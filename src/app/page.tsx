
"use client";

import { useMemo, useState, useEffect } from "react";
import { LayoutDashboard, Users, Receipt, Route, LogOut, Loader2, Shield, Wallet, BarChart3, Settings, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

import { Employee, RouteTrackerRow, PayrollRun, PayrollItem, DeductionRecord, FormulaSettings, FormulaAuditLog } from "@/app/lib/types";
import { createPayrollItem, initialPayrollRun } from "@/app/lib/payroll-data-utils";
import { computeTotals } from "@/app/lib/payroll-utils";

import { DashboardView } from "@/components/dashboard/DashboardView";
import { EmployeeManager } from "@/components/employees/EmployeeManager";
import { PayrollRunsView } from "@/components/payroll/PayrollRunsView";
import { RouteTrackerView } from "@/components/payroll/RouteTrackerView";
import { DeductionBoard } from "@/components/deductions/DeductionBoard";
import { FleetProfitabilityView } from "@/components/fleet/FleetProfitabilityView";
import { LoginView } from "@/components/auth/LoginView";
import { FormulaSettingsView } from "@/components/settings/FormulaSettingsView";
import { RXOSettlementView } from "@/components/rxo/RXOSettlementView";

import { useFirestore, useCollection, useDoc, useMemoFirebase, updateDocumentNonBlocking, setDocumentNonBlocking, deleteDocumentNonBlocking, useAuth, useUser } from "@/firebase";
import { collection, doc, query, orderBy, limit } from "firebase/firestore";
import { signOut } from "firebase/auth";

type ActiveView = "dashboard" | "employees" | "payroll" | "routes" | "deductions" | "fleet" | "rxo" | "settings";

export default function AppShell() {
  const [activeView, setActiveView] = useState<ActiveView | null>(null);
  const { toast } = useToast();
  const db = useFirestore();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();

  const userEmail = useMemo(() => user?.email?.toLowerCase().trim(), [user]);

  // Admin Role Check
  const adminDocRef = useMemoFirebase(() => user ? doc(db, "roles_admin", user.uid) : null, [db, user]);
  const { data: adminRoleData, isLoading: adminLoading } = useDoc(adminDocRef, { enabled: !!user });
  
  const isMasterByEmail = userEmail === "admin@systemoriented.com" || userEmail === "jedocaton1997@gmail.com" || userEmail === "masteradmin@system.oriented";
  const isAdmin = !!adminRoleData || isMasterByEmail;

  // System Bootstrap Check
  const bootstrapDocRef = useMemoFirebase(() => doc(db, "roles_admin", "first_admin_placeholder"), [db]);
  const { data: bootstrapDoc, isLoading: bootstrapLoading } = useDoc(bootstrapDocRef, { enabled: !!user });
  const isSystemFresh = !bootstrapLoading && !bootstrapDoc && !isMasterByEmail && !isAdmin && user;

  // Formula Settings
  const settingsDocRef = useMemoFirebase(() => doc(db, "payrollFormulaSettings", "global-payroll-settings"), [db]);
  const { data: formulaSettings } = useDoc<FormulaSettings>(settingsDocRef, { enabled: isAdmin });

  const auditLogsQuery = useMemoFirebase(() => isAdmin ? query(collection(db, "payrollFormulaAuditLog"), orderBy("changedAt", "desc"), limit(20)) : null, [db, isAdmin]);
  const { data: auditLogs } = useCollection<FormulaAuditLog>(auditLogsQuery, { enabled: isAdmin });

  // Redirection Logic
  useEffect(() => {
    if (isUserLoading || adminLoading || bootstrapLoading || !user) return;

    if (isAdmin) {
      if (!activeView) setActiveView("dashboard");
    } else if (!isSystemFresh) {
      signOut(auth);
      toast({ title: "Access Denied", description: "Only authorized administrators may access this portal.", variant: "destructive" });
    }
  }, [isAdmin, isUserLoading, adminLoading, bootstrapLoading, user, activeView, auth, isSystemFresh, toast]);
  
  // Data Collections
  const shouldLoadData = isAdmin && !!user;
  
  const employeesQuery = useMemoFirebase(() => shouldLoadData ? collection(db, "employees") : null, [db, shouldLoadData]);
  const { data: employeesData } = useCollection<Employee>(employeesQuery, { enabled: shouldLoadData });
  const employees = useMemo(() => (employeesData || []) as Employee[], [employeesData]);

  const routesQuery = useMemoFirebase(() => shouldLoadData ? collection(db, "routeTrackerRows") : null, [db, shouldLoadData]);
  const { data: routesData } = useCollection<RouteTrackerRow>(routesQuery, { enabled: shouldLoadData });
  const routeTracker = useMemo(() => (routesData || []) as RouteTrackerRow[], [routesData]);

  const deductionsQuery = useMemoFirebase(() => shouldLoadData ? collection(db, "deductions") : null, [db, shouldLoadData]);
  const { data: deductionsData } = useCollection<DeductionRecord>(deductionsQuery, { enabled: shouldLoadData });
  const deductions = useMemo(() => (deductionsData || []) as DeductionRecord[], [deductionsData]);

  const [payrollRun, setPayrollRun] = useState<PayrollRun>(initialPayrollRun);
  const [payrollItems, setPayrollItems] = useState<PayrollItem[]>([]);

  // 1. Logic to Load Saved Items if Run is Finalized
  const savedItemsQuery = useMemoFirebase(() => 
    payrollRun.status === "Finalized" ? collection(db, "payrollRuns", payrollRun.id, "payrollItems") : null, 
    [db, payrollRun.id, payrollRun.status]
  );
  const { data: savedItemsData } = useCollection<PayrollItem>(savedItemsQuery, { enabled: payrollRun.status === "Finalized" });

  useEffect(() => {
    if (payrollRun.status === "Finalized" && savedItemsData) {
      setPayrollItems(savedItemsData);
    }
  }, [payrollRun.status, savedItemsData]);

  // 2. Logic to Sync Draft Items
  useEffect(() => {
    if (!isAdmin || employees.length === 0 || payrollRun.status === "Finalized") return;
    
    setPayrollItems(prev => {
      const existingIds = new Set(prev.map(i => i.employeeId));
      const newItems = employees
        .filter(e => !existingIds.has(e.id))
        .map(e => createPayrollItem(e, payrollRun, routeTracker, deductions, formulaSettings || undefined));
      return [...prev, ...newItems];
    });
  }, [employees, isAdmin, payrollRun, routeTracker, deductions, formulaSettings]);

  const payrollSummary = useMemo(() => {
    const totals = payrollItems.map(computeTotals);
    return {
      employees: payrollItems.length,
      gross: totals.reduce((sum, t) => sum + t.grossPay, 0),
      deductions: totals.reduce((sum, t) => sum + t.totalDeductions, 0),
      net: totals.reduce((sum, t) => sum + t.netPay, 0),
      items: payrollItems
    };
  }, [payrollItems]);

  const handleBootstrapMaster = () => {
    if (!user) return;
    const adminRef = doc(db, "roles_admin", user.uid);
    setDocumentNonBlocking(adminRef, { role: "master", createdAt: new Date().toISOString() }, { merge: true });
    setDocumentNonBlocking(doc(db, "roles_admin", "first_admin_placeholder"), { active: true }, { merge: true });
    toast({ title: "System Initialized" });
  };

  if (isUserLoading || (user && (adminLoading || bootstrapLoading))) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!user) return <LoginView />;

  if (isSystemFresh) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-md text-center space-y-6">
          <Shield className="h-10 w-10 mx-auto text-primary" />
          <h2 className="text-2xl font-black uppercase">System Initialization</h2>
          <Button onClick={handleBootstrapMaster} className="w-full h-14 rounded-2xl bg-slate-900 font-bold uppercase">Initialize Master Admin</Button>
          <Button variant="ghost" onClick={() => signOut(auth)} className="text-xs font-bold text-slate-400">Sign Out</Button>
        </div>
      </div>
    );
  }

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "employees", label: "Employees", icon: Users },
    { id: "payroll", label: "Payroll Runs", icon: Receipt },
    { id: "routes", label: "Route Tracker", icon: Route },
    { id: "deductions", label: "Deductions", icon: Wallet },
    { id: "fleet", label: "Fleet Profitability", icon: BarChart3 },
    { id: "rxo", label: "RXO Settlement", icon: ClipboardCheck },
    { id: "settings", label: "Formula Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50">
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur-md px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white font-black text-xl shadow-lg">S</div>
          <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {navItems.map((item) => (
              <button key={item.id} onClick={() => setActiveView(item.id as ActiveView)} className={cn("flex items-center gap-2 px-4 h-10 rounded-xl font-bold text-[10px] uppercase whitespace-nowrap", activeView === item.id ? "bg-slate-100 text-primary" : "text-slate-500")}>
                <item.icon className="h-4 w-4" /><span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="rounded-full h-10 w-10" onClick={() => signOut(auth)}><LogOut className="h-5 w-5" /></Button>
        </div>
      </header>
      <main className="flex-1 p-8 max-w-[1600px] mx-auto w-full">
        {!activeView ? (
          <div className="flex justify-center p-20"><Loader2 className="h-8 w-8 animate-spin text-primary/20" /></div>
        ) : (
          <>
            {activeView === "dashboard" && <DashboardView summary={payrollSummary} deductions={deductions} />}
            {activeView === "employees" && <EmployeeManager employees={employees} onAddEmployee={e => setDocumentNonBlocking(doc(db, "employees", e.id), e, {merge: true})} onUpdateEmployee={e => updateDocumentNonBlocking(doc(db, "employees", e.id), e)} onDeleteEmployee={id => deleteDocumentNonBlocking(doc(db, "employees", id))} />}
            {activeView === "payroll" && <PayrollRunsView payrollRun={payrollRun} setPayrollRun={setPayrollRun} payrollItems={payrollItems} setPayrollItems={setPayrollItems} employees={employees} routeTracker={routeTracker} deductions={deductions} settings={formulaSettings || undefined} />}
            {activeView === "routes" && <RouteTrackerView routeTracker={routeTracker} onAddRoute={r => setDocumentNonBlocking(doc(db, "routeTrackerRows", r.id), r, {merge: true})} onUpdateRoute={r => updateDocumentNonBlocking(doc(db, "routeTrackerRows", r.id), r)} onDeleteRoute={id => deleteDocumentNonBlocking(doc(db, "routeTrackerRows", id))} employees={employees} settings={formulaSettings || undefined} />}
            {activeView === "deductions" && <DeductionBoard employees={employees} deductions={deductions} />}
            {activeView === "fleet" && <FleetProfitabilityView routeTracker={routeTracker} settings={formulaSettings || undefined} />}
            {activeView === "rxo" && (
              <RXOSettlementView 
                routes={routeTracker} 
                settings={formulaSettings || undefined} 
                onAddInternalRoute={r => setDocumentNonBlocking(doc(db, "routeTrackerRows", r.id), r, {merge: true})}
              />
            )}
            {activeView === "settings" && <FormulaSettingsView settings={formulaSettings || null} auditLogs={auditLogs || []} />}
          </>
        )}
      </main>
    </div>
  );
}
