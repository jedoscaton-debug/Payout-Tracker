"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RouteTrackerRow } from "@/app/lib/types";
import { 
  currency, 
  shortDate, 
  getDayOfWeek, 
  estimatePay, 
  estimateFuel, 
  driverPay, 
  helperPay,
  truckRentalMileageCost
} from "@/app/lib/payroll-utils";

interface RouteTrackerViewProps {
  routeTracker: RouteTrackerRow[];
}

export function RouteTrackerView({ routeTracker }: RouteTrackerViewProps) {
  const headers = [
    "Route",
    "Route Type",
    "Vehicle #",
    "Date",
    "Day of Week",
    "Miles",
    "Stops",
    "Estimated Pay",
    "Actual Pay - Audit",
    "Delta - Audit",
    "", // Spacer
    "Driver",
    "", // Spacer
    "Helper(s)",
    "Driver Pay",
    "Helper(s) Pay",
    "Truck Rental",
    "Truck Rental Mileage Cost",
    "Insurance",
    "Est. Fuel",
    "Total Expenses",
    "Net Profit"
  ];

  return (
    <div className="animate-in fade-in duration-500">
      <Card className="rounded-[2.5rem] border-0 shadow-sm overflow-hidden bg-white">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-6 w-1 bg-primary rounded-full" />
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Route Financial Auditor</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto relative">
            <div className="min-w-[2600px]">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50/80">
                    <th className="sticky left-0 z-30 bg-white border-b border-r border-slate-200 px-6 py-5 text-left text-[10px] font-black uppercase tracking-[0.15em] text-slate-900 whitespace-nowrap shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                      {headers[0]}
                    </th>
                    {headers.slice(1).map((header, i) => (
                      <th 
                        key={`${header}-${i}`} 
                        className="border-b border-slate-100 px-4 py-5 text-left text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 whitespace-nowrap"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {routeTracker.map((row) => {
                    const estRev = estimatePay(row.stops);
                    const delta = row.actualPayAudit - estRev;
                    const dPay = driverPay(row.stops);
                    const hPay = row.helper ? helperPay(row.stops) : 0;
                    const mileageCost = truckRentalMileageCost(row.miles);
                    const fuel = estimateFuel(row.miles);
                    const totalExp = row.truckRental + mileageCost + row.insurance + fuel;
                    const netProfit = row.actualPayAudit - totalExp - dPay - hPay;

                    return (
                      <tr key={row.id} className="hover:bg-slate-50/30 transition-all group align-top">
                        <td className="sticky left-0 z-20 bg-white px-6 py-6 font-black text-slate-900 whitespace-nowrap border-r border-slate-100 shadow-[2px_0_5px_rgba(0,0,0,0.05)] group-hover:bg-slate-50/80">
                          {row.route}
                        </td>
                        <td className="px-4 py-6 text-xs font-bold text-slate-500 whitespace-nowrap">{row.routeType}</td>
                        <td className="px-4 py-6 text-xs font-black text-slate-900">{row.vehicleNumber}</td>
                        <td className="px-4 py-6 text-xs font-bold text-slate-700">{shortDate(row.date)}</td>
                        <td className="px-4 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">{getDayOfWeek(row.date)}</td>
                        <td className="px-4 py-6 text-xs font-bold text-slate-700">{row.miles}</td>
                        <td className="px-4 py-6 text-xs font-bold text-slate-700">{row.stops}</td>
                        <td className="px-4 py-6 text-xs font-black text-primary">{currency(estRev)}</td>
                        <td className="px-4 py-6 text-xs font-black text-slate-900">{currency(row.actualPayAudit)}</td>
                        <td className={`px-4 py-6 text-xs font-black ${delta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {currency(delta)}
                        </td>
                        <td className="px-4 py-6 w-12 border-l border-slate-100 bg-slate-50/20"></td>
                        <td className="px-4 py-6 text-xs font-black text-slate-900 whitespace-nowrap">{row.driver}</td>
                        <td className="px-4 py-6 w-12 border-l border-slate-100 bg-slate-50/20"></td>
                        <td className="px-4 py-6 text-xs font-bold text-slate-500 whitespace-nowrap">{row.helper || "—"}</td>
                        <td className="px-4 py-6 text-xs font-black text-emerald-600">{currency(dPay)}</td>
                        <td className="px-4 py-6 text-xs font-black text-emerald-600">{row.helper ? currency(hPay) : "—"}</td>
                        <td className="px-4 py-6 text-xs font-bold text-slate-500">{currency(row.truckRental)}</td>
                        <td className="px-4 py-6 text-xs font-bold text-slate-500">{currency(mileageCost)}</td>
                        <td className="px-4 py-6 text-xs font-bold text-slate-500">{currency(row.insurance)}</td>
                        <td className="px-4 py-6 text-xs font-medium text-slate-400 italic">{currency(fuel)}</td>
                        <td className="px-4 py-6">
                          <div className="bg-rose-50 text-rose-600 rounded-lg px-3 py-1.5 font-black text-xs border border-rose-100/50">
                            {currency(totalExp)}
                          </div>
                        </td>
                        <td className="px-4 py-6">
                          <div className={`rounded-xl px-4 py-2 font-black text-xs shadow-lg ${netProfit >= 0 ? 'bg-primary text-white shadow-primary/20' : 'bg-rose-600 text-white shadow-rose-600/20'}`}>
                            {currency(netProfit)}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
