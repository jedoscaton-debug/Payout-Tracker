"use client";

import React, { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { 
  Search, 
  Download, 
  RefreshCw, 
  Calendar,
  AlertCircle,
  CheckCircle2,
  MapPin
} from "lucide-react";
import { RXORouteDetail, RouteTrackerRow, FormulaSettings } from "@/app/lib/types";
import { currency, shortDate, estimatePay } from "@/app/lib/payroll-utils";
import { cn } from "@/lib/utils";

interface RouteAuditTableProps {
  routeDetails: RXORouteDetail[];
  internalRoutes: RouteTrackerRow[];
  search: string;
  setSearch: (v: string) => void;
  onRecalculate: () => void;
  onAddInternalRoute?: (route: RouteTrackerRow) => void;
  settings?: FormulaSettings;
}

/**
 * STEP 3 & 4 — LIVE MATCHING ENGINE
 * Implements logic for Cases 1-4 and Date Locking for the comparison audit.
 */
function findInternalMatch(rxoRouteId: string, rxoDate: string, internalRoutes: RouteTrackerRow[]) {
  const id = (rxoRouteId || "").toUpperCase();
  const reportDate = rxoDate; // YYYY-MM-DD

  // Case 3: EV Route Detection (Prefix DMPEV)
  if (id.includes("DMPEV")) {
    return internalRoutes.find(r => 
      r.date === reportDate && 
      r.route.toUpperCase() === 'EV' && 
      r.vehicleNumber.toUpperCase() === 'EV'
    );
  }

  // Case 4: GAS Route Detection (Prefix DMPGAS)
  if (id.includes("DMPGAS")) {
    return internalRoutes.find(r => 
      r.date === reportDate && 
      r.route.toUpperCase() === 'GAS'
    );
  }

  // Cases 1 & 2: LMH Patterns
  if (id.includes("LMH")) {
    const parts = id.split('_').filter(Boolean);
    const datePart = parts.find(p => /^\d{8}$/.test(p)); // MMDDYYYY
    
    if (datePart) {
      // Step 4 Validation: Convert MMDDYYYY from ID to YYYY-MM-DD
      const m = datePart.substring(0, 2);
      const d = datePart.substring(2, 4);
      const y = datePart.substring(4, 8);
      const formattedIdDate = `${y}-${m}-${d}`;
      
      // Strict match: ID embedded date must match the actual route date
      if (formattedIdDate !== reportDate) return null;

      const dateIndex = parts.indexOf(datePart);
      // The actual internal route code is everything after the date part
      const code = parts.slice(dateIndex + 1).join('_');
      
      return internalRoutes.find(r => 
        r.date === reportDate && 
        r.route.toUpperCase() === code.toUpperCase()
      );
    }
  }

  return null;
}

export function RouteAuditTable({ routeDetails, internalRoutes, search, setSearch, onRecalculate, settings }: RouteAuditTableProps) {
  
  // STEP 8 — DATE ORDERING (Sun to Sat / Chronological)
  const sortedAndFiltered = useMemo(() => {
    return routeDetails
      .filter(r => 
        r.routeId.toLowerCase().includes(search.toLowerCase()) ||
        r.market.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => a.routeDate.localeCompare(b.routeDate));
  }, [routeDetails, search]);

  const handleExport = () => {
    const headers = [
      "Route ID", "Route Date", "Market", "Internal Route ID", 
      "RXO Route Miles", "Internal Miles", "RXO Stop Count", "Internal Stops", 
      "Estimated Pay", "RXO Settlement Pay", "Delta", "Delta Status", "Match Status"
    ];
    
    const rows = sortedAndFiltered.map(row => {
      const matched = findInternalMatch(row.routeId, row.routeDate, internalRoutes);
      const est = matched ? (matched.estimatedPay || estimatePay(matched.stops, matched.miles, matched.route, matched.vehicleNumber, settings, matched.routeType)) : 0;
      const delta = Number((row.rxoSettlementPay - est).toFixed(2));
      return [
        row.routeId, row.routeDate, row.market, matched?.route || "N/A",
        row.routeMiles, matched?.miles || 0, row.stopCount, matched?.stops || 0,
        est, row.rxoSettlementPay, delta, delta < 0 ? "RED" : "GREEN", matched ? "Verified Match" : "Unmatched"
      ];
    });

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `RXO_Settlement_Audit_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Search Route ID or Market..." className="pl-10 h-11 rounded-xl bg-white border-slate-200" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="h-11 rounded-xl bg-white font-bold border-slate-200" onClick={onRecalculate}><RefreshCw className="mr-2 h-4 w-4" /> Sync Tracker</Button>
          <Button variant="outline" className="h-11 rounded-xl bg-white font-bold border-slate-200" onClick={handleExport}><Download className="mr-2 h-4 w-4" /> Export CSV</Button>
        </div>
      </div>

      <Card className="rounded-[2.5rem] border-0 shadow-sm overflow-hidden bg-white">
        <CardContent className="p-0">
          <ScrollArea className="w-full">
            <div className="min-w-[2800px] pb-10">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    {/* STEP 7 — AUDIT OUTPUT TABLE (13 COLUMNS) */}
                    <th className="px-8 py-6 text-left text-[10px] font-black uppercase tracking-widest min-w-[280px]">Route ID</th>
                    <th className="px-4 py-6 text-center text-[10px] font-black uppercase tracking-widest">Route Date</th>
                    <th className="px-4 py-6 text-center text-[10px] font-black uppercase tracking-widest">Market</th>
                    <th className="px-4 py-6 text-center text-[10px] font-black uppercase tracking-widest bg-primary/20">Internal Route ID</th>
                    <th className="px-4 py-6 text-center text-[10px] font-black uppercase tracking-widest bg-slate-800">RXO Route Miles</th>
                    <th className="px-4 py-6 text-center text-[10px] font-black uppercase tracking-widest bg-slate-700">Internal Miles</th>
                    <th className="px-4 py-6 text-center text-[10px] font-black uppercase tracking-widest bg-slate-800">RXO Stop Count</th>
                    <th className="px-4 py-6 text-center text-[10px] font-black uppercase tracking-widest bg-slate-700">Internal Stops</th>
                    <th className="px-4 py-6 text-right text-[10px] font-black uppercase tracking-widest bg-slate-800">Estimated Pay</th>
                    <th className="px-4 py-6 text-right text-[10px] font-black uppercase tracking-widest bg-slate-700">RXO Settlement Pay</th>
                    <th className="px-4 py-6 text-right text-[10px] font-black uppercase tracking-widest border-l border-white/10">Delta</th>
                    <th className="px-4 py-6 text-center text-[10px] font-black uppercase tracking-widest">Delta Status</th>
                    <th className="px-8 py-6 text-right text-[10px] font-black uppercase tracking-widest">Match Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedAndFiltered.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="py-20 text-center text-slate-400 font-bold uppercase text-xs tracking-widest">No routes found for this settlement period.</td>
                    </tr>
                  ) : sortedAndFiltered.map(row => {
                    // STEP 3 & 4: LIVE DATA COMPARISON
                    const matched = findInternalMatch(row.routeId, row.routeDate, internalRoutes);
                    // STEP 5: Use Estimated Pay from Tracker if matched
                    const est = matched ? (matched.estimatedPay || estimatePay(matched.stops, matched.miles, matched.route, matched.vehicleNumber, settings, matched.routeType)) : 0;
                    
                    // STEP 6: DELTA AUDIT
                    const liveDelta = Number((row.rxoSettlementPay - est).toFixed(2));
                    
                    // CRITICAL: Mark ALL negative variance as RED (Even small differences like -11.25)
                    const isRed = liveDelta < 0;
                    
                    return (
                      <tr key={row.id} className={cn("hover:bg-slate-50 transition-colors group", !matched && "bg-slate-50/20")}>
                        <td className="px-8 py-5 font-black text-slate-900 text-xs">{row.routeId}</td>
                        <td className="px-4 py-5 text-center">
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-[10px] font-black text-slate-600 uppercase">
                            <Calendar className="h-3 w-3" /> {shortDate(row.routeDate)}
                          </div>
                        </td>
                        <td className="px-4 py-5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <MapPin className="h-3 w-3 text-slate-300" />
                            <span className="text-[10px] font-bold text-slate-500 uppercase">{row.market}</span>
                          </div>
                        </td>
                        <td className="px-4 py-5 text-center bg-primary/5">
                          {matched ? (
                            <Badge className="bg-primary font-black uppercase text-[10px] px-3 py-1">{matched.route}</Badge>
                          ) : (
                            <span className="text-[9px] text-rose-400 font-black uppercase italic tracking-tighter">No Match Found</span>
                          )}
                        </td>
                        <td className="px-4 py-5 text-center font-bold text-slate-400 bg-slate-50/50">{row.routeMiles}</td>
                        <td className="px-4 py-5 text-center font-black text-slate-900 bg-slate-50/30">
                          {matched ? matched.miles : "—"}
                        </td>
                        <td className="px-4 py-5 text-center font-bold text-slate-400 bg-slate-50/50">{row.stopCount}</td>
                        <td className="px-4 py-5 text-center font-black text-slate-900 bg-slate-50/30">
                          {matched ? matched.stops : "—"}
                        </td>
                        <td className="px-4 py-5 text-right font-black text-primary bg-slate-50/30">{currency(est)}</td>
                        <td className="px-4 py-5 text-right font-black text-slate-900 bg-slate-50/50">{currency(row.rxoSettlementPay)}</td>
                        <td className={cn("px-4 py-5 text-right font-black text-xs border-l", isRed ? "text-rose-600" : "text-emerald-600")}>
                          {currency(liveDelta)}
                        </td>
                        <td className="px-4 py-5 text-center">
                          <div className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase border-2",
                            isRed ? "bg-rose-50 text-rose-600 border-rose-200" : "bg-emerald-50 text-emerald-600 border-emerald-200"
                          )}>
                            {isRed ? <AlertCircle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />} {isRed ? "RED" : "GREEN"}
                          </div>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <Badge variant="outline" className={cn(
                            "text-[8px] font-black uppercase px-3", 
                            matched ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-100 text-slate-400 border-slate-200"
                          )}>
                            {matched ? 'Verified Match' : 'Unmatched'}
                          </Badge>
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
    </div>
  );
}
