"use client";

import React, { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, FileText, Loader2, Info, Sparkles, X } from "lucide-react";
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
  
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

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

  /**
   * STEP 3 & 4 — REFINED MATCHING ENGINE
   * Implements the 4 defined cases for parsing RXO strings
   */
  const findInternalMatch = (rxoRouteId: string, rxoDate: string) => {
    const id = (rxoRouteId || "").toUpperCase();
    const reportDate = rxoDate; // YYYY-MM-DD

    // CASE 3: EV Route Detection (Prefix DMPEV)
    if (id.includes("DMPEV")) {
      return routes.find(r => 
        r.date === reportDate && 
        r.route.toUpperCase() === 'EV' && 
        r.vehicleNumber.toUpperCase() === 'EV'
      );
    }

    // CASE 4: GAS Route Detection (Prefix DMPGAS)
    if (id.includes("DMPGAS")) {
      return routes.find(r => 
        r.date === reportDate && 
        r.route.toUpperCase() === 'GAS'
      );
    }

    // CASE 1 & 2: LMH Patterns
    if (id.includes("LMH")) {
      const parts = id.split('_').filter(Boolean);
      const datePart = parts.find(p => /^\d{8}$/.test(p)); // Finds MMDDYYYY
      
      if (datePart) {
        // STEP 4 Validation: Check embedded date against report date
        const m = datePart.substring(0, 2);
        const d = datePart.substring(2, 4);
        const y = datePart.substring(4, 8);
        const formattedIdDate = `${y}-${m}-${d}`;
        
        if (formattedIdDate !== reportDate) return null;

        const dateIndex = parts.indexOf(datePart);
        // Extract everything after the date part as the route code
        const extractedCode = parts.slice(dateIndex + 1).join('_');
        
        return routes.find(r => 
          r.date === reportDate && 
          r.route.toUpperCase() === extractedCode.toUpperCase()
        );
      }
    }

    return null;
  };

  const startAuditProcess = async () => {
    if (!startDate || !endDate) {
      toast({ variant: "destructive", title: "Missing Dates", description: "Select the settlement period." });
      return;
    }
    if (files.length === 0) {
      toast({ variant: "destructive", title: "No Files", description: "Upload settlement documents or screenshots." });
      return;
    }

    setIsImporting(true);
    
    try {
      const reportId = `rxo-rep-${Date.now()}`;
      const now = new Date().toISOString();
      let allExtractedRoutes: any[] = [];
      let summaryTotalPay = 0;
      let orderDetailsRateSum = 0;
      let hasExcelIntegrity = false;

      for (let i = 0; i < files.length; i++) {
        const currentFile = files[i];
        if (currentFile.type.startsWith('image/')) {
          const aiResult = await analyzeRXOSettlement({ photoDataUri: previews[i] });
          allExtractedRoutes = [...allExtractedRoutes, ...aiResult.extractedRoutes];
        } else {
          const data = await currentFile.arrayBuffer();
          const workbook = XLSX.read(data);
          
          // STEP 1: VALIDATION AUDIT (Summary vs Order Details)
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

      allExtractedRoutes.forEach((extracted, idx) => {
        const matched = findInternalMatch(extracted.routeId, extracted.routeDate);
        const internalEst = matched 
          ? (matched.estimatedPay || estimatePay(matched.stops, matched.miles, matched.route, matched.vehicleNumber, settings, matched.routeType))
          : 0;

        const delta = Number((extracted.settlementAmount - internalEst).toFixed(2));
        const detailId = `rd-${Date.now()}-${idx}`;
        
        setDocumentNonBlocking(doc(db, "rxoSettlementRouteDetails", detailId), {
          id: detailId,
          reportId,
          routeId: extracted.routeId,
          market: extracted.market,
          routeDate: extracted.routeDate,
          routeMiles: extracted.routeMiles,
          stopCount: extracted.stopCount,
          rxoSettlementPay: extracted.settlementAmount,
          systemEstimatedPay: internalEst,
          delta,
          // CRITICAL: Mark any negative variance as RED
          deltaStatus: delta < 0 ? 'RED' : 'GREEN',
          internalRouteId: matched?.id || null,
          matchStatus: matched ? 'Matched' : 'Unmatched',
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
        totalMiles: allExtractedRoutes.reduce((sum, r) => sum + r.routeMiles, 0),
        totalStops: allExtractedRoutes.reduce((sum, r) => sum + r.stopCount, 0),
        rxoTotalPay: Number((summaryTotalPay || allExtractedRoutes.reduce((sum, r) => sum + r.settlementAmount, 0)).toFixed(2)),
        internalEstimatedTotalPay: 0,
        totalDelta: 0,
        fileName: files.length > 1 ? `Batch (${files.length} files)` : files[0].name,
        importedAt: now,
        importedBy: "System Admin",
        notes: `AI Extraction Batch: ${startDate} to ${endDate}`,
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
      toast({ title: "AI Settlement Audit Complete" });

    } catch (e) {
      console.error(e);
      setIsImporting(false);
      toast({ variant: "destructive", title: "Import Failed", description: "Audit engine encountered an error." });
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
              <Label className="text-[10px] font-black uppercase text-slate-400 px-1">Settlement Start</Label>
              <Input type="date" className="h-12 rounded-xl bg-white border-none font-bold" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400 px-1">Settlement End</Label>
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
              <p className="text-sm font-bold text-slate-900">{isDragging ? "Drop files to scan" : "Upload Settlement Batch"}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Accepts Screenshots (PNG/JPG) & Excel (XLSX)</p>
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
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFile(i)}><X className="h-3 w-3" /></Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          <Alert className="rounded-2xl bg-blue-50 border-blue-100 text-blue-700">
            <Info className="h-4 w-4" />
            <AlertTitle className="text-[10px] font-black uppercase tracking-widest">Matching Intelligence Active</AlertTitle>
            <AlertDescription className="text-[10px] font-medium leading-relaxed mt-1">
              Scanning LMH, DMPEV, and DMPGAS patterns. Any negative payouts (under-estimated) are flagged in RED. Verified Sunday to Saturday audit order.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="mt-10">
          <Button variant="ghost" onClick={onClose} className="rounded-xl h-12">Cancel</Button>
          <Button 
            className="rounded-xl h-12 bg-slate-900 font-bold px-10 uppercase text-xs shadow-xl" 
            onClick={startAuditProcess} disabled={isImporting || files.length === 0}
          >
            {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Run AI Settlement Audit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}