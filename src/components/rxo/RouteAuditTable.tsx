"use client";

import React, { useState } from "react";
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
  Plus,
  Info,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { RXORouteDetail, RouteTrackerRow } from "@/app/lib/types";
import { currency, shortDate } from "@/app/lib/payroll-utils";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface RouteAuditTableProps {
  routeDetails: RXORouteDetail[];
  internalRoutes: RouteTrackerRow[];
  search: string;
  setSearch: (v: string) => void;
  onRecalculate: () => void;
  onAddInternalRoute?: (route: RouteTrackerRow) => void;
}

export function RouteAuditTable({ routeDetails, internalRoutes, search, setSearch, onRecalculate, onAddInternalRoute }: RouteAuditTableProps) {
  const filtered = routeDetails.filter(r => 
    r.routeId.toLowerCase().includes(search.toLowerCase()) ||
    r.market.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Search RXO Route ID or Market..." className="pl-10 h-11 rounded-xl bg-white border-slate-200 shadow-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="h-11 rounded-xl bg-white font-bold" onClick={onRecalculate}>
            <RefreshCw className="mr-2 h-4 w-4" /> Re-sync with Internal Logs
          </Button>
          <Button variant="outline" className="h-11 rounded-xl bg-white font-bold">
            <Download className="mr-2 h-4 w-4" /> Export Audit Report
          </Button>
        </div>
      </div>

      <Card className="rounded-[2.5rem] border-0 shadow-sm overflow-hidden bg-white">
        <CardContent className="p-0">
          <ScrollArea className="w-full">
            <div className="min-w-[2200px]">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-widest min-w-[220px]">RXO Route ID</th>
                    <th className="px-4 py-5 text-left text-[10px] font-black uppercase tracking-widest border-l border-white/10 min-w-[150px]">Internal Route</th>
                    <th className="px-4 py-5 text-left text-[10px] font-black uppercase tracking-widest">Market</th>
                    
                    <th className="px-4 py-5 text-center text-[10px] font-black uppercase tracking-widest bg-slate-800">RXO Miles</th>
                    <th className="px-4 py-5 text-center text-[10px] font-black uppercase tracking-widest bg-slate-700">Internal Miles</th>
                    
                    <th className="px-4 py-5 text-center text-[10px] font-black uppercase tracking-widest bg-slate-800">RXO Stops</th>
                    <th className="px-4 py-5 text-center text-[10px] font-black uppercase tracking-widest bg-slate-700">Internal Stops</th>
                    
                    <th className="px-4 py-5 text-right text-[10px] font-black uppercase tracking-widest border-l border-white/10 bg-slate-800">RXO Pay</th>
                    <th className="px-4 py-5 text-right text-[10px] font-black uppercase tracking-widest bg-slate-700">Internal Est. Pay</th>
                    
                    <th className="px-4 py-5 text-right text-[10px] font-black uppercase tracking-widest border-l border-white/10">Delta</th>
                    <th className="px-4 py-5 text-center text-[10px] font-black uppercase tracking-widest">Audit Status</th>
                    <th className="px-8 py-5 text-right text-[10px] font-black uppercase tracking-widest">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="px-8 py-20 text-center text-slate-400 font-bold uppercase text-[10px]">No records found for the selected review week.</td>
                    </tr>
                  ) : filtered.map(row => {
                    const matchedInternal = internalRoutes.find(ir => ir.id === row.internalRouteId);
                    const hasDiscrepancy = row.deltaStatus === 'RED';
                    const milesMatch = matchedInternal ? row.routeMiles === matchedInternal.miles : true;
                    const stopsMatch = matchedInternal ? row.stopCount === matchedInternal.stops : true;
                    
                    return (
                      <tr key={row.id} className={cn("hover:bg-slate-50/50 transition-colors group", !matchedInternal && "bg-slate-50/20")}>
                        <td className="px-8 py-5 font-black text-slate-900 text-xs">
                          <div className="flex flex-col">
                            <span>{row.routeId}</span>
                            <span className="text-[9px] text-slate-400 font-bold uppercase">{shortDate(row.routeDate)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-5 border-l">
                          {matchedInternal ? (
                            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px] font-black uppercase px-3 py-1">
                              {matchedInternal.route}
                            </Badge>
                          ) : (
                            <div className="flex items-center gap-2 text-rose-400">
                              <span className="text-[10px] font-bold uppercase italic">Unmatched</span>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild><AlertCircle className="h-3 w-3 cursor-help" /></TooltipTrigger>
                                  <TooltipContent><p className="text-[10px] font-bold">No internal log found for this RXO ID on this date.</p></TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-5 text-[10px] font-bold text-slate-500 uppercase">{row.market}</td>
                        
                        <td className="px-4 py-5 text-center font-bold text-slate-900 bg-slate-50/30">{row.routeMiles}</td>
                        <td className={cn("px-4 py-5 text-center font-bold bg-slate-50/50", milesMatch ? "text-slate-400" : "text-rose-500 underline decoration-dotted decoration-2 underline-offset-4")}>
                          {matchedInternal?.miles ?? "—"}
                        </td>
                        
                        <td className="px-4 py-5 text-center font-bold text-slate-900 bg-slate-50/30">{row.stopCount}</td>
                        <td className={cn("px-4 py-5 text-center font-bold bg-slate-50/50", stopsMatch ? "text-slate-400" : "text-rose-500 underline decoration-dotted decoration-2 underline-offset-4")}>
                          {matchedInternal?.stops ?? "—"}
                        </td>
                        
                        <td className="px-4 py-5 text-right font-black text-slate-900 bg-slate-50/30 border-l border-slate-200">{currency(row.rxoSettlementPay)}</td>
                        <td className="px-4 py-5 text-right font-bold text-primary bg-slate-50/50">{currency(row.systemEstimatedPay)}</td>
                        
                        <td className={cn(
                          "px-4 py-5 text-right font-black text-xs border-l",
                          hasDiscrepancy ? "text-rose-600 bg-rose-50/30" : "text-emerald-600 bg-emerald-50/30"
                        )}>
                          {currency(row.delta)}
                        </td>
                        
                        <td className="px-4 py-5 text-center">
                          <div className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase border-2",
                            hasDiscrepancy 
                              ? "bg-rose-50 text-rose-600 border-rose-200" 
                              : "bg-emerald-50 text-emerald-600 border-emerald-200"
                          )}>
                            {hasDiscrepancy ? <AlertCircle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                            {hasDiscrepancy ? "Discrepancy" : "Verified"}
                          </div>
                        </td>
                        
                        <td className="px-8 py-5 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="rounded-full"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-xl w-56 p-2">
                              {!matchedInternal && (
                                <DropdownMenuItem className="rounded-lg font-bold text-xs uppercase text-emerald-600 gap-2">
                                  <Plus className="h-3 w-3" /> Create Internal Log
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem className="rounded-lg font-bold text-xs uppercase text-primary gap-2">
                                  <ArrowRightLeft className="h-3 w-3" /> Manual Match ID
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
