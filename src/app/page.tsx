"use client";

import React, { useMemo, useState, useEffect } from "react";
import { LayoutDashboard, Users, Receipt, Route, Lock, Download, Loader2, LogOut, Shield, UserCircle, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

import { Employee, RouteTrackerRow, PayrollRun, PayrollItem } from "@/app/lib/types";
import { createPayrollItem, initialPayrollRun } from "@/app/lib/payroll-data-utils";
import { computeTotals } from "@/app/lib/payroll-utils";

import { DashboardView } from "@/components/dashboard/DashboardView";
import { EmployeeManager } from "@/components/employees/EmployeeManager";
import { PayrollRunsView } from "@/components/payroll/PayrollRunsView";
import { RouteTrackerView } from "@/components/payroll/RouteTrackerView";
import { LoginView } from "@/components/auth/LoginView";
import { MyPaystubsView } from "@/components/employees/MyPaystubsView";
import { EmployeeDashboard } from "@/components/employees/EmployeeDashboard";
import { MyRoutesView } from "@/components/employees/MyRoutesView";
import { EmployeeProfileView } from "@/components/employees/EmployeeProfileView";

import { useFirestore, useCollection, useDoc, useMemoFirebase, updateDocumentNonBlocking, setDocumentNonBlocking, deleteDocumentNonBlocking, useAuth, useUser } from "@/firebase";
import { collection, doc, query, where } from "firebase/firestore";
import { signOut } from "firebase/auth";

type ActiveView = "dashboard" | "employees" | "payroll" | "routes" | "emp-dashboard" | "emp-payslips" | "emp-routes" | "emp-profile";

export default function AppShell() {
  const [activeView, setActiveView] = useState<ActiveView | null>(null);
  const { toast } = useToast();
  const db = useFirestore();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();

  const userEmail = user?.email?.toLowerCase().trim();

  // Role and Profile Checks
  const adminDocRef = useMemoFirebase(() => user ? doc(db, "roles_admin", user.uid) : null, [db, user]);
  const { data: adminRole, isLoading: adminLoading } = useDoc(adminDocRef, { enabled: !!user });
  
  // Master Admin check via email as fallback for bootstrap phase
  const isMasterByEmail = userEmail === "admin@systemoriented.com" || userEmail === "jedocaton1997@gmail.com";
  const isAdmin = !!adminRole || isMasterByEmail;

  // Employee Profile Handshake
  const employeeQuery = useMemoFirebase(() => userEmail ? query(collection(db, "employees"), where("email", "==", userEmail)) : null, [db, userEmail]);
  const { data: employeesFound, isLoading: profileLoading } = useCollection<Employee>(employeeQuery, { enabled: !!userEmail });
  const employeeProfile = employeesFound?.[0] || null;
  const isEmployee = !!employeeProfile;

  // System Bootstrap Check
  const bootstrapDocRef = useMemoFirebase(() => doc(db, "roles_admin", "first_admin_placeholder"), [db]);
  const { data: bootstrapDoc, isLoading: bootstrapLoading } = useDoc(bootstrapDocRef);
  const isSystemFresh = !bootstrapLoading && !bootstrapDoc && !isMasterByEmail && !isAdmin && !isEmployee && user;

  // Redirection Logic
  useEffect(() => {
    if (isUserLoading || adminLoading || profileLoading || bootstrapLoading || !user) return;

    if (isAdmin) {
      if (!activeView || activeView.startsWith('emp-')) {
        setActiveView("dashboard");
      }
    } else if (isEmployee) {
      if (!activeView || !activeView.startsWith('emp-')) {
        setActiveView("emp-dashboard");
      }
    } else {
      setActiveView("emp-profile");
    }
  }, [isAdmin, isEmployee, isUserLoading, adminLoading, profileLoading, bootstrapLoading, user, activeView]);
  
  // Guarded Admin Collections - Only query if confirmed admin
  const shouldLoadAdminData = isAdmin && !adminLoading;
  
  const employeesQuery = useMemoFirebase(() => shouldLoadAdminData ? collection(db, "employees") : null, [db, shouldLoadAdminData]);
  const { data: employeesData } = useCollection<Employee>(employeesQuery, { enabled: shouldLoadAdminData });
  const employees = useMemo(() => (employeesData || []) as Employee[], [employeesData]);

  const routesQuery = useMemoFirebase(() => shouldLoadAdminData ? collection(db, "routeTrackerRows") : null, [db, shouldLoadAdminData]);
  const { data: routesData } = useCollection<RouteTrackerRow>(routesQuery, { enabled: shouldLoadAdminData });
  const routeTracker = useMemo(() => (routesData || []) as RouteTrackerRow[], [routesData]);

  const adminsQuery = useMemoFirebase(() => shouldLoadAdminData ? collection(db, "roles_admin") : null, [db, shouldLoadAdminData]);
  const { data: allAdmins } = useCollection(adminsQuery, { enabled: shouldLoadAdminData });

  const [payrollRun, setPayrollRun] = useState<PayrollRun>(initialPayrollRun);
  const [payrollItems, setPayrollItems] = useState<PayrollItem[]>([]);

  // Sync Payroll Items for Admin
  useEffect(() => {
    if (!isAdmin || employees.length === 0) return;
    setPayrollItems(prev => {
      const existingIds = new Set(prev.map(i => i.employeeId));
      const newItems = employees.filter(e => !existingIds.has(e.id)).map(e => createPayrollItem(e, payrollRun, routeTracker));
      return [...prev, ...newItems];
    });
  }, [employees, isAdmin, payrollRun, routeTracker]);

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

  const handleGrantAdmin = (uid: string) => {
    setDocumentNonBlocking(doc(db, "roles_admin", uid), { role: "admin", createdAt: new Date().toISOString() }, { merge: true });
    toast({ title: "Admin Privileges Granted" });
  };

  const handleRevokeAdmin = (uid: string) => {
    if (uid === user?.uid) return toast({ title: "Forbidden", variant: "destructive" });
    deleteDocumentNonBlocking(doc(db, "roles_admin", uid));
    toast({ title: "Admin Privileges Revoked" });
  };

  if (isUserLoading || (user && (adminLoading || profileLoading || bootstrapLoading))) {
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

  const navItems = isAdmin ? [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "employees", label: "Employees", icon: Users },
    { id: "payroll", label: "Payroll Runs", icon: Receipt },
    { id: "routes", label: "Route Tracker", icon: Route },
  ] : [
    { id: "emp-dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "emp-payslips", label: "My Payslips", icon: Receipt },
    { id: "emp-routes", label: "My Routes", icon: History },
    { id: "emp-profile", label: "Profile", icon: UserCircle },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50">
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur-md px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white font-black text-xl shadow-lg">S</div>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <button key={item.id} onClick={() => setActiveView(item.id as ActiveView)} className={cn("flex items-center gap-2 px-4 h-10 rounded-xl font-bold text-[10px] uppercase", activeView === item.id ? "bg-slate-100 text-primary" : "text-slate-500")}>
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
        ) : isAdmin ? (
          <>
            {activeView === "dashboard" && <DashboardView summary={payrollSummary} />}
            {activeView === "employees" && <EmployeeManager employees={employees} onAddEmployee={e => setDocumentNonBlocking(doc(db, "employees", e.id), e, {merge: true})} onUpdateEmployee={e => updateDocumentNonBlocking(doc(db, "employees", e.id), e)} onDeleteEmployee={id => deleteDocumentNonBlocking(doc(db, "employees", id))} allAdmins={allAdmins || []} onGrantAdmin={handleGrantAdmin} onRevokeAdmin={handleRevokeAdmin} isMasterAdmin={isAdmin} />}
            {activeView === "payroll" && <PayrollRunsView payrollRun={payrollRun} setPayrollRun={setPayrollRun} payrollItems={payrollItems} setPayrollItems={setPayrollItems} employees={employees} routeTracker={routeTracker} />}
            {activeView === "routes" && <RouteTrackerView routeTracker={routeTracker} onAddRoute={r => setDocumentNonBlocking(doc(db, "routeTrackerRows", r.id), r, {merge: true})} onUpdateRoute={r => updateDocumentNonBlocking(doc(db, "routeTrackerRows", r.id), r)} onDeleteRoute={id => deleteDocumentNonBlocking(doc(db, "routeTrackerRows", id))} employees={employees} />}
          </>
        ) : (
          <>
            {activeView === "emp-dashboard" && <EmployeeDashboard employee={employeeProfile} />}
            {activeView === "emp-payslips" && <MyPaystubsView employee={employeeProfile} />}
            {activeView === "emp-routes" && <MyRoutesView employee={employeeProfile} />}
            {activeView === "emp-profile" && <EmployeeProfileView employee={employeeProfile} />}
          </>
        )}
      </main>
    </div>
  );
}
