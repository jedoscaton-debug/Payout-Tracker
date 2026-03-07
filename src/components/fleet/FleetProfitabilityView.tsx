
"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { 
  BarChart3, 
  Calendar, 
  Download, 
  Search, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle,
  Truck,
  Settings2
} from "lucide-react";
import { 
  RouteTrackerRow, 
  FleetWeeklySettings 
} from "@/app/lib/types";
import { 
  currency, 
  estimatePay, 
  driverPay, 
  helperPay, 
  estimateFuel,
  shortDate
} from "@/app/lib/payroll-utils";
import { useToast } from "@/hooks/use-toast";

interface FleetProfitabilityViewProps {
  routeTracker: RouteTrackerRow[];
}

export function FleetProfitabilityView({ routeTracker }: FleetProfitabilityViewProps) {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay()); // Start of this week
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + (6 - d.getDay())); // End of this week
    return d.toISOString().split('T')[0];
  });
  
  const [weeklyInsurance, setWeeklyInsurance] = useState(600);
  const { toast } = useToast();

  const filteredRoutes = useMemo(() => {
    return routeTracker.filter(r => r.date >= startDate && r.date <= endDate);
  }, [routeTracker, startDate, endDate]);

  const vanStats = useMemo(() => {
    const groups: Record<string, {
      van: string;
      dates: Set<string>;
      revenue: number;
      labor: number;
      vanFuel: number;
    }> = {};

    filteredRoutes.forEach(r => {
      if (!groups[r.vehicleNumber]) {
        groups[r.vehicleNumber] = {
          van: r.vehicleNumber,
          dates: new Set(),
          revenue: 0,
          labor: 0,
          vanFuel: 0
        };
      }

      const g = groups[r.vehicleNumber];
      g.dates.add(r.date);
      
      const rev = r.estimatedPay && r.estimatedPay > 0 ? r.estimatedPay : estimatePay(r.stops);
      const dPay = driverPay(r.stops, r.route, r.vehicleNumber, r.estimatedPay);
      const hPay = r.helper && r.helper !== "No Helper" ? helperPay(r.stops, r.route, r.vehicleNumber, r.estimatedPay) : 0;
      const fuel = estimateFuel(r.miles);
      
      g.revenue += rev;
      g.labor += (dPay + hPay);
      g.vanFuel += (r.truckRental + fuel);
    });

    return Object.values(groups).map(g => {
      const totalCosts = g.labor + g.vanFuel;
      const netProfit = g.revenue - totalCosts;
      
      let status: "RED" | "YELLOW" | "GREEN" = "RED";
      let actionItem = "CRITICAL. Return van or fix pay structure immediately.";
      
      if (netProfit >= 300) {
        status = "GREEN";
        actionItem = "Healthy. Continue current structure.";
      } else if (netProfit >= 100) {
        status = "YELLOW";
        actionItem = "Watch. Low utilization. Park if routes drop.";
      }

      return {
        van: g.van,
        daysActive: g.dates.size,
        revenue: g.revenue,
        laborCosts: g.labor,
        vanFuelCosts: g.vanFuel,
        totalCosts,
        netProfit,
        status,
        actionItem
      };
    }).sort((a, b) => b.netProfit - a.netProfit);
  }, [filteredRoutes]);

  const totals = useMemo(() => {
    return vanStats.reduce((acc, v) => ({
      daysActive: acc.daysActive + v.daysActive,
      revenue: acc.revenue + v.revenue,
      laborCosts: acc.laborCosts + v.laborCosts,
      vanFuelCosts: acc.vanFuelCosts + v.vanFuelCosts,
      totalCosts: acc.totalCosts + v.totalCosts,
      netProfit: acc.netProfit + v.netProfit
    }), {
      daysActive: 0, revenue: 0, laborCosts: 0, vanFuelCosts: 0, totalCosts: 0, netProfit: 0
    });
  }, [vanStats]);

  const realityCheck = useMemo(() => {
    const rxoReserve = totals.revenue * 0.15;
    const trueNetProfit = totals.netProfit - weeklyInsurance - rxoReserve;
    return { rxoReserve, trueNetProfit };
  }, [totals, weeklyInsurance]);

  const handleExport = () => {
    toast({ title: "Generating Report", description: "Your profitability board is being compiled." });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Fleet Profitability Board</h3>
          <p className="text-sm text-slate-500 font-medium">Weekly van performance, cost visibility, and operational action signals.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
            <Calendar className="h-4 w-4 text-slate-400 ml-3" />
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9 border-none bg-transparent text-[10px] font-bold uppercase w-32" />
            <span className="text-slate-300 text-[10px] font-black">TO</span>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9 border-none bg-transparent text-[10px] font-bold uppercase w-32" />
          </div>
          <Button variant="outline" className="h-11 rounded-xl bg-white font-bold" onClick={handleExport}><Download className="mr-2 h-4 w-4" /> Export Board</Button>
        </div>
      </div>

      <Card className="rounded-[2rem] border-0 shadow-xl overflow-hidden bg-white">
        <CardHeader className="bg-slate-900 border-b border-slate-800 p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Truck className="h-6 w-6 text-white" />
              <CardTitle className="text-white font-black uppercase tracking-widest text-lg">
                Week of {shortDate(startDate)} – {shortDate(endDate)}
              </CardTitle>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-black text-slate-400 uppercase">HEALTHY</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-amber-500" />
                <span className="text-[10px] font-black text-slate-400 uppercase">WEAK</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-rose-500" />
                <span className="text-[10px] font-black text-slate-400 uppercase">CRITICAL</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="w-full">
            <div className="min-w-[1400px]">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-800 text-white">
                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest">Van #</th>
                    <th className="px-4 py-4 text-center text-[10px] font-black uppercase tracking-widest">Days Active</th>
                    <th className="px-4 py-4 text-right text-[10px] font-black uppercase tracking-widest">Total Revenue</th>
                    <th className="px-4 py-4 text-right text-[10px] font-black uppercase tracking-widest">Labor Costs</th>
                    <th className="px-4 py-4 text-right text-[10px] font-black uppercase tracking-widest">Van & Fuel Costs</th>
                    <th className="px-4 py-4 text-right text-[10px] font-black uppercase tracking-widest">Total Costs</th>
                    <th className="px-4 py-4 text-right text-[10px] font-black uppercase tracking-widest">Net Profit</th>
                    <th className="px-4 py-4 text-center text-[10px] font-black uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest">Action Item</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vanStats.map((row) => (
                    <tr key={row.van} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-5 font-black text-slate-900">{row.van}</td>
                      <td className="px-4 py-5 text-center font-bold text-slate-500">{row.daysActive}</td>
                      <td className="px-4 py-5 text-right font-bold">{currency(row.revenue)}</td>
                      <td className="px-4 py-5 text-right font-medium text-slate-600">{currency(row.laborCosts)}</td>
                      <td className="px-4 py-5 text-right font-medium text-slate-600">{currency(row.vanFuelCosts)}</td>
                      <td className="px-4 py-5 text-right font-bold text-slate-900">{currency(row.totalCosts)}</td>
                      <td className="px-4 py-5 text-right font-black text-primary">{currency(row.netProfit)}</td>
                      <td className="px-4 py-5 text-center">
                        <StatusPill status={row.status} />
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{row.actionItem}</span>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 border-t-2 border-slate-200">
                    <td className="px-6 py-6 font-black text-slate-900 text-lg uppercase tracking-widest">Fleet Totals</td>
                    <td className="px-4 py-6 text-center font-black text-slate-900">{totals.daysActive}</td>
                    <td className="px-4 py-6 text-right font-black text-slate-900">{currency(totals.revenue)}</td>
                    <td className="px-4 py-6 text-right font-black text-slate-900">{currency(totals.laborCosts)}</td>
                    <td className="px-4 py-6 text-right font-black text-slate-900">{currency(totals.vanFuelCosts)}</td>
                    <td className="px-4 py-6 text-right font-black text-slate-900">{currency(totals.totalCosts)}</td>
                    <td className="px-4 py-6 text-right font-black text-primary text-xl">{currency(totals.netProfit)}</td>
                    <td colSpan={2} className="px-6 py-6">
                      <div className="flex items-center gap-3">
                        <StatusPill status={totals.netProfit < 300 ? (totals.netProfit < 0 ? "RED" : "YELLOW") : "GREEN"} />
                        <span className="text-[10px] font-black uppercase text-slate-400">Overall Fleet Performance</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>

      <div className="grid gap-8 lg:grid-cols-2">
        <Card className="rounded-[2.5rem] border-0 shadow-lg bg-slate-900 text-white overflow-hidden">
          <CardHeader className="bg-white/5 p-8 border-b border-white/5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.4em] text-white/50">Reality Check</CardTitle>
              <div className="flex items-center gap-3">
                <Settings2 className="h-4 w-4 text-white/30" />
                <Input 
                  type="number" 
                  value={weeklyInsurance} 
                  onChange={(e) => setWeeklyInsurance(Number(e.target.value))}
                  className="w-24 h-8 bg-white/10 border-none text-xs font-black text-white"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-10 space-y-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <span className="text-xs font-bold text-white/60 uppercase">Fleet Net Profit</span>
                <span className="text-lg font-black">{currency(totals.netProfit)}</span>
              </div>
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <span className="text-xs font-bold text-white/60 uppercase">Est. Weekly Insurance</span>
                <span className="text-lg font-black text-rose-400">({currency(weeklyInsurance)})</span>
              </div>
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <span className="text-xs font-bold text-white/60 uppercase">RXO “Risk Reserve (15%)”</span>
                <span className="text-lg font-black text-rose-400">({currency(realityCheck.rxoReserve)})</span>
              </div>
            </div>
            
            <div className={cn(
              "p-8 rounded-[2rem] flex items-center justify-between",
              realityCheck.trueNetProfit < 0 ? "bg-rose-600 shadow-xl shadow-rose-900/40" : "bg-emerald-600 shadow-xl shadow-emerald-900/40"
            )}>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">True Net Profit</p>
                <p className="text-sm font-bold text-white/50 italic mt-1">Final business take-home after all costs.</p>
              </div>
              <p className="text-4xl font-black tracking-tighter">{currency(realityCheck.trueNetProfit)}</p>
            </div>

            {realityCheck.trueNetProfit < 0 && (
              <div className="p-6 bg-rose-500/20 border border-rose-500/30 rounded-2xl flex items-center gap-4 animate-pulse">
                <AlertCircle className="h-8 w-8 text-rose-500 shrink-0" />
                <p className="text-xs font-black uppercase tracking-wide leading-relaxed">
                  CRITICAL ALERT: Business is bleeding cash. Return a van immediately to save weekly cost and flip to profit.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-[2rem] border-0 shadow-sm bg-white p-8">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Revenue Efficiency</p>
                <p className="text-2xl font-black text-slate-900">{((totals.netProfit / (totals.revenue || 1)) * 100).toFixed(1)}%</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase">Margin before reality check</p>
              </div>
            </div>
          </Card>
          <Card className="rounded-[2rem] border-0 shadow-sm bg-white p-8">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500">
                <TrendingDown className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Labor Cost Ratio</p>
                <p className="text-2xl font-black text-slate-900">{((totals.laborCosts / (totals.revenue || 1)) * 100).toFixed(1)}%</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase">Share of revenue going to staff</p>
              </div>
            </div>
          </Card>
          <div className="p-8 bg-slate-900/5 border border-slate-900/10 rounded-[2.5rem] italic">
            <p className="text-[10px] font-bold text-slate-400 leading-relaxed uppercase">
              "This board provides a weekly financial control view. It is designed to expose operational leaks. If True Net Profit is low, analyze individual van Action Items to identify underperforming routes."
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: "RED" | "YELLOW" | "GREEN" }) {
  const styles = {
    RED: "bg-rose-500 text-black",
    YELLOW: "bg-amber-400 text-black",
    GREEN: "bg-emerald-500 text-black"
  };

  return (
    <div className={cn("px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest inline-block", styles[status])}>
      {status === "RED" ? "CRITICAL" : status === "YELLOW" ? "WEAK" : "HEALTHY"}
    </div>
  );
}
