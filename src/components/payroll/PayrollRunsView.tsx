
"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Plus, 
  RefreshCw, 
  ShieldAlert, 
  CheckCircle2, 
  Lock, 
  History,
  ChevronDown,
  Loader2,
  Save,
  Trash2,
  CalendarDays
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useCollection, useMemoFirebase, setDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase";
import { doc, collection, query, orderBy, limit } from "firebase/firestore";

import { 
  Employee, 
  RouteTrackerRow, 
  PayrollRun, 
  PayrollItem,
  DeductionRecord,
  FormulaSettings
} from "@/app/lib/types";
import { 
  computeTotals, 
  currency,
  shortDate 
} from "@/app/lib/payroll-utils";
import { createPayrollItem, createNewPayrollRun } from "@/app/lib/payroll-data-utils";

import { PaystubPreview } from "@/components/payroll/PaystubPreview";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

interface PayrollRunsViewProps {
  payrollRun: PayrollRun;
  setPayrollRun: React.Dispatch<React.SetStateAction<PayrollRun>>;
  payrollItems: PayrollItem[];
  setPayrollItems: React.Dispatch<React.SetStateAction<PayrollItem[]>>;
  employees: Employee[];
  routeTracker: RouteTrackerRow[];
  deductions: DeductionRecord[];
  settings?: FormulaSettings;
}

