
"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  ArrowRightLeft
} from "lucide-react";
import { 
  RXOSettlementReport, 
  RXORouteDetail, 
  RXOOrderDetail, 
  RouteTrackerRow,
  FormulaSettings
} from "@/app/lib/types";
import { currency, shortDate } from "@/app/lib/payroll-utils";
import { useFirestore, useCollection, useMemoFirebase, setDocumentNonBlocking } from "@/firebase";
import { collection, doc, query, orderBy, limit, where } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { ImportSettlementModal } from "./ImportSettlementModal";
import { RouteAuditTable } from "./RouteAuditTable";
import { ExceptionPanel } from "./ExceptionPanel";

interface RXOSettlementViewProps {
  routes: RouteTrackerRow[];
  settings?: FormulaSettings;
}

export function RXOSettlementView({ routes, settings }: RXOSettlementViewProps) {
  const [activeTab, setActiveTab] = useState("audit");
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  
  const db = useFirestore();
  const { toast } = useToast();

  // Data Fetching
  const reportsQuery = useMemoFirebase(() => query(collection(db, "rxoSettlementReports"), orderBy("importedAt", "desc"), limit(10)), [db]);
  const { data: reports } = useCollection<RXOSettlementReport>(reportsQuery);

  // Set default selected report if none selected
  useMemo(() => {
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

  const orderDetailsQuery = useMemoFirebase(() => 
    selectedReportId ? query(collection(db, "rxoSettlementOrderDetails"), where("reportId", "==", selectedReportId)) : null, 
    [db, selectedReportId]
  );
  const { data: orderDetails } = useCollection<RXOOrderDetail>(orderDetailsQuery);

  const summaryRowsQuery = useMemoFirebase(() => 
    selectedReportId ? query(collection(db, "rxoSettlementSummaryRows"), where("reportId", "==", selectedReportId)) : null, 
    [db, selectedReportId]
  );
  const { data: summaryRows } = useCollection<any>(summaryRowsQuery);

  const flaggedRoutes = useMemo(() => routeDetails?.filter(r => r.delta < -50) || [], [routeDetails]);

  const handleRecalculate = () => {
    toast({ title: "Recalculating Audit", description: "Re-matching routes and updating estimates..." });
    // In a real app, this would trigger a background function or local recalculation loop
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">RXO Weekly Settlement Report</h3>
          <p className="text-sm text-slate-500 font-medium">Import RXO settlement files, review payouts, and audit internal estimates.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" className="rounded-xl h-11 bg-white font-bold" onClick={() => setActiveTab("history")}>
            <History className="mr-2 h-4 w-4" /> Settlement History
          </Button>
          <Button className="rounded-xl h-11 bg-primary px-6 font-bold shadow-lg" onClick={() => setIsImportOpen(true)}>
            <Upload className="mr-2 h-4 w-4" /> Import Settlement File
          </Button>
        </div>
      </div>

      {selectedReport && (
        <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-7">
          <StatCard label="Period" value={`${shortDate(selectedReport.settlementPeriodStart)} - ${shortDate(selectedReport.settlementPeriodEnd)}`} icon={Calendar} color="text-blue-500" />
          <StatCard label="Markets" value={selectedReport.marketCount} icon={Layers} color="text-indigo-500" />
          <StatCard label="Routes" value={selectedReport.routeCount} icon={ClipboardCheck} color="text-emerald-500" />
          <StatCard label="Total RXO Pay" value={currency(selectedReport.rxoTotalPay)} icon={Download} color="text-slate-900" />
          <StatCard label="Internal Est." value={currency(selectedReport.internalEstimatedTotalPay)} icon={Info} color="text-slate-400" />
          <StatCard 
            label="Total Delta" 
            value={currency(selectedReport.totalDelta)} 
            icon={ArrowRightLeft} 
            color={selectedReport.totalDelta < 0 ? "text-rose-500" : "text-emerald-500"} 
            highlight={selectedReport.totalDelta < -500}
          />
          <StatCard label="Flagged" value={flaggedRoutes.length} icon={AlertTriangle} color="text-rose-500" highlight={flaggedRoutes.length > 0} />
        </div>
      )}

      {flaggedRoutes.length > 0 && <ExceptionPanel routes={flaggedRoutes} />}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-white border p-1 rounded-2xl h-14 mb-6">
          <TabsTrigger value="audit" className="rounded-xl h-full font-bold uppercase text-[10px] px-8">Route Audit</TabsTrigger>
          <TabsTrigger value="summary" className="rounded-xl h-full font-bold uppercase text-[10px] px-8">RXO Summary</TabsTrigger>
          <TabsTrigger value="orders" className="rounded-xl h-full font-bold uppercase text-[10px] px-8">Order Details</TabsTrigger>
          <TabsTrigger value="history" className="rounded-xl h-full font-bold uppercase text-[10px] px-8">History</TabsTrigger>
        </TabsList>

        <TabsContent value="audit">
          <RouteAuditTable routeDetails={routeDetails || []} orderDetails={orderDetails || []} search={search} setSearch={setSearch} onRecalculate={handleRecalculate} />
        </TabsContent>

        <TabsContent value="summary">
          <Card className="rounded-[2.5rem] border-0 shadow-sm overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/50 border-b p-8">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Imported Summary Snapshot</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-900 text-white">
                      <th className="px-8 py-4 text-left text-[10px] font-black uppercase tracking-widest">Market</th>
                      <th className="px-4 py-4 text-center text-[10px] font-black uppercase tracking-widest">Route Count</th>
                      <th className="px-4 py-4 text-center text-[10px] font-black uppercase tracking-widest">Total Miles</th>
                      <th className="px-4 py-4 text-center text-[10px] font-black uppercase tracking-widest">Total Stops</th>
                      <th className="px-8 py-4 text-right text-[10px] font-black uppercase tracking-widest">Total Pay</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {summaryRows?.map((row: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="px-8 py-5 font-bold text-slate-900">{row.market}</td>
                        <td className="px-4 py-5 text-center font-bold text-slate-500">{row.routeCount}</td>
                        <td className="px-4 py-5 text-center font-bold text-slate-500">{row.totalMiles}</td>
                        <td className="px-4 py-5 text-center font-bold text-slate-500">{row.totalStops}</td>
                        <td className="px-8 py-5 text-right font-black text-slate-900">{currency(row.totalPay)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders">
          <Card className="rounded-[2.5rem] border-0 shadow-sm overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/50 border-b p-8">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Raw Order Details Reference</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-[600px]">
                <table className="w-full">
                  <thead className="sticky top-0 z-10 bg-slate-900 text-white">
                    <tr>
                      <th className="px-8 py-4 text-left text-[10px] font-black uppercase tracking-widest">Job #</th>
                      <th className="px-4 py-4 text-left text-[10px] font-black uppercase tracking-widest">Route ID</th>
                      <th className="px-4 py-4 text-left text-[10px] font-black uppercase tracking-widest">Service</th>
                      <th className="px-4 py-4 text-center text-[10px] font-black uppercase tracking-widest">Status</th>
                      <th className="px-4 py-4 text-right text-[10px] font-black uppercase tracking-widest">Rate</th>
                      <th className="px-4 py-4 text-right text-[10px] font-black uppercase tracking-widest">Mileage</th>
                      <th className="px-8 py-4 text-right text-[10px] font-black uppercase tracking-widest">Supplement</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {orderDetails?.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-8 py-4 font-black text-slate-900 text-xs">{order.jobNumber}</td>
                        <td className="px-4 py-4 font-bold text-slate-500 text-xs">{order.routeId}</td>
                        <td className="px-4 py-4 text-xs font-medium text-slate-600">{order.service}</td>
                        <td className="px-4 py-4 text-center text-[10px] font-black uppercase text-slate-400">{order.completion}</td>
                        <td className="px-4 py-4 text-right font-bold">{currency(order.rate)}</td>
                        <td className="px-4 py-4 text-right font-bold">{currency(order.mileage)}</td>
                        <td className="px-8 py-4 text-right font-bold text-emerald-600">+{currency(order.supplement)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card className="rounded-[2.5rem] border-0 shadow-sm overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/50 border-b p-8">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Past Imported Reports</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Settlement Period</th>
                      <th className="px-4 py-5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Imported Date</th>
                      <th className="px-4 py-5 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Routes</th>
                      <th className="px-4 py-5 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">RXO Total</th>
                      <th className="px-4 py-5 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Delta</th>
                      <th className="px-8 py-5 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {reports?.map((report) => (
                      <tr key={report.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-8 py-5 font-black text-slate-900">{shortDate(report.settlementPeriodStart)} - {shortDate(report.settlementPeriodEnd)}</td>
                        <td className="px-4 py-5 text-sm font-medium text-slate-500">{new Date(report.importedAt).toLocaleDateString()}</td>
                        <td className="px-4 py-5 text-center font-bold">{report.routeCount}</td>
                        <td className="px-4 py-5 text-right font-bold">{currency(report.rxoTotalPay)}</td>
                        <td className={cn("px-4 py-5 text-right font-black", report.totalDelta < 0 ? "text-rose-500" : "text-emerald-500")}>
                          {currency(report.totalDelta)}
                        </td>
                        <td className="px-8 py-5 text-right">
                          <Button variant="ghost" size="sm" className="rounded-xl h-9 text-[10px] font-black uppercase tracking-wider text-primary" onClick={() => { setSelectedReportId(report.id); setActiveTab("audit"); }}>
                            View Report <ChevronRight className="ml-1 h-3 w-3" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
    <Card className={cn(
      "rounded-[1.5rem] border-0 shadow-sm bg-white p-6",
      highlight && "bg-rose-50 border border-rose-100 animate-pulse"
    )}>
      <div className="flex flex-col gap-4">
        <div className={`h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
          <p className={cn("text-lg font-black", color)}>{value}</p>
        </div>
      </div>
    </Card>
  );
}
