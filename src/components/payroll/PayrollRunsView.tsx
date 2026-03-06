
"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Plus, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

import { 
  Employee, 
  RouteTrackerRow, 
  PayrollRun, 
  PayrollItem 
} from "@/app/lib/types";
import { 
  computeTotals, 
  currency 
} from "@/app/lib/payroll-utils";
import { createPayrollItem } from "@/app/lib/payroll-data-utils";

import { PaystubPreview } from "@/components/payroll/PaystubPreview";

interface PayrollRunsViewProps {
  payrollRun: PayrollRun;
  setPayrollRun: React.Dispatch<React.SetStateAction<PayrollRun>>;
  payrollItems: PayrollItem[];
  setPayrollItems: React.Dispatch<React.SetStateAction<PayrollItem[]>>;
  employees: Employee[];
  routeTracker: RouteTrackerRow[];
}

export function PayrollRunsView({ 
  payrollRun, 
  setPayrollRun, 
  payrollItems, 
  setPayrollItems,
  employees,
  routeTracker
}: PayrollRunsViewProps) {
  const [previewItem, setPreviewItem] = useState<PayrollItem | null>(null);

  const refreshFromRoutes = () => {
    setPayrollItems((current) =>
      current.map((item) => {
        const employee = employees.find((e) => e.id === item.employeeId);
        if (!employee) return item;
        const refreshed = createPayrollItem(employee, payrollRun, routeTracker);
        return {
          ...item,
          earningsLines: refreshed.earningsLines,
          deductionsLines: item.deductionsLines.length ? item.deductionsLines : refreshed.deductionsLines,
        };
      })
    );
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

  const addDeduction = (itemId: string) => {
    updateItem(itemId, (item) => {
      if (item.deductionsLines.length >= 4) return item;
      return {
        ...item,
        deductionsLines: [...item.deductionsLines, { id: Math.random().toString(36).substr(2, 9), deductionName: "", amount: 0, type: "Fixed" }],
      };
    });
  };

  const headers = [
    "Employee Name",
    "Daily Rate",
    "Earning Description",
    "Earning Amount",
    "Other Earning Description",
    "Other Earning Amount",
    "Deductions 1",
    "Amt 1",
    "Deductions 2",
    "Amt 2",
    "Deductions 3",
    "Amt 3",
    "Deductions 4",
    "Amt 4",
    "Total Deductions",
    "Total Earning",
    "Total Gross",
    "Pay Period",
    "Pay Date",
    "Actions"
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <Card className="rounded-[2.5rem] border-0 shadow-sm overflow-hidden bg-white">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
          <div className="flex items-center gap-2">
            <div className="h-6 w-1 bg-primary rounded-full" />
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Active Run Configuration</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-8">
          <div className="grid gap-8 md:grid-cols-4 items-end">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-1">Period Start</label>
              <Input className="h-12 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all font-medium" type="date" value={payrollRun.payPeriodStart} disabled={payrollRun.status === "Finalized"} onChange={(e) => setPayrollRun((current) => ({ ...current, payPeriodStart: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-1">Period End</label>
              <Input className="h-12 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all font-medium" type="date" value={payrollRun.payPeriodEnd} disabled={payrollRun.status === "Finalized"} onChange={(e) => setPayrollRun((current) => ({ ...current, payPeriodEnd: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-1">Pay Date</label>
              <Input className="h-12 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all font-medium" type="date" value={payrollRun.payDate} disabled={payrollRun.status === "Finalized"} onChange={(e) => setPayrollRun((current) => ({ ...current, payDate: e.target.value }))} />
            </div>
            <Button className="h-12 w-full rounded-2xl bg-primary/10 text-primary hover:bg-primary font-bold transition-all border-none" variant="outline" onClick={refreshFromRoutes} disabled={payrollRun.status === "Finalized"}>
              <RefreshCw className="mr-2 h-4 w-4" /> Sync Route Earnings
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[2.5rem] border-0 shadow-sm overflow-hidden bg-white">
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto relative">
            <div className="min-w-[2400px]">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50/80">
                    <th className="sticky left-0 z-30 bg-white border-b border-r border-slate-200 px-8 py-5 text-left text-[10px] font-black uppercase tracking-[0.15em] text-slate-900 whitespace-nowrap shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                      {headers[0]}
                    </th>
                    {headers.slice(1).map((header) => (
                      <th 
                        key={header} 
                        className="border-b border-slate-100 px-4 py-5 text-left text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 whitespace-nowrap"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payrollItems.map((item) => {
                    const totals = computeTotals(item);
                    const visibleDeductions = [...item.deductionsLines];
                    while (visibleDeductions.length < 4) {
                      visibleDeductions.push({ id: `blank-${visibleDeductions.length}`, deductionName: "", amount: 0, type: "Fixed" });
                    }

                    return (
                      <tr key={item.id} className="group hover:bg-slate-50/30 transition-all align-top">
                        <td className="sticky left-0 z-20 bg-white px-8 py-6 font-bold text-slate-900 whitespace-nowrap border-r border-slate-100 shadow-[2px_0_5px_rgba(0,0,0,0.05)] group-hover:bg-slate-50/80">
                          {item.employeeNameSnapshot}
                        </td>
                        <td className="px-4 py-6 text-sm text-slate-500 italic">{item.dailyRateSnapshot}</td>
                        <td className="px-4 py-6">
                          <div className="space-y-1 w-48">
                            {item.earningsLines.map((line, i) => (
                              <div key={i} className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-md border border-slate-100/50 truncate">
                                {line.description}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-6">
                          <div className="space-y-1">
                            {item.earningsLines.map((line, i) => (
                              <div key={i} className="text-[10px] font-black text-slate-900 bg-slate-50 px-2 py-1 rounded-md border border-slate-100/50">
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
                                value={line.description}
                                placeholder="Earning label..."
                                className="h-8 text-[11px] rounded-lg border-slate-100 font-medium"
                                onChange={(e) => updateItem(item.id, (c) => ({ ...c, otherEarningsLines: c.otherEarningsLines.map(x => x.id === line.id ? { ...x, description: e.target.value } : x) }))}
                                disabled={payrollRun.status === "Finalized"}
                              />
                            ))}
                            <Button variant="ghost" size="sm" className="h-6 rounded-lg text-[10px] font-bold text-primary hover:bg-primary/10" onClick={() => addOtherEarning(item.id)} disabled={payrollRun.status === "Finalized"}>
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
                                value={line.amount}
                                className="h-8 w-20 text-[11px] rounded-lg border-slate-100 font-black text-emerald-600"
                                onChange={(e) => updateItem(item.id, (c) => ({ ...c, otherEarningsLines: c.otherEarningsLines.map(x => x.id === line.id ? { ...x, amount: Number(e.target.value) } : x) }))}
                                disabled={payrollRun.status === "Finalized"}
                              />
                            ))}
                          </div>
                        </td>
                        {visibleDeductions.map((deduction, index) => (
                          <React.Fragment key={`${item.id}-${index}`}>
                            <td className="px-4 py-6">
                              <Input
                                value={deduction.deductionName}
                                placeholder={`Deduction ${index + 1}`}
                                className="h-8 w-32 text-[11px] rounded-lg border-slate-100"
                                disabled={payrollRun.status === "Finalized" || !item.deductionsLines[index] || deduction.deductionName === "Direct Deposit Fee"}
                                onChange={(e) => updateItem(item.id, (c) => ({ ...c, deductionsLines: c.deductionsLines.map((x, i) => i === index ? { ...x, deductionName: e.target.value } : x) }))}
                              />
                            </td>
                            <td className="px-4 py-6">
                              <Input
                                type="number"
                                value={deduction.amount}
                                className="h-8 w-20 text-[11px] rounded-lg border-slate-100 font-black text-rose-500"
                                disabled={payrollRun.status === "Finalized" || !item.deductionsLines[index] || deduction.deductionName === "Direct Deposit Fee"}
                                onChange={(e) => updateItem(item.id, (c) => ({ ...c, deductionsLines: c.deductionsLines.map((x, i) => i === index ? { ...x, amount: Number(e.target.value) } : x) }))}
                              />
                            </td>
                          </React.Fragment>
                        ))}
                        <td className="px-4 py-6 font-black text-rose-600 text-xs">{currency(totals.totalDeductions)}</td>
                        <td className="px-4 py-6 font-black text-slate-900 text-xs">{currency(totals.totalEarnings)}</td>
                        <td className="px-4 py-6">
                          <div className="bg-primary text-white rounded-xl px-4 py-2 font-black text-xs shadow-lg shadow-primary/20">
                            {currency(totals.grossPay)}
                          </div>
                        </td>
                        <td className="px-4 py-6 text-[10px] font-bold text-slate-400 whitespace-nowrap">
                          {shortDate(payrollRun.payPeriodStart)} - {shortDate(payrollRun.payPeriodEnd)}
                        </td>
                        <td className="px-4 py-6 text-[10px] font-bold text-slate-400 whitespace-nowrap">
                          {payrollRun.payDate}
                        </td>
                        <td className="px-4 py-6">
                          <div className="flex flex-col gap-2">
                            <Button size="sm" variant="outline" className="rounded-xl h-10 border-slate-200 font-bold text-[10px] uppercase tracking-wider hover:bg-slate-50 text-slate-600" onClick={() => setPreviewItem(item)}>
                              <FileText className="mr-2 h-3 w-3" /> Preview
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 rounded-xl font-bold text-[9px] uppercase tracking-wider text-slate-400 hover:text-primary" onClick={() => addDeduction(item.id)} disabled={payrollRun.status === "Finalized" || item.deductionsLines.length >= 4}>
                              <Plus className="mr-1 h-3 w-3" /> Add Deduction
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!previewItem} onOpenChange={(open) => !open && setPreviewItem(null)}>
        <DialogContent className="max-w-[850px] w-full p-0 border-none shadow-2xl bg-white overflow-y-auto max-h-[95vh] rounded-[2.5rem]">
          <DialogHeader className="p-0 h-0 overflow-hidden">
            <DialogTitle className="sr-only">Paystub Preview</DialogTitle>
          </DialogHeader>
          {previewItem && (
            <PaystubPreview item={previewItem} run={payrollRun} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
