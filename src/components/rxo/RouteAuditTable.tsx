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
  Plus
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
          <Input placeholder="Search routes or markets..." className="pl-10 h-11 rounded-xl bg-white border-slate-200 shadow-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="h-11 rounded-xl bg-white font-bold" onClick={onRecalculate}><RefreshCw className="mr-2 h-4 w-4" /> Sync With Logs</Button>
          <Button variant="outline" className="h-11 rounded-xl bg-white font-bold"><Download className="mr-2 h-4 w-4" /> Export Report</Button>
        </div>
      </div>

      <Card className="rounded-[2.5rem] border-0 shadow-sm overflow-hidden bg-white">
        <CardContent className="p-0">
          <ScrollArea className="w-full">
            <div className="min-w-[1800px]">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-widest">RXO Route ID</th>
                    <th className="px-4 py-5 text-left text-[10px] font-black uppercase tracking-widest">Internal Route</th>
                    <th className="px-4 py-5 text-left text-[10px] font-black uppercase tracking-widest">Market</th>
                    <th className="px-4 py-5 text-center text-[10px] font-black uppercase tracking-widest">Route Miles</th>
                    <th className="px-4 py-5 text-center text-[10px] font-black uppercase tracking-widest">Stop Count</th>
                    <th className="px-4 py-5 text-right text-[10px] font-black uppercase tracking-widest">Est. Pay (SO)</th>
                    <th className="px-4 py-5 text-right text-[10px] font-black uppercase tracking-widest">RXO Settlement Pay</th>
                    <th className="px-4 py-5 text-right text-[10px] font-black uppercase tracking-widest">Delta</th>
                    <th className="px-4 py-5 text-center text-[10px] font-black uppercase tracking-widest">Delta Status</th>
                    <th className="px-8 py-5 text-right text-[10px] font-black uppercase tracking-widest">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-8 py-20 text-center text-slate-400 font-bold uppercase text-[10px]">No route records found</td>
                    </tr>
                  ) : filtered.map(row => {
                    const matchedInternal = internalRoutes.find(ir => ir.id === row.internalRouteId);
                    
                    return (
                      <tr key={row.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-8 py-5 font-black text-slate-900 text-xs">
                          <div className="flex flex-col">
                            <span>{row.routeId}</span>
                            <span className="text-[9px] text-slate-400 font-bold uppercase">{shortDate(row.routeDate)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-5">
                          {matchedInternal ? (
                            <Badge variant="outline" className="bg-slate-50 text-[10px] font-black uppercase px-3 py-1">
                              {matchedInternal.route}
                            </Badge>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-300 uppercase italic">Unmatched</span>
                          )}
                        </td>
                        <td className="px-4 py-5 text-[10px] font-bold text-slate-500 uppercase">{row.market}</td>
                        <td className="px-4 py-5 text-center font-bold text-slate-500">{row.routeMiles}</td>
                        <td className="px-4 py-5 text-center font-black text-slate-900">{row.stopCount}</td>
                        <td className="px-4 py-5 text-right font-bold text-primary">{currency(row.systemEstimatedPay)}</td>
                        <td className="px-4 py-5 text-right font-black text-slate-900">{currency(row.rxoSettlementPay)}</td>
                        <td className={cn(
                          "px-4 py-5 text-right font-black",
                          row.delta < 0 ? "text-rose-500" : "text-emerald-500"
                        )}>
                          {currency(row.delta)}
                        </td>
                        <td className="px-4 py-5 text-center">
                          <Badge variant="outline" className={cn(
                            "text-[9px] font-black uppercase px-3 py-1 border-2 shadow-sm",
                            row.deltaStatus === 'RED' 
                              ? "bg-rose-50 text-rose-600 border-rose-200" 
                              : "bg-emerald-50 text-emerald-600 border-emerald-200"
                          )}>
                            {row.deltaStatus === 'RED' ? "DISCREPANCY" : "VERIFIED"}
                          </Badge>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="rounded-full"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-xl w-56 p-2">
                              {row.matchStatus !== 'Matched' && (
                                <DropdownMenuItem className="rounded-lg font-bold text-xs uppercase text-emerald-600">
                                  <Plus className="mr-2 h-3 w-3" /> Create Log Entry
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem className="rounded-lg font-bold text-xs uppercase text-primary">
                                  <ArrowRightLeft className="mr-2 h-3 w-3" /> Rematch Route
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
