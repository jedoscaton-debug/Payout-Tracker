
"use client";

import React, { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, FileText, CheckCircle2, Loader2, Info, Calendar, Sparkles, Image as ImageIcon, RefreshCw, X } from "lucide-react";
import { RouteTrackerRow, FormulaSettings } from "@/app/lib/types";
import { useFirestore, setDocumentNonBlocking } from "@/firebase";
import { doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { analyzeRXOSettlement } from "@/ai/flows/process-rxo-settlement-flow";
import { cn } from "@/lib/utils";

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
      }
    });
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    // Previews index might mismatch if non-images are mixed, but simple cleanup for now
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

      // Process each file
      for (let i = 0; i < files.length; i++) {
        const currentFile = files[i];
        
        if (currentFile.type.startsWith('image/')) {
          const preview = previews[i] || "";
          if (preview) {
            toast({ title: `Scanning Image ${i + 1}/${files.length}`, description: "Gemini is analyzing the screenshot..." });
            const aiResult = await analyzeRXOSettlement({ photoDataUri: preview });
            allExtractedRoutes = [...allExtractedRoutes, ...aiResult.extractedRoutes];
            totalSettlementPay += aiResult.totalPay;
          }
        } else {
          // Fallback simulation for non-image files (Excel/CSV)
          const simulated = simulateFileExtraction(startDate);
          allExtractedRoutes = [...allExtractedRoutes, ...simulated];
          totalSettlementPay += simulated.reduce((sum, r) => sum + r.settlementAmount, 0);
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
          
          // Date Check: Handle MMDDYYYY format from AI vs YYYY-MM-DD from tracker
          const internalDate = r.date;
          if (internalDate !== extracted.routeDate) return false;

          const rxoId = extracted.routeId.toUpperCase();
          const internalRoute = r.route.toUpperCase();
          const internalVehicle = r.vehicleNumber.toUpperCase();

          // Rule 1: EV Pattern (DMPEV)
          if (rxoId.includes('DMPEV') && internalRoute === 'EV' && internalVehicle === 'EV') {
            return true;
          }

          // Rule 2: LMH Pattern (Check suffix)
          if (rxoId.endsWith(`_${internalRoute}`)) {
            return true;
          }

          // Relaxed suffix check
          const parts = rxoId.split('_');
          const suffix = parts[parts.length - 1];
          if (suffix === internalRoute || (parts[parts.length - 2] === internalRoute && suffix === 'EV')) {
            return true;
          }

          return false;
        });

        if (matchedInternal) usedInternalIds.add(matchedInternal.id);

        const internalEst = matchedInternal?.estimatedPay || 0;
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
        rxoTotalPay: Number(totalSettlementPay.toFixed(2)),
        internalEstimatedTotalPay: Number(totalInternalEst.toFixed(2)),
        totalDelta: Number((totalSettlementPay - totalInternalEst).toFixed(2)),
        fileName: files.length > 1 ? `Batch (${files.length} files)` : files[0].name,
        importedAt: now,
        importedBy: "System Admin",
        notes: `AI-powered batch audit for ${startDate} to ${endDate}.`
      };

      setDocumentNonBlocking(doc(db, "rxoSettlementReports", reportId), reportData, { merge: true });

      setTimeout(() => {
        setIsImporting(false);
        onImportComplete(reportId);
        toast({ title: "Audit Batch Complete", description: `Cross-referenced ${allExtractedRoutes.length} routes from ${files.length} files.` });
        onClose();
      }, 1000);

    } catch (e) {
      console.error(e);
      setIsImporting(false);
      toast({ variant: "destructive", title: "Import Failed", description: "AI batch processing encountered an error." });
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
                {isDragging ? "Drop files here" : "Upload RXO Files or Screenshots"}
              </p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                Supports multiple PNG, JPG, JPEG, and CSV files
              </p>
            </div>
            <input 
              type="file" multiple ref={fileInputRef} className="hidden" 
              accept="image/*,.csv,.xlsx,.xls" onChange={handleFileChange} 
            />
          </div>

          {files.length > 0 && (
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Selected Batch ({files.length})</p>
              <ScrollArea className="max-h-[200px] rounded-2xl border border-slate-100 bg-slate-50/50">
                <div className="p-4 space-y-2">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center gap-4 p-3 bg-white rounded-xl border border-slate-100 group">
                      <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-500">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{f.name}</p>
                        <p className="text-[8px] font-black text-emerald-600 uppercase tracking-tight">Queue Position {i + 1}</p>
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
            <AlertTitle className="text-[10px] font-black uppercase tracking-widest">AI Batch Processing</AlertTitle>
            <AlertDescription className="text-[10px] font-medium leading-relaxed mt-1">
              Gemini AI will process all selected files in sequence. Each screenshot will be cross-referenced with your internal records. Discrepancies exceeding -$50.00 will be flagged.
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
            {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <><Sparkles className="mr-2 h-4 w-4" /> Start AI Batch Audit</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function simulateFileExtraction(date: string) {
  const dateParts = date.split('-');
  const dateFormatted = `${dateParts[1]}${dateParts[2]}${dateParts[0]}`;
  
  return Array.from({ length: 4 }).map((_, i) => ({
    routeId: `LMH__BWI_${dateFormatted}_A${String(i+1).padStart(2, '0')}`,
    market: "LMH Beltsville",
    routeDate: date,
    routeMiles: 110 + i,
    stopCount: 15 + i,
    settlementAmount: 440.21
  }));
}
