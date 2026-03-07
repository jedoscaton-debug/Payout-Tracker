
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Employee, PayrollItem, PayrollRun } from "@/app/lib/types";
import { FileText, Receipt, Loader2 } from "lucide-react";
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase";
import { collectionGroup, query, where, collection } from "firebase/firestore";
import { computeTotals, currency, shortDate } from "@/app/lib/payroll-utils";
import { PaystubPreview } from "@/components/payroll/PaystubPreview";

interface MyPaystubsViewProps {
  employee: Employee | null;
}

export function MyPaystubsView({ employee }: MyPaystubsViewProps) {
  const [previewItem, setPreviewItem] = useState<PayrollItem | null>(null);
  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null);
  const db = useFirestore();
  const { user } = useUser();
  const userEmail = user?.email?.toLowerCase().trim();

  // Fetch all payroll items using email filter for security rules
  const itemsQuery = useMemoFirebase(() => 
    userEmail ? query(
      collectionGroup(db, "payrollItems"), 
      where("employeeEmailSnapshot", "==", userEmail)
    ) : null, 
    [db, userEmail]
  );
  const { data: paystubs, isLoading: itemsLoading } = useCollection<PayrollItem>(itemsQuery);

  const runsQuery = useMemoFirebase(() => collection(db, "payrollRuns"), [db]);
  const { data: runs, isLoading: runsLoading } = useCollection<PayrollRun>(runsQuery);

  const handlePreview = (item: PayrollItem) => {
    const run = (runs || []).find(r => r.id === item.payrollRunId);
    if (run) {
      setSelectedRun(run);
      setPreviewItem(item);
    }
  };

  const isLoading = itemsLoading || runsLoading;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">My Earnings Statements</h3>
        <p className="text-sm text-slate-500 font-medium">Historical earnings history and official paystubs.</p>
      </div>

      <Card className="rounded-[2.5rem] border-0 shadow-sm overflow-hidden bg-white">
        <CardHeader className="bg-slate-50/50 border-b p-8"><CardTitle className="text-[10px] font-black uppercase text-slate-400">Available Statements</CardTitle></CardHeader>
        <CardContent className="p-0">
          {isLoading ? <div className="p-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary/20" /></div> : (
            !paystubs?.length ? <div className="p-12 text-center text-slate-400 font-bold uppercase text-[10px]">No payroll records found</div> : (
              <div className="divide-y">
                {paystubs.map(item => {
                  const totals = computeTotals(item);
                  const run = (runs || []).find(r => r.id === item.payrollRunId);
                  return (
                    <div key={item.id} className="flex flex-col sm:flex-row items-center justify-between p-8 hover:bg-slate-50 gap-6">
                      <div className="flex items-center gap-6">
                        <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary"><Receipt className="h-6 w-6" /></div>
                        <div>
                          <p className="font-black text-slate-900 text-lg">Statement for {run?.payDate ? shortDate(run.payDate) : "Period"}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">
                            {run ? `${shortDate(run.payPeriodStart)} - ${shortDate(run.payPeriodEnd)}` : "Pending"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-10">
                        <div className="text-right"><p className="text-xl font-black">{currency(totals.netPay)}</p><p className="text-[10px] font-bold text-slate-400 uppercase">Net Amount</p></div>
                        <Button className="rounded-xl h-12 px-6 bg-slate-900 font-bold text-[10px] uppercase" onClick={() => handlePreview(item)}><FileText className="mr-2 h-4 w-4" /> View PDF</Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </CardContent>
      </Card>

      <Dialog open={!!previewItem} onOpenChange={(o) => !o && setPreviewItem(null)}>
        <DialogContent className="max-w-[850px] w-full p-0 border-none shadow-2xl bg-white rounded-[2.5rem] overflow-y-auto max-h-[95vh]">
          <DialogHeader className="sr-only">
            <DialogTitle>Paystub Preview</DialogTitle>
          </DialogHeader>
          {previewItem && selectedRun && <PaystubPreview item={previewItem} run={selectedRun} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
