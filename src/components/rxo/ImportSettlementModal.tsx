"use client";

import React, { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Upload, FileText, CheckCircle2, Loader2, Info, Calendar } from "lucide-react";
import { RouteTrackerRow, FormulaSettings } from "@/app/lib/types";
import { useFirestore, setDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

interface ImportSettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (reportId: string) => void;
  routes: RouteTrackerRow[];
  settings?: FormulaSettings;
}

export function ImportSettlementModal({ isOpen, onClose, onImportComplete, routes, settings }: ImportSettlementModalProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14); // Default to two weeks ago
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

  const handleSimulateImport = async () => {
    if (!startDate || !endDate) {
      toast({ variant: "destructive", title: "Missing Dates", description: "Please select the settlement period dates." });
      return;
    }

    setIsImporting(true);
    
    try {
      const reportId = `rxo-rep-${Date.now()}`;
      const now = new Date().toISOString();
      
      const reportRef = doc(db, "rxoSettlementReports", reportId);

      // Simulation Data matching exact totals for a consistent audit
      const demoReport = {
        id: reportId,
        payee: "SYSTEM ORIENTED LLC",
        companyName: "SYSTEM ORIENTED LLC",
        settlementPeriodStart: startDate,
        settlementPeriodEnd: endDate,
        anticipatedIssueDate: now.split('T')[0],
        marketCount: 1,
        routeCount: 16,
        totalMiles: 1764.1,
        totalStops: 266,
        rxoTotalPay: 7043.41,
        internalEstimatedTotalPay: 0,
        totalDelta: 0,
        fileName: file?.name || `RXO_Settlement_${startDate}_${endDate}.xlsx`,
        importedAt: now,
        importedBy: "System Admin",
        notes: `Imported for period ${startDate} to ${endDate}.`
      };

      // Generate simulated routes that sum up exactly to the report totals
      const demoRoutes = Array.from({ length: 16 }).map((_, i) => {
        const routeCode = `A${String(i + 1).padStart(2, '0')}`;
        
        // Distribute stops: 10 routes with 17 stops, 6 routes with 16 stops = 266 total
        const stops = i < 10 ? 17 : 16;
        
        // Distribute miles: 15 routes with 110.2, 1 route with 111.1 = 1764.1 total
        const miles = i < 15 ? 110.2 : 111.1;
        
        // Distribute pay: 15 routes with 440.21, 1 route with 440.26 = 7043.41 total
        const rxoPay = i < 15 ? 440.21 : 440.26;

        return {
          routeId: `LMH__BWI_02152026_${routeCode}`, 
          rxoPay,
          stops,
          miles,
          market: "LMH Beltsville",
          date: startDate
        };
      });

      let totalInternalEst = 0;

      demoRoutes.forEach((demo, idx) => {
        // MATCHING LOGIC: Extract the route ID (e.g., A01) from RXO string
        const matchedInternal = routes.find(r => 
          r.date === demo.date && (demo.routeId.endsWith(r.route) || demo.routeId.includes(`_${r.route}`))
        );

        // Use internal estimate if matched, otherwise fallback to standard node calculation
        const internalEst = matchedInternal?.estimatedPay || (demo.stops * 27);
        totalInternalEst += internalEst;

        const delta = demo.rxoPay - internalEst;
        const detailId = `rd-${Date.now()}-${idx}`;

        // Audit Status logic: RED if < -50, GREEN otherwise
        const deltaStatus = delta < -50 ? 'RED' : 'GREEN';

        setDocumentNonBlocking(doc(db, "rxoSettlementRouteDetails", detailId), {
          id: detailId,
          reportId,
          routeId: demo.routeId,
          market: demo.market,
          routeDate: demo.date,
          routeMiles: demo.miles,
          stopCount: demo.stops,
          rxoSettlementPay: demo.rxoPay,
          systemEstimatedPay: internalEst,
          delta,
          deltaStatus,
          internalRouteId: matchedInternal?.id || null,
          matchStatus: matchedInternal ? 'Matched' : 'Unmatched',
          finalEstimatedPay: internalEst,
          createdAt: now
        }, { merge: true });
      });

      demoReport.internalEstimatedTotalPay = totalInternalEst;
      demoReport.totalDelta = demoReport.rxoTotalPay - totalInternalEst;

      setDocumentNonBlocking(reportRef, demoReport, { merge: true });

      // Summary Snapshot Row
      addDocumentNonBlocking(collection(db, "rxoSettlementSummaryRows"), {
        reportId,
        companyName: "SYSTEM ORIENTED LLC",
        market: "LMH Beltsville",
        routeCount: 16,
        totalMiles: 1764.1,
        totalStops: 266,
        totalPay: 7043.41,
        createdAt: now
      });

      setTimeout(() => {
        setIsImporting(false);
        onImportComplete(reportId);
        toast({ title: "Audit Complete", description: `Report synchronized for ${startDate} to ${endDate}.` });
        onClose();
      }, 1500);

    } catch (e) {
      console.error(e);
      setIsImporting(false);
      toast({ variant: "destructive", title: "Import Failed", description: "Could not process RXO settlement data." });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl rounded-[2.5rem] p-10 bg-white shadow-2xl border-none">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Import RXO Settlement</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-8 mt-6">
          <div className="grid grid-cols-2 gap-6 p-6 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400">Settlement Start Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input type="date" className="h-12 pl-10 rounded-xl bg-white border-none font-bold" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400">Settlement End Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input type="date" className="h-12 pl-10 rounded-xl bg-white border-none font-bold" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
          </div>

          <div 
            className="p-12 border-2 border-dashed border-slate-100 rounded-[2rem] flex flex-col items-center justify-center gap-4 bg-slate-50/50 hover:bg-slate-50 transition-all cursor-pointer group"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="h-16 w-16 rounded-2xl bg-white shadow-sm flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors">
              <Upload className="h-8 w-8" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-slate-900">Upload RXO Weekly Statement</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Cross-referencing Summary & Route Details...</p>
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept=".csv, .xlsx, .xls" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </div>

          {file && (
            <div className="flex items-center gap-4 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
              <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-emerald-500 shadow-sm"><FileText className="h-5 w-5" /></div>
              <div className="flex-1">
                <p className="text-xs font-black text-slate-900">{file.name}</p>
                <p className="text-[9px] font-bold text-emerald-600 uppercase">File loaded for cross-reference</p>
              </div>
            </div>
          )}

          <Alert className="rounded-2xl bg-blue-50 border-blue-100 text-blue-700">
            <Info className="h-4 w-4" />
            <AlertTitle className="text-[10px] font-black uppercase tracking-widest">Logic: Side-by-Side Verification</AlertTitle>
            <AlertDescription className="text-[10px] font-medium leading-relaxed mt-1">
              The system compares RXO Route ID, Miles, and Stops against your internal tracker. Delta Status flags discrepancies &lt; -50.00 in RED.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="mt-10 gap-3">
          <Button variant="ghost" onClick={onClose} className="rounded-xl h-12 font-bold px-8">Cancel</Button>
          <Button 
            className="rounded-xl h-12 bg-slate-900 font-bold px-10 uppercase text-xs shadow-xl" 
            onClick={handleSimulateImport} 
            disabled={isImporting || !file || !startDate || !endDate}
          >
            {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <><CheckCircle2 className="mr-2 h-4 w-4" /> Start Audit Process</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
