"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Employee, PayrollItem, PayrollRun } from "@/app/lib/types";
import { FileText, Download, Calendar, Search } from "lucide-react";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collectionGroup, query, where, collection } from "firebase/firestore";
import { computeTotals, currency, shortDate } from "@/app/lib/payroll-utils";
import { PaystubPreview } from "@/components/payroll/PaystubPreview";

interface MyPaystubsViewProps {
  employee: Employee;
}

export function MyPaystubsView({ employee }: MyPaystubsViewProps) {
  const [previewItem, setPreviewItem] = useState<PayrollItem | null>(null);
  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null);
  const db = useFirestore();

  // Fetch all payroll items across all runs for this employee
  const itemsQuery = useMemoFirebase(() => 
    query(collectionGroup(db, "payrollItems"), where("employeeId", "==", employee.id)), 
    [db, employee.id]
  );
  const { data: paystubs, isLoading } = useCollection<PayrollItem>(itemsQuery);

  // Fetch all payroll runs to associate dates
  const runsQuery = useMemoFirebase(() => collection(db, "payrollRuns"), [db]);
  const { data: runs } = useCollection<PayrollRun>(runsQuery);

  const handlePreview = (item: PayrollItem) => {
    const run = (runs || []).find(r => r.id === item.payrollRunId);
    if (run) {
      setSelectedRun(run);
      setPreviewItem(item);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">My Earnings Statement</h3>
        <p className="text-sm text-slate-500 font-medium">Access your official paystubs and historical earnings history.</p>
      </div>

      <div className="grid gap-6">
        <Card className="rounded-[2.5rem] border-0 shadow-sm overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Available Statements</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-12 flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-slate-200" />
              </div>
            ) : !paystubs || paystubs.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">No payroll records found yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {paystubs.map((item) => {
                  const totals = computeTotals(item);
                  const run = (runs || []).find(r => r.id === item.payrollRunId);
                  
                  return (
                    <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-8 hover:bg-slate-50 transition-colors gap-6">
                      <div className="flex items-center gap-6">
                        <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                          <Receipt className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="font-black text-slate-900 text-lg">Statement for {run?.payDate ? shortDate(run.payDate) : "Period"}</p>
                          <div className="flex items-center gap-4 mt-1">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em]">
                              {run ? `${shortDate(run.payPeriodStart)} - ${shortDate(run.payPeriodEnd)}` : "Pending Run"}
                            </p>
                            <div className="h-1 w-1 rounded-full bg-slate-300" />
                            <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-[0.1em]">{item.dailyRateSnapshot} Basis</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-10">
                        <div className="text-right">
                          <p className="text-xl font-black text-slate-900 leading-none">{currency(totals.netPay)}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Take-Home Amount</p>
                        </div>
                        <Button 
                          className="rounded-xl h-12 px-6 bg-slate-900 text-white font-bold text-[10px] uppercase tracking-wider hover:bg-black shadow-lg shadow-slate-900/10"
                          onClick={() => handlePreview(item)}
                        >
                          <FileText className="mr-2 h-4 w-4" /> View Detailed Statement
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!previewItem} onOpenChange={(open) => !open && setPreviewItem(null)}>
        <DialogContent className="max-w-[850px] w-full p-0 border-none shadow-2xl bg-white overflow-y-auto max-h-[95vh] rounded-[2.5rem]">
          <DialogHeader className="sr-only">
            <DialogTitle>Paystub Statement Preview</DialogTitle>
          </DialogHeader>
          {previewItem && selectedRun && (
            <PaystubPreview item={previewItem} run={selectedRun} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { Loader2 } from "lucide-react";