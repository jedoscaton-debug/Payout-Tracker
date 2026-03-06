
"use client";

import { PayrollSummaryCards } from "@/components/payroll/PayrollSummaryCards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from "recharts";
import { computeTotals, currency } from "@/app/lib/payroll-utils";
import { PayrollItem, DeductionRecord } from "@/app/lib/types";
import { Wallet, Activity, ArrowRight, ShieldAlert } from "lucide-react";

interface DashboardViewProps {
  summary: {
    employees: number;
    gross: number;
    deductions: number;
    net: number;
    items: PayrollItem[];
  };
  deductions: DeductionRecord[];
}

export function DashboardView({ summary, deductions }: DashboardViewProps) {
  const chartData = summary.items.map(item => {
    const totals = computeTotals(item);
    return {
      name: item.employeeNameSnapshot.split(' ')[0], 
      netPay: totals.netPay,
      grossPay: totals.grossPay,
    };
  }).sort((a, b) => b.netPay - a.netPay);

  const deductionStats = {
    totalOutstanding: deductions.reduce((sum, d) => sum + (d.remainingBalance || 0), 0),
    activeCount: deductions.filter(d => d.status === "Active").length,
    pausedCount: deductions.filter(d => d.status === "Paused").length
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Performance Overview</h3>
        <p className="text-sm text-slate-500 font-medium">Real-time breakdown of current payroll cycle status and employee earnings.</p>
      </div>

      <PayrollSummaryCards summary={summary} />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 rounded-[2rem] border-0 shadow-sm overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Net Pay Distribution</CardTitle>
          </CardHeader>
          <CardContent className="p-8 h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                  tickFormatter={(val) => `$${val}`}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                  formatter={(value: number) => [currency(value), 'Net Pay']}
                />
                <Bar dataKey="netPay" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.3)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-0 shadow-sm overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Claims Widget</CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                <div className="flex items-center gap-3">
                  <Wallet className="h-5 w-5 text-rose-500" />
                  <span className="text-xs font-bold text-slate-600">Outstanding Balance</span>
                </div>
                <span className="font-black text-slate-900">{currency(deductionStats.totalOutstanding)}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                <div className="flex items-center gap-3">
                  <Activity className="h-5 w-5 text-emerald-500" />
                  <span className="text-xs font-bold text-slate-600">Active Claims</span>
                </div>
                <span className="font-black text-slate-900">{deductionStats.activeCount}</span>
              </div>
              {deductionStats.pausedCount > 0 && (
                <div className="flex items-center gap-2 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                  <ShieldAlert className="h-4 w-4 text-amber-500" />
                  <span className="text-[10px] font-black text-amber-700 uppercase">{deductionStats.pausedCount} Claims Currently Paused</span>
                </div>
              )}
            </div>
            <div className="pt-4 border-t border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 text-center">Top Installment Plans</p>
              <div className="space-y-3">
                {deductions.filter(d => d.type === "Installment" && d.status === "Active").slice(0, 3).map(d => (
                  <div key={d.id} className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">{d.employeeName}</span>
                    <span className="font-black text-slate-900">{currency(d.remainingBalance)}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
