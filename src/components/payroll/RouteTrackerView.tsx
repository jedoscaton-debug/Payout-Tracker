"use client";

import React, { useMemo, useState } from "react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Plus, Search, MoreHorizontal, Pencil, Trash2, Calendar as CalendarIcon, Download } from "lucide-react";

interface RouteTrackerViewProps {
  routeTracker: RouteTrackerRow[];
  onAddRoute?: (route: RouteTrackerRow) => void;
  onUpdateRoute?: (route: RouteTrackerRow) => void;
  onDeleteRoute?: (id: string) => void;
  employees?: Employee[];
}

export function RouteTrackerView({ 
  routeTracker, 
  onAddRoute, 
  onUpdateRoute,
  onDeleteRoute,
  employees = [] 
}: RouteTrackerViewProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [editingRoute, setEditingRoute] = useState<RouteTrackerRow | null>(null);
  
  const [newRoute, setNewRoute] = useState<Partial<RouteTrackerRow>>({
    route: "",
    routeType: "EA",
    vehicleNumber: "",
    date: new Date().toISOString().split('T')[0],
    miles: 0,
    stops: 0,
    truckRental: TRUCK_RENTAL_FIXED,
    insurance: 0,
    driver: "",
    helper: ""
  });

  const currentRoute = isEditOpen ? editingRoute : newRoute;
  const estPayValue = estimatePay(currentRoute?.stops || 0);
  const dPayValue = driverPay(currentRoute?.stops || 0);
  const hPayValue = currentRoute?.helper && currentRoute?.helper !== "No Helper" ? helperPay(currentRoute?.stops || 0) : 0;
  const mileageCostValue = truckRentalMileageCost(currentRoute?.miles || 0);
  const fuelValue = estimateFuel(currentRoute?.miles || 0);
  const totalExpensesValue = (currentRoute?.truckRental || 0) + mileageCostValue + fuelValue;
  const netProfitValue = estPayValue - (totalExpensesValue + dPayValue + hPayValue);

  const headers = [
    "Route",
    "E Type",
    "Vehicle #",
    "Date",
    "Day of Week",
    "Miles",
    "Stops",
    "Estimated Pay",
    "Driver",
    "Helper(s)",
    "Driver Pay",
    "Helper(s) Pay",
    "Truck Rental",
    "Mileage Cost",
    "Insurance",
    "Est. Fuel",
    "Total Expenses",
    "Net Profit",
    "Actions"
  ];

  const filtered = routeTracker.filter(r => {
    const matchesSearch = r.route.toLowerCase().includes(search.toLowerCase()) ||
      r.driver.toLowerCase().includes(search.toLowerCase()) ||
      (r.helper && r.helper.toLowerCase().includes(search.toLowerCase()));
    
    const matchesDate = (!startDate || r.date >= startDate) && (!endDate || r.date <= endDate);
    
    return matchesSearch && matchesDate;
  });

  const totals = useMemo(() => {
    return filtered.reduce((acc, row) => {
      const estRev = estimatePay(row.stops);
      const dPay = driverPay(row.stops);
      const hPay = row.helper && row.helper !== "No Helper" ? helperPay(row.stops) : 0;
      const fuel = estimateFuel(row.miles);
      const mileageCost = truckRentalMileageCost(row.miles);
      const totalExp = (row.truckRental || 0) + mileageCost + (row.insurance || 0) + fuel;

      return {
        miles: acc.miles + (row.miles || 0),
        stops: acc.stops + (row.stops || 0),
        estPay: acc.estPay + estRev,
        driverPay: acc.driverPay + dPay,
        helperPay: acc.helperPay + hPay,
        truckRental: acc.truckRental + (row.truckRental || 0),
        fuel: acc.fuel + fuel,
        totalExp: acc.totalExp + totalExp,
        netProfit: acc.netProfit + (estRev - totalExp - dPay - hPay)
      };
    }, {
      miles: 0, stops: 0, estPay: 0, driverPay: 0, helperPay: 0, truckRental: 0, fuel: 0, totalExp: 0, netProfit: 0
    });
  }, [filtered]);

  const handleExportAudit = () => {
    const csvHeaders = [
      "Route", "Route Type", "Vehicle #", "Date", "Day of Week", 
      "Miles", "Stops", "Estimated Pay", "Driver", "Helper(s)", 
      "Driver Pay", "Helper(s) Pay", "Truck Rental", "Mileage Cost", 
      "Insurance", "Est. Fuel", "Total Expenses", "Net Profit"
    ];

    const rows = filtered.map(row => {
      const estRev = estimatePay(row.stops);
      const dPay = driverPay(row.stops);
      const hPay = row.helper && row.helper !== "No Helper" ? helperPay(row.stops) : 0;
      const mileageCost = truckRentalMileageCost(row.miles);
      const fuel = estimateFuel(row.miles);
      const totalExp = (row.truckRental || 0) + mileageCost + (row.insurance || 0) + fuel;
      const netProfit = estRev - totalExp - dPay - hPay;

      return [
        row.route,
        row.routeType,
        row.vehicleNumber,
        row.date,
        getDayOfWeek(row.date),
        row.miles || 0,
        row.stops,
        estRev.toFixed(2),
        row.driver,
        row.helper || "",
        dPay.toFixed(2),
        hPay.toFixed(2),
        (row.truckRental || 0).toFixed(2),
        mileageCost.toFixed(2),
        (row.insurance || 0).toFixed(2),
        fuel.toFixed(2),
        totalExp.toFixed(2),
        netProfit.toFixed(2)
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + [csvHeaders.join(","), ...rows.map(r => r.join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `route_audit_export_${startDate || 'all'}_to_${endDate || 'all'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
        routeType: "EA",
        vehicleNumber: "",
        date: new Date().toISOString().split('T')[0],
        miles: 0,
        stops: 0,
        truckRental: TRUCK_RENTAL_FIXED,
        insurance: 0,
        driver: "",
        helper: ""
      });
    }
  };

  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateRoute && editingRoute) {
      onUpdateRoute(editingRoute);
      setIsEditOpen(false);
      setEditingRoute(null);
    }
  };

  const startEdit = (row: RouteTrackerRow) => {
    setEditingRoute(row);
    setIsEditOpen(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Route Audit Tracker</h3>
          <p className="text-sm text-slate-500 font-medium">Log and analyze daily route profitability and performance.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center px-3 py-1 gap-2">
              <CalendarIcon className="h-4 w-4 text-slate-400" />
              <div className="flex items-center gap-2">
                <Input 
                  type="date" 
                  className="h-8 w-36 border-none bg-transparent p-0 text-[10px] font-bold uppercase" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <span className="text-[10px] font-black text-slate-300">TO</span>
                <Input 
                  type="date" 
                  className="h-8 w-36 border-none bg-transparent p-0 text-[10px] font-bold uppercase" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search routes or staff..." 
              className="pl-10 h-11 w-64 rounded-xl border-slate-200" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <Button 
            variant="outline" 
            className="rounded-xl h-11 border-slate-200 bg-white font-bold px-6 shadow-sm transition-all hover:bg-slate-50"
            onClick={handleExportAudit}
          >
            <Download className="mr-2 h-4 w-4" /> Export Audit
          </Button>

          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl h-11 bg-primary px-6 font-bold shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5">
                <Plus className="mr-2 h-4 w-4" /> Log Daily Route
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[1000px] p-0 border-none shadow-2xl rounded-[2rem] overflow-hidden bg-white">
              <DialogHeader className="sr-only">
                <DialogTitle>Log Daily Route Entry</DialogTitle>
              </DialogHeader>
              <div className="p-10 space-y-8">
                <div className="grid grid-cols-5 gap-x-6 gap-y-8">
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
                        <SelectItem value="EA">EA</SelectItem>
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
                    <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Driver Pay</Label>
                    <div className="h-12 flex items-center px-4 rounded-xl bg-slate-50 text-slate-400 font-bold">
                      {currency(dPayValue)}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Helper Pay</Label>
                    <div className="h-12 flex items-center px-4 rounded-xl bg-slate-50 text-slate-400 font-bold">
                      {currency(hPayValue)}
                    </div>
                  </div>
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
                    <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Est. Fuel</Label>
                    <div className="h-12 flex items-center px-4 rounded-xl bg-slate-50 text-slate-400 font-bold">
                      {currency(fuelValue)}
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900 rounded-[1.5rem] p-8 flex items-center justify-between shadow-xl shadow-slate-900/20">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Net Profit Calculation</p>
                    <p className="text-[9px] font-bold text-slate-500 italic">Est. Pay - (Expenses + Driver Pay + Helper Pay)</p>
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
            <div className="min-w-[2400px]">
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
                    const dPay = driverPay(row.stops);
                    const hPay = row.helper && row.helper !== "No Helper" ? helperPay(row.stops) : 0;
                    const mileageCost = truckRentalMileageCost(row.miles);
                    const fuel = estimateFuel(row.miles);
                    const totalExp = (row.truckRental || 0) + mileageCost + (row.insurance || 0) + fuel;
                    const netProfit = estRev - totalExp - dPay - hPay;
                    
                    return (
                      <tr key={row.id} className="transition-colors group align-middle h-14 bg-white hover:bg-slate-50/50">
                        <td className="sticky left-0 z-30 px-4 py-2 font-bold text-slate-900 text-center whitespace-nowrap border-r-2 border-slate-800 shadow-[2px_0_5px_rgba(0,0,0,0.05)] bg-white group-hover:bg-slate-50/80">
                          {row.route}
                        </td>
                        <td className="px-3 py-2 text-[10px] font-bold text-center border-r border-slate-200">{row.routeType}</td>
                        <td className="px-3 py-2 text-[10px] font-black text-center border-r border-slate-200">{row.vehicleNumber}</td>
                        <td className="px-3 py-2 text-[10px] font-bold text-center border-r border-slate-200">{shortDate(row.date)}</td>
                        <td className="px-3 py-2 text-[10px] font-bold text-center border-r border-slate-200 uppercase">{getDayOfWeek(row.date)}</td>
                        <td className="px-3 py-2 text-[10px] font-bold text-center border-r border-slate-200">{row.miles || ""}</td>
                        <td className="px-3 py-2 text-[10px] font-bold text-center border-r border-slate-200">{row.stops}</td>
                        <td className="px-3 py-2 text-[10px] font-black text-center border-r border-slate-200 italic">{currency(estRev)}</td>
                        <td className="px-3 py-2 text-[10px] font-bold text-center border-r border-slate-200 whitespace-nowrap bg-slate-50/20">{row.driver}</td>
                        <td className="px-3 py-2 text-[10px] font-bold text-center border-r border-slate-200 whitespace-nowrap bg-slate-50/20">{row.helper || ""}</td>
                        <td className="px-3 py-2 text-[10px] font-bold text-center border-r border-slate-200">{currency(dPay)}</td>
                        <td className="px-3 py-2 text-[10px] font-bold text-center border-r border-slate-200">{hPay > 0 ? currency(hPay) : ""}</td>
                        <td className="px-3 py-2 text-[10px] font-bold text-center border-r border-slate-200">{currency(row.truckRental)}</td>
                        <td className="px-3 py-2 text-[10px] font-bold text-center border-r border-slate-200">{currency(mileageCost)}</td>
                        <td className="px-3 py-2 text-[10px] font-bold text-center border-r border-slate-200 italic text-slate-400">Included</td>
                        <td className="px-3 py-2 text-[10px] font-bold text-center border-r border-slate-200">{currency(fuel)}</td>
                        <td className="px-3 py-2 text-[10px] font-bold text-center border-r border-slate-200">{currency(totalExp)}</td>
                        <td className={cn("px-4 py-2 text-[10px] font-black text-center border-r border-slate-200", netProfit < 0 ? "text-rose-600" : "text-slate-900")}>
                          {currency(netProfit)}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100">
                                <MoreHorizontal className="h-4 w-4 text-slate-400" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-xl border-slate-100 shadow-xl p-2">
                              <DropdownMenuItem 
                                className="rounded-lg font-bold text-xs uppercase tracking-wider text-slate-600 gap-2 cursor-pointer"
                                onClick={() => startEdit(row)}
                              >
                                <Pencil className="h-3 w-3" /> Edit Log
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="rounded-lg font-bold text-xs uppercase tracking-wider text-rose-600 gap-2 cursor-pointer focus:bg-rose-50 focus:text-rose-600"
                                onClick={() => onDeleteRoute?.(row.id)}
                              >
                                <Trash2 className="h-3 w-3" /> Delete Entry
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
                    <td colSpan={2} className="border-r border-slate-800"></td>
                    <td className="px-3 py-2 text-center border-r border-slate-800">{currency(totals.driverPay)}</td>
                    <td className="px-3 py-2 text-center border-r border-slate-800">{currency(totals.helperPay)}</td>
                    <td className="px-3 py-2 text-center border-r border-slate-800">{currency(totals.truckRental)}</td>
                    <td colSpan={2} className="border-r border-slate-800"></td>
                    <td className="px-3 py-2 text-center border-r border-slate-800">{currency(totals.fuel)}</td>
                    <td className="px-3 py-2 text-center border-r border-slate-800 font-mono">{currency(totals.totalExp)}</td>
                    <td className="px-4 py-2 text-center bg-slate-800 font-black text-lg border-r border-slate-800">{currency(totals.netProfit)}</td>
                    <td className="bg-slate-900"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-[1000px] p-0 border-none shadow-2xl rounded-[2rem] overflow-hidden bg-white">
          <DialogHeader className="sr-only">
            <DialogTitle>Edit Route Entry</DialogTitle>
          </DialogHeader>
          {editingRoute && (
            <div className="p-10 space-y-8">
              <div className="grid grid-cols-5 gap-x-6 gap-y-8">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Route ID</Label>
                  <Input className="h-12 rounded-xl bg-slate-50 border-none font-bold" value={editingRoute.route} onChange={(e) => setEditingRoute({...editingRoute, route: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Route Type</Label>
                  <Select value={editingRoute.routeType} onValueChange={(v) => setEditingRoute({...editingRoute, routeType: v})}>
                    <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EA">EA</SelectItem>
                      <SelectItem value="IKEA">IKEA</SelectItem>
                      <SelectItem value="GAS">GAS</SelectItem>
                      <SelectItem value="EV">EV</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Vehicle #</Label>
                  <Input className="h-12 rounded-xl bg-slate-50 border-none font-bold" value={editingRoute.vehicleNumber} onChange={(e) => setEditingRoute({...editingRoute, vehicleNumber: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Date</Label>
                  <Input type="date" className="h-12 rounded-xl bg-slate-50 border-none font-bold" value={editingRoute.date} onChange={(e) => setEditingRoute({...editingRoute, date: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Day of Week</Label>
                  <div className="h-12 flex items-center px-4 rounded-xl bg-slate-50 text-slate-400 font-bold uppercase tracking-wider text-xs">
                    {getDayOfWeek(editingRoute.date)}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Miles</Label>
                  <Input type="number" className="h-12 rounded-xl bg-slate-50 border-none font-bold" value={editingRoute.miles} onChange={(e) => setEditingRoute({...editingRoute, miles: Number(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Stops</Label>
                  <Input type="number" className="h-12 rounded-xl bg-slate-50 border-none font-bold" value={editingRoute.stops} onChange={(e) => setEditingRoute({...editingRoute, stops: Number(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Est. Pay</Label>
                  <div className="h-12 flex items-center px-4 rounded-xl bg-slate-50 text-slate-400 font-bold">
                    {currency(estPayValue)}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Driver</Label>
                  <Select value={editingRoute.driver} onValueChange={(v) => setEditingRoute({...editingRoute, driver: v})}>
                    <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map(e => <SelectItem key={e.id} value={e.fullName}>{e.fullName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Helper</Label>
                  <Select value={editingRoute.helper} onValueChange={(v) => setEditingRoute({...editingRoute, helper: v})}>
                    <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="No Helper">No Helper</SelectItem>
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
                  <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Helper Pay</Label>
                  <div className="h-12 flex items-center px-4 rounded-xl bg-slate-50 text-slate-400 font-bold">
                    {currency(hPayValue)}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Truck Rental</Label>
                  <Input type="number" className="h-12 rounded-xl bg-slate-50 border-none font-bold" value={editingRoute.truckRental} onChange={(e) => setEditingRoute({...editingRoute, truckRental: Number(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Mileage Cost</Label>
                  <div className="h-12 flex items-center px-4 rounded-xl bg-slate-50 text-slate-400 font-bold">
                    {currency(mileageCostValue)}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Est. Fuel</Label>
                  <div className="h-12 flex items-center px-4 rounded-xl bg-slate-50 text-slate-400 font-bold">
                    {currency(fuelValue)}
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 rounded-[1.5rem] p-8 flex items-center justify-between shadow-xl shadow-slate-900/20">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Net Profit Calculation</p>
                  <p className="text-[9px] font-bold text-slate-500 italic">Est. Pay - (Expenses + Driver Pay + Helper Pay)</p>
                </div>
                <div className={cn("text-4xl font-black tracking-tighter", netProfitValue < 0 ? "text-white" : "text-emerald-400")}>
                  {currency(netProfitValue)}
                </div>
              </div>

              <div className="flex items-center justify-end gap-4 pt-4">
                <Button variant="ghost" onClick={() => setIsEditOpen(false)} className="px-8 font-bold text-slate-500 rounded-xl">Cancel</Button>
                <Button onClick={handleSubmitEdit} className="bg-primary text-white px-10 h-14 rounded-[1.25rem] font-bold shadow-xl shadow-primary/10 transition-transform hover:-translate-y-0.5">
                  Update System Log
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
