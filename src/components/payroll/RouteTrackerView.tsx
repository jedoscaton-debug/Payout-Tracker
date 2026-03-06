"use client";

import React, { useMemo } from "react";
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
  truckRentalMileageCost,
  TRUCK_RENTAL_FIXED
} from "@/app/lib/payroll-utils";
import { cn } from "@/lib/utils";

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
    "", // Spacer 1
    "Driver",
    "", // Spacer 2
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

  const totals = useMemo(() => {
    return routeTracker.reduce((acc, row) => {
      const estRev = estimatePay(row.stops);
      const dPay = driverPay(row.stops);
      const hPay = row.helper ? helperPay(row.stops) : 0;
      const fuel = estimateFuel(row.miles);
      const mileageCost = truckRentalMileageCost(row.miles);
      const totalExp = row.truckRental + mileageCost + row.insurance + fuel;
      const actualPay = row.actualPayAudit || estRev;

      return {
        miles: acc.miles + (row.miles || 0),
        stops: acc.stops + (row.stops || 0),
        estPay: acc.estPay + estRev,
        driverPay: acc.driverPay + dPay,
        helperPay: acc.helperPay + hPay,
        truckRental: acc.truckRental + row.truckRental,
        fuel: acc.fuel + fuel,
        totalExp: acc.totalExp + totalExp,
        netProfit: acc.netProfit + (actualPay - totalExp - dPay - hPay)
      };
    }, {
      miles: 0, stops: 0, estPay: 0, driverPay: 0, helperPay: 0, truckRental: 0, fuel: 0, totalExp: 0, netProfit: 0
    });
  }, [routeTracker]);

  return (
    <div className="animate-in fade-in duration-500">
      <Card className="rounded-[1.5rem] border border-slate-200 shadow-xl overflow-hidden bg-white">
        <CardHeader className="bg-slate-900 border-b border-slate-800 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-1.5 bg-primary rounded-full" />
              <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-white">Route Financial Audit (Week Feb 22 - Feb 28, 2026)</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto relative">
            <div className="min-w-[2800px]">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-white border-b-2 border-slate-900">
                    <th className="sticky left-0 z-40 bg-white border-r-2 border-slate-900 px-4 py-4 text-center text-[10px] font-black uppercase tracking-wider text-slate-900 whitespace-nowrap">
                      {headers[0]}
                    </th>
                    {headers.slice(1).map((header, i) => (
                      <th 
                        key={`${header}-${i}`} 
                        className={cn(
                          "border-r border-slate-200 px-3 py-4 text-center text-[9px] font-black uppercase tracking-wider text-slate-900 whitespace-nowrap",
                          header === "" && "w-8 bg-slate-50 border-x-2 border-slate-300"
                        )}
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {routeTracker.map((row, idx) => {
                    const estRev = estimatePay(row.stops);
                    const actualPay = row.actualPayAudit || 0;
                    const delta = actualPay ? actualPay - estRev : 0;
                    const dPay = driverPay(row.stops);
                    const hPay = row.helper ? helperPay(row.stops) : 0;
                    const mileageCost = truckRentalMileageCost(row.miles);
                    const fuel = estimateFuel(row.miles);
                    const totalExp = row.truckRental + mileageCost + row.insurance + fuel;
                    const netProfit = (actualPay || estRev) - totalExp - dPay - hPay;
                    
                    // Sample logic for yellow highlighting from the image
                    const isYellow = idx % 3 === 2 || row.route === "EV" || row.route === "GAS";

                    return (
                      <tr key={row.id} className={cn("transition-colors group align-middle h-12", isYellow ? "bg-yellow-300/90" : "bg-white hover:bg-slate-50")}>
                        <td className={cn("sticky left-0 z-30 px-4 py-2 font-bold text-slate-900 text-center whitespace-nowrap border-r-2 border-slate-900", isYellow ? "bg-yellow-300" : "bg-white group-hover:bg-slate-50")}>
                          {row.route}
                        </td>
                        <td className="px-3 py-2 text-[10px] font-bold text-center border-r border-slate-200">{row.routeType}</td>
                        <td className="px-3 py-2 text-[10px] font-black text-center border-r border-slate-200">{row.vehicleNumber}</td>
                        <td className="px-3 py-2 text-[10px] font-bold text-center border-r border-slate-200">{shortDate(row.date)}</td>
                        <td className="px-3 py-2 text-[10px] font-bold text-center border-r border-slate-200">{getDayOfWeek(row.date)}</td>
                        <td className="px-3 py-2 text-[10px] font-bold text-center border-r border-slate-200">{row.miles || ""}</td>
                        <td className="px-3 py-2 text-[10px] font-bold text-center border-r border-slate-200">{row.stops}</td>
                        <td className="px-3 py-2 text-[10px] font-bold text-center border-r border-slate-200 italic">{currency(estRev)}</td>
                        <td className="px-3 py-2 text-[10px] font-bold text-center border-r border-slate-200">
                          {actualPay ? currency(actualPay) : ""}
                        </td>
                        <td className={cn("px-3 py-2 text-[10px] font-bold text-center border-r border-slate-200", delta < 0 ? "text-rose-600" : delta > 0 ? "text-emerald-600" : "")}>
                          {delta !== 0 ? currency(delta) : ""}
                        </td>
                        <td className="px-3 py-2 bg-slate-50/50 border-x border-slate-300"></td>
                        <td className="px-3 py-2 text-[10px] font-bold text-center border-r border-slate-200 whitespace-nowrap">{row.driver}</td>
                        <td className="px-3 py-2 bg-slate-50/50 border-x border-slate-300"></td>
                        <td className="px-3 py-2 text-[10px] font-bold text-center border-r border-slate-200 whitespace-nowrap">{row.helper || ""}</td>
                        <td className="px-3 py-2 text-[10px] font-bold text-center border-r border-slate-200">{currency(dPay)}</td>
                        <td className="px-3 py-2 text-[10px] font-bold text-center border-r border-slate-200">{hPay > 0 ? currency(hPay) : ""}</td>
                        <td className="px-3 py-2 text-[10px] font-bold text-center border-r border-slate-200">{currency(row.truckRental)}</td>
                        <td className="px-3 py-2 text-[10px] font-bold text-center border-r border-slate-200">{currency(mileageCost)}</td>
                        <td className="px-3 py-2 text-[10px] font-bold text-center border-r border-slate-200 italic text-slate-400">TBD</td>
                        <td className="px-3 py-2 text-[10px] font-bold text-center border-r border-slate-200">{currency(fuel)}</td>
                        <td className="px-3 py-2 text-[10px] font-bold text-center border-r border-slate-200">{currency(totalExp)}</td>
                        <td className={cn("px-4 py-2 text-[10px] font-black text-center", netProfit < 0 ? "text-white bg-rose-600" : "text-slate-900")}>
                          {currency(netProfit)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-900 text-white font-black text-[11px] h-14">
                    <td className="sticky left-0 z-40 bg-slate-900 border-r-2 border-slate-800 px-4 py-2 text-center uppercase">Totals</td>
                    <td colSpan={4} className="border-r border-slate-800"></td>
                    <td className="px-3 py-2 text-center border-r border-slate-800">{totals.miles}</td>
                    <td className="px-3 py-2 text-center border-r border-slate-800">{totals.stops}</td>
                    <td className="px-3 py-2 text-center border-r border-slate-800 italic">{currency(totals.estPay)}</td>
                    <td colSpan={6} className="border-r border-slate-800"></td>
                    <td className="px-3 py-2 text-center border-r border-slate-800">{currency(totals.driverPay)}</td>
                    <td className="px-3 py-2 text-center border-r border-slate-800">{currency(totals.helperPay)}</td>
                    <td className="px-3 py-2 text-center border-r border-slate-800">{currency(totals.truckRental)}</td>
                    <td className="border-r border-slate-800"></td>
                    <td className="border-r border-slate-800"></td>
                    <td className="px-3 py-2 text-center border-r border-slate-800">{currency(totals.fuel)}</td>
                    <td className="px-3 py-2 text-center border-r border-slate-800">{currency(totals.totalExp)}</td>
                    <td className="px-4 py-2 text-center bg-slate-800">{currency(totals.netProfit)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
