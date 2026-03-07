"use client";

import React, { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, FileText, CheckCircle2, Loader2, Info, Calendar, Sparkles, Image as ImageIcon, RefreshCw, X, Table } from "lucide-react";
import { RouteTrackerRow, FormulaSettings, RXORouteDetail } from "@/app/lib/types";
import { useFirestore, setDocumentNonBlocking } from "@/firebase";
import { doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { analyzeRXOSettlement } from "@/ai/flows/process-rxo-settlement-flow";
import { estimatePay } from "@/app/lib/payroll-utils";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";

interface ImportSettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (reportId: string) => void;
  routes: RouteTrackerRow[];
  settings?: FormulaSettings;
}

export function ImportSettlementModal({ isOpen, onClose, onImportComplete, routes, settings }: ImportSettlementModalProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const db = useFirestore();
  const { toast } = useToast();

  const handleFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;
    const incoming = Array.from(newFiles);
    setFiles(prev => [...prev, ...incoming]);
    incoming.forEach(f => {
      if (f.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => setPreviews(prev => [...prev, reader.result as string]);
        reader.readAsDataURL(f);
      } else {
        setPreviews(prev => [...prev, "excel-placeholder"]);
      }
    });
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => handleFiles(e.target.files);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(e.type === "dragenter" || e.type === "dragover");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  // Helper to extract date and code from RXO ID
  const parseRXOId = (rxoId: string) => {
    const id = rxoId.toUpperCase();
    
    // Case 3: EV Route
    if (id.includes("DMPEV")) return { type: 'EV', code: 'EV' };
    
    // Case 4: GAS Route
    if (id.includes("DMPGAS")) return { type: 'GAS', code: 'GAS' };

    // Case 1 & 2: LMH Patterns (e.g. LMH__BWI_02152026_A01_EV)
    if (id.includes("LMH")) {
      const parts = id.split('_').filter(Boolean);
      // Date is usually the numeric part MMDDYYYY
      const datePart = parts.find(p => /^\d{8}$/.test(p));
      
      // Extract code (everything after date)
      const dateIndex = parts.indexOf(datePart || "");
      if (dateIndex !== -1) {
        const codeParts = parts.slice(dateIndex + 1);
        return { type: 'LMH', code: codeParts.join('_'), dateStr: datePart };
      }
    }

    return { type: 'UNKNOWN', code: rxoId };
  };

  const startAuditProcess = async () => {
    if (!startDate || !endDate) {
      toast({ variant: "destructive", title: "Missing Dates", description: "Select the settlement period." });
      return;
    }
    if (files.length === 0) {
      toast({ variant: "destructive", title: "No Files", description: "Please upload at least one settlement file or screenshot." });
      return;
    }

    setIsImporting(true);
    
    try {
      const reportId = `rxo-rep-${Date.now()}`;
      const now = new Date().toISOString();
      let allExtractedRoutes: any[] = [];
      let totalSettlementPay = 0;
      let summaryTotalPay = 0;
      let orderDetailsRateSum = 0;
      let hasExcelIntegrity = false;

      for (let i = 0; i < files.length; i++) {
        const currentFile = files[i];
        if (currentFile.type.startsWith('image/')) {
          const preview = previews[i];
          if (preview) {
            toast({ title: `AI Scanning Image ${i + 1}/${files.length}` });
            const aiResult = await analyzeRXOSettlement({ photoDataUri: preview });
            allExtractedRoutes = [...allExtractedRoutes, ...aiResult.extractedRoutes];
            totalSettlementPay += aiResult.totalPay;
          }
        } else if (currentFile.name.endsWith('.xlsx') || currentFile.name.endsWith('.xls')) {
          toast({ title: `Logic Audit: Excel` });
          const data = await currentFile.arrayBuffer();
          const workbook = XLSX.read(data);
          
          // STEP 1: Settlement Validation Audit
          const summarySheet = workbook.Sheets[workbook.SheetNames.find(n => n.toLowerCase().includes("summary")) || ""];
          if (summarySheet) {
            const json = XLSX.utils.sheet_to_json(summarySheet, { header: 1 }) as any[][];
            for (const row of json) {
              const payIdx = row.findIndex(cell => String(cell).toLowerCase().includes("total pay"));
              if (payIdx !== -1 && row[payIdx + 1]) { summaryTotalPay = Number(row[payIdx + 1]); break; }
            }
          }

          const orderSheet = workbook.Sheets[workbook.SheetNames.find(n => n.toLowerCase().includes("order")) || ""];
          if (orderSheet) {
            const json = XLSX.utils.sheet_to_json(orderSheet) as any[];
            orderDetailsRateSum = json.reduce((sum, row) => {
              const rateKey = Object.keys(row).find(k => k.toLowerCase() === "rate");
              return sum + (rateKey ? Number(row[rateKey] || 0) : 0);
            }, 0);
            hasExcelIntegrity = true;
          }

          // STEP 2: Route Details Extraction (from Excel)
          const routeSheet = workbook.Sheets[workbook.SheetNames.find(n => n.toLowerCase().includes("route")) || ""];
          if (routeSheet) {
            const json = XLSX.utils.sheet_to_json(routeSheet) as any[];
            const mapped = json.map(r => ({
              routeId: String(r["Route ID"] || r["RouteID"] || ""),
              market: String(r["Market"] || ""),
              routeDate: r["Route Date"] || r["RouteDate"],
              routeMiles: Number(r["Route Miles"] || r["Miles"] || 0),
              stopCount: Number(r["Stop Count"] || r["Stops"] || 0),
              settlementAmount: Number(r["Settlement Amount"] || r["Amount"] || 0)
            })).filter(r => r.routeId);
            allExtractedRoutes = [...allExtractedRoutes, ...mapped];
          }
        }
      }

      // STEP 3-6: Matching, Comparison, and Delta Audit
      let totalInternalEst = 0;
      let totalMilesRXO = 0;
      let totalStopsRXO = 0;

      allExtractedRoutes.forEach((extracted, idx) => {
        const { type, code, dateStr } = parseRXOId(extracted.routeId);
        totalMilesRXO += extracted.routeMiles;
        totalStopsRXO += extracted.stopCount;

        // Match based on cases
        const matchedInternal = routes.find(r => {
          if (r.date !== extracted.routeDate) return false;
          
          if (type === 'EV') return r.route.toUpperCase() === 'EV' && r.vehicleNumber.toUpperCase() === 'EV';
          if (type === 'GAS') return r.route.toUpperCase() === 'GAS';
          
          // LMH Case: Extract code must match exactly
          return r.route.toUpperCase() === code;
        });

        const internalEst = matchedInternal 
          ? (matchedInternal.estimatedPay || estimatePay(matchedInternal.stops, matchedInternal.miles, matchedInternal.route, matchedInternal.vehicleNumber, settings, matchedInternal.routeType))
          : 0;

        totalInternalEst += internalEst;
        const delta = Number((extracted.settlementAmount - internalEst).toFixed(2));
        const deltaStatus = delta < -50 ? 'RED' : 'GREEN';

        const detailId = `rd-${Date.now()}-${idx}`;
        setDocumentNonBlocking(doc(db, "rxoSettlementRouteDetails", detailId), {
          id: detailId,
          reportId,
          routeId: extracted.routeId,
          market: extracted.market,
          routeDate: extracted.routeDate,
          routeMiles: extracted.routeMiles,
          internalMiles: matchedInternal?.miles || 0,
          stopCount: extracted.stopCount,
          internalStops: matchedInternal?.stops || 0,
          rxoSettlementPay: extracted.settlementAmount,
          systemEstimatedPay: internalEst,
          delta,
          deltaStatus,
          internalRouteId: matchedInternal?.id || null,
          matchStatus: matchedInternal ? 'Matched' : 'Unmatched',
          finalEstimatedPay: internalEst,
          createdAt: now
        } satisfies RXORouteDetail, { merge: true });
      });

      const reportData = {
        id: reportId,
        payee: "SYSTEM ORIENTED LLC",
        companyName: "SYSTEM ORIENTED LLC",
        settlementPeriodStart: startDate,
        settlementPeriodEnd: endDate,
        anticipatedIssueDate: now.split('T')[0],
        marketCount: 1,
        routeCount: allExtractedRoutes.length,
        totalMiles: Number(totalMilesRXO.toFixed(1)),
        totalStops: totalStopsRXO,
        rxoTotalPay: Number((summaryTotalPay || totalSettlementPay).toFixed(2)),
        internalEstimatedTotalPay: Number(totalInternalEst.toFixed(2)),
        totalDelta: Number(((summaryTotalPay || totalSettlementPay) - totalInternalEst).toFixed(2)),
        fileName: files.length > 1 ? `Batch (${files.length} files)` : files[0].name,
        importedAt: now,
        importedBy: "System Admin",
        notes: `AI Audit Batch for ${startDate} to ${endDate}`,
        summaryTotalPay: Number(summaryTotalPay.toFixed(2)),
        orderDetailsRateSum: Number(orderDetailsRateSum.toFixed(2)),
        integrityStatus: hasExcelIntegrity 
          ? (Math.abs(summaryTotalPay - orderDetailsRateSum) < 0.01 ? 'Verified' : 'Mismatch')
          : 'Pending'
      };

      setDocumentNonBlocking(doc(db, "rxoSettlementReports", reportId), reportData, { merge: true });
      setIsImporting(false);
      onImportComplete(reportId);
      onClose();
      toast({ title: "AI Audit Complete" });

    } catch (e) {
      console.error(e);
      setIsImporting(false);
      toast({ variant: "destructive", title: "Import Failed", description: "Audit logic encountered an error." });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl rounded-[2.5rem] p-10 bg-white border-none shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><Sparkles className="h-6 w-6" /></div>
            <DialogTitle className="text-2xl font-black uppercase tracking-tighter">AI Settlement Audit</DialogTitle>
          </div>
        </DialogHeader>
        
        <div className="space-y-8 mt-6">
          <div className="grid grid-cols-2 gap-6 p-6 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400">Week Start</Label>
              <Input type="date" className="h-12 rounded-xl bg-white border-none font-bold" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400">Week End</Label>
              <Input type="date" className="h-12 rounded-xl bg-white border-none font-bold" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>

          <div 
            className={cn(
              "p-12 border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center gap-4 transition-all cursor-pointer group",
              isDragging ? "border-primary bg-primary/5 scale-[1.02]" : "border-slate-100 bg-slate-50/50 hover:bg-slate-50"
            )}
            onClick={() => fileInputRef.current?.click()}
            onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
          >
            <div className="h-16 w-16 rounded-2xl bg-white shadow-sm flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors">
              <Upload className="h-8 w-8" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-slate-900">{isDragging ? "Drop to Scan" : "Upload Batch"}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Images or RXO Excel Reports</p>
            </div>
            <input type="file" multiple ref={fileInputRef} className="hidden" accept="image/*,.xlsx,.xls" onChange={handleFileChange} />
          </div>

          {files.length > 0 && (
            <ScrollArea className="max-h-[150px] rounded-2xl border bg-slate-50/50">
              <div className="p-4 space-y-2">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-white rounded-xl border border-slate-100 group">
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-slate-400" />
                      <span className="text-xs font-bold text-slate-700 truncate max-w-[200px]">{f.name}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => removeFile(i)}><X className="h-3 w-3" /></Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          <Alert className="rounded-2xl bg-blue-50 border-blue-100 text-blue-700">
            <Info className="h-4 w-4" />
            <AlertTitle className="text-[10px] font-black uppercase tracking-widest">Matching Engine Active</AlertTitle>
            <AlertDescription className="text-[10px] font-medium leading-relaxed mt-1">
              Extracts route code from LMH patterns and validates MMDDYYYY strings. Case 3 (DMPEV) and Case 4 (DMPGAS) specific rules applied.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="mt-10">
          <Button variant="ghost" onClick={onClose} className="rounded-xl h-12">Cancel</Button>
          <Button 
            className="rounded-xl h-12 bg-slate-900 font-bold px-10 uppercase text-xs shadow-xl" 
            onClick={startAuditProcess} disabled={isImporting || files.length === 0}
          >
            {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Run AI Audit Batch"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
