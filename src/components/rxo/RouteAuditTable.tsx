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
  ArrowRightLeft, 
  MoreHorizontal, 
  CheckCircle2,
  AlertCircle,
  Calendar,
  Sparkles
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
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

export function RouteAuditTable({ routeDetails, internalRoutes, search, setSearch, onRecalculate, onAddInternalRoute, settings }: RouteAuditTableProps) {
  // Filter and sort by date ascending (Sun to Sat / A-Z)
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
      "RXO Route ID", "Route Date", "Market", "Internal Route", 
      "RXO Miles", "Internal Miles", "RXO Stops", "Internal Stops", 
      "Internal Est Pay", "RXO Settlement Pay", "Delta"
    ];
    
    const rows = sortedAndFiltered.map(row => {
      const matchedInternal = internalRoutes.find(ir => ir.id === row.internalRouteId);
      const liveInternalEst = matchedInternal 
        ? (matchedInternal.estimatedPay && matchedInternal.estimatedPay > 0 
            ? matchedInternal.estimatedPay 
            : estimatePay(matchedInternal.stops, matchedInternal.miles, matchedInternal.route, matchedInternal.vehicleNumber, settings, matchedInternal.routeType))
        : row.systemEstimatedPay;
      
      const liveDelta = Number((row.rxoSettlementPay - liveInternalEst).toFixed(2));

      return [
        row.routeId,
        row.routeDate,
        row.market,
        matchedInternal?.route || "N/A",
        row.routeMiles,
        matchedInternal?.miles || 0,
        row.stopCount,
        matchedInternal?.stops || 0,
        liveInternalEst,
        row.rxoSettlementPay,
        liveDelta
      ];
    });

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `RXO_Audit_Export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Search Route ID..." className="pl-10 h-11 rounded-xl bg-white border-slate-200 shadow-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="h-11 rounded-xl bg-white font-bold" onClick={onRecalculate}>
            <RefreshCw className="mr-2 h-4 w-4" /> Re-sync Tracker
          </Button>
          <Button variant="outline" className="h-11 rounded-xl bg-white font-bold" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" /> Export Report
          </Button>
        </div>
      </div>

      <Card className="rounded-[2.5rem] border-0 shadow-sm overflow-hidden bg-white">
        <CardContent className="p-0">
          <ScrollArea className="w-full">
            <div className="min-w-[2800px]">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-widest min-w-[250px]">RXO Route ID</th>
                    <th className="px-4 py-5 text-center text-[10px] font-black uppercase tracking-widest">Route Date</th>
                    <th className="px-4 py-5 text-center text-[10px] font-black uppercase tracking-widest">Market</th>
                    <th className="px-4 py-5 text-center text-[10px] font-black uppercase tracking-widest bg-primary/10">Internal Route ID</th>
                    
                    <th className="px-4 py-5 text-center text-[10px] font-black uppercase tracking-widest bg-slate-800">RXO Route Miles</th>
                    <th className="px-4 py-5 text-center text-[10px] font-black uppercase tracking-widest bg-slate-700">Internal Miles</th>
                    
                    <th className="px-4 py-5 text-center text-[10px] font-black uppercase tracking-widest bg-slate-800">RXO Stop Count</th>
                    <th className="px-4 py-5 text-center text-[10px] font-black uppercase tracking-widest bg-slate-700">Internal Stops</th>
                    
                    <th className="px-4 py-5 text-right text-[10px] font-black uppercase tracking-widest bg-slate-800">Estimated Pay (Tracker)</th>
                    <th className="px-4 py-5 text-right text-[10px] font-black uppercase tracking-widest bg-slate-700">RXO Settlement Amount</th>
                    
                    <th className="px-4 py-5 text-right text-[10px] font-black uppercase tracking-widest border-l border-white/10">Delta</th>
                    <th className="px-4 py-5 text-center text-[10px] font-black uppercase tracking-widest">Delta Status</th>
                    <th className="px-8 py-5 text-right text-[10px] font-black uppercase tracking-widest">Match Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedAndFiltered.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="px-8 py-20 text-center text-slate-400 font-bold uppercase text-[10px]">No matches found for the selected review week.</td>
                    </tr>
                  ) : sortedAndFiltered.map(row => {
                    const matchedInternal = internalRoutes.find(ir => ir.id === row.internalRouteId);
                    
                    const liveInternalEst = matchedInternal 
                      ? (matchedInternal.estimatedPay && matchedInternal.estimatedPay > 0 
                          ? matchedInternal.estimatedPay 
                          : estimatePay(matchedInternal.stops, matchedInternal.miles, matchedInternal.route, matchedInternal.vehicleNumber, settings, matchedInternal.routeType))
                      : row.systemEstimatedPay;

                    const liveDelta = Number((row.rxoSettlementPay - liveInternalEst).toFixed(2));
                    const isRed = liveDelta < -50;
                    
                    const milesMatch = matchedInternal ? matchedInternal.miles === row.routeMiles : false;
                    const stopsMatch = matchedInternal ? matchedInternal.stops === row.stopCount : false;
                    
                    return (
                      <tr key={row.id} className={cn("hover:bg-slate-50/50 transition-colors group", !matchedInternal && "bg-slate-50/20")}>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-3 w-3 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                            <span className="font-black text-slate-900 text-xs">{row.routeId}</span>
                          </div>
                        </td>
                        <td className="px-4 py-5 text-center">
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-[10px] font-black text-slate-600 uppercase">
                            <Calendar className="h-3 w-3" /> {shortDate(row.routeDate)}
                          </div>
                        </td>
                        <td className="px-4 py-5 text-center">
                          <span className="text-[10px] font-bold text-slate-500 uppercase">{row.market}</span>
                        </td>
                        <td className="px-4 py-5 text-center bg-primary/5">
                          {matchedInternal ? (
                            <Badge className="bg-primary text-white text-[10px] font-black uppercase">
                              {matchedInternal.route}
                            </Badge>
                          ) : (
                            <span className="text-[9px] font-bold uppercase text-slate-300 italic">No Match Found</span>
                          )}
                        </td>
                        
                        <td className="px-4 py-5 text-center font-bold text-slate-500 bg-slate-50/50">{row.routeMiles}</td>
                        <td className={cn("px-4 py-5 text-center font-bold bg-slate-50/30", !milesMatch && matchedInternal ? "text-rose-500 underline decoration-dotted decoration-2 underline-offset-4" : "text-slate-900")}>
                          {matchedInternal?.miles ?? "—"}
                        </td>
                        
                        <td className="px-4 py-5 text-center font-bold text-slate-500 bg-slate-50/50">{row.stopCount}</td>
                        <td className={cn("px-4 py-5 text-center font-bold bg-slate-50/30", !stopsMatch && matchedInternal ? "text-rose-500 underline decoration-dotted decoration-2 underline-offset-4" : "text-slate-900")}>
                          {matchedInternal?.stops ?? "—"}
                        </td>
                        
                        <td className="px-4 py-5 text-right font-black text-primary bg-slate-50/30">
                          {currency(liveInternalEst)}
                        </td>
                        <td className="px-4 py-5 text-right font-black text-slate-900 bg-slate-50/50">
                          {currency(row.rxoSettlementPay)}
                        </td>
                        
                        <td className={cn(
                          "px-4 py-5 text-right font-black text-xs border-l",
                          isRed ? "text-rose-600 bg-rose-50/30" : "text-emerald-600 bg-emerald-50/30"
                        )}>
                          {currency(liveDelta)}
                        </td>
                        
                        <td className="px-4 py-5 text-center">
                          <div className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase border-2",
                            isRed ? "bg-rose-50 text-rose-600 border-rose-200" : "bg-emerald-50 text-emerald-600 border-emerald-200"
                          )}>
                            {isRed ? <AlertCircle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                            {isRed ? "RED" : "GREEN"}
                          </div>
                        </td>
                        
                        <td className="px-8 py-5 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <Badge variant="outline" className={cn(
                              "text-[8px] font-black uppercase px-2 py-0.5",
                              row.matchStatus === 'Matched' ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"
                            )}>
                              {row.matchStatus}
                            </Badge>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="rounded-full"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="rounded-xl w-56 p-2">
                                <DropdownMenuItem className="rounded-lg font-bold text-xs uppercase text-primary gap-2">
                                    <ArrowRightLeft className="h-3 w-3" /> Manual Overwrite
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
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
