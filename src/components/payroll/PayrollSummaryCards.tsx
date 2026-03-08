
import { Card, CardContent } from "@/components/ui/card";
import { Users, DollarSign, CalendarDays, Wallet, Clock, Lock } from "lucide-react";
import { currency } from "@/app/lib/payroll-utils";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PayrollSummaryCardsProps {
  summary: {
    employees: number;
    gross: number;
    deductions: number;
    net: number;
    status?: string;
  };
}

export function PayrollSummaryCards({ summary }: PayrollSummaryCardsProps) {
  const cards = [
    { label: "Employees in Run", value: summary.employees.toString(), icon: Users, color: "text-blue-500" },
    { label: "Total Gross", value: currency(summary.gross), icon: DollarSign, color: "text-emerald-500" },
    { label: "Total Deductions", value: currency(summary.deductions), icon: Wallet, color: "text-rose-500" },
    { label: "Total Net Pay", value: currency(summary.net), icon: CalendarDays, color: "text-indigo-600" },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label} className="overflow-hidden rounded-3xl border-0 bg-white shadow-sm transition-all hover:shadow-md">
          <CardContent className="flex items-center gap-4 p-6 relative">
            <div className={`rounded-2xl bg-slate-50 p-3 ${card.color}`}>
              <card.icon className="h-6 w-6" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{card.label}</div>
              <div className="text-2xl font-black text-slate-900 tracking-tighter">{card.value}</div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
