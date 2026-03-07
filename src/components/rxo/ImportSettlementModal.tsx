
"use client";

import React, { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, FileText, CheckCircle2, Loader2, Info, Calendar, Sparkles, Image as ImageIcon, RefreshCw, X, Table } from "lucide-react";
import { RouteTrackerRow, FormulaSettings } from "@/app/lib/types";
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
        reader.onloadend = () => {
          setPreviews(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(f);
      } else {
        // Placeholder for non-image previews (Excel)
        setPreviews(prev => [...prev, "excel-placeholder"]);
      }
    });
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true);
    } else if (e.type === "dragleave") {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
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
      
      // Integrity Check States
      let summaryTotalPay = 0;
      let orderDetailsRateSum = 0;
      let hasExcelIntegrity = false;

      // Process each file
      for (let i = 0; i < files.length; i++) {
        const currentFile = files[i];
        
        // 1. Process Images with AI
        if (currentFile.type.startsWith('image/')) {
          const preview = previews[i] || "";
          if (preview) {
            toast({ title: `Scanning Image ${i + 1}/${files.length}`, description: "AI is analyzing settlement details..." });
            const aiResult = await analyzeRXOSettlement({ photoDataUri: preview });
            allExtractedRoutes = [...allExtractedRoutes, ...aiResult.extractedRoutes];
            totalSettlementPay += aiResult.totalPay;
          }
        } 
        // 2. Process Excel for Integrity Audit
        else if (currentFile.name.endsWith('.xlsx') || currentFile.name.endsWith('.xls')) {
          toast({ title: `Scanning Excel`, description: "Performing settlement integrity audit..." });
          const data = await currentFile.arrayBuffer();
          const workbook = XLSX.read(data);
          
          // Find Summary and Order Details sheets
          const summaryName = workbook.SheetNames.find(n => n.toLowerCase().includes("summary"));
          const orderName = workbook.SheetNames.find(n => n.toLowerCase().includes("order"));

          if (summaryName) {
            const summarySheet = workbook.Sheets[summaryName];
            const json = XLSX.utils.sheet_to_json(summarySheet, { header: 1 }) as any[][];
            // Locate "Total Pay" - simple heuristic search
            for (const row of json) {
              const payIdx = row.findIndex(cell => String(cell).toLowerCase().includes("total pay"));
              if (payIdx !== -1 && row[payIdx + 1]) {
                summaryTotalPay = Number(row[payIdx + 1]);
                break;
              }
            }
          }

          if (orderName) {
            const orderSheet = workbook.Sheets[orderName];
            const json = XLSX.utils.sheet_to_json(orderSheet) as any[];
            // Sum "Rate" column
            orderDetailsRateSum = json.reduce((sum, row) => {
              const rateKey = Object.keys(row).find(k => k.toLowerCase() === "rate");
              return sum + (rateKey ? Number(row[rateKey] || 0) : 0);
            }, 0);
            hasExcelIntegrity = true;
          }
        }
      }

      let totalInternalEst = 0;
      let totalMilesRXO = 0;
      let totalStopsRXO = 0;
      const usedInternalIds = new Set<string>();

      allExtractedRoutes.forEach((extracted, idx) => {
        totalMilesRXO += extracted.routeMiles;
        totalStopsRXO += extracted.stopCount;

        // MATCHING LOGIC
        const matchedInternal = routes.find(r => {
          if (usedInternalIds.has(r.id)) return false;
          if (r.date !== extracted.routeDate) return false;

          const rxoId = extracted.routeId.toUpperCase();
          const internalRoute = r.route.toUpperCase();
          const internalVehicle = r.vehicleNumber.toUpperCase();

          if (rxoId.includes('DMPEV') && internalRoute === 'EV' && internalVehicle === 'EV') return true;
          if (rxoId.endsWith(`_${internalRoute}`)) return true;

          return false;
        });

        if (matchedInternal) usedInternalIds.add(matchedInternal.id);

        const internalEst = matchedInternal 
          ? (matchedInternal.estimatedPay && matchedInternal.estimatedPay > 0 
              ? matchedInternal.estimatedPay 
              : estimatePay(matchedInternal.stops, matchedInternal.miles, matchedInternal.route, matchedInternal.vehicleNumber, settings, matchedInternal.routeType))
          : 0;

        totalInternalEst += internalEst;

        const delta = Number((extracted.settlementAmount - internalEst).toFixed(2));
        const detailId = `rd-${Date.now()}-${idx}`;
        const deltaStatus = delta < -50 ? 'RED' : 'GREEN';

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
        }, { merge: true });
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
        notes: `Audit for ${startDate} to ${endDate}.`,
        summaryTotalPay: Number(summaryTotalPay.toFixed(2)),
        orderDetailsRateSum: Number(orderDetailsRateSum.toFixed(2)),
        integrityStatus: hasExcelIntegrity 
          ? (Math.abs(summaryTotalPay - orderDetailsRateSum) < 0.01 ? 'Verified' : 'Mismatch')
          : 'Pending'
      };

      setDocumentNonBlocking(doc(db, "rxoSettlementReports", reportId), reportData, { merge: true });

      setTimeout(() => {
        setIsImporting(false);
        onImportComplete(reportId);
        toast({ title: "Audit Complete", description: `Cross-referenced settlement data with your internal tracker.` });
        onClose();
      }, 1000);

    } catch (e) {
      console.error(e);
      setIsImporting(false);
      toast({ variant: "destructive", title: "Import Failed", description: "The system encountered an error while processing the files." });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl rounded-[2.5rem] p-10 bg-white shadow-2xl border-none">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Sparkles className="h-6 w-6" />
            </div>
            <DialogTitle className="text-2xl font-black uppercase tracking-tighter">AI Settlement Audit</DialogTitle>
          </div>
        </DialogHeader>
        
        <div className="space-y-8 mt-6">
          <div className="grid grid-cols-2 gap-6 p-6 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400">Settlement Start</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input type="date" className="h-12 pl-10 rounded-xl bg-white border-none font-bold" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400">Settlement End</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input type="date" className="h-12 pl-10 rounded-xl bg-white border-none font-bold" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
          </div>

          <div 
            className={cn(
              "p-12 border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center gap-4 transition-all cursor-pointer group",
              isDragging ? "border-primary bg-primary/5 scale-[1.02]" : "border-slate-100 bg-slate-50/50 hover:bg-slate-50"
            )}
            onClick={() => fileInputRef.current?.click()}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className={cn(
              "h-16 w-16 rounded-2xl bg-white shadow-sm flex items-center justify-center transition-colors",
              isDragging ? "text-primary" : "text-slate-400 group-hover:text-primary"
            )}>
              <Upload className="h-8 w-8" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-slate-900">
                {isDragging ? "Drop files here" : "Upload Settlement Data"}
              </p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                Accepts RXO Screenshots (PNG/JPG) or Excel (.XLSX)
              </p>
            </div>
            <input 
              type="file" multiple ref={fileInputRef} className="hidden" 
              accept="image/*,.xlsx,.xls" onChange={handleFileChange} 
            />
          </div>

          {files.length > 0 && (
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Batch Queue ({files.length})</p>
              <ScrollArea className="max-h-[200px] rounded-2xl border border-slate-100 bg-slate-50/50">
                <div className="p-4 space-y-2">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center gap-4 p-3 bg-white rounded-xl border border-slate-100 group">
                      <div className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center",
                        f.type.startsWith('image/') ? "bg-emerald-50 text-emerald-500" : "bg-blue-50 text-blue-500"
                      )}>
                        {f.type.startsWith('image/') ? <ImageIcon className="h-4 w-4" /> : <Table className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{f.name}</p>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-tight">
                          {f.type.startsWith('image/') ? "AI Scanning Enabled" : "Logic Audit Enabled"}
                        </p>
                      </div>
                      <Button 
                        variant="ghost" size="icon" className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-rose-500"
                        onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          <Alert className="rounded-2xl bg-blue-50 border-blue-100 text-blue-700">
            <Info className="h-4 w-4" />
            <AlertTitle className="text-[10px] font-black uppercase tracking-widest">Audit Rules</AlertTitle>
            <AlertDescription className="text-[10px] font-medium leading-relaxed mt-1">
              The system compares RXO Route ID, Miles, and Stops against your internal tracker. Excel files undergo a specific "Summary vs Order Rate" integrity check.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="mt-10 gap-3">
          <Button variant="ghost" onClick={onClose} className="rounded-xl h-12 font-bold px-8">Cancel</Button>
          <Button 
            className="rounded-xl h-12 bg-slate-900 font-bold px-10 uppercase text-xs shadow-xl" 
            onClick={startAuditProcess} 
            disabled={isImporting || files.length === 0}
          >
            {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <><Sparkles className="mr-2 h-4 w-4" /> Start Audit Batch</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
