
"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Upload, FileText, CheckCircle2, Loader2, Info, AlertTriangle } from "lucide-react";
import { RouteTrackerRow, FormulaSettings } from "@/app/lib/types";
import { evaluateFormula } from "@/app/lib/formula-evaluator";
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
  const db = useFirestore();
  const { toast } = useToast();

  const handleSimulateImport = async () => {
    setIsImporting(true);
    
    try {
      const reportId = `rxo-rep-${Date.now()}`;
      const now = new Date().toISOString();
      const reportRef = doc(db, "rxoSettlementReports", reportId);

      // Simulation Data Construction
      const demoReport = {
        id: reportId,
        payee: "SYSTEM ORIENTED LLC",
        companyName: "SYSTEM ORIENTED LLC",
        settlementPeriodStart: "2024-03-01",
        settlementPeriodEnd: "2024-03-07",
        anticipatedIssueDate: "2024-03-12",
        marketCount: 1,
        routeCount: 3,
        totalMiles: 420,
        totalStops: 82,
        rxoTotalPay: 2154.50,
        internalEstimatedTotalPay: 2214.00, // 82 stops * 27
        totalDelta: -59.50,
        fileName: file?.name || "RXO_Settlement_Week_9.xlsx",
        importedAt: now,
        importedBy: "Master Admin",
        notes: "Demo import data generated for operational preview."
      };

      const demoRoutes = [
        { routeId: "A01_EV", rxoPay: 729.00, stops: 27, miles: 68, market: "LMH Beltsville", date: "2024-03-04" },
        { routeId: "A02_GAS", rxoPay: 680.50, stops: 30, miles: 142, market: "LMH Beltsville", date: "2024-03-05" },
        { routeId: "A03_IKEA", rxoPay: 745.00, stops: 25, miles: 210, market: "LMH Beltsville", date: "2024-03-06" }
      ];

      // Save Report Header
      setDocumentNonBlocking(reportRef, demoReport, { merge: true });

      // Save Summary Row
      addDocumentNonBlocking(collection(db, "rxoSettlementSummaryRows"), {
        reportId,
        companyName: "SYSTEM ORIENTED LLC",
        market: "LMH Beltsville",
        routeCount: 3,
        totalMiles: 420,
        totalStops: 82,
        totalPay: 2154.50,
        createdAt: now
      });

      // Save Route Details & Order Details
      demoRoutes.forEach(demo => {
        const formulaRate = 27; // Fallback rate
        const sysEst = demo.stops * formulaRate;
        const delta = demo.rxoPay - sysEst;
        const detailId = `rd-${Date.now()}-${demo.routeId}`;

        // Find internal match
        const matchedInternal = routes.find(r => r.route === demo.routeId && r.date === demo.date);

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

        // Add dummy Order Details for the first route
        if (demo.routeId === "A01_EV") {
          for(let i=1; i<=3; i++) {
            addDocumentNonBlocking(collection(db, "rxoSettlementOrderDetails"), {
              reportId,
              routeId: demo.routeId,
              market: demo.market,
              jobNumber: `JOB-${demo.routeId}-${i}`,
              service: i === 1 ? "Standard Delivery" : "Threshold Delivery",
              completion: "Completed",
              completedOn: demo.date,
              rate: 243.00,
              mileage: 0,
              supplement: 0,
              createdAt: now
            });
          }
        }
      });

      setTimeout(() => {
        setIsImporting(false);
        onImportComplete(reportId);
        toast({ title: "Import Successful", description: `${demoRoutes.length} routes processed and audited.` });
        onClose();
      }, 1500);

    } catch (e) {
      console.error(e);
      setIsImporting(false);
      toast({ variant: "destructive", title: "Import Failed", description: "Could not parse the settlement file." });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl rounded-[2.5rem] p-10 bg-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Import RXO Settlement</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-8 mt-6">
          <div className="p-12 border-2 border-dashed border-slate-100 rounded-[2rem] flex flex-col items-center justify-center gap-4 bg-slate-50/50 hover:bg-slate-50 transition-all cursor-pointer group">
            <div className="h-16 w-16 rounded-2xl bg-white shadow-sm flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors">
              <Upload className="h-8 w-8" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-slate-900">Upload Settlement File</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Excel or CSV files accepted</p>
            </div>
            <Input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </div>

          {file && (
            <div className="flex items-center gap-4 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
              <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-emerald-500 shadow-sm"><FileText className="h-5 w-5" /></div>
              <div className="flex-1">
                <p className="text-xs font-black text-slate-900">{file.name}</p>
                <p className="text-[9px] font-bold text-emerald-600 uppercase">Ready for processing</p>
              </div>
            </div>
          )}

          <Alert className="rounded-2xl bg-blue-50 border-blue-100 text-blue-700">
            <Info className="h-4 w-4" />
            <AlertTitle className="text-[10px] font-black uppercase tracking-widest">Requirement Checklist</AlertTitle>
            <AlertDescription className="text-[10px] font-medium leading-relaxed mt-1">
              Ensure the file contains the <strong>Summary</strong>, <strong>Route Details</strong>, and <strong>Order Details</strong> tabs. The system will use your active <strong>Formula Settings</strong> to audit payouts.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="mt-10 gap-3">
          <Button variant="ghost" onClick={onClose} className="rounded-xl h-12 font-bold px-8">Cancel</Button>
          <Button 
            className="rounded-xl h-12 bg-slate-900 font-bold px-10 uppercase text-xs" 
            onClick={handleSimulateImport} 
            disabled={isImporting}
          >
            {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <><CheckCircle2 className="mr-2 h-4 w-4" /> Process Settlement</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
