
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { RXOSettlementReport } from "@/app/lib/types";
import { currency } from "@/app/lib/payroll-utils";
import { ShieldCheck, ShieldAlert, Scale, ArrowRight, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface IntegrityAuditPanelProps {
  report: RXOSettlementReport;
}

export function IntegrityAuditPanel({ report }: IntegrityAuditPanelProps) {
  const summaryPay = report.summaryTotalPay || 0;
  const orderSum = report.orderDetailsRateSum || 0;
  const delta = Number((summaryPay - orderSum).toFixed(2));
  const isVerified = Math.abs(delta) < 0.01;

  return (
    <Card className={cn(
      "rounded-[2rem] border-0 shadow-xl overflow-hidden transition-all duration-500",
      isVerified ? "bg-emerald-600 shadow-emerald-200" : "bg-rose-600 shadow-rose-200"
    )}>
      <CardContent className="p-0 flex flex-col lg:flex-row items-stretch">
        <div className="p-8 lg:p-10 flex items-center gap-6 text-white border-b lg:border-b-0 lg:border-r border-white/10 shrink-0">
          <div className="h-16 w-16 rounded-[1.5rem] bg-white/10 backdrop-blur-md flex items-center justify-center">
            {isVerified ? <ShieldCheck className="h-8 w-8" /> : <ShieldAlert className="h-8 w-8" />}
          </div>
          <div>
            <h4 className="text-xl font-black uppercase tracking-tighter leading-none">
              {isVerified ? "Settlement Verified" : "Audit Mismatch Detected"}
            </h4>
            <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mt-2">
              {isVerified 
                ? "Summary payout aligns perfectly with order details." 
                : "A discrepancy exists between summary and order rates."}
            </p>
          </div>
        </div>
        
        <div className="flex-1 p-8 lg:p-10 flex flex-wrap items-center justify-between gap-8">
          <div className="flex items-center gap-10 text-white">
            <div className="space-y-1">
              <p className="text-[9px] font-black uppercase text-white/50 tracking-widest">Summary Total</p>
              <p className="text-2xl font-black tracking-tighter">{currency(summaryPay)}</p>
            </div>
            
            <div className="flex items-center justify-center">
              <Scale className="h-5 w-5 text-white/20" />
            </div>

            <div className="space-y-1">
              <p className="text-[9px] font-black uppercase text-white/50 tracking-widest">Order Detail Sum</p>
              <p className="text-2xl font-black tracking-tighter">{currency(orderSum)}</p>
            </div>
          </div>

          <div className="flex items-center gap-10">
            <div className={cn(
              "px-6 py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-center min-w-[140px]",
              !isVerified && "bg-white text-rose-600"
            )}>
              <p className={cn("text-[8px] font-black uppercase tracking-[0.2em]", isVerified ? "text-white/50" : "text-rose-400")}>
                Integrity Delta
              </p>
              <p className="text-xl font-black tracking-tighter">{currency(delta)}</p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className={cn(
                "h-12 px-6 rounded-xl flex items-center justify-center font-black text-[10px] uppercase tracking-widest border-2",
                isVerified ? "bg-white/5 border-white/20 text-white" : "bg-white text-rose-600 border-white"
              )}>
                {isVerified ? "System Verified" : "Action Required"}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