export function PayrollRunsView({ 
  payrollRun, 
  setPayrollRun, 
  payrollItems, 
  setPayrollItems,
  employees,
  routeTracker,
  deductions,
  settings
}: PayrollRunsViewProps) {
  const [previewItem, setPreviewItem] = useState<PayrollItem | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const { toast } = useToast();
  const db = useFirestore();

  const runsQuery = useMemoFirebase(() => query(collection(db, "payrollRuns"), orderBy("payDate", "desc"), limit(10)), [db]);
  const { data: pastRuns } = useCollection<PayrollRun>(runsQuery);

  const handlePeriodStartChange = (val: string) => {
    if (!val) return;
    const start = new Date(`${val}T12:00:00`);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const pay = new Date(end);
    pay.setDate(end.getDate() + 6);

    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    setPayrollRun(prev => ({
      ...prev,
      payPeriodStart: val,
      payPeriodEnd: formatDate(end),
      payDate: formatDate(pay)
    }));
  };

  const handlePeriodEndChange = (val: string) => {
    if (!val) return;
    const end = new Date(`${val}T12:00:00`);
    const pay = new Date(end);
    pay.setDate(end.getDate() + 6);

    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    setPayrollRun(prev => ({
      ...prev,
      payPeriodEnd: val,
      payDate: formatDate(pay)
    }));
  };

  const refreshFromRoutes = () => {
    if (payrollRun.status === "Finalized") return;
    setPayrollItems((current) =>
      current.map((item) => {
        const employee = employees.find((e) => e.id === item.employeeId);
        if (!employee) return item;
        const refreshed = createPayrollItem(employee, payrollRun, routeTracker, deductions, settings);
        return {
          ...item,
          earningsLines: refreshed.earningsLines,
          deductionsLines: refreshed.deductionsLines,
        };
      })
    );
    toast({ title: "Sync Complete", description: "Routes and auto-deductions updated." });
  };

  const handleFinalize = async () => {
    if (payrollRun.status === "Finalized" || isFinalizing) return;
    
    setIsFinalizing(true);
    try {
      const runId = payrollRun.id;
      const finalizedRun: PayrollRun = { ...payrollRun, status: "Finalized" };
      
      setDocumentNonBlocking(doc(db, "payrollRuns", runId), finalizedRun, { merge: true });

      payrollItems.forEach(item => {
        const itemWithSnapshot = {
          ...item,
          payDateSnapshot: finalizedRun.payDate,
          payPeriodStartSnapshot: finalizedRun.payPeriodStart,
          payPeriodEndSnapshot: finalizedRun.payPeriodEnd,
          payrollRunId: runId
        };
        setDocumentNonBlocking(doc(db, "payrollRuns", runId, "payrollItems", item.id), itemWithSnapshot, { merge: true });

        item.deductionsLines.forEach(line => {
          if (line.originalDeductionId) {
            const original = deductions.find(d => d.id === line.originalDeductionId);
            if (original) {
              const newPaidCount = (original.installmentsPaid || 0) + 1;
              const newBalance = Math.max(0, (original.remainingBalance || 0) - line.amount);
              const isFinished = original.type === "Installment" && newBalance <= 0;
              
              updateDocumentNonBlocking(doc(db, "deductions", original.id), {
                installmentsPaid: newPaidCount,
                remainingBalance: newBalance,
                status: isFinished ? "Completed" : original.status,
                lastAppliedPayDate: finalizedRun.payDate
              });
            }
          }
        });
      });

      setPayrollRun(finalizedRun);
      toast({ title: "Payroll Finalized" });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Finalization Failed" });
    } finally {
      setIsFinalizing(false);
    }
  };

  const startNewRun = () => {
    setPayrollRun(createNewPayrollRun());
    setPayrollItems([]);
    toast({ title: "New Draft Initialized" });
  };

  const loadPastRun = (run: PayrollRun) => {
    setPayrollRun(run);
    toast({ title: `Loaded Run: ${shortDate(run.payPeriodStart)}` });
  };

  const handleDeleteRun = (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this payroll record?")) return;
    deleteDocumentNonBlocking(doc(db, "payrollRuns", id));
    toast({ title: "Record Deleted" });
    if (payrollRun.id === id) {
      startNewRun();
    }
  };

  const updateItem = (itemId: string, updater: (item: PayrollItem) => PayrollItem) => {
    if (payrollRun.status === "Finalized") return;
    setPayrollItems((current) => current.map((item) => (item.id === itemId ? updater(item) : item)));
  };

  const addOtherEarning = (itemId: string) => {
    updateItem(itemId, (item) => ({
      ...item,
      otherEarningsLines: [...item.otherEarningsLines, { id: Math.random().toString(36).substr(2, 9), description: "", amount: 0 }],
    }));
  };

  const headers = [
    "Employee Name",
    "Daily Rate",
    "Earning Description",
    "Earning Amount",
    "Other Earning Description",
    "Other Earning Amount",
    "Deductions Breakdown",
    "Deduction Total",
    "Total Gross",
    "Net Pay",
    "Pay Period",
    "Pay Date",
    "Actions"
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-primary shadow-sm">
            <History className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">Weekly Payroll Run</h3>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className={cn(
                "text-[10px] font-black uppercase px-3 py-1",
                payrollRun.status === "Finalized" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-blue-50 text-blue-600 border-blue-100"
              )}>
                {payrollRun.status === "Finalized" ? <Lock className="h-3 w-3 mr-1.5" /> : <CheckCircle2 className="h-3 w-3 mr-1.5" />}
                {payrollRun.status} RUN
              </Badge>
              <span className="text-[10px] font-bold text-slate-400 uppercase">ID: {payrollRun.id.split('-').pop()}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="rounded-xl h-11 bg-white font-bold border-slate-200">
                <History className="mr-2 h-4 w-4" /> Run History <ChevronDown className="ml-2 h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72 rounded-xl p-2">
              <p className="text-[9px] font-black uppercase text-slate-400 p-2 tracking-widest">Recent Saved Runs</p>
              {pastRuns?.map(r => (
                <div key={r.id} className="flex items-center gap-1 group px-1">
                  <DropdownMenuItem 
                    onClick={() => loadPastRun(r)} 
                    className={cn(
                      "flex-1 rounded-lg py-3 cursor-pointer transition-colors", 
                      payrollRun.id === r.id ? "bg-primary text-white hover:bg-primary/90" : "hover:bg-slate-50"
                    )}
                  >
                    <div className="space-y-0.5">
                      <p className={cn("font-bold text-xs", payrollRun.id === r.id ? "text-white" : "text-slate-900")}>Week of {shortDate(r.payPeriodStart)}</p>
                      <p className={cn("text-[10px] uppercase", payrollRun.id === r.id ? "text-white/70" : "text-slate-400")}>Paid: {r.payDate}</p>
                    </div>
                  </DropdownMenuItem>
                  <div 
                    className="h-10 w-10 flex items-center justify-center text-slate-300 hover:text-rose-500 cursor-pointer rounded-lg hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDeleteRun(r.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </div>
                </div>
              ))}
              <DropdownMenuItem onClick={startNewRun} className="rounded-lg py-3 mt-2 border-t text-primary font-bold">
                <Plus className="mr-2 h-4 w-4" /> Start Fresh Run
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {payrollRun.status !== "Finalized" && (
            <Button 
              className="rounded-xl h-11 bg-slate-900 px-8 font-bold shadow-xl shadow-slate-200 transition-all hover:-translate-y-0.5"
              onClick={handleFinalize}
              disabled={isFinalizing}
            >
              {isFinalizing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Finalize & Complete Run
            </Button>
          )}
        </div>
      </div>

      <Card className="rounded-[2.5rem] border-0 shadow-sm overflow-hidden bg-white">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Schedule Configuration</CardTitle>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" className="h-10 rounded-xl bg-white border-slate-200 font-bold" onClick={refreshFromRoutes} disabled={payrollRun.status === "Finalized"}>
                <RefreshCw className="mr-2 h-4 w-4" /> Sync Claims & Routes
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8">
          <div className="grid gap-8 md:grid-cols-3">
            <div className="space-y-3">
              <div className="flex flex-col">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-1">Period Start</label>
                <span className="text-[8px] font-black text-primary uppercase px-1">Sunday</span>
              </div>
              <Input className="h-12 rounded-2xl bg-slate-50/50" type="date" value={payrollRun.payPeriodStart || ""} disabled={payrollRun.status === "Finalized"} onChange={(e) => handlePeriodStartChange(e.target.value)} />
            </div>
            <div className="space-y-3">
              <div className="flex flex-col">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-1">Period End</label>
                <span className="text-[8px] font-black text-primary uppercase px-1">Saturday</span>
              </div>
              <Input className="h-12 rounded-2xl bg-slate-50/50" type="date" value={payrollRun.payPeriodEnd || ""} disabled={payrollRun.status === "Finalized"} onChange={(e) => handlePeriodEndChange(e.target.value)} />
            </div>
            <div className="space-y-3">
              <div className="flex flex-col">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-1">Pay Date</label>
                <span className="text-[8px] font-black text-emerald-600 uppercase px-1">Following Friday</span>
              </div>
              <Input className="h-12 rounded-2xl bg-slate-50/50 border-emerald-100 bg-emerald-50/20" type="date" value={payrollRun.payDate || ""} disabled={payrollRun.status === "Finalized"} onChange={(e) => setPayrollRun((current) => ({ ...current, payDate: e.target.value }))} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[2.5rem] border-0 shadow-sm overflow-hidden bg-white">
        <CardContent className="p-0">
          <ScrollArea className="w-full">
            <div className="min-w-[2200px] pb-6">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50/80">
                    <th className="sticky left-0 z-30 bg-white border-b border-r border-slate-200 px-8 py-5 text-left text-[10px] font-black uppercase tracking-[0.15em] text-slate-900 whitespace-nowrap shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                      {headers[0]}
                    </th>
                    {headers.slice(1).map((header) => (
                      <th key={header} className="border-b border-slate-100 px-4 py-5 text-left text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 whitespace-nowrap">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payrollItems.map((item) => {
                    const totals = computeTotals(item);
                    const isLocked = payrollRun.status === "Finalized";
                    return (
                      <tr key={item.id} className="group hover:bg-slate-50/30 transition-all align-top">
                        <td className="sticky left-0 z-20 bg-white px-8 py-6 font-bold text-slate-900 whitespace-nowrap border-r border-slate-100 shadow-[2px_0_5px_rgba(0,0,0,0.05)] group-hover:bg-slate-50/80">
                          {item.employeeNameSnapshot || ""}
                        </td>
                        <td className="px-4 py-6 text-sm text-slate-500 italic whitespace-nowrap">{item.dailyRateSnapshot || ""}</td>
                        <td className="px-4 py-6">
                          <div className="space-y-1 w-48">
                            {item.earningsLines.map((line, i) => (
                              <div key={i} className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-md border border-slate-100/50 truncate">
                                {line.description || ""}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-6">
                          <div className="space-y-1">
                            {item.earningsLines.map((line, i) => (
                              <div key={i} className="text-[10px] font-black text-slate-900 bg-slate-50 px-2 py-1 rounded-md">
                                {currency(line.amount)}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-6">
                          <div className="space-y-2 w-48">
                            {item.otherEarningsLines.map((line) => (
                              <Input
                                key={line.id}
                                value={line.description || ""}
                                placeholder="Earning label..."
                                className="h-8 text-[11px] rounded-lg"
                                onChange={(e) => updateItem(item.id, (c) => ({ ...c, otherEarningsLines: c.otherEarningsLines.map(x => x.id === line.id ? { ...x, description: e.target.value } : x) }))}
                                disabled={isLocked}
                              />
                            ))}
                            <Button variant="ghost" size="sm" className="h-6 rounded-lg text-[10px] font-bold text-primary hover:bg-primary/10" onClick={() => addOtherEarning(item.id)} disabled={isLocked}>
                              <Plus className="mr-1 h-3 w-3" /> Add Other
                            </Button>
                          </div>
                        </td>
                        <td className="px-4 py-6">
                          <div className="space-y-2">
                            {item.otherEarningsLines.map((line) => (
                              <Input
                                key={line.id}
                                type="number"
                                value={line.amount || 0}
                                className="h-8 w-20 text-[11px] font-black text-emerald-600"
                                onChange={(e) => updateItem(item.id, (c) => ({ ...c, otherEarningsLines: c.otherEarningsLines.map(x => x.id === line.id ? { ...x, amount: Number(e.target.value) } : x) }))}
                                disabled={isLocked}
                              />
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-6">
                          <div className="space-y-1 w-48">
                            {item.deductionsLines.map((line, i) => (
                              <div key={i} className="flex items-center justify-between text-[10px] bg-slate-50 px-2 py-1 rounded-md">
                                <span className="font-bold text-slate-400">{line.deductionName}</span>
                                <span className="font-black text-rose-500">{currency(line.amount)}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-6 font-black text-rose-600 text-xs">{currency(totals.totalDeductions)}</td>
                        <td className="px-4 py-6 font-black text-slate-900 text-xs">{currency(totals.grossPay)}</td>
                        <td className="px-4 py-6">
                          <div className={cn("rounded-xl px-4 py-2 font-black text-xs shadow-lg", totals.netPay < 0 ? "bg-rose-600 text-white shadow-rose-200" : "bg-primary text-white shadow-primary/20")}>
                            {currency(totals.netPay)}
                          </div>
                          {totals.netPay < 0 && (
                            <div className="flex items-center gap-1 mt-2 text-rose-500 text-[8px] font-black uppercase">
                              <ShieldAlert className="h-3 w-3" /> Negative Net Pay
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-6 text-[10px] font-bold text-slate-400 whitespace-nowrap">
                          {shortDate(payrollRun.payPeriodStart)} - {shortDate(payrollRun.payPeriodEnd)}
                        </td>
                        <td className="px-4 py-6 text-[10px] font-bold text-slate-400 whitespace-nowrap">
                          {payrollRun.payDate || ""}
                        </td>
                        <td className="px-4 py-6">
                          <Button size="sm" variant="outline" className="rounded-xl h-10 border-slate-200 font-bold text-[10px] uppercase tracking-wider hover:bg-slate-50 text-slate-600" onClick={() => setPreviewItem(item)}>
                            <FileText className="mr-2 h-3 w-3" /> Preview
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={!!previewItem} onOpenChange={(open) => !open && setPreviewItem(null)}>
        <DialogContent className="max-w-[850px] w-full p-0 border-none shadow-2xl bg-white overflow-y-auto max-h-[95vh] rounded-[2.5rem]">
          <DialogHeader className="sr-only">
            <DialogTitle>Paystub Preview</DialogTitle>
          </DialogHeader>
          {previewItem && (
            <PaystubPreview item={previewItem} run={payrollRun} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
