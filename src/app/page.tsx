
"use client";

import React, { useMemo, useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  Users, 
  Receipt, 
  Route, 
  Lock,
  Download,
  ChevronRight,
  Loader2,
  LogOut,
  ShieldAlert,
  ShieldCheck,
  Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

import { 
  Employee, 
  RouteTrackerRow, 
  PayrollRun, 
  PayrollItem 
} from "@/app/lib/types";
import { 
  createPayrollItem,
  initialPayrollRun
} from "@/app/lib/payroll-data-utils";
import { computeTotals } from "@/app/lib/payroll-utils";

import { DashboardView } from "@/components/dashboard/DashboardView";
import { EmployeeManager } from "@/components/employees/EmployeeManager";
import { PayrollRunsView } from "@/components/payroll/PayrollRunsView";
import { RouteTrackerView } from "@/components/payroll/RouteTrackerView";
import { LoginView } from "@/components/auth/LoginView";
import { MyPaystubsView } from "@/components/employees/MyPaystubsView";

import { 
  useFirestore, 
  useCollection, 
  useDoc,
  useMemoFirebase,
  updateDocumentNonBlocking,
  setDocumentNonBlocking,
  deleteDocumentNonBlocking,
  useAuth,
  useUser
} from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { signOut } from "firebase/auth";

type ActiveView = "dashboard" | "employees" | "payroll" | "routes" | "my-stubs" | "admin-board";

export default function AppShell() {
  const [activeView, setActiveView] = useState<ActiveView>("dashboard");
  const { toast } = useToast();
  const db = useFirestore();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();

  // Role Checks
  const adminDocRef = useMemoFirebase(() => user ? doc(db, "roles_admin", user.uid) : null, [db, user]);
  const { data: adminRole, isLoading: adminLoading } = useDoc(adminDocRef);
  
  const employeeDocRef = useMemoFirebase(() => user ? doc(db, "employees", user.uid) : null, [db, user]);
  const { data: employeeProfile, isLoading: profileLoading } = useDoc<Employee>(employeeDocRef);

  const isAdmin = !!adminRole;
  const isEmployee = !!employeeProfile && !isAdmin;

  // Set initial view based on role
  useEffect(() => {
    if (isAdmin) setActiveView("dashboard");
    else if (isEmployee) setActiveView("my-stubs");
  }, [isAdmin, isEmployee]);
  
  // Firestore Subscriptions (Admins only for general collections)
  const employeesQuery = useMemoFirebase(() => isAdmin ? collection(db, "employees") : null, [db, isAdmin]);
  const { data: employeesData } = useCollection<Employee>(employeesQuery);
  
  const routesQuery = useMemoFirebase(() => isAdmin ? collection(db, "routeTrackerRows") : null, [db, isAdmin]);
  const { data: routesData } = useCollection<RouteTrackerRow>(routesQuery);

  const adminsQuery = useMemoFirebase(() => isAdmin ? collection(db, "roles_admin") : null, [db, isAdmin]);
  const { data: allAdminsData } = useCollection(adminsQuery);

  const [payrollRun, setPayrollRun] = useState<PayrollRun>(initialPayrollRun);
  const [payrollItems, setPayrollItems] = useState<PayrollItem[]>([]);

  const employees = useMemo(() => (employeesData || []) as Employee[], [employeesData]);
  const routeTracker = useMemo(() => (routesData || []) as RouteTrackerRow[], [routesData]);
  const allAdmins = useMemo(() => (allAdminsData || []), [allAdminsData]);

  // Guard initialization to prevent infinite update loop
  useEffect(() => {
    if (isAdmin && employees.length > 0 && payrollItems.length === 0) {
      setPayrollItems(employees.map(e => createPayrollItem(e, payrollRun, routeTracker)));
    }
  }, [employees, payrollRun, routeTracker, isAdmin, payrollItems.length]);

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

  const handleAddEmployee = (newEmployee: Employee) => {
    const docRef = doc(db, "employees", newEmployee.id);
    setDocumentNonBlocking(docRef, newEmployee, { merge: true });
    toast({
      title: "Employee Added",
      description: `${newEmployee.fullName} has been added to the system.`
    });
  };

  const handleUpdateEmployee = (updatedEmployee: Employee) => {
    const docRef = doc(db, "employees", updatedEmployee.id);
    updateDocumentNonBlocking(docRef, updatedEmployee);
    toast({
      title: "Profile Updated",
      description: `Changes to ${updatedEmployee.fullName} have been saved.`
    });
  };

  const handleDeleteEmployee = (id: string) => {
    const docRef = doc(db, "employees", id);
    deleteDocumentNonBlocking(docRef);
    // Also remove admin role if it exists
    const adminRef = doc(db, "roles_admin", id);
    deleteDocumentNonBlocking(adminRef);
    toast({
      title: "Record Terminated",
      description: "Access has been revoked and record removed from system.",
      variant: "destructive"
    });
  };

  const handleGrantAdmin = (uid: string) => {
    const docRef = doc(db, "roles_admin", uid);
    setDocumentNonBlocking(docRef, { role: "admin", createdAt: new Date().toISOString() }, { merge: true });
    toast({
      title: "Admin Role Granted",
      description: "Administrative privileges have been enabled for this account."
    });
  };

  const handleRevokeAdmin = (uid: string) => {
    if (user?.uid === uid) {
      toast({
        title: "Action Restricted",
        description: "You cannot revoke your own administrative privileges.",
        variant: "destructive"
      });
      return;
    }
    const docRef = doc(db, "roles_admin", uid);
    deleteDocumentNonBlocking(docRef);
    toast({
      title: "Admin Role Revoked",
      description: "Administrative privileges have been disabled for this account.",
      variant: "destructive"
    });
  };

  const handleAddRoute = (newRoute: RouteTrackerRow) => {
    const docRef = doc(db, "routeTrackerRows", newRoute.id);
    setDocumentNonBlocking(docRef, newRoute, { merge: true });
    toast({
      title: "Route Logged",
      description: `Route ${newRoute.route} for ${newRoute.date} has been added.`
    });
  };

  const handleUpdateRoute = (updatedRoute: RouteTrackerRow) => {
    const docRef = doc(db, "routeTrackerRows", updatedRoute.id);
    updateDocumentNonBlocking(docRef, updatedRoute);
    toast({
      title: "Route Updated",
      description: `Log for Route ${updatedRoute.route} has been updated.`
    });
  };

  const handleDeleteRoute = (id: string) => {
    const docRef = doc(db, "routeTrackerRows", id);
    deleteDocumentNonBlocking(docRef);
    toast({
      title: "Log Removed",
      description: "Route log has been deleted from the audit.",
      variant: "destructive"
    });
  };

  const exportCsv = () => {
    const rows = [
      ["Employee", "Pay Period", "Pay Date", "Gross", "Deductions", "Net"],
      ...payrollItems.map((item) => {
        const totals = computeTotals(item);
        return [
          item.employeeNameSnapshot,
          `${payrollRun.payPeriodStart} to ${payrollRun.payPeriodEnd}`,
          payrollRun.payDate,
          totals.grossPay.toFixed(2),
          totals.totalDeductions.toFixed(2),
          totals.netPay.toFixed(2),
        ];
      }),
    ];
    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `payroll_run_${payrollRun.payDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const finalizeRun = () => {
    setPayrollRun((current) => ({ ...current, status: "Finalized" }));
    toast({
      title: "Payroll Finalized",
      description: "All records have been locked for this period."
    });
  };

  const handleSignOut = () => {
    signOut(auth);
    setActiveView("dashboard");
  };

  const handleBootstrapAdmin = () => {
    if (!user) return;
    const docRef = doc(db, "roles_admin", user.uid);
    setDocumentNonBlocking(docRef, { role: "admin", createdAt: new Date().toISOString() }, { merge: true });
    toast({
      title: "Admin Role Granted",
      description: "You now have full system access. Page will refresh."
    });
  };

  if (isUserLoading || adminLoading || profileLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Authenticating Session...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  // Handle users that are neither admin nor have an employee profile
  if (!isAdmin && !isEmployee && !profileLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="flex h-20 w-20 mx-auto items-center justify-center rounded-3xl bg-rose-50 text-rose-500">
            <ShieldAlert className="h-10 w-10" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Access Pending</h1>
            <p className="text-sm text-slate-500 font-medium">Your account ({user.email}) is not yet registered in the workforce directory. Please contact your administrator to set up your profile.</p>
          </div>
          <div className="grid gap-3">
            <Button className="rounded-xl h-12 w-full font-bold uppercase tracking-wider bg-slate-900" onClick={handleBootstrapAdmin}>
              <ShieldCheck className="mr-2 h-4 w-4" /> Grant Admin Privileges (Dev)
            </Button>
            <Button variant="outline" className="rounded-xl h-12 w-full font-bold uppercase tracking-wider" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" /> Sign Out
            </Button>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Bootstrap button is for initial prototype setup only.
          </p>
        </div>
      </div>
    );
  }

  const navItems = isAdmin ? [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "employees", label: "Employees", icon: Users },
    { id: "payroll", label: "Payroll Runs", icon: Receipt },
    { id: "routes", label: "Route Tracker", icon: Route },
    { id: "admin-board", label: "Admin Board", icon: Shield },
  ] : [
    { id: "my-stubs", label: "My Paystubs", icon: Receipt },
  ];

  return (
    <div className="min-h-screen w-full bg-slate-50/50 flex flex-col">
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-lg shadow-primary/20">
                <svg viewBox="0 0 100 100" className="h-6 w-6 fill-white">
                  <circle cx="50" cy="50" r="40" fill="#4461B5"/>
                  <text x="35" y="68" style={{ fontFamily: 'Inter', fontWeight: 900, fontSize: '50px' }} fill="white">S</text>
                </svg>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xs font-black tracking-tighter text-slate-900 uppercase leading-none">Payout Tracker</h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase">System Oriented</p>
              </div>
            </div>

            <nav className="flex items-center gap-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id as ActiveView)}
                  className={cn(
                    "flex items-center gap-2 px-4 h-10 rounded-xl transition-all font-bold text-[10px] uppercase tracking-wider",
                    activeView === item.id 
                      ? "bg-slate-100 text-primary" 
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span className="hidden md:inline">{item.label}</span>
                </button>
              ))}
            </nav>
          </div>
          
          <div className="flex items-center gap-3">
            {isAdmin && (
              <>
                <Button variant="outline" size="sm" className="rounded-xl h-9 border-slate-200 font-bold text-[10px] uppercase tracking-wider" onClick={exportCsv}>
                  <Download className="mr-2 h-3 w-3" /> Export
                </Button>
                <Button size="sm" className="rounded-xl h-9 bg-accent hover:bg-accent/90 text-white font-bold text-[10px] uppercase tracking-wider" onClick={finalizeRun} disabled={payrollRun.status === "Finalized"}>
                  <Lock className="mr-2 h-3 w-3" /> Finalize
                </Button>
              </>
            )}
            <div className="h-8 w-px bg-slate-200 mx-2" />
            <div className="flex items-center gap-3 pl-2">
              <div className="text-right hidden sm:block">
                <p className="text-[10px] font-black text-slate-900 uppercase leading-none">{user.email?.split('@')[0]}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase">{isAdmin ? "Administrator" : "Employee"}</p>
              </div>
              <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 text-slate-400 hover:text-rose-600 hover:bg-rose-50" onClick={handleSignOut}>
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="bg-white border-b border-slate-100 px-8 py-3 flex items-center gap-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">System</span>
        <ChevronRight className="h-3 w-3 text-slate-300" />
        <h2 className="text-[10px] font-black uppercase tracking-widest text-primary">
          {activeView === "payroll" ? "Payroll Runs" : activeView === "routes" ? "Route Tracker" : activeView === "my-stubs" ? "My Statements" : activeView === "admin-board" ? "Admin Board" : activeView.toUpperCase()}
        </h2>
      </div>

      <main className="flex-1 p-8 overflow-x-hidden">
        <div className="max-w-[1600px] mx-auto">
          {isAdmin ? (
            <>
              {activeView === "dashboard" && <DashboardView summary={payrollSummary} />}
              {activeView === "employees" && (
                <EmployeeManager 
                  employees={employees} 
                  onAddEmployee={handleAddEmployee}
                  onUpdateEmployee={handleUpdateEmployee}
                  onDeleteEmployee={handleDeleteEmployee}
                />
              )}
              {activeView === "payroll" && (
                <PayrollRunsView 
                  payrollRun={payrollRun} 
                  setPayrollRun={setPayrollRun}
                  payrollItems={payrollItems}
                  setPayrollItems={setPayrollItems}
                  employees={employees}
                  routeTracker={routeTracker}
                />
              )}
              {activeView === "routes" && (
                <RouteTrackerView 
                  routeTracker={routeTracker} 
                  onAddRoute={handleAddRoute}
                  onUpdateRoute={handleUpdateRoute}
                  onDeleteRoute={handleDeleteRoute}
                  employees={employees}
                />
              )}
              {activeView === "admin-board" && (
                <EmployeeManager 
                  employees={employees} 
                  onAddEmployee={handleAddEmployee}
                  onUpdateEmployee={handleUpdateEmployee}
                  onDeleteEmployee={handleDeleteEmployee}
                  isRoleManagement={true}
                  allAdmins={allAdmins}
                  onGrantAdmin={handleGrantAdmin}
                  onRevokeAdmin={handleRevokeAdmin}
                />
              )}
            </>
          ) : (
            <MyPaystubsView employee={employeeProfile || null} />
          )}
        </div>
      </main>
    </div>
  );
}
