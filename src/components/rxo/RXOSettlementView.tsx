
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
  MoreHorizontal,
  Scale,
  Mail,
  Copy,
  CheckCircle2,
  ExternalLink
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
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
import { IntegrityAuditPanel } from "./IntegrityAuditPanel";

export function RXOSettlementView({ routes, settings, onAddInternalRoute }: { routes: RouteTrackerRow[], settings?: FormulaSettings, onAddInternalRoute?: (r: RouteTrackerRow) => void }) {
  const [activeTab, setActiveTab] = useState("audit");
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
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

  // Recalculate Live Stats
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
      isRed: delta < 0
    };
  }, [routeDetails, routes, selectedReport, settings]);

  const flaggedRoutes = useMemo(() => {
    if (!routeDetails || !routes) return [];
    return routeDetails
      .map(row => {
        const matched = routes.find(r => r.id === row.internalRouteId);
        const est = matched 
          ? (matched.estimatedPay && matched.estimatedPay > 0 
              ? matched.estimatedPay 
              : estimatePay(matched.stops, matched.miles, matched.route, matched.vehicleNumber, settings, matched.routeType))
          : row.systemEstimatedPay;
        return { ...row, liveDelta: row.rxoSettlementPay - est, internalMatch: matched };
      })
      .filter(row => row.liveDelta < 0)
      .sort((a, b) => a.routeDate.localeCompare(b.routeDate));
  }, [routeDetails, routes, settings]);

  const emailReportContent = useMemo(() => {
    if (!selectedReport || flaggedRoutes.length === 0) return null;

    const startDate = shortDate(selectedReport.settlementPeriodStart);
    const endDate = shortDate(selectedReport.settlementPeriodEnd);
    
    let body = `Hello\n\nI've reviewed the Weekly Settlement Report for ${startDate} - ${endDate}\n\n`;
    
    flaggedRoutes.forEach(row => {
      const routeName = row.internalMatch?.route || row.routeId;
      const internalStops = row.internalMatch?.stops || 0;
      const internalPay = row.internalMatch?.estimatedPay || row.systemEstimatedPay;
      const rxoPay = row.rxoSettlementPay;
      const rxoStops = row.stopCount;
      const variance = Math.abs(row.liveDelta);
      
      body += `For Route ${routeName} ${shortDate(row.routeDate)}, we were projected to receive ${currency(internalPay)} for ${internalStops} stops, but only ${currency(rxoPay)} for ${rxoStops} stops was received, resulting in a variance of ${currency(variance)}\n\n`;
    });

    const totalVar = flaggedRoutes.reduce((sum, r) => sum + Math.abs(r.liveDelta), 0);
    body += `Total variance for this week: ${currency(totalVar)}`;

    const subject = `Route Reconciliation - ${startDate} thru ${endDate}, ${new Date().getFullYear()} - System Oriented`;

    return { subject, body };
  }, [selectedReport, flaggedRoutes]);

  const handleCopyEmail = () => {
    if (emailReportContent) {
      navigator.clipboard.writeText(`${emailReportContent.subject}\n\n${emailReportContent.body}`);
      toast({ title: "Report Copied", description: "Reconciliation text copied to clipboard." });
    }
  };

  const handleSendEmail = () => {
    if (emailReportContent) {
      const mailto = `mailto:?subject=${encodeURIComponent(emailReportContent.subject)}&body=${encodeURIComponent(emailReportContent.body)}`;
      window.location.href = mailto;
    }
  };

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
            <>
              {flaggedRoutes.length > 0 && (
                <Button 
                  variant="outline" 
                  className="rounded-xl h-11 border-primary text-primary font-bold bg-primary/5 hover:bg-primary/10"
                  onClick={() => setIsEmailModalOpen(true)}
                >
                  <Mail className="mr-2 h-4 w-4" /> Generate Email Report
                </Button>
              )}
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
            </>
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

          <div className="grid gap-6">
            {selectedReport.summaryTotalPay !== undefined && selectedReport.orderDetailsRateSum !== undefined && (
              <IntegrityAuditPanel report={selectedReport} />
            )}
            
            {flaggedRoutes.length > 0 && <ExceptionPanel routes={flaggedRoutes as any} />}
          </div>

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
                        <th className="px-4 py-5 text-right">Integrity</th>
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
                          <td className="px-4 py-5 text-right">
                            <div className={cn(
                              "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[8px] font-black uppercase border",
                              report.integrityStatus === 'Verified' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : 
                              report.integrityStatus === 'Mismatch' ? "bg-rose-50 text-rose-600 border-rose-100" :
                              "bg-slate-50 text-slate-400 border-slate-100"
                            )}>
                              {report.integrityStatus || 'N/A'}
                            </div>
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
            <p className="text-sm text-slate-500 font-medium">Upload RXO screenshots or Excel files to begin settlement cross-referencing.</p>
          </div>
          <Button className="rounded-xl h-14 bg-slate-900 px-10 font-bold uppercase text-xs" onClick={() => setIsImportOpen(true)}>
            <Upload className="mr-2 h-4 w-4" /> Start Audit Batch
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

      <Dialog open={isEmailModalOpen} onOpenChange={setIsEmailModalOpen}>
        <DialogContent className="max-w-2xl rounded-[2rem] p-0 border-none shadow-2xl overflow-hidden bg-white">
          <DialogHeader className="p-8 bg-slate-50 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-white">
                <Mail className="h-5 w-5" />
              </div>
              <DialogTitle className="text-xl font-black uppercase tracking-tighter">Reconciliation Report</DialogTitle>
            </div>
          </DialogHeader>
          
          <div className="p-8 space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 px-1">Subject</label>
              <div className="p-4 bg-slate-50 rounded-xl font-bold text-sm text-slate-900 border border-slate-100">
                {emailReportContent?.subject}
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 px-1">Message Body</label>
              <div className="p-6 bg-slate-50 rounded-xl font-medium text-sm text-slate-700 border border-slate-100 whitespace-pre-wrap leading-relaxed max-h-[400px] overflow-y-auto">
                {emailReportContent?.body}
              </div>
            </div>
          </div>

          <DialogFooter className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-4">
            <Button variant="ghost" className="rounded-xl h-12 font-bold px-6" onClick={() => setIsEmailModalOpen(false)}>Close</Button>
            <div className="flex items-center gap-3">
              <Button variant="outline" className="rounded-xl h-12 font-bold px-6 bg-white border-slate-200" onClick={handleCopyEmail}>
                <Copy className="mr-2 h-4 w-4" /> Copy Text
              </Button>
              <Button className="rounded-xl h-12 font-bold px-8 bg-primary shadow-lg shadow-primary/20" onClick={handleSendEmail}>
                <ExternalLink className="mr-2 h-4 w-4" /> Send Email
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
