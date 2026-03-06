
"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RouteTrackerRow } from "@/app/lib/types";
import { currency, shortDate, estimatePay, estimateFuel, driverPay, helperPay } from "@/app/lib/payroll-utils";

interface RouteTrackerViewProps {
  routeTracker: RouteTrackerRow[];
}

export function RouteTrackerView({ routeTracker }: RouteTrackerViewProps) {
  return (
    <div className="animate-in fade-in duration-500">
      <Card className="rounded-[2.5rem] border-0 shadow-sm overflow-hidden bg-white">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-6 w-1 bg-primary rounded-full" />
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Route Tracker Source Data</CardTitle>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Driver</span>
                <span className="text-xs font-black text-slate-900 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">27%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Helper</span>
                <span className="text-xs font-black text-slate-900 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">23%</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <div className="min-w-[1200px]">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50/80">
                    {[
                      "Date",
                      "Client",
                      "Miles",
                      "Stops",
                      "EST. PAY (27×Stops)",
                      "EST. FUEL",
                      "Driver",
                      "Driver Pay (27%)",
                      "Helper",
                      "Helper Pay (23%)",
                    ].map((header) => (
                      <th key={header} className="px-4 py-5 text-left text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 whitespace-nowrap">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {routeTracker.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/30 transition-all group">
                      <td className="px-4 py-4 text-xs font-bold text-slate-900">{shortDate(row.date)}</td>
                      <td className="px-4 py-4 text-xs font-semibold text-slate-500">{row.client}</td>
                      <td className="px-4 py-4 text-xs font-bold text-slate-700">{row.miles}</td>
                      <td className="px-4 py-4 text-xs font-bold text-slate-700">{row.stops}</td>
                      <td className="px-4 py-4 text-xs font-black text-primary">{currency(estimatePay(row.stops))}</td>
                      <td className="px-4 py-4 text-xs font-medium text-slate-400 italic">{currency(estimateFuel(row.miles))}</td>
                      <td className="px-4 py-4 text-xs font-bold text-slate-700">{row.driver}</td>
                      <td className="px-4 py-4 text-xs font-black text-emerald-600">{currency(driverPay(row.stops))}</td>
                      <td className="px-4 py-4 text-xs font-bold text-slate-700">{row.helper || "—"}</td>
                      <td className="px-4 py-4 text-xs font-black text-emerald-600">{row.helper ? currency(helperPay(row.stops)) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
