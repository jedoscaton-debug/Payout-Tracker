
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { RXORouteDetail } from "@/app/lib/types";
import { currency } from "@/app/lib/payroll-utils";
import { AlertTriangle, ArrowRight, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExceptionPanelProps {
  routes: RXORouteDetail[];
}

export function ExceptionPanel({ routes }: ExceptionPanelProps) {
  const totalVariance = routes.reduce((sum, r) => sum + r.delta, 0);

  return (
    <Card className="rounded-[2rem] border-0 bg-rose-600 shadow-xl shadow-rose-200 overflow-hidden">
      <CardContent className="p-0 flex flex-col md:flex-row items-stretch">
        <div className="p-8 md:p-10 flex items-center gap-6 text-white border-b md:border-b-0 md:border-r border-white/10">
          <div className="h-16 w-16 rounded-[1.5rem] bg-white/10 backdrop-blur-md flex items-center justify-center">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <div>
            <h4 className="text-xl font-black uppercase tracking-tighter leading-none">Settlement Discrepancy Detected</h4>
            <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mt-2">
              {routes.length} RXO route payouts are significantly lower than estimates.
            </p>
          </div>
        </div>
        <div className="flex-1 p-8 md:p-10 flex items-center justify-between gap-10">
          <div className="flex items-center gap-10 text-white">
            <div className="space-y-1">
              <p className="text-[9px] font-black uppercase text-white/50 tracking-widest">Flagged Variance</p>
              <p className="text-3xl font-black tracking-tighter">{currency(totalVariance)}</p>
            </div>
            <div className="h-10 w-px bg-white/10" />
            <div className="space-y-1">
              <p className="text-[9px] font-black uppercase text-white/50 tracking-widest">Action Status</p>
              <p className="text-lg font-black tracking-tight uppercase">Manual Review Required</p>
            </div>
          </div>
          <button className="h-14 w-14 rounded-2xl bg-white text-rose-600 flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95">
            <ArrowRight className="h-6 w-6" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
