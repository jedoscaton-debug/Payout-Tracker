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
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
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
      const today = new Date().toISOString().split('T')[0];
      
      const reportRef = doc(db, "rxoSettlementReports", reportId);

      // Simulation Data Construction using user selected dates
      const demoReport = {
        id: reportId,
        payee: "SYSTEM ORIENTED LLC",
        companyName: "SYSTEM ORIENTED LLC",
        settlementPeriodStart: startDate,
        settlementPeriodEnd: endDate,
        anticipatedIssueDate: today,
        marketCount: 1,
        routeCount: 4,
        totalMiles: 452.7,
        totalStops: 70,
        rxoTotalPay: 1998.21,
        internalEstimatedTotalPay: 1890.00,
        totalDelta: 108.21,
        fileName: file?.name || `RXO_Settlement_${startDate}_${endDate}.xlsx`,
        importedAt: now,
        importedBy: "Master Admin",
        notes: `Imported for period ${startDate} to ${endDate}.`
      };

      const demoRoutes = [
        { routeId: "DMPEV__1589092-4_121", rxoPay: 804.75, stops: 29, miles: 152.8, market: "LMH Beltsville", date: startDate },
        { routeId: "DMPGAS__1585466-6_281", rxoPay: 293.59, stops: 6, miles: 88.1, market: "LMH Beltsville", date: startDate },
        { routeId: "LMH__BWI_02152026_A01_EV", rxoPay: 596.62, stops: 22, miles: 80.5, market: "LMH Beltsville", date: endDate },
        { routeId: "LMH__BWI_02172026_A07", rxoPay: 305.25, stops: 13, miles: 132.1, market: "LMH Beltsville", date: endDate }
      ];

      // Save Report Header
      setDocumentNonBlocking(reportRef, demoReport, { merge: true });

      // Save Summary Row
      addDocumentNonBlocking(collection(db, "rxoSettlementSummaryRows"), {
        reportId,
        companyName: "SYSTEM ORIENTED LLC",
        market: "LMH Beltsville",
        routeCount: 4,
        totalMiles: 452.7,
        totalStops: 70,
        totalPay: 1998.21,
        createdAt: now
      });

      // Save Route Details
      demoRoutes.forEach(demo => {
        const formulaRate = 27; 
        const sysEst = demo.stops * formulaRate;
        const delta = demo.rxoPay - sysEst;
        const detailId = `rd-${Date.now()}-${demo.routeId}`;

        const matchedInternal = routes.find(r => r.date === demo.date && (demo.routeId.includes(r.route) || r.route === "EV" && demo.routeId.startsWith("DMPEV")));

        setDocumentNonBlocking(doc(db, "rxoSettlementRouteDetails", detailId), {
          id: detailId,
          reportId,
          routeId: demo.routeId,
          market: demo.market,
          routeDate: demo.date,
          routeMiles: demo.miles,
          stopCount: demo.stops,
          rxoSettlementPay: demo.rxoPay,
          systemEstimatedPay: sysEst,
          delta,
          deltaStatus: delta < -50 ? 'RED' : 'GREEN',
          internalRouteId: matchedInternal?.id || null,
          matchStatus: matchedInternal ? 'Matched' : 'Unmatched',
          finalEstimatedPay: sysEst,
          createdAt: now
        }, { merge: true });
      });

      setTimeout(() => {
        setIsImporting(false);
        onImportComplete(reportId);
        toast({ title: "Import Successful", description: `${demoRoutes.length} routes processed for selected period.` });
        onClose();
      }, 1500);

    } catch (e) {
      console.error(e);
      setIsImporting(false);
      toast({ variant: "destructive", title: "Import Failed", description: "Could not process the settlement data." });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl rounded-[2.5rem] p-10 bg-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Import RXO Settlement</DialogTitle>
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
            className="p-12 border-2 border-dashed border-slate-100 rounded-[2rem] flex flex-col items-center justify-center gap-4 bg-slate-50/50 hover:bg-slate-50 transition-all cursor-pointer group"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="h-16 w-16 rounded-2xl bg-white shadow-sm flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors">
              <Upload className="h-8 w-8" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-slate-900">Upload RXO Settlement File</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Excel or CSV files accepted</p>
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept=".csv, .xlsx, .xls" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </div>

          {file && (
            <div className="flex items-center gap-4 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
              <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-emerald-500 shadow-sm"><FileText className="h-5 w-5" /></div>
              <div className="flex-1">
                <p className="text-xs font-black text-slate-900">{file.name}</p>
                <p className="text-[9px] font-bold text-emerald-600 uppercase">File Attached</p>
              </div>
            </div>
          )}

          <Alert className="rounded-2xl bg-blue-50 border-blue-100 text-blue-700">
            <Info className="h-4 w-4" />
            <AlertTitle className="text-[10px] font-black uppercase tracking-widest">Configuration Notice</AlertTitle>
            <AlertDescription className="text-[10px] font-medium leading-relaxed mt-1">
              Select the dates that match the RXO Settlement report period. This will overwrite any automatic detection to ensure your <strong>Review Week</strong> filter is accurate.
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
            {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <><CheckCircle2 className="mr-2 h-4 w-4" /> Process & Match Period</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
