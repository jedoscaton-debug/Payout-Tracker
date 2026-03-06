
"use client";

import React, { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { FileText, Lock, Plus, RefreshCw, Download, Settings2, Sparkles } from "lucide-react";

import { 
  Employee, 
  RouteTrackerRow, 
  PayrollRun, 
  PayrollItem 
} from "@/app/lib/types";
import { 
  autoBuildEarnings, 
  computeTotals, 
  currency, 
  shortDate, 
  estimatePay, 
  estimateFuel, 
  driverPay, 
  helperPay,
  DIRECT_DEPOSIT_FEE
} from "@/app/lib/payroll-utils";

import { PayrollSummaryCards } from "@/components/payroll/PayrollSummaryCards";
import { PaystubPreview } from "@/components/payroll/PaystubPreview";
import { NoteSummarizer } from "@/components/payroll/NoteSummarizer";

const employeesSeed: Employee[] = [
  { id: "emp-1", fullName: "Jose Nolasco", defaultDailyRate: "Varies", paymentMethod: "Direct Deposit" },
  { id: "emp-2", fullName: "Geovani", defaultDailyRate: "Varies", paymentMethod: "Direct Deposit" },
  { id: "emp-3", fullName: "Steven Howard", defaultDailyRate: "Varies", paymentMethod: "Direct Deposit" },
  { id: "emp-4", fullName: "Labrinkley Marshall", defaultDailyRate: "Varies", paymentMethod: "Direct Deposit" },
  { id: "emp-5", fullName: "Dominique Roche", defaultDailyRate: "Varies", paymentMethod: "Direct Deposit" },
  { id: "emp-6", fullName: "Diego Guevara", defaultDailyRate: "Varies", paymentMethod: "Direct Deposit" },
  { id: "emp-7", fullName: "Edildo Geovani Morataya", defaultDailyRate: "Varies", paymentMethod: "Direct Deposit" },
];

const routeTrackerSeed: RouteTrackerRow[] = [
  { id: "rt-1", date: "2026-02-22", client: "IKEA", miles: 104, stops: 23, driver: "Steven Howard", helper: "Labrinkley Marshall" },
  { id: "rt-2", date: "2026-02-23", client: "IKEA", miles: 179, stops: 10, driver: "Labrinkley Marshall", helper: "Steven Howard" },
  { id: "rt-3", date: "2026-02-23", client: "IKEA", miles: 0, stops: 16, driver: "Jose Nolasco", helper: "Geovani" },
  { id: "rt-4", date: "2026-02-24", client: "IKEA", miles: 0, stops: 18, driver: "Jose Nolasco", helper: "Geovani" },
  { id: "rt-5", date: "2026-02-25", client: "IKEA", miles: 222, stops: 13, driver: "Labrinkley Marshall", helper: "Dominique Roche" },
  { id: "rt-6", date: "2026-02-25", client: "IKEA", miles: 0, stops: 9, driver: "Jose Nolasco", helper: "Geovani" },
  { id: "rt-7", date: "2026-02-26", client: "IKEA", miles: 157, stops: 14, driver: "Steven Howard", helper: "Dominique Roche" },
  { id: "rt-8", date: "2026-02-26", client: "IKEA", miles: 77, stops: 16, driver: "Labrinkley Marshall", helper: "Labrinkley Marshall" },
  { id: "rt-9", date: "2026-02-26", client: "IKEA", miles: 0, stops: 12, driver: "Geovani", helper: "Diego Guevara" },
  { id: "rt-10", date: "2026-02-27", client: "IKEA", miles: 59, stops: 15, driver: "Steven Howard", helper: "Steven Howard" },
  { id: "rt-11", date: "2026-02-27", client: "IKEA", miles: 110, stops: 16, driver: "Labrinkley Marshall", helper: "Dominique Roche" },
  { id: "rt-12", date: "2026-02-27", client: "IKEA", miles: 0, stops: 18, driver: "Jose Nolasco", helper: "Geovani" },
  { id: "rt-13", date: "2026-02-28", client: "IKEA", miles: 0, stops: 13, driver: "Jose Nolasco", helper: "Geovani" },
];

const initialPayrollRun: PayrollRun = {
  id: "run-1",
  payPeriodStart: "2026-02-22",
  payPeriodEnd: "2026-02-28",
  payDate: "2026-03-06",
  status: "Draft",
};

function createPayrollItem(employee: Employee, payrollRun: PayrollRun, routes: RouteTrackerRow[]): PayrollItem {
  const earningsLines = autoBuildEarnings(employee, payrollRun, routes);
  return {
    id: `${payrollRun.id}-${employee.id}`,
    payrollRunId: payrollRun.id,
    employeeId: employee.id,
    employeeNameSnapshot: employee.fullName,
    dailyRateSnapshot: employee.defaultDailyRate,
    notes: "",
    earningsLines,
    otherEarningsLines: [],
    deductionsLines: [
      { id: `${employee.id}-dd-fee`, deductionName: "Direct Deposit Fee", amount: DIRECT_DEPOSIT_FEE, type: "Fixed" },
    ],
  };
}

export default function EmployeePayoutTrackerApp() {
  const [employees] = useState<Employee[]>(employeesSeed);
  const [routeTracker] = useState<RouteTrackerRow[]>(routeTrackerSeed);
  const [payrollRun, setPayrollRun] = useState<PayrollRun>(initialPayrollRun);
  const [payrollItems, setPayrollItems] = useState<PayrollItem[]>([]);
  const [previewItem, setPreviewItem] = useState<PayrollItem | null>(null);

  useEffect(() => {
    setPayrollItems(employees.map(e => createPayrollItem(e, initialPayrollRun, routeTrackerSeed)));
  }, [employees]);

  const payrollSummary = useMemo(() => {
    const totals = payrollItems.map(computeTotals);
    return {
      employees: payrollItems.length,
      gross: totals.reduce((sum, t) => sum + t.grossPay, 0),
      deductions: totals.reduce((sum, t) => sum + t.totalDeductions, 0),
      net: totals.reduce((sum, t) => sum + t.netPay, 0),
    };
  }, [payrollItems]);

  const refreshFromRoutes = () => {
    setPayrollItems((current) =>
      current.map((item) => {
        const employee = employees.find((e) => e.id === item.employeeId)!;
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

  const finalizeRun = () => {
    const hasNegative = payrollItems.some((item) => computeTotals(item).netPay < 0);
    if (hasNegative) {
      if (!confirm("One or more employees have negative net pay. Finalize anyway?")) return;
    }
    setPayrollRun((current) => ({ ...current, status: "Finalized" }));
  };

  const exportCsv = () => {
    const rows = [
      ["Employee", "Pay Period", "Pay Date", "Gross", "Deductions", "Net"],
      ...payrollItems.map((item) => {
        const totals = computeTotals(item);
        return [
          item.employeeNameSnapshot,
          `${payrollRun.payPeriodStart} to ${payrollRun.payPeriodEnd}`,
          payrollRun.payDate,
          totals.grossPay.toFixed(2),
          totals.totalDeductions.toFixed(2),
          totals.netPay.toFixed(2),
        ];
      }),
    ];
    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `payroll_run_${payrollRun.payDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="mx-auto max-w-[1800px] space-y-8">
        
        {/* Header */}
        <div className="flex flex-col gap-6 rounded-[2.5rem] bg-white p-8 shadow-sm lg:flex-row lg:items-center lg:justify-between border border-slate-200/50">
          <div className="flex items-center gap-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary text-white shadow-xl shadow-primary/20">
              <Settings2 className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tighter text-slate-900 uppercase">Payout Tracker</h1>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-sm font-semibold text-slate-500 tracking-wide uppercase">SYSTEM ORIENTED LLC</p>
                <Badge variant="outline" className="rounded-full border-slate-200 text-slate-400 font-bold px-2 py-0.5 text-[10px]">UPPER MARLBORO, MD</Badge>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={payrollRun.status === "Draft" ? "secondary" : "default"} className={`rounded-full px-5 py-2 font-bold tracking-widest text-xs uppercase ${payrollRun.status === 'Draft' ? 'bg-slate-100 text-slate-600' : 'bg-accent text-white'}`}>
              {payrollRun.status}
            </Badge>
            <div className="h-10 w-px bg-slate-100 mx-2" />
            <Button variant="outline" className="rounded-2xl h-12 border-slate-200 hover:bg-slate-50 font-bold text-slate-600 px-6 shadow-sm" onClick={exportCsv}>
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
            <Button className="rounded-2xl h-12 bg-accent hover:bg-accent/90 text-white font-bold px-8 shadow-lg shadow-accent/20 transition-all hover:-translate-y-0.5" onClick={finalizeRun} disabled={payrollRun.status === "Finalized"}>
              <Lock className="mr-2 h-4 w-4" /> Finalize Run
            </Button>
          </div>
        </div>

        {/* Stats */}
        <PayrollSummaryCards summary={payrollSummary} />

        {/* Pay Period Configuration */}
        <Card className="rounded-[2.5rem] border-0 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
            <div className="flex items-center gap-2">
              <div className="h-6 w-1 bg-primary rounded-full" />
              <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-400">Payroll Period Configuration</CardTitle>
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
                <RefreshCw className="mr-2 h-4 w-4" /> Rebuild All Earnings
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Main Tabs */}
        <Tabs defaultValue="tracker" className="space-y-6">
          <TabsList className="flex w-fit rounded-3xl bg-white p-1 shadow-sm border border-slate-100">
            <TabsTrigger value="tracker" className="rounded-[1.25rem] px-8 py-3 data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg font-bold transition-all uppercase tracking-widest text-[10px]">Employee Tracker</TabsTrigger>
            <TabsTrigger value="routeTracker" className="rounded-[1.25rem] px-8 py-3 data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg font-bold transition-all uppercase tracking-widest text-[10px]">Route Source</TabsTrigger>
          </TabsList>

          <TabsContent value="tracker" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <Card className="rounded-[2.5rem] border-0 shadow-sm overflow-hidden">
              <CardContent className="p-0">
                <ScrollArea className="w-full">
                  <div className="min-w-[2000px] overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-slate-50/80">
                          {[
                            "Employee",
                            "Daily Rate",
                            "Earnings Breakdown",
                            "Earning Amount",
                            "Other Earnings",
                            "Other Amount",
                            "Deduction 1",
                            "Amt 1",
                            "Deduction 2",
                            "Amt 2",
                            "Deduction 3",
                            "Amt 3",
                            "Deduction 4",
                            "Amt 4",
                            "Net Total",
                            "Notes",
                            "Actions",
                          ].map((header) => (
                            <th key={header} className="border-b border-slate-100 px-4 py-5 text-left text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 whitespace-nowrap">
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
                              <td className="px-4 py-6 font-bold text-slate-900 whitespace-nowrap">{item.employeeNameSnapshot}</td>
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
                                      placeholder="Other earning..."
                                      className="h-8 text-[11px] rounded-lg border-slate-100 font-medium"
                                      onChange={(e) => updateItem(item.id, (c) => ({ ...c, otherEarningsLines: c.otherEarningsLines.map(x => x.id === line.id ? { ...x, description: e.target.value } : x) }))}
                                      disabled={payrollRun.status === "Finalized"}
                                    />
                                  ))}
                                  <Button variant="ghost" size="sm" className="h-6 rounded-lg text-[10px] font-bold text-primary hover:bg-primary/10" onClick={() => addOtherEarning(item.id)} disabled={payrollRun.status === "Finalized"}>
                                    <Plus className="mr-1 h-3 w-3" /> Add Item
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
                              <td className="px-4 py-6">
                                <div className="bg-indigo-600 text-white rounded-xl px-4 py-2 font-black text-xs shadow-lg shadow-indigo-200">
                                  {currency(totals.netPay)}
                                </div>
                              </td>
                              <td className="px-4 py-6">
                                <div className="space-y-3">
                                  <Textarea
                                    className="h-20 w-64 rounded-2xl border-slate-100 bg-slate-50/30 text-[11px] font-medium p-3 resize-none focus:bg-white"
                                    value={item.notes}
                                    placeholder="Employee specific instructions..."
                                    onChange={(e) => updateItem(item.id, (c) => ({ ...c, notes: e.target.value }))}
                                    disabled={payrollRun.status === "Finalized"}
                                  />
                                  <NoteSummarizer 
                                    notes={item.notes} 
                                    onSummarized={(s) => updateItem(item.id, c => ({ ...c, notes: `${c.notes}\n\nSUMMARY: ${s}` }))} 
                                    disabled={payrollRun.status === "Finalized"}
                                  />
                                </div>
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
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="routeTracker" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <Card className="rounded-[2.5rem] border-0 shadow-sm overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-1 bg-primary rounded-full" />
                    <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-400">Route Tracker Source Data</CardTitle>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400">DRIVER PAY</span>
                      <span className="text-xs font-black text-slate-900 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">27%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400">HELPER PAY</span>
                      <span className="text-xs font-black text-slate-900 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">23%</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="w-full">
                  <div className="min-w-[1200px] overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-slate-50/80">
                          {[
                            "Date",
                            "Client",
                            "Miles",
                            "Stops",
                            "EST. PAY (27×Stops)",
                            "EST. FUEL",
                            "Driver",
                            "Driver Pay (27%)",
                            "Helper",
                            "Helper Pay (23%)",
                          ].map((header) => (
                            <th key={header} className="px-4 py-5 text-left text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 whitespace-nowrap">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {routeTracker.map((row) => (
                          <tr key={row.id} className="hover:bg-slate-50/30 transition-all group">
                            <td className="px-4 py-4 text-xs font-bold text-slate-900">{shortDate(row.date)}</td>
                            <td className="px-4 py-4 text-xs font-semibold text-slate-500">{row.client}</td>
                            <td className="px-4 py-4 text-xs font-bold text-slate-700">{row.miles}</td>
                            <td className="px-4 py-4 text-xs font-bold text-slate-700">{row.stops}</td>
                            <td className="px-4 py-4 text-xs font-black text-primary">{currency(estimatePay(row.stops))}</td>
                            <td className="px-4 py-4 text-xs font-medium text-slate-400 italic">{currency(estimateFuel(row.miles))}</td>
                            <td className="px-4 py-4 text-xs font-bold text-slate-700">{row.driver}</td>
                            <td className="px-4 py-4 text-xs font-black text-emerald-600">{currency(driverPay(row.stops))}</td>
                            <td className="px-4 py-4 text-xs font-bold text-slate-700">{row.helper || "—"}</td>
                            <td className="px-4 py-4 text-xs font-black text-emerald-600">{row.helper ? currency(helperPay(row.stops)) : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Paystub Dialog */}
        <Dialog open={!!previewItem} onOpenChange={(open) => !open && setPreviewItem(null)}>
          <DialogContent className="max-h-[95vh] max-w-5xl overflow-hidden rounded-[2.5rem] p-0 border-none shadow-2xl">
            <DialogHeader className="p-0 h-0 overflow-hidden">
              <DialogTitle className="sr-only">Paystub Preview</DialogTitle>
            </DialogHeader>
            {previewItem && (
              <PaystubPreview item={previewItem} run={payrollRun} />
            )}
          </DialogContent>
        </Dialog>

        {/* Credits */}
        <div className="text-center pt-8 pb-12">
          <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest flex items-center justify-center gap-2">
            Secure Payroll Management <Lock className="h-3 w-3" /> System Oriented Cloud
          </p>
        </div>
      </div>
    </div>
  );
}
