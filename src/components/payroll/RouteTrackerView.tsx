"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    "Driver",
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
            <DialogContent className="rounded-[2.5rem] p-8 border-none shadow-2xl max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Register Route Entry</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmitAdd} className="grid grid-cols-2 gap-6 mt-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Route ID</Label>
                  <Input required className="h-11 rounded-xl" value={newRoute.route} onChange={(e) => setNewRoute({...newRoute, route: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Date</Label>
                  <Input required type="date" className="h-11 rounded-xl" value={newRoute.date} onChange={(e) => setNewRoute({...newRoute, date: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Route Type</Label>
                  <Select value={newRoute.routeType} onValueChange={(v) => setNewRoute({...newRoute, routeType: v})}>
                    <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="IKEA">IKEA</SelectItem><SelectItem value="GAS">GAS</SelectItem><SelectItem value="EV">EV</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Vehicle #</Label>
                  <Input required className="h-11 rounded-xl" value={newRoute.vehicleNumber} onChange={(e) => setNewRoute({...newRoute, vehicleNumber: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Miles</Label>
                  <Input type="number" className="h-11 rounded-xl" value={newRoute.miles} onChange={(e) => setNewRoute({...newRoute, miles: Number(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Stops</Label>
                  <Input type="number" className="h-11 rounded-xl" value={newRoute.stops} onChange={(e) => setNewRoute({...newRoute, stops: Number(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Driver</Label>
                  <Select value={newRoute.driver} onValueChange={(v) => setNewRoute({...newRoute, driver: v})}>
                    <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select driver" /></SelectTrigger>
                    <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.fullName}>{e.fullName}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Helper</Label>
                  <Select value={newRoute.helper} onValueChange={(v) => setNewRoute({...newRoute, helper: v})}>
                    <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select helper" /></SelectTrigger>
                    <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.fullName}>{e.fullName}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Actual Audit Pay</Label>
                  <Input type="number" className="h-11 rounded-xl" value={newRoute.actualPayAudit} onChange={(e) => setNewRoute({...newRoute, actualPayAudit: Number(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Truck Rental ($)</Label>
                  <Input type="number" className="h-11 rounded-xl" value={newRoute.truckRental} onChange={(e) => setNewRoute({...newRoute, truckRental: Number(e.target.value)})} />
                </div>
                <DialogFooter className="col-span-2 pt-4">
                  <Button type="submit" className="w-full rounded-xl h-12 bg-accent font-bold shadow-lg shadow-accent/20">
                    Log Financial Entry
                  </Button>
                </DialogFooter>
              </form>
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
                    <th className="sticky left-0 z-40 bg-slate-900 border-r-2 border-slate-800 px-4 py-5 text-center text-[10px] font-black uppercase tracking-wider text-white whitespace-nowrap">
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
                  {filtered.map((row, idx) => {
                    const estRev = estimatePay(row.stops);
                    const actualPay = row.actualPayAudit || 0;
                    const delta = actualPay ? actualPay - estRev : 0;
                    const dPay = driverPay(row.stops);
                    const hPay = row.helper ? helperPay(row.stops) : 0;
                    const mileageCost = truckRentalMileageCost(row.miles);
                    const fuel = estimateFuel(row.miles);
                    const totalExp = (row.truckRental || 0) + mileageCost + (row.insurance || 0) + fuel;
                    const netProfit = (actualPay || estRev) - totalExp - dPay - hPay;
                    
                    const isYellow = row.route === "EV" || row.route === "GAS" || idx % 4 === 1;

                    return (
                      <tr key={row.id} className={cn("transition-colors group align-middle h-14", isYellow ? "bg-yellow-300/80" : "bg-white hover:bg-slate-50")}>
                        <td className={cn("sticky left-0 z-30 px-4 py-2 font-bold text-slate-900 text-center whitespace-nowrap border-r-2 border-slate-800 shadow-[2px_0_5px_rgba(0,0,0,0.05)]", isYellow ? "bg-yellow-300" : "bg-white group-hover:bg-slate-50")}>
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
                    <td className="sticky left-0 z-40 bg-slate-900 border-r-2 border-slate-800 px-4 py-2 text-center uppercase tracking-widest">Totals</td>
                    <td colSpan={4} className="border-r border-slate-800"></td>
                    <td className="px-3 py-2 text-center border-r border-slate-800">{totals.miles}</td>
                    <td className="px-3 py-2 text-center border-r border-slate-800">{totals.stops}</td>
                    <td className="px-3 py-2 text-center border-r border-slate-800 italic">{currency(totals.estPay)}</td>
                    <td colSpan={4} className="border-r border-slate-800"></td>
                    <td className="px-3 py-2 text-center border-r border-slate-800">{currency(totals.driverPay)}</td>
                    <td className="px-3 py-2 text-center border-r border-slate-800">{currency(totals.helperPay)}</td>
                    <td className="px-3 py-2 text-center border-r border-slate-800">{currency(totals.truckRental)}</td>
                    <td colSpan={3} className="border-r border-slate-800"></td>
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
