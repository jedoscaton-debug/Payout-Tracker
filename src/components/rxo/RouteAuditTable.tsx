
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
  Eye, 
  FileText, 
  ShieldCheck,
  Filter
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RXORouteDetail, RXOOrderDetail } from "@/app/lib/types";
import { currency, shortDate } from "@/app/lib/payroll-utils";
import { cn } from "@/lib/utils";

interface RouteAuditTableProps {
  routeDetails: RXORouteDetail[];
  orderDetails: RXOOrderDetail[];
  search: string;
  setSearch: (v: string) => void;
  onRecalculate: () => void;
}

export function RouteAuditTable({ routeDetails, orderDetails, search, setSearch, onRecalculate }: RouteAuditTableProps) {
  const [selectedRoute, setSelectedRoute] = useState<RXORouteDetail | null>(null);

  const filtered = routeDetails.filter(r => 
    r.routeId.toLowerCase().includes(search.toLowerCase()) ||
    r.market.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Search routes or markets..." className="pl-10 h-11 rounded-xl bg-white border-slate-200" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="h-11 rounded-xl bg-white font-bold" onClick={onRecalculate}><RefreshCw className="mr-2 h-4 w-4" /> Sync Audit</Button>
          <Button variant="outline" className="h-11 rounded-xl bg-white font-bold"><Download className="mr-2 h-4 w-4" /> Export Audit</Button>
        </div>
      </div>

      <Card className="rounded-[2.5rem] border-0 shadow-sm overflow-hidden bg-white">
        <CardContent className="p-0">
          <ScrollArea className="w-full">
            <div className="min-w-[1600px]">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-widest">Route ID</th>
                    <th className="px-4 py-5 text-left text-[10px] font-black uppercase tracking-widest">Market</th>
                    <th className="px-4 py-5 text-center text-[10px] font-black uppercase tracking-widest">Date</th>
                    <th className="px-4 py-5 text-center text-[10px] font-black uppercase tracking-widest">Miles</th>
                    <th className="px-4 py-5 text-center text-[10px] font-black uppercase tracking-widest">Stops</th>
                    <th className="px-4 py-5 text-right text-[10px] font-black uppercase tracking-widest">RXO Settlement</th>
                    <th className="px-4 py-5 text-right text-[10px] font-black uppercase tracking-widest">System Est.</th>
                    <th className="px-4 py-5 text-right text-[10px] font-black uppercase tracking-widest">Delta</th>
                    <th className="px-4 py-5 text-center text-[10px] font-black uppercase tracking-widest">Status</th>
                    <th className="px-4 py-5 text-center text-[10px] font-black uppercase tracking-widest">Match</th>
                    <th className="px-8 py-5 text-right text-[10px] font-black uppercase tracking-widest">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map(row => (
                    <tr key={row.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-5 font-black text-slate-900">{row.routeId}</td>
                      <td className="px-4 py-5 text-xs font-bold text-slate-500 uppercase">{row.market}</td>
                      <td className="px-4 py-5 text-center text-[10px] font-bold text-slate-400 uppercase">{shortDate(row.routeDate)}</td>
                      <td className="px-4 py-5 text-center font-bold text-slate-500">{row.routeMiles}</td>
                      <td className="px-4 py-5 text-center font-black text-slate-900">{row.stopCount}</td>
                      <td className="px-4 py-5 text-right font-black text-slate-900">{currency(row.rxoSettlementPay)}</td>
                      <td className="px-4 py-5 text-right font-bold text-slate-400 italic">{currency(row.systemEstimatedPay)}</td>
                      <td className={cn("px-4 py-5 text-right font-black", row.delta < 0 ? "text-rose-500" : "text-emerald-500")}>
                        {currency(row.delta)}
                      </td>
                      <td className="px-4 py-5 text-center">
                        <Badge variant="outline" className={cn(
                          "text-[9px] font-black uppercase px-2 py-0.5",
                          row.deltaStatus === 'RED' ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
                        )}>
                          {row.deltaStatus === 'RED' ? "UNDERPAID" : "OK"}
                        </Badge>
                      </td>
                      <td className="px-4 py-5 text-center">
                        <Badge variant="outline" className={cn(
                          "text-[9px] font-black uppercase px-2 py-0.5",
                          row.matchStatus === 'Matched' ? "bg-blue-50 text-blue-600 border-blue-100" : 
                          row.matchStatus === 'Partial Match' ? "bg-amber-50 text-amber-600 border-amber-100" : 
                          "bg-slate-50 text-slate-400 border-slate-100"
                        )}>
                          {row.matchStatus}
                        </Badge>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="rounded-full"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl w-48 p-2">
                            <DropdownMenuItem className="rounded-lg font-bold text-xs uppercase" onClick={() => setSelectedRoute(row)}>
                              <Eye className="mr-2 h-3 w-3" /> View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem className="rounded-lg font-bold text-xs uppercase">
                              <FileText className="mr-2 h-3 w-3" /> RXO Breakdown
                            </DropdownMenuItem>
                            <DropdownMenuItem className="rounded-lg font-bold text-xs uppercase text-primary">
                              <ArrowRightLeft className="mr-2 h-3 w-3" /> Match System Log
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={!!selectedRoute} onOpenChange={(o) => !o && setSelectedRoute(null)}>
        <DialogContent className="max-w-4xl p-0 border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden">
          <DialogHeader className="p-8 bg-slate-900 text-white">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Route {selectedRoute?.routeId}</DialogTitle>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{selectedRoute?.market} • {selectedRoute && shortDate(selectedRoute.routeDate)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Audit Status</p>
                <Badge className={cn("mt-1 font-black", selectedRoute?.deltaStatus === 'RED' ? "bg-rose-500 text-white" : "bg-emerald-500 text-white")}>
                  {selectedRoute?.deltaStatus === 'RED' ? "SETTLEMENT DISCREPANCY" : "SETTLEMENT VERIFIED"}
                </Badge>
              </div>
            </div>
          </DialogHeader>
          <div className="p-10 space-y-8">
            <div className="grid grid-cols-3 gap-6">
              <div className="p-6 rounded-2xl bg-slate-50 space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase">RXO Settlement</p>
                <p className="text-2xl font-black text-slate-900">{currency(selectedRoute?.rxoSettlementPay || 0)}</p>
              </div>
              <div className="p-6 rounded-2xl bg-slate-50 space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase">System Estimate</p>
                <p className="text-2xl font-black text-slate-900">{currency(selectedRoute?.systemEstimatedPay || 0)}</p>
              </div>
              <div className={cn("p-6 rounded-2xl space-y-1", selectedRoute?.delta && selectedRoute.delta < 0 ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600")}>
                <p className="text-[10px] font-black uppercase opacity-60">Delta / Variance</p>
                <p className="text-2xl font-black">{currency(selectedRoute?.delta || 0)}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-black uppercase tracking-widest text-slate-900">RXO Order Details (Payout Support)</h4>
                <Badge variant="outline" className="bg-slate-50 uppercase text-[9px] font-black">
                  {orderDetails.filter(o => o.routeId === selectedRoute?.routeId).length} line items
                </Badge>
              </div>
              <Card className="border border-slate-100 rounded-2xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-black uppercase text-slate-400 text-[10px]">Job #</th>
                      <th className="px-4 py-3 text-left font-black uppercase text-slate-400 text-[10px]">Service</th>
                      <th className="px-4 py-3 text-right font-black uppercase text-slate-400 text-[10px]">Rate</th>
                      <th className="px-4 py-3 text-right font-black uppercase text-slate-400 text-[10px]">Mileage</th>
                      <th className="px-4 py-3 text-right font-black uppercase text-slate-400 text-[10px]">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {orderDetails.filter(o => o.routeId === selectedRoute?.routeId).map(order => (
                      <tr key={order.id}>
                        <td className="px-4 py-3 font-bold">{order.jobNumber}</td>
                        <td className="px-4 py-3 text-slate-500">{order.service}</td>
                        <td className="px-4 py-3 text-right font-medium">{currency(order.rate)}</td>
                        <td className="px-4 py-3 text-right font-medium">{currency(order.mileage)}</td>
                        <td className="px-4 py-3 text-right font-black text-slate-900">{currency(order.rate + order.mileage + order.supplement)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
