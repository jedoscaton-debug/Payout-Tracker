
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
import { PayrollItem } from "@/app/lib/types";

interface DashboardViewProps {
  summary: {
    employees: number;
    gross: number;
    deductions: number;
    net: number;
    items: PayrollItem[];
  };
}

export function DashboardView({ summary }: DashboardViewProps) {
  const chartData = summary.items.map(item => {
    const totals = computeTotals(item);
    return {
      name: item.employeeNameSnapshot.split(' ')[0], // First name for chart labels
      netPay: totals.netPay,
      grossPay: totals.grossPay,
    };
  }).sort((a, b) => b.netPay - a.netPay);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Performance Overview</h3>
        <p className="text-sm text-slate-500 font-medium">Real-time breakdown of current payroll cycle status and employee earnings.</p>
      </div>

      <PayrollSummaryCards summary={summary} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-[2rem] border-0 shadow-sm overflow-hidden">
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

        <Card className="rounded-[2rem] border-0 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Top Earners This Period</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {summary.items.slice(0, 5).map((item, i) => {
                const totals = computeTotals(item);
                return (
                  <div key={item.id} className="flex items-center justify-between p-6 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 font-bold text-xs">
                        {i + 1}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{item.employeeNameSnapshot}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.dailyRateSnapshot}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-slate-900">{currency(totals.netPay)}</p>
                      <p className="text-[10px] font-bold text-emerald-500 uppercase">Net Amount</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
