
"use client";

import React, { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ClipboardCheck, 
  Search, 
  Download, 
  Upload, 
  RefreshCw, 
  History, 
  AlertTriangle,
  ChevronRight,
  Info,
  Calendar,
  Layers,
  ArrowRightLeft,
  Trash2,
  MoreHorizontal
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  RXOSettlementReport, 
  RXORouteDetail, 
  RXOOrderDetail, 
  RouteTrackerRow,
  FormulaSettings
} from "@/app/lib/types";
import { currency, shortDate, estimatePay } from "@/app/lib/payroll-utils";
import { useFirestore, useCollection, useMemoFirebase, deleteDocumentNonBlocking } from "@/firebase";
import { collection, doc, query, orderBy, limit, where } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ImportSettlementModal } from "./ImportSettlementModal";
import { RouteAuditTable } from "./RouteAuditTable";
import { ExceptionPanel } from "./ExceptionPanel";

export function RXOSettlementView({ routes, settings, onAddInternalRoute }: { routes: RouteTrackerRow[], settings?: FormulaSettings, onAddInternalRoute?: (r: RouteTrackerRow) => void }) {
  const [activeTab, setActiveTab] = useState("audit");
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  
  const db = useFirestore();
  const { toast } = useToast();

  const reportsQuery = useMemoFirebase(() => query(collection(db, "rxoSettlementReports"), orderBy("importedAt", "desc"), limit(20)), [db]);
  const { data: reports } = useCollection<RXOSettlementReport>(reportsQuery);

  useEffect(() => {
    if (reports && reports.length > 0 && !selectedReportId) {
      setSelectedReportId(reports[0].id);
    }
  }, [reports, selectedReportId]);

  const selectedReport = useMemo(() => reports?.find(r => r.id === selectedReportId) || null, [reports, selectedReportId]);

  const routeDetailsQuery = useMemoFirebase(() => 
    selectedReportId ? query(collection(db, "rxoSettlementRouteDetails"), where("reportId", "==", selectedReportId)) : null, 
    [db, selectedReportId]
  );
  const { data: routeDetails } = useCollection<RXORouteDetail>(routeDetailsQuery);

  // Recalculate Live Stats based on current Route Tracker values
  const liveStats = useMemo(() => {
    if (!routeDetails || !routes) return null;
    
    let totalInternalEst = 0;
    routeDetails.forEach(row => {
      const matched = routes.find(r => r.id === row.internalRouteId);
      const est = matched 
        ? (matched.estimatedPay && matched.estimatedPay > 0 
            ? matched.estimatedPay 
            : estimatePay(matched.stops, matched.miles, matched.route, matched.vehicleNumber, settings, matched.routeType))
        : row.systemEstimatedPay;
      totalInternalEst += est;
    });

    const rxoTotal = selectedReport?.rxoTotalPay || 0;
    const delta = rxoTotal - totalInternalEst;

    return {
      internalEst: totalInternalEst,
      delta,
      isRed: delta < -500
    };
  }, [routeDetails, routes, selectedReport, settings]);

  const flaggedRoutes = useMemo(() => {
    if (!routeDetails) return [];
    return routeDetails.filter(row => {
      const matched = routes.find(r => r.id === row.internalRouteId);
      const est = matched 
        ? (matched.estimatedPay && matched.estimatedPay > 0 
            ? matched.estimatedPay 
            : estimatePay(matched.stops, matched.miles, matched.route, matched.vehicleNumber, settings, matched.routeType))
        : row.systemEstimatedPay;
      return (row.rxoSettlementPay - est) < -50;
    });
  }, [routeDetails, routes, settings]);

  const handleRecalculate = () => {
    toast({ title: "Audit Re-synchronized", description: "All estimates updated against active Route Tracker logs." });
  };

  const handleDeleteReport = (id: string) => {
    deleteDocumentNonBlocking(doc(db, "rxoSettlementReports", id));
    toast({ title: "Report Removed" });
    if (selectedReportId === id) setSelectedReportId(null);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">RXO Settlement Audit</h3>
          <p className="text-sm text-slate-500 font-medium">Verify RXO payout accuracy using live estimates from your Route Tracker.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {reports && reports.length > 0 && (
            <div className="flex items-center gap-2 bg-white px-4 h-11 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[9px] font-black uppercase text-slate-400 whitespace-nowrap">Review Week:</span>
              <Select value={selectedReportId || ""} onValueChange={setSelectedReportId}>
                <SelectTrigger className="h-8 border-none bg-transparent font-bold text-[10px] uppercase min-w-[180px] p-0 focus:ring-0">
                  <SelectValue placeholder="Select period..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {reports.map(r => (
                    <SelectItem key={r.id} value={r.id} className="text-[10px] font-bold uppercase">
                      {shortDate(r.settlementPeriodStart)} - {shortDate(r.settlementPeriodEnd)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <Button variant="outline" className="rounded-xl h-11 bg-white font-bold" onClick={() => setIsImportOpen(true)}>
            <Upload className="mr-2 h-4 w-4" /> AI Batch Import
          </Button>
        </div>
      </div>

      {selectedReport && liveStats ? (
        <>
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            <StatCard label="Total Routes" value={selectedReport.routeCount} icon={ClipboardCheck} color="text-slate-900" />
            <StatCard label="Total Miles" value={selectedReport.totalMiles.toLocaleString()} icon={Layers} color="text-slate-500" />
            <StatCard label="Total Stops" value={selectedReport.totalStops} icon={Layers} color="text-slate-500" />
            <StatCard label="Internal Est. Pay" value={currency(liveStats.internalEst)} icon={Info} color="text-primary" />
            <StatCard label="RXO Settlement Pay" value={currency(selectedReport.rxoTotalPay)} icon={Download} color="text-slate-900" />
            <StatCard 
              label="Weekly Delta" 
              value={currency(liveStats.delta)} 
              icon={ArrowRightLeft} 
              color={liveStats.isRed ? "text-rose-500" : "text-emerald-500"} 
              highlight={liveStats.isRed}
            />
          </div>

          {flaggedRoutes.length > 0 && <ExceptionPanel routes={flaggedRoutes as any} />}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-white border p-1 rounded-2xl h-14 mb-6">
              <TabsTrigger value="audit" className="rounded-xl h-full font-bold uppercase text-[10px] px-8">Route Comparison Audit</TabsTrigger>
              <TabsTrigger value="history" className="rounded-xl h-full font-bold uppercase text-[10px] px-8">Import History</TabsTrigger>
            </TabsList>

            <TabsContent value="audit">
              <RouteAuditTable 
                routeDetails={routeDetails || []} 
                internalRoutes={routes}
                search={search} 
                setSearch={setSearch} 
                onRecalculate={handleRecalculate}
                onAddInternalRoute={onAddInternalRoute}
                settings={settings}
              />
            </TabsContent>

            <TabsContent value="history">
              <Card className="rounded-[2.5rem] border-0 shadow-sm overflow-hidden bg-white">
                <CardHeader className="bg-slate-50/50 border-b p-8"><CardTitle className="text-[10px] font-black uppercase text-slate-400">Past AI Audits</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50 border-b text-[10px] font-black uppercase text-slate-400">
                        <th className="px-8 py-5 text-left">Period</th>
                        <th className="px-4 py-5 text-left">Imported Date</th>
                        <th className="px-4 py-5 text-center">Routes</th>
                        <th className="px-4 py-5 text-right">RXO Total</th>
                        <th className="px-4 py-5 text-right">Snapshot Delta</th>
                        <th className="px-8 py-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {reports?.map((report) => (
                        <tr key={report.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-8 py-5 font-black text-slate-900">{shortDate(report.settlementPeriodStart)} - {shortDate(report.settlementPeriodEnd)}</td>
                          <td className="px-4 py-5 text-sm font-medium text-slate-500">{new Date(report.importedAt).toLocaleDateString()}</td>
                          <td className="px-4 py-5 text-center font-bold">{report.routeCount}</td>
                          <td className="px-4 py-5 text-right font-bold">{currency(report.rxoTotalPay)}</td>
                          <td className={cn("px-4 py-5 text-right font-black", report.totalDelta < -100 ? "text-rose-500" : "text-emerald-500")}>
                            {currency(report.totalDelta)}
                          </td>
                          <td className="px-8 py-5 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="rounded-xl w-40">
                                <DropdownMenuItem onClick={() => { setSelectedReportId(report.id); setActiveTab("audit"); }} className="font-bold text-xs uppercase">View Audit</DropdownMenuItem>
                                <DropdownMenuItem className="text-rose-600 font-bold text-xs uppercase" onClick={() => handleDeleteReport(report.id)}>Delete</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      ) : (
        <Card className="rounded-[2.5rem] border-0 shadow-sm p-20 text-center space-y-6 bg-white">
          <div className="h-20 w-20 rounded-[2rem] bg-slate-50 flex items-center justify-center mx-auto text-slate-300"><ClipboardCheck className="h-10 w-10" /></div>
          <div className="space-y-2">
            <h4 className="text-xl font-black uppercase tracking-tighter text-slate-900">No Audits Imported</h4>
            <p className="text-sm text-slate-500 font-medium">Upload RXO screenshots to begin AI-powered settlement cross-referencing.</p>
          </div>
          <Button className="rounded-xl h-14 bg-slate-900 px-10 font-bold uppercase text-xs" onClick={() => setIsImportOpen(true)}>
            <Upload className="mr-2 h-4 w-4" /> Start AI Batch Audit
          </Button>
        </Card>
      )}

      <ImportSettlementModal 
        isOpen={isImportOpen} 
        onClose={() => setIsImportOpen(false)} 
        onImportComplete={(id) => { setSelectedReportId(id); setActiveTab("audit"); }} 
        routes={routes}
        settings={settings}
      />
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, highlight }: any) {
  return (
    <Card className={cn("rounded-[1.5rem] border-0 shadow-sm bg-white p-6", highlight && "bg-rose-50 border border-rose-100")}>
      <div className="flex flex-col gap-4">
        <div className={`h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center ${color}`}><Icon className="h-5 w-5" /></div>
        <div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
          <p className={cn("text-lg font-black truncate", color)} title={String(value)}>{value}</p>
        </div>
      </div>
    </Card>
  );
}
