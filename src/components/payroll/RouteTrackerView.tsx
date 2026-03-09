
"use client";

import React, { useMemo, useState, useEffect } from "react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RouteTrackerRow, Employee, AdminSettings } from "@/app/lib/types";
import { 
  currency, 
  shortDate, 
  getDayOfWeek, 
  estimatePay, 
  estimateFuel, 
  driverPay, 
  helperPay,
  truckRentalMileageCost,
  getWeekRange
} from "@/app/lib/payroll-utils";
import { cn } from "@/lib/utils";
import { Plus, Search, MoreHorizontal, Pencil, Trash2, Calendar as CalendarIcon, Download, Info, Archive, Lock, History, Loader2, ChevronDown, CheckCircle2, CalendarDays } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

const TRUCK_RENTAL_FIXED = 52;

interface RouteTrackerViewProps {
  routeTracker: RouteTrackerRow[];
  onAddRoute?: (route: RouteTrackerRow) => void;
  onUpdateRoute?: (route: RouteTrackerRow) => void;
  onDeleteRoute?: (id: string) => void;
  employees?: Employee[];
  settings?: AdminSettings;
}

export function RouteTrackerView({ 
  routeTracker, 
  onAddRoute, 
  onUpdateRoute,
  onDeleteRoute,
  employees = [],
  settings
}: RouteTrackerViewProps) {
  const { toast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [search, setSearch] = useState("");
  
  // Weekly Navigation State
  const currentWeek = useMemo(() => getWeekRange(new Date()), []);
  const [selectedWeekStart, setSelectedWeekStart] = useState(currentWeek.start);
  
  // Date Range State
  const [startDate, setStartDate] = useState(currentWeek.start);
  const [endDate, setEndDate] = useState(currentWeek.end);
  
  const [newRoute, setNewRoute] = useState<Partial<RouteTrackerRow>>({
    route: "",
    routeType: "IKEA",
    vehicleNumber: "",
    date: new Date().toISOString().split('T')[0],
    miles: 0,
    stops: 0,
    estimatedPay: 0,
    truckRental: TRUCK_RENTAL_FIXED,
    insurance: 0,
    driver: "",
    helper: "",
    status: "Active"
  });

  const [editingRoute, setEditingRoute] = useState<RouteTrackerRow | null>(null);
  
  // Sync startDate/endDate when Review Period dropdown changes
  const handleWeekChange = (val: string) => {
    setSelectedWeekStart(val);
    const range = getWeekRange(val);
    setStartDate(range.start);
    setEndDate(range.end);
  };

  // Sync new route date with selected range if needed
  useEffect(() => {
    if (!isAddOpen) return;
    const today = new Date().toISOString().split('T')[0];
    const isTodayInRange = today >= startDate && today <= endDate;
    setNewRoute(prev => ({
      ...prev,
      date: isTodayInRange ? today : startDate
    }));
  }, [isAddOpen, startDate, endDate]);

  const availableWeeks = useMemo(() => {
    const weeksMap = new Map<string, { start: string, end: string }>();
    
    // Always include current week
    weeksMap.set(currentWeek.start, currentWeek);
    
    // Add weeks from historical data
    routeTracker.forEach(r => {
      const range = getWeekRange(r.date);
      weeksMap.set(range.start, range);
    });
    
    return Array.from(weeksMap.values()).sort((a, b) => b.start.localeCompare(a.start));
  }, [routeTracker, currentWeek]);

  const filtered = useMemo(() => {
    return routeTracker.filter(r => {
      const matchesSearch = r.route.toLowerCase().includes(search.toLowerCase()) ||
        r.driver.toLowerCase().includes(search.toLowerCase()) ||
        (r.helper && r.helper.toLowerCase().includes(search.toLowerCase()));
      
      const inRange = r.date >= startDate && r.date <= endDate;
      
      return matchesSearch && inRange;
    }).sort((a, b) => a.date.localeCompare(b.date));
  }, [routeTracker, search, startDate, endDate]);

  const totals = useMemo(() => {
    const raw = filtered.reduce((acc, row) => {
      const dObj = employees.find(e => e.fullName === row.driver);
      const hObj = employees.find(e => e.fullName === row.helper);

      const estRev = row.estimatedPay && row.estimatedPay > 0 ? row.estimatedPay : estimatePay(row.stops, row.miles, row.route, row.vehicleNumber, settings, row.routeType);
      const dPay = driverPay(row.stops, row.miles, row.route, row.vehicleNumber, row.estimatedPay, settings, row.routeType, dObj);
      const hPay = row.helper && row.helper !== "No Helper" ? helperPay(row.stops, row.miles, row.route, row.vehicleNumber, row.estimatedPay, settings, row.routeType, hObj) : 0;
      const fuel = estimateFuel(row.miles, settings);
      const mileageCost = truckRentalMileageCost(row.miles);
      
      const totalExp = (row.truckRental || 0) + mileageCost + (row.insurance || 0) + fuel + dPay + hPay;

      return {
        miles: acc.miles + (row.miles || 0),
        stops: acc.stops + (row.stops || 0),
        estPay: acc.estPay + estRev,
        driverPay: acc.driverPay + dPay,
        helperPay: acc.helperPay + hPay,
        truckRental: acc.truckRental + (row.truckRental || 0),
        fuel: acc.fuel + fuel,
        totalExp: acc.totalExp + totalExp,
        netProfit: acc.netProfit + (estRev - totalExp)
      };
    }, {
      miles: 0, stops: 0, estPay: 0, driverPay: 0, helperPay: 0, truckRental: 0, fuel: 0, totalExp: 0, netProfit: 0
    });

    return {
      miles: Number(raw.miles.toFixed(2)),
      stops: raw.stops,
      estPay: Number(raw.estPay.toFixed(2)),
      driverPay: Number(raw.driverPay.toFixed(2)),
      helperPay: Number(raw.helperPay.toFixed(2)),
      truckRental: Number(raw.truckRental.toFixed(2)),
      fuel: Number(raw.fuel.toFixed(2)),
      totalExp: Number(raw.totalExp.toFixed(2)),
      netProfit: Number(raw.netProfit.toFixed(2))
    };
  }, [filtered, settings, employees]);

  const handleFinalizeWeek = () => {
    if (filtered.length === 0) {
      toast({ title: "No Data", description: "This range has no routes to archive." });
      return;
    }
    const toClose = filtered.filter(r => r.status !== "Closed");
    if (toClose.length === 0) {
      toast({ title: "Already Archived", description: "These routes are already locked." });
      return;
    }

    if (confirm(`Are you sure you want to finalize and archive ${toClose.length} routes for this period? This will lock the data for auditing.`)) {
      toClose.forEach(r => {
        onUpdateRoute?.({ ...r, status: "Closed" });
      });
      toast({ title: "Archive Complete", description: "Selected routes have been locked." });
    }
  };

  const handleExportAudit = () => {
    const csvHeaders = [
      "Route", "Route Type", "Vehicle #", "Date", "Day of Week", 
      "Miles", "Stops", "Estimated Pay", "Driver", "Helper(s)", 
      "Driver Pay", "Helper(s) Pay", "Truck Rental", "Mileage Cost", 
      "Insurance", "Est. Fuel", "Total Expenses", "Net Profit", "Status"
    ];

    const rows = filtered.map(row => {
      const dObj = employees.find(e => e.fullName === row.driver);
      const hObj = employees.find(e => e.fullName === row.helper);

      const estRev = row.estimatedPay && row.estimatedPay > 0 ? row.estimatedPay : estimatePay(row.stops, row.miles, row.route, row.vehicleNumber, settings, row.routeType);
      const dPay = driverPay(row.stops, row.miles, row.route, row.vehicleNumber, row.estimatedPay, settings, row.routeType, dObj);
      const hPay = row.helper && row.helper !== "No Helper" ? helperPay(row.stops, row.miles, row.route, row.vehicleNumber, row.estimatedPay, settings, row.routeType, hObj) : 0;
      const mileageCost = truckRentalMileageCost(row.miles);
      const fuel = estimateFuel(row.miles, settings);
      const totalExp = (row.truckRental || 0) + mileageCost + (row.insurance || 0) + fuel + dPay + hPay;
      const netProfit = Number((estRev - totalExp).toFixed(2));

      return [
        `"${row.route}"`, `"${row.routeType}"`, `"${row.vehicleNumber}"`, `"${row.date}"`, `"${getDayOfWeek(row.date)}"`,
        row.miles || 0, row.stops, estRev.toFixed(2), `"${row.driver}"`, `"${row.helper || ""}"`,
        dPay.toFixed(2), hPay.toFixed(2), (row.truckRental || 0).toFixed(2), mileageCost.toFixed(2),
        (row.insurance || 0).toFixed(2), fuel.toFixed(2), totalExp.toFixed(2), netProfit.toFixed(2), `"${row.status || 'Active'}"`
      ];
    });

    const csvContent = [csvHeaders.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `route_audit_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const currentRoute = isEditOpen ? editingRoute : newRoute;
  const driverObj = employees.find(e => e.fullName === currentRoute?.driver);
  const helperObj = employees.find(e => e.fullName === currentRoute?.helper);

  const estPayValue = currentRoute?.estimatedPay && currentRoute.estimatedPay > 0 
    ? currentRoute.estimatedPay 
    : estimatePay(currentRoute?.stops || 0, currentRoute?.miles || 0, currentRoute?.route || "", currentRoute?.vehicleNumber || "", settings, currentRoute?.routeType);

  const dPayValue = driverPay(currentRoute?.stops || 0, currentRoute?.miles || 0, currentRoute?.route || "", currentRoute?.vehicleNumber || "", currentRoute?.estimatedPay, settings, currentRoute?.routeType, driverObj);
  const hPayValue = currentRoute?.helper && currentRoute?.helper !== "No Helper" 
    ? helperPay(currentRoute?.stops || 0, currentRoute?.miles || 0, currentRoute?.route || "", currentRoute?.vehicleNumber || "", currentRoute?.estimatedPay, settings, currentRoute?.routeType, helperObj) 
    : 0;
    
  const mileageCostValue = truckRentalMileageCost(currentRoute?.miles || 0);
  const fuelValue = estimateFuel(currentRoute?.miles || 0, settings);
  const totalExpensesValue = Number(((currentRoute?.truckRental || 0) + (currentRoute?.insurance || 0) + mileageCostValue + fuelValue + dPayValue + hPayValue).toFixed(2));
  const netProfitValue = Number((estPayValue - totalExpensesValue).toFixed(2));

  const isCurrentWeekInRange = startDate <= currentWeek.start && endDate >= currentWeek.end;
  const isWeekClosed = filtered.every(r => r.status === "Closed") && filtered.length > 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Route Tracker</h3>
            {isWeekClosed && <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 uppercase text-[9px] font-black"><Lock className="h-3 w-3 mr-1" /> Archived</Badge>}
          </div>
          <p className="text-sm text-slate-500 font-medium">Log and analyze daily route profitability across weekly periods or custom ranges.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-4 h-11 rounded-xl border border-slate-200 shadow-sm">
            <History className="h-4 w-4 text-slate-400" />
            <span className="text-[9px] font-black uppercase text-slate-400 whitespace-nowrap">Review Period:</span>
            <Select value={selectedWeekStart} onValueChange={handleWeekChange}>
              <SelectTrigger className="h-8 border-none bg-transparent font-bold text-[10px] uppercase min-w-[200px] p-0 focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {availableWeeks.map(w => (
                  <SelectItem key={w.start} value={w.start} className="text-[10px] font-bold uppercase">
                    {shortDate(w.start)} - {shortDate(w.end)} {w.start === currentWeek.start ? "(Active Week)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 bg-white px-4 h-11 rounded-xl border border-slate-200 shadow-sm">
            <CalendarDays className="h-4 w-4 text-slate-400" />
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black uppercase text-slate-400">From</span>
              <Input 
                type="date" 
                className="h-8 border-none bg-transparent font-bold text-[10px] uppercase p-0 focus-visible:ring-0 w-28" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)} 
              />
              <span className="text-[9px] font-black uppercase text-slate-400">To</span>
              <Input 
                type="date" 
                className="h-8 border-none bg-transparent font-bold text-[10px] uppercase p-0 focus-visible:ring-0 w-28" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)} 
              />
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input placeholder="Search logs..." className="pl-10 h-11 w-48 rounded-xl border-slate-200" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          
          <Button variant="outline" className="rounded-xl h-11 border-slate-200 bg-white font-bold px-6 shadow-sm" onClick={handleExportAudit}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>

          {!isWeekClosed && (
            <Button variant="outline" className="rounded-xl h-11 border-primary text-primary bg-primary/5 font-bold px-6" onClick={handleFinalizeWeek}>
              <Archive className="mr-2 h-4 w-4" /> Finalize Selection
            </Button>
          )}

          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl h-11 bg-primary px-6 font-bold shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5">
                <Plus className="mr-2 h-4 w-4" /> Log Daily Route
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[1000px] p-0 border-none shadow-2xl rounded-[2rem] overflow-hidden bg-white">
              <DialogHeader className="sr-only"><DialogTitle>Log Daily Route Entry</DialogTitle></DialogHeader>
              <div className="p-10 space-y-8">
                <div className="grid grid-cols-5 gap-x-6 gap-y-8">
                  <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400">Route ID</Label><Input placeholder="e.g. A01_EV" className="h-12 rounded-xl bg-slate-50 border-none font-bold" value={newRoute.route || ""} onChange={(e) => setNewRoute({...newRoute, route: e.target.value})} /></div>
                  <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400">Route Type</Label>
                    <Select value={newRoute.routeType || "IKEA"} onValueChange={(v) => setNewRoute({...newRoute, routeType: v})}>
                      <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none font-bold"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="IKEA">IKEA</SelectItem><SelectItem value="EA">EA</SelectItem><SelectItem value="GAS">GAS</SelectItem><SelectItem value="EV">EV</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400">Vehicle #</Label><Input placeholder="e.g. 2" className="h-12 rounded-xl bg-slate-50 border-none font-bold" value={newRoute.vehicleNumber || ""} onChange={(e) => setNewRoute({...newRoute, vehicleNumber: e.target.value})} /></div>
                  <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400">Date</Label><Input type="date" className="h-12 rounded-xl bg-slate-50 border-none font-bold" value={newRoute.date || ""} onChange={(e) => setNewRoute({...newRoute, date: e.target.value})} /></div>
                  <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400">Day of Week</Label>
                    <div className="h-12 flex items-center px-4 rounded-xl bg-slate-50 text-slate-400 font-bold uppercase text-xs">{getDayOfWeek(newRoute.date || "")}</div>
                  </div>
                  <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400">Miles</Label><Input type="number" step="0.1" className="h-12 rounded-xl bg-slate-50 border-none font-bold" value={newRoute.miles || 0} onChange={(e) => setNewRoute({...newRoute, miles: Number(e.target.value)})} /></div>
                  <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400">Stops</Label><Input type="number" className="h-12 rounded-xl bg-slate-50 border-none font-bold" value={newRoute.stops || 0} onChange={(e) => setNewRoute({...newRoute, stops: Number(e.target.value)})} /></div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400">Est. Pay (Override)</Label>
                    <Input type="number" className="h-12 rounded-xl bg-slate-100 border-none font-bold" placeholder={estimatePay(newRoute.stops || 0, newRoute.miles || 0, newRoute.route || "", newRoute.vehicleNumber || "", settings, newRoute.routeType).toString()} value={newRoute.estimatedPay === 0 ? "" : newRoute.estimatedPay} onChange={(e) => setNewRoute({...newRoute, estimatedPay: e.target.value === "" ? 0 : Number(e.target.value)})} />
                  </div>
                  <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400">Driver</Label>
                    <Select value={newRoute.driver || ""} onValueChange={(v) => setNewRoute({...newRoute, driver: v})}>
                      <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none font-bold"><SelectValue placeholder="Select Driver" /></SelectTrigger>
                      <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.fullName}>{e.fullName}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400">Helper</Label>
                    <Select value={newRoute.helper || "No Helper"} onValueChange={(v) => setNewRoute({...newRoute, helper: v})}>
                      <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none font-bold"><SelectValue placeholder="No Helper" /></SelectTrigger>
                      <SelectContent><SelectItem value="No Helper">No Helper</SelectItem>{employees.map(e => <SelectItem key={e.id} value={e.fullName}>{e.fullName}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className={cn("rounded-[1.5rem] p-8 flex items-center justify-between shadow-xl transition-colors", netProfitValue < 0 ? "bg-rose-600 shadow-rose-900/20" : "bg-emerald-600 shadow-emerald-900/20")}>
                  <div className="space-y-1"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">Audit Net Profit</p><p className="text-[9px] font-bold text-white/50 italic">Profit = Estimated Pay - Expenses</p></div>
                  <div className="text-4xl font-black tracking-tighter text-white">{currency(netProfitValue)}</div>
                </div>
                <div className="flex items-center justify-end gap-4 pt-4">
                  <Button variant="ghost" onClick={() => setIsAddOpen(false)} className="px-8 font-bold text-slate-500 rounded-xl">Cancel</Button>
                  <Button onClick={(e) => {
                    e.preventDefault();
                    if (onAddRoute) {
                      onAddRoute({ id: `rt-${Date.now()}`, ...newRoute as RouteTrackerRow });
                      setIsAddOpen(false);
                      setNewRoute({ route: "", routeType: "IKEA", vehicleNumber: "", date: new Date().toISOString().split('T')[0], miles: 0, stops: 0, estimatedPay: 0, truckRental: TRUCK_RENTAL_FIXED, insurance: 0, driver: "", helper: "", status: "Active" });
                    }
                  }} className="bg-slate-900 text-white px-10 h-14 rounded-[1.25rem] font-bold shadow-xl transition-transform hover:-translate-y-0.5">Save Log Entry</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="rounded-[1.5rem] border border-slate-200 shadow-xl overflow-hidden bg-white">
        <CardContent className="p-0">
          <ScrollArea className="w-full">
            <div className="min-w-[2400px] pb-6">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="sticky left-0 z-40 bg-slate-900 border-r-2 border-slate-800 px-4 py-5 text-center text-[10px] font-black uppercase tracking-wider whitespace-nowrap shadow-[2px_0_5px_rgba(0,0,0,0.1)]">Route</th>
                    <th className="border-r border-slate-800 px-3 py-5 text-center text-[10px] font-black uppercase tracking-wider whitespace-nowrap">Route Type</th>
                    <th className="border-r border-slate-800 px-3 py-5 text-center text-[10px] font-black uppercase tracking-wider whitespace-nowrap">Vehicle #</th>
                    <th className="border-r border-slate-800 px-3 py-5 text-center text-[10px] font-black uppercase tracking-wider whitespace-nowrap">Date</th>
                    <th className="border-r border-slate-800 px-3 py-5 text-center text-[10px] font-black uppercase tracking-wider whitespace-nowrap">Day</th>
                    <th className="border-r border-slate-800 px-3 py-5 text-center text-[10px] font-black uppercase tracking-wider whitespace-nowrap">Miles</th>
                    <th className="border-r border-slate-800 px-3 py-5 text-center text-[10px] font-black uppercase tracking-wider whitespace-nowrap">Stops</th>
                    <th className="border-r border-slate-800 px-3 py-5 text-center text-[10px] font-black uppercase tracking-wider whitespace-nowrap">Est. Pay</th>
                    <th className="border-r border-slate-800 px-3 py-5 text-center text-[10px] font-black uppercase tracking-wider whitespace-nowrap">Driver</th>
                    <th className="border-r border-slate-800 px-3 py-5 text-center text-[10px] font-black uppercase tracking-wider whitespace-nowrap">Helper</th>
                    <th className="border-r border-slate-800 px-3 py-5 text-center text-[10px] font-black uppercase tracking-wider whitespace-nowrap">Driver Pay</th>
                    <th className="border-r border-slate-800 px-3 py-5 text-center text-[10px] font-black uppercase tracking-wider whitespace-nowrap">Helper Pay</th>
                    <th className="border-r border-slate-800 px-3 py-5 text-center text-[10px] font-black uppercase tracking-wider whitespace-nowrap">Rent</th>
                    <th className="border-r border-slate-800 px-3 py-5 text-center text-[10px] font-black uppercase tracking-wider whitespace-nowrap">Mileage Cost</th>
                    <th className="border-r border-slate-800 px-3 py-5 text-center text-[10px] font-black uppercase tracking-wider whitespace-nowrap">Insurance</th>
                    <th className="border-r border-slate-800 px-3 py-5 text-center text-[10px] font-black uppercase tracking-wider whitespace-nowrap">Fuel</th>
                    <th className="border-r border-slate-800 px-3 py-5 text-center text-[10px] font-black uppercase tracking-wider whitespace-nowrap">Total Exp</th>
                    <th className="border-r border-slate-800 px-3 py-5 text-center text-[10px] font-black uppercase tracking-wider whitespace-nowrap">Net Profit</th>
                    <th className="px-4 py-5 text-center text-[10px] font-black uppercase tracking-wider whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={19} className="py-20 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest">No routes found for this period. {isCurrentWeekInRange ? "Automatic reset active for new week." : ""}</td></tr>
                  ) : filtered.map((row) => {
                    const dObj = employees.find(e => e.fullName === row.driver);
                    const hObj = employees.find(e => e.fullName === row.helper);
                    const estRev = row.estimatedPay && row.estimatedPay > 0 ? row.estimatedPay : estimatePay(row.stops, row.miles, row.route, row.vehicleNumber, settings, row.routeType);
                    const dPay = driverPay(row.stops, row.miles, row.route, row.vehicleNumber, row.estimatedPay, settings, row.routeType, dObj);
                    const hPay = row.helper && row.helper !== "No Helper" ? helperPay(row.stops, row.miles, row.route, row.vehicleNumber, row.estimatedPay, settings, row.routeType, hObj) : 0;
                    const mileageCost = truckRentalMileageCost(row.miles);
                    const fuel = estimateFuel(row.miles, settings);
                    const totalExp = Number(((row.truckRental || 0) + mileageCost + (row.insurance || 0) + fuel + dPay + hPay).toFixed(2));
                    const netProfit = Number((estRev - totalExp).toFixed(2));
                    const isClosed = row.status === "Closed";
                    
                    return (
                      <tr key={row.id} className={cn("transition-colors group align-middle h-14", isClosed ? "bg-slate-50/50" : "bg-white hover:bg-slate-50/50")}>
                        <td className="sticky left-0 z-30 px-4 py-2 font-bold text-slate-900 text-center whitespace-nowrap border-r-2 border-slate-800 shadow-[2px_0_5px_rgba(0,0,0,0.05)] bg-inherit group-hover:bg-slate-50/80">
                          <div className="flex items-center justify-center gap-2">
                            {isClosed && <Lock className="h-3 w-3 text-slate-400" />}
                            {row.route}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-[10px] font-bold text-center border-r border-slate-200">{row.routeType}</td>
                        <td className="px-3 py-2 text-[10px] font-black text-center border-r border-slate-200">{row.vehicleNumber}</td>
                        <td className="px-3 py-2 text-[10px] font-bold text-center border-r border-slate-200">{shortDate(row.date)}</td>
                        <td className="px-3 py-2 text-[10px] font-bold text-center border-r border-slate-200 uppercase">{getDayOfWeek(row.date)}</td>
                        <td className="px-3 py-2 text-[10px] font-bold text-center border-r border-slate-200">{row.miles}</td>
                        <td className="px-3 py-2 text-[10px] font-bold text-center border-r border-slate-200">{row.stops}</td>
                        <td className="px-3 py-2 text-[10px] font-black text-center border-r border-slate-200 italic">{currency(estRev)}</td>
                        <td className="px-3 py-2 text-[10px] font-bold text-center border-r border-slate-200 whitespace-nowrap">{row.driver}</td>
                        <td className="px-3 py-2 text-[10px] font-bold text-center border-r border-slate-200 whitespace-nowrap">{row.helper || ""}</td>
                        <td className="px-3 py-2 text-[10px] font-bold text-center border-r border-slate-200">{currency(dPay)}</td>
                        <td className="px-3 py-2 text-[10px] font-bold text-center border-r border-slate-200">{hPay > 0 ? currency(hPay) : ""}</td>
                        <td className="px-3 py-2 text-[10px] font-bold text-center border-r border-slate-200">{currency(row.truckRental)}</td>
                        <td className="px-3 py-2 text-[10px] font-bold text-center border-r border-slate-200">{currency(mileageCost)}</td>
                        <td className="px-3 py-2 text-[10px] font-bold text-center border-r border-slate-200 text-slate-400">{currency(row.insurance || 0)}</td>
                        <td className="px-3 py-2 text-[10px] font-bold text-center border-r border-slate-200">{currency(fuel)}</td>
                        <td className="px-3 py-2 text-[10px] font-bold text-center border-r border-slate-200">{currency(totalExp)}</td>
                        <td className={cn("px-4 py-2 text-[10px] font-black text-center border-r border-slate-200", netProfit < 0 ? "text-rose-600 bg-rose-50/30" : "text-emerald-600 bg-emerald-50/30")}>{currency(netProfit)}</td>
                        <td className="px-4 py-2 text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-xl p-2">
                              {!isClosed && (
                                <DropdownMenuItem className="rounded-lg font-bold text-xs uppercase tracking-wider text-slate-600 gap-2 cursor-pointer" onClick={() => { setEditingRoute(row); setIsEditOpen(true); }}>
                                  <Pencil className="h-3 w-3" /> Edit Entry
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem className="rounded-lg font-bold text-xs uppercase tracking-wider text-rose-600 gap-2 cursor-pointer" onClick={() => onDeleteRoute?.(row.id)}>
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
                    <td className={cn("px-4 py-2 text-center bg-slate-800 font-black text-lg border-r border-slate-800", totals.netProfit < 0 ? "text-rose-400" : "text-emerald-400")}>{currency(totals.netProfit)}</td>
                    <td className="bg-slate-900"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={!!editingRoute} onOpenChange={(open) => !open && setEditingRoute(null)}>
        <DialogContent className="max-w-[1000px] p-0 border-none shadow-2xl rounded-[2rem] overflow-hidden bg-white">
          <DialogHeader className="sr-only"><DialogTitle>Edit Route Entry</DialogTitle></DialogHeader>
          {editingRoute && (
            <div className="p-10 space-y-8">
              <div className="grid grid-cols-5 gap-x-6 gap-y-8">
                <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400">Route ID</Label><input className="flex h-12 w-full border-none bg-slate-50 px-4 rounded-xl font-bold text-sm focus:ring-2 focus:ring-primary outline-none" value={editingRoute.route || ""} onChange={(e) => setEditingRoute({...editingRoute, route: e.target.value})} /></div>
                <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400">Route Type</Label>
                  <Select value={editingRoute.routeType || "IKEA"} onValueChange={(v) => setEditingRoute({...editingRoute, routeType: v})}>
                    <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none font-bold"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="IKEA">IKEA</SelectItem><SelectItem value="EA">EA</SelectItem><SelectItem value="GAS">GAS</SelectItem><SelectItem value="EV">EV</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400">Vehicle #</Label><input className="flex h-12 w-full border-none bg-slate-50 px-4 rounded-xl font-bold text-sm focus:ring-2 focus:ring-primary outline-none" value={editingRoute.vehicleNumber || ""} onChange={(e) => setEditingRoute({...editingRoute, vehicleNumber: e.target.value})} /></div>
                <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400">Date</Label><input type="date" className="flex h-12 w-full border-none bg-slate-50 px-4 rounded-xl font-bold text-sm focus:ring-2 focus:ring-primary outline-none" value={editingRoute.date || ""} onChange={(e) => setEditingRoute({...editingRoute, date: e.target.value})} /></div>
                <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400">Day of Week</Label><div className="h-12 flex items-center px-4 rounded-xl bg-slate-50 text-slate-400 font-bold uppercase text-xs">{getDayOfWeek(editingRoute.date || "")}</div></div>
                <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400">Miles</Label><input type="number" step="0.1" className="flex h-12 w-full border-none bg-slate-50 px-4 rounded-xl font-bold text-sm focus:ring-2 focus:ring-primary outline-none" value={editingRoute.miles || 0} onChange={(e) => setEditingRoute({...editingRoute, miles: Number(e.target.value)})} /></div>
                <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400">Stops</Label><input type="number" className="flex h-12 w-full border-none bg-slate-50 px-4 rounded-xl font-bold text-sm focus:ring-2 focus:ring-primary outline-none" value={editingRoute.stops || 0} onChange={(e) => setEditingRoute({...editingRoute, stops: Number(e.target.value)})} /></div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Est. Pay (Override)</Label>
                  <input type="number" className="flex h-12 w-full border-none bg-slate-100 px-4 rounded-xl font-bold text-sm text-slate-900 focus:bg-white outline-none" placeholder={estimatePay(editingRoute.stops || 0, editingRoute.miles || 0, editingRoute.route || "", editingRoute.vehicleNumber || "", settings, editingRoute.routeType).toString()} value={editingRoute.estimatedPay === 0 ? "" : editingRoute.estimatedPay} onChange={(e) => setEditingRoute({...editingRoute, estimatedPay: e.target.value === "" ? 0 : Number(e.target.value)})} />
                </div>
                <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400">Driver</Label>
                  <Select value={editingRoute.driver || ""} onValueChange={(v) => setEditingRoute({...editingRoute, driver: v})}>
                    <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none font-bold"><SelectValue placeholder="Select Driver" /></SelectTrigger>
                    <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.fullName}>{e.fullName}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400">Helper</Label>
                  <Select value={editingRoute.helper || "No Helper"} onValueChange={(v) => setEditingRoute({...editingRoute, helper: v})}>
                    <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none font-bold"><SelectValue placeholder="No Helper" /></SelectTrigger>
                    <SelectContent><SelectItem value="No Helper">No Helper</SelectItem>{employees.map(e => <SelectItem key={e.id} value={e.fullName}>{e.fullName}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className={cn("rounded-[1.5rem] p-8 flex items-center justify-between shadow-xl transition-colors", netProfitValue < 0 ? "bg-rose-600 shadow-rose-900/20" : "bg-emerald-600 shadow-emerald-900/20")}>
                <div className="space-y-1"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">Audit Net Profit</p><p className="text-[9px] font-bold text-white/50 italic">Profit = Estimated Pay - Expenses</p></div>
                <div className="text-4xl font-black tracking-tighter text-white">{currency(netProfitValue)}</div>
              </div>
              <div className="flex items-center justify-end gap-4 pt-4">
                <Button variant="ghost" onClick={() => setIsEditOpen(false)} className="px-8 font-bold text-slate-500 rounded-xl">Cancel</Button>
                <Button onClick={(e) => {
                  e.preventDefault();
                  if (onUpdateRoute && editingRoute) {
                    onUpdateRoute(editingRoute);
                    setIsEditOpen(false);
                    setEditingRoute(null);
                  }
                }} className="bg-slate-900 text-white px-10 h-14 rounded-[1.25rem] font-bold shadow-xl transition-transform hover:-translate-y-0.5">Update System Log</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
