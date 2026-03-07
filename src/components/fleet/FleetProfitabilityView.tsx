
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
  TrendingUp, 
  TrendingDown, 
  AlertCircle,
  Truck,
  Settings2,
  RefreshCw,
  Info,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Zap
} from "lucide-react";
import { 
  RouteTrackerRow,
  FormulaSettings 
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
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { evaluateFormula } from "@/app/lib/formula-evaluator";

interface FleetProfitabilityViewProps {
  routeTracker: RouteTrackerRow[];
  settings?: FormulaSettings;
}

export function FleetProfitabilityView({ routeTracker, settings }: FleetProfitabilityViewProps) {
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
  
  const [isLogicOpen, setIsLogicOpen] = useState(false);
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
      vanCosts: number;
      fuel: number;
      miles: number;
      stops: number;
      revenueSource: "Actual Audit" | "Estimated";
    }> = {};

    filteredRoutes.forEach(r => {
      const vanId = r.vehicleNumber || "Unknown";
      if (!groups[vanId]) {
        groups[vanId] = {
          van: vanId,
          dates: new Set(),
          revenue: 0,
          labor: 0,
          vanCosts: 0,
          fuel: 0,
          miles: 0,
          stops: 0,
          revenueSource: "Estimated"
        };
      }

      const g = groups[vanId];
      g.dates.add(r.date);
      g.miles += (r.miles || 0);
      g.stops += (r.stops || 0);
      
      // Revenue Logic: Use settings rule
      const hasActualAudit = r.actualPayAudit && r.actualPayAudit > 0;
      const rev = hasActualAudit ? r.actualPayAudit : (r.estimatedPay && r.estimatedPay > 0 ? r.estimatedPay : estimatePay(r.stops, r.miles, r.route, r.vehicleNumber, settings));
      
      if (hasActualAudit) g.revenueSource = "Actual Audit";
      
      // Labor Cost Logic (Driver + Helper)
      const dPay = driverPay(r.stops, r.miles, r.route, r.vehicleNumber, r.estimatedPay, settings);
      const hPay = r.helper && r.helper !== "No Helper" ? helperPay(r.stops, r.miles, r.route, r.vehicleNumber, r.estimatedPay, settings) : 0;
      
      // Van & Fuel Cost Logic
      const fuel = estimateFuel(r.miles, settings);
      const vanFixed = r.truckRental || TRUCK_RENTAL_FIXED; 
      
      g.revenue += rev;
      g.labor += (dPay + hPay);
      g.vanCosts += vanFixed;
      g.fuel += fuel;
    });

    return Object.values(groups).map(g => {
      const vanFuelCosts = g.vanCosts + g.fuel;
      const totalCosts = g.labor + vanFuelCosts;
      const netProfit = g.revenue - totalCosts;
      
      const redLimit = settings?.redThreshold ?? 100;
      const yellowLimit = settings?.yellowThreshold ?? 300;

      let status: "RED" | "YELLOW" | "GREEN" = "RED";
      let actionItem = "CRITICAL. Return van or fix pay structure immediately.";
      
      if (netProfit >= yellowLimit) {
        status = "GREEN";
        actionItem = "Healthy. Continue current structure.";
      } else if (netProfit >= redLimit) {
        status = "YELLOW";
        actionItem = "Watch. Low utilization. Park if routes drop.";
      }

      return {
        ...g,
        vanFuelCosts,
        totalCosts,
        netProfit,
        status,
        actionItem,
        daysActive: g.dates.size
      };
    }).sort((a, b) => b.netProfit - a.netProfit);
  }, [filteredRoutes, settings]);

  const TRUCK_RENTAL_FIXED = 52;

  const totals = useMemo(() => {
    return vanStats.reduce((acc, v) => ({
      daysActive: acc.daysActive + v.daysActive,
      revenue: acc.revenue + v.revenue,
      laborCosts: acc.laborCosts + v.labor,
      vanFuelCosts: acc.vanFuelCosts + v.vanFuelCosts,
      totalCosts: acc.totalCosts + v.totalCosts,
      netProfit: acc.netProfit + v.netProfit,
      miles: acc.miles + v.miles,
      stops: acc.stops + v.stops
    }), {
      daysActive: 0, 
      revenue: 0, 
      laborCosts: 0, 
      vanFuelCosts: 0, 
      totalCosts: 0, 
      netProfit: 0,
      miles: 0,
      stops: 0
    });
  }, [vanStats]);

  const realityCheck = useMemo(() => {
    const reserveRate = settings?.reserveRate ?? 0.15;
    const insurance = settings?.estimatedWeeklyInsurance ?? 600;
    
    const rxoReserve = totals.revenue * reserveRate;
    const trueNetProfit = evaluateFormula(settings?.trueNetProfitFormula || "fleetNetProfit - estimatedWeeklyInsurance - (fleetRevenue * reserveRate)", {
      fleetNetProfit: totals.netProfit,
      estimatedWeeklyInsurance: insurance,
      fleetRevenue: totals.revenue,
      reserveRate: reserveRate
    });

    return { rxoReserve, trueNetProfit, insurance, reserveRate };
  }, [totals, settings]);

  const handleRecalculate = () => {
    toast({ title: "Board Refreshed", description: "All calculations updated based on latest formula settings." });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Fleet Profitability Board</h3>
          <p className="text-sm text-slate-500 font-medium">Weekly van performance and operational margin visibility.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
            <Calendar className="h-4 w-4 text-slate-400 ml-3" />
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9 border-none bg-transparent text-[10px] font-bold uppercase w-32" />
            <span className="text-slate-300 text-[10px] font-black">TO</span>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9 border-none bg-transparent text-[10px] font-bold uppercase w-32" />
          </div>
          <Button variant="outline" className="h-11 rounded-xl bg-white font-bold" onClick={handleRecalculate}><RefreshCw className="mr-2 h-4 w-4" /> Recalculate</Button>
          <Button variant="outline" className="h-11 rounded-xl bg-white font-bold" onClick={() => window.print()}><Download className="mr-2 h-4 w-4" /> Export Board</Button>
        </div>
      </div>

      <Collapsible open={isLogicOpen} onOpenChange={setIsLogicOpen} className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-4 hover:bg-slate-100 transition-colors">
            <div className="flex items-center gap-3">
              <Info className="h-4 w-4 text-primary" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Active Calculation Engine & Settings</span>
            </div>
            {isLogicOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="p-6 border-t border-slate-200 space-y-4">
          <div className="grid gap-6 md:grid-cols-4">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase">Revenue Formula (EV)</p>
              <p className="text-xs font-bold text-slate-700 leading-relaxed italic">{settings?.estimatedPayFormula || "27 * stops"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase">Revenue Formula (GAS)</p>
              <p className="text-xs font-bold text-slate-700 leading-relaxed italic">{settings?.gasEstimatedPayFormula || "100 + (1.37 * MILE) + (12.5 * STOPS)"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase">Fuel Ratio</p>
              <p className="text-xs font-bold text-slate-700 leading-relaxed italic">{settings?.estimatedFuelFormula || "(3.76/8)*miles"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase">Reserves</p>
              <p className="text-xs font-bold text-slate-700 leading-relaxed italic">Ins: {currency(realityCheck.insurance)}<br/>RXO: {(realityCheck.reserveRate * 100).toFixed(0)}%</p>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Card className="rounded-[2.5rem] border-0 shadow-xl overflow-hidden bg-white">
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
                <span className="text-[10px] font-black text-slate-400 uppercase">HEALTHY (&gt; ${settings?.yellowThreshold ?? 300})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-amber-500" />
                <span className="text-[10px] font-black text-slate-400 uppercase">WEAK (&gt; ${settings?.redThreshold ?? 100})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-rose-500" />
                <span className="text-[10px] font-black text-slate-400 uppercase">CRITICAL (&lt; ${settings?.redThreshold ?? 100})</span>
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
                  {vanStats.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-20 text-center">
                        <div className="flex flex-col items-center gap-3 text-slate-400">
                          <Zap className="h-10 w-10 opacity-20" />
                          <p className="text-[10px] font-black uppercase tracking-widest">No route logs found for this period.</p>
                        </div>
                      </td>
                    </tr>
                  ) : vanStats.map((row) => (
                    <tr key={row.van} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-900">{row.van}</span>
                          <Badge variant="outline" className="text-[8px] font-bold uppercase opacity-0 group-hover:opacity-100 transition-opacity">
                            {row.revenueSource}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-4 py-5 text-center font-bold text-slate-500">{row.daysActive}</td>
                      <td className="px-4 py-5 text-right font-bold">{currency(row.revenue)}</td>
                      <td className="px-4 py-5 text-right font-medium text-slate-600">{currency(row.labor)}</td>
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
                        <StatusPill status={totals.netProfit < (settings?.yellowThreshold ?? 300) ? (totals.netProfit < (settings?.redThreshold ?? 100) ? "RED" : "YELLOW") : "GREEN"} />
                        <span className="text-[10px] font-black uppercase text-slate-400">Overall Portfolio Performance</span>
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
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.4em] text-white/50">Reality Check Audit</CardTitle>
              <div className="flex items-center gap-6">
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[8px] font-black text-white/30 uppercase">Reserve Rate</span>
                  <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-lg">
                    <Settings2 className="h-3 w-3 text-primary" />
                    <span className="text-[10px] font-black">{(realityCheck.reserveRate * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-10 space-y-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <span className="text-xs font-bold text-white/60 uppercase">Fleet Net Profit (Before Reserve)</span>
                <span className="text-lg font-black">{currency(totals.netProfit)}</span>
              </div>
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <span className="text-xs font-bold text-white/60 uppercase">Weekly Insurance (Fixed Cost)</span>
                <span className="text-lg font-black text-rose-400">({currency(realityCheck.insurance)})</span>
              </div>
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <span className="text-xs font-bold text-white/60 uppercase">RXO “Risk Reserve ({ (realityCheck.reserveRate * 100).toFixed(0) }%)”</span>
                <span className="text-lg font-black text-rose-400">({currency(realityCheck.rxoReserve)})</span>
              </div>
            </div>
            
            <div className={cn(
              "p-8 rounded-[2rem] flex items-center justify-between",
              realityCheck.trueNetProfit < 0 ? "bg-rose-600 shadow-xl shadow-rose-900/40" : "bg-emerald-600 shadow-xl shadow-emerald-900/40"
            )}>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">True Net Profit</p>
                <p className="text-sm font-bold text-white/50 italic mt-1">Calculated via dynamic formula settings.</p>
              </div>
              <p className="text-4xl font-black tracking-tighter">{currency(realityCheck.trueNetProfit)}</p>
            </div>

            {realityCheck.trueNetProfit < 0 && (
              <div className="p-6 bg-rose-500/20 border border-rose-500/30 rounded-2xl flex items-center gap-4 animate-pulse">
                <AlertCircle className="h-8 w-8 text-rose-500 shrink-0" />
                <p className="text-xs font-black uppercase tracking-wide leading-relaxed">
                  CRITICAL ALERT: Business is bleeding cash. Review route logs and formula settings immediately.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="rounded-[2rem] border-0 shadow-sm bg-white p-8">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fleet Efficiency</p>
                  <p className="text-2xl font-black text-slate-900">{((totals.netProfit / (totals.revenue || 1)) * 100).toFixed(1)}%</p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Margin before overhead</p>
                </div>
              </div>
            </Card>
            <Card className="rounded-[2rem] border-0 shadow-sm bg-white p-8">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500">
                  <TrendingDown className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Labor Ratio</p>
                  <p className="text-2xl font-black text-slate-900">{((totals.laborCosts / (totals.revenue || 1)) * 100).toFixed(1)}%</p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Revenue share to staff</p>
                </div>
              </div>
            </Card>
          </div>
          
          <Card className="rounded-[2.5rem] border-0 shadow-sm bg-white p-8">
            <div className="flex items-center justify-between mb-6">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Operational Metrics</p>
              <Badge variant="outline" className="bg-slate-50 text-[10px] font-black uppercase">{vanStats.length} Active Nodes</Badge>
            </div>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Total Fleet Mileage</span>
                <span className="text-lg font-black text-slate-900">{totals.miles?.toLocaleString() || 0} Mi</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Total Route Stops</span>
                <span className="text-lg font-black text-slate-900">{totals.stops?.toLocaleString() || 0}</span>
              </div>
              <div className="pt-4 border-t border-slate-50">
                <p className="text-[10px] font-bold text-slate-400 leading-relaxed uppercase italic">
                  "Calculations are real-time and use active formula settings. Final audit requires all route tracker rows to be finalized."
                </p>
              </div>
            </div>
          </Card>
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
