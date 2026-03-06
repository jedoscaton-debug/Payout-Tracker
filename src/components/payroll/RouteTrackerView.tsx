"use client";

import React, { useMemo, useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RouteTrackerRow, Employee } from "@/app/lib/types";
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
import { Plus, Search } from "lucide-react";

interface RouteTrackerViewProps {
  routeTracker: RouteTrackerRow[];
  onAddRoute?: (route: RouteTrackerRow) => void;
  employees?: Employee[];
}

export function RouteTrackerView({ routeTracker, onAddRoute, employees = [] }: RouteTrackerViewProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [search, setSearch] = useState("");
  
  const [newRoute, setNewRoute] = useState<Partial<RouteTrackerRow>>({
    route: "",
    routeType: "IKEA",
    vehicleNumber: "",
    date: new Date().toISOString().split('T')[0],
    miles: 0,
    stops: 0,
    actualPayAudit: 0,
    truckRental: TRUCK_RENTAL_FIXED,
    insurance: 0,
    driver: "",
    helper: ""
  });

  // Financial Calculations for the Form
  const estPayValue = estimatePay(newRoute.stops || 0);
  const deltaValue = (newRoute.actualPayAudit || 0) - estPayValue;
  const dPayValue = driverPay(newRoute.stops || 0);
  const hPayValue = newRoute.helper && newRoute.helper !== "No Helper" ? helperPay(newRoute.stops || 0) : 0;
  const mileageCostValue = truckRentalMileageCost(newRoute.miles || 0);
  const fuelValue = estimateFuel(newRoute.miles || 0);
  const totalExpensesValue = (newRoute.truckRental || 0) + mileageCostValue + fuelValue;
  const netProfitValue = (newRoute.actualPayAudit || estPayValue) - (totalExpensesValue + dPayValue + hPayValue);

  const headers = [
    "Route",
    "Route Type",
    "Vehicle #",
    "Date",
    "Day of Week",
    "Miles",
    "Stops",
    "Estimated Pay",
    "Actual Pay Audit",
    "Delta Audit",
    "Driver",
    "Helper(s)",
    "Driver Pay",
    "Helper(s) Pay",
    "Truck Rental",
    "Mileage Cost",
    "Insurance",
    "Est. Fuel",
    "Total Expenses",
    "Net Profit"
  ];

  const filtered = routeTracker.filter(r => 
    r.route.toLowerCase().includes(search.toLowerCase()) ||
    r.driver.toLowerCase().includes(search.toLowerCase()) ||
    (r.helper && r.helper.toLowerCase().includes(search.toLowerCase()))
  );

  const totals = useMemo(() => {
    return filtered.reduce((acc, row) => {
      const estRev = estimatePay(row.stops);
      const dPay = driverPay(row.stops);
      const hPay = row.helper ? helperPay(row.stops) : 0;
      const fuel = estimateFuel(row.miles);
      const mileageCost = truckRentalMileageCost(row.miles);
      const totalExp = (row.truckRental || 0) + mileageCost + (row.insurance || 0) + fuel;
      const actualPay = row.actualPayAudit || estRev;

      return {
        miles: acc.miles + (row.miles || 0),
        stops: acc.stops + (row.stops || 0),
        estPay: acc.estPay + estRev,
        driverPay: acc.driverPay + dPay,
        helperPay: acc.helperPay + hPay,
        truckRental: acc.truckRental + (row.truckRental || 0),
        fuel: acc.fuel + fuel,
        totalExp: acc.totalExp + totalExp,
        netProfit: acc.netProfit + (actualPay - totalExp - dPay - hPay)
      };
    }, {
      miles: 0, stops: 0, estPay: 0, driverPay: 0, helperPay: 0, truckRental: 0, fuel: 0, totalExp: 0, netProfit: 0
    });
  }, [filtered]);

  const handleSubmitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (onAddRoute) {
      onAddRoute({
        id: `rt-${Date.now()}`,
        ...newRoute as RouteTrackerRow
      });
      setIsAddOpen(false);
      setNewRoute({
        route: "",
        routeType: "IKEA",
        vehicleNumber: "",
        date: new Date().toISOString().split('T')[0],
        miles: 0,
        stops: 0,
        actualPayAudit: 0,
        truckRental: TRUCK_RENTAL_FIXED,
        insurance: 0,
        driver: "",
        helper: ""
      });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Route Audit Tracker</h3>
          <p className="text-sm text-slate-500 font-medium">Log and analyze daily route profitability and driver performance.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search routes or staff..." 
              className="pl-10 h-11 w-64 rounded-xl border-slate-200" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl h-11 bg-primary px-6 font-bold shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5">
                <Plus className="mr-2 h-4 w-4" /> Log Daily Route
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[1000px] p-0 border-none shadow-2xl rounded-[2rem] overflow-hidden bg-white">
              <div className="p-10 space-y-8">
                <div className="grid grid-cols-5 gap-x-6 gap-y-8">
                  {/* Row 1 */}
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Route ID</Label>
                    <Input placeholder="e.g. A01_EV" className="h-12 rounded-xl bg-slate-50 border-none font-bold" value={newRoute.route} onChange={(e) => setNewRoute({...newRoute, route: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Route Type</Label>
                    <Select value={newRoute.routeType} onValueChange={(v) => setNewRoute({...newRoute, routeType: v})}>
                      <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="IKEA">IKEA</SelectItem>
                        <SelectItem value="GAS">GAS</SelectItem>
                        <SelectItem value="EV">EV</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Vehicle #</Label>
                    <Input placeholder="e.g. 2" className="h-12 rounded-xl bg-slate-50 border-none font-bold" value={newRoute.vehicleNumber} onChange={(e) => setNewRoute({...newRoute, vehicleNumber: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Date</Label>
                    <Input type="date" className="h-12 rounded-xl bg-slate-50 border-none font-bold" value={newRoute.date} onChange={(e) => setNewRoute({...newRoute, date: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Day of Week</Label>
                    <div className="h-12 flex items-center px-4 rounded-xl bg-slate-50 text-slate-400 font-bold uppercase tracking-wider text-xs">
                      {getDayOfWeek(newRoute.date || "") || "Select Date"}
                    </div>
                  </div>

                  {/* Row 2 */}
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Miles</Label>
                    <Input type="number" className="h-12 rounded-xl bg-slate-50 border-none font-bold" value={newRoute.miles} onChange={(e) => setNewRoute({...newRoute, miles: Number(e.target.value)})} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Stops</Label>
                    <Input type="number" className="h-12 rounded-xl bg-slate-50 border-none font-bold" value={newRoute.stops} onChange={(e) => setNewRoute({...newRoute, stops: Number(e.target.value)})} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Est. Pay</Label>
                    <div className="h-12 flex items-center px-4 rounded-xl bg-slate-50 text-slate-400 font-bold">
                      {currency(estPayValue)}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Actual Pay (Audit)</Label>
                    <Input type="number" className="h-12 rounded-xl bg-slate-50 border-none font-bold" value={newRoute.actualPayAudit} onChange={(e) => setNewRoute({...newRoute, actualPayAudit: Number(e.target.value)})} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Delta (Audit)</Label>
                    <div className={cn("h-12 flex items-center px-4 rounded-xl bg-slate-50 font-bold", deltaValue < 0 ? "text-rose-500" : deltaValue > 0 ? "text-emerald-500" : "text-slate-400")}>
                      {deltaValue > 0 ? "+" : ""}{deltaValue}
                    </div>
                  </div>

                  {/* Row 3 */}
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Driver</Label>
                    <Select value={newRoute.driver} onValueChange={(v) => setNewRoute({...newRoute, driver: v})}>
                      <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none font-bold">
                        <SelectValue placeholder="Select Driver" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map(e => <SelectItem key={e.id} value={e.fullName}>{e.fullName}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Driver Pay</Label>
                    <div className="h-12 flex items-center px-4 rounded-xl bg-slate-50 text-slate-400 font-bold">
                      {currency(dPayValue)}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Helper</Label>
                    <Select value={newRoute.helper} onValueChange={(v) => setNewRoute({...newRoute, helper: v})}>
                      <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none font-bold">
                        <SelectValue placeholder="No Helper" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="No Helper">No Helper</SelectItem>
                        {employees.map(e => <SelectItem key={e.id} value={e.fullName}>{e.fullName}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Helper Pay</Label>
                    <div className="h-12 flex items-center px-4 rounded-xl bg-slate-50 text-slate-400 font-bold">
                      {currency(hPayValue)}
                    </div>
                  </div>
                  <div />

                  {/* Row 4 */}
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Truck Rental</Label>
                    <Input type="number" className="h-12 rounded-xl bg-slate-50 border-none font-bold" value={newRoute.truckRental} onChange={(e) => setNewRoute({...newRoute, truckRental: Number(e.target.value)})} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Mileage Cost</Label>
                    <div className="h-12 flex items-center px-4 rounded-xl bg-slate-50 text-slate-400 font-bold">
                      {currency(mileageCostValue)}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Insurance</Label>
                    <div className="h-12 flex items-center px-4 rounded-xl bg-slate-50 text-slate-400 font-bold">
                      Included
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Est. Fuel</Label>
                    <div className="h-12 flex items-center px-4 rounded-xl bg-slate-50 text-slate-400 font-bold">
                      {currency(fuelValue)}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Total Expenses</Label>
                    <div className="h-12 flex items-center px-4 rounded-xl bg-slate-50 text-slate-400 font-bold">
                      {currency(totalExpensesValue)}
                    </div>
                  </div>
                </div>

                {/* Net Profit Banner */}
                <div className="bg-slate-900 rounded-[1.5rem] p-8 flex items-center justify-between shadow-xl shadow-slate-900/20">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Net Profit Calculation</p>
                    <p className="text-[9px] font-bold text-slate-500 italic">Actual Pay - (Expenses + Driver Pay + Helper Pay)</p>
                  </div>
                  <div className={cn("text-4xl font-black tracking-tighter", netProfitValue < 0 ? "text-white" : "text-emerald-400")}>
                    {currency(netProfitValue)}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-4 pt-4">
                  <Button variant="ghost" onClick={() => setIsAddOpen(false)} className="px-8 font-bold text-slate-500 rounded-xl">Cancel</Button>
                  <Button onClick={handleSubmitAdd} className="bg-slate-900 text-white px-10 h-14 rounded-[1.25rem] font-bold shadow-xl shadow-slate-900/10 transition-transform hover:-translate-y-0.5">
                    Save Log Entry
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="rounded-[1.5rem] border border-slate-200 shadow-xl overflow-hidden bg-white">
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto relative">
            <div className="min-w-[2800px]">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-900">
                    <th className="sticky left-0 z-40 bg-slate-900 border-r-2 border-slate-800 px-4 py-5 text-center text-[10px] font-black uppercase tracking-wider text-white whitespace-nowrap shadow-[2px_0_5px_rgba(0,0,0,0.1)]">
                      {headers[0]}
                    </th>
                    {headers.slice(1).map((header, i) => (
                      <th 
                        key={`${header}-${i}`} 
                        className="border-r border-slate-800 px-3 py-5 text-center text-[10px] font-black uppercase tracking-wider text-white whitespace-nowrap"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filtered.map((row) => {
                    const estRev = estimatePay(row.stops);
                    const actualPay = row.actualPayAudit || 0;
                    const delta = actualPay ? actualPay - estRev : 0;
                    const dPay = driverPay(row.stops);
                    const hPay = row.helper && row.helper !== "No Helper" ? helperPay(row.stops) : 0;
                    const mileageCost = truckRentalMileageCost(row.miles);
                    const fuel = estimateFuel(row.miles);
                    const totalExp = (row.truckRental || 0) + mileageCost + (row.insurance || 0) + fuel;
                    const netProfit = (actualPay || estRev) - totalExp - dPay - hPay;
                    
                    return (
                      <tr key={row.id} className="transition-colors group align-middle h-14 bg-white hover:bg-slate-50">
                        <td className="sticky left-0 z-30 px-4 py-2 font-bold text-slate-900 text-center whitespace-nowrap border-r-2 border-slate-800 shadow-[2px_0_5px_rgba(0,0,0,0.05)] bg-white group-hover:bg-slate-50">
                          {row.route}
                        </td>
                        <td className="px-3 py-2 text-[10px] font-bold text-center border-r border-slate-200">{row.routeType}</td>
                        <td className="px-3 py-2 text-[10px] font-black text-center border-r border-slate-200">{row.vehicleNumber}</td>
                        <td className="px-3 py-2 text-[10px] font-bold text-center border-r border-slate-200">{shortDate(row.date)}</td>
                        <td className="px-3 py-2 text-[10px] font-bold text-center border-r border-slate-200 uppercase">{getDayOfWeek(row.date)}</td>
                        <td className="px-3 py-2 text-[10px] font-bold text-center border-r border-slate-200">{row.miles || ""}</td>
                        <td className="px-3 py-2 text-[10px] font-bold text-center border-r border-slate-200">{row.stops}</td>
                        <td className="px-3 py-2 text-[10px] font-bold text-center border-r border-slate-200 italic">{currency(estRev)}</td>
                        <td className="px-3 py-2 text-[10px] font-bold text-center border-r border-slate-200 font-mono">
                          {actualPay ? currency(actualPay) : ""}
                        </td>
                        <td className={cn("px-3 py-2 text-[10px] font-black text-center border-r border-slate-200", delta < 0 ? "text-rose-600" : delta > 0 ? "text-emerald-600" : "")}>
                          {delta !== 0 ? (delta > 0 ? "+" : "") + currency(delta) : ""}
                        </td>
                        <td className="px-3 py-2 text-[10px] font-bold text-center border-r border-slate-200 whitespace-nowrap bg-slate-50/20">{row.driver}</td>
                        <td className="px-3 py-2 text-[10px] font-bold text-center border-r border-slate-200 whitespace-nowrap bg-slate-50/20">{row.helper || ""}</td>
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
                  <tr className="bg-slate-900 text-white font-black text-[11px] h-16">
                    <td className="sticky left-0 z-40 bg-slate-900 border-r-2 border-slate-800 px-4 py-2 text-center uppercase tracking-widest shadow-[2px_0_5px_rgba(0,0,0,0.1)]">Totals</td>
                    <td colSpan={4} className="border-r border-slate-800"></td>
                    <td className="px-3 py-2 text-center border-r border-slate-800">{totals.miles}</td>
                    <td className="px-3 py-2 text-center border-r border-slate-800">{totals.stops}</td>
                    <td className="px-3 py-2 text-center border-r border-slate-800 italic">{currency(totals.estPay)}</td>
                    <td colSpan={4} className="border-r border-slate-800"></td>
                    <td className="px-3 py-2 text-center border-r border-slate-800">{currency(totals.driverPay)}</td>
                    <td className="px-3 py-2 text-center border-r border-slate-800">{currency(totals.helperPay)}</td>
                    <td className="px-3 py-2 text-center border-r border-slate-800">{currency(totals.truckRental)}</td>
                    <td colSpan={2} className="border-r border-slate-800"></td>
                    <td className="px-3 py-2 text-center border-r border-slate-800">{currency(totals.fuel)}</td>
                    <td className="px-3 py-2 text-center border-r border-slate-800 font-mono">{currency(totals.totalExp)}</td>
                    <td className="px-4 py-2 text-center bg-slate-800 font-black text-lg">{currency(totals.netProfit)}</td>
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
