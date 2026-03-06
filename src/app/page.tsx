
"use client";

import React, { useMemo, useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  Users, 
  Receipt, 
  Route, 
  Lock,
  Download,
  Loader2,
  LogOut,
  Shield,
  UserCircle,
  History,
  ShieldAlert,
  Save
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
import { EmployeeDashboard } from "@/components/employees/EmployeeDashboard";
import { MyRoutesView } from "@/components/employees/MyRoutesView";
import { EmployeeProfileView } from "@/components/employees/EmployeeProfileView";

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
import { collection, doc, query, where } from "firebase/firestore";
import { signOut } from "firebase/auth";

type ActiveView = 
  | "dashboard" 
  | "employees" 
  | "payroll" 
  | "routes" 
  | "admin-board"
  | "emp-dashboard"
  | "emp-payslips"
  | "emp-routes"
  | "emp-profile";

export default function AppShell() {
  const [activeView, setActiveView] = useState<ActiveView>("dashboard");
  const { toast } = useToast();
  const db = useFirestore();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();

  // 1. Identify the System UID for the currently logged in Firebase User
  const systemNodeQuery = useMemoFirebase(() => 
    user ? query(collection(db, "system_users"), where("authUid", "==", user.uid)) : null, 
    [db, user]
  );
  const { data: matchedNodes, isLoading: nodeLoading } = useCollection(systemNodeQuery);
  const activeSystemNode = matchedNodes?.[0];
  const systemUid = activeSystemNode?.id;

  // 2. Role and Profile Checks using the mapped IDs
  const adminDocRef = useMemoFirebase(() => user ? doc(db, "roles_admin", user.uid) : null, [db, user]);
  const { data: adminRole, isLoading: adminLoading } = useDoc(adminDocRef);
  
  const employeeDocRef = useMemoFirebase(() => systemUid ? doc(db, "employees", systemUid) : null, [db, systemUid]);
  const { data: employeeProfile, isLoading: profileLoading } = useDoc<Employee>(employeeDocRef);

  const isAdmin = !!adminRole;
  const isEmployee = !!employeeProfile;

  // 3. System Freshness Check (Bootstrap state)
  const bootstrapDocRef = useMemoFirebase(() => doc(db, "roles_admin", "first_admin_placeholder"), [db]);
  const { data: bootstrapDoc, isLoading: bootstrapLoading } = useDoc(bootstrapDocRef);
  const isSystemFresh = !bootstrapLoading && !bootstrapDoc;

  const adminsQuery = useMemoFirebase(() => isAdmin ? collection(db, "roles_admin") : null, [db, isAdmin]);
  const { data: allAdminsData, isLoading: allAdminsLoading } = useCollection(adminsQuery);
  const allAdmins = useMemo(() => (allAdminsData || []), [allAdminsData]);

  // Automated Redirection Logic
  useEffect(() => {
    if (!isUserLoading && !adminLoading && !profileLoading && !bootstrapLoading && !nodeLoading && user) {
      if (isAdmin) {
        setActiveView("dashboard");
      } else if (isEmployee) {
        setActiveView("emp-dashboard");
      } else if (!isSystemFresh) {
        setActiveView("emp-profile");
      }
    }
  }, [isAdmin, isEmployee, isUserLoading, adminLoading, profileLoading, bootstrapLoading, isSystemFresh, nodeLoading, user]);
  
  const employeesQuery = useMemoFirebase(() => isAdmin ? collection(db, "employees") : null, [db, isAdmin]);
  const { data: employeesData } = useCollection<Employee>(employeesQuery);
  
  const systemUsersQuery = useMemoFirebase(() => isAdmin ? collection(db, "system_users") : null, [db, isAdmin]);
  const { data: systemUsersData } = useCollection(systemUsersQuery);

  const routesQuery = useMemoFirebase(() => isAdmin ? collection(db, "routeTrackerRows") : null, [db, isAdmin]);
  const { data: routesData } = useCollection<RouteTrackerRow>(routesQuery);

  const [payrollRun, setPayrollRun] = useState<PayrollRun>(initialPayrollRun);
  const [payrollItems, setPayrollItems] = useState<PayrollItem[]>([]);

  const employees = useMemo(() => (employeesData || []) as Employee[], [employeesData]);
  const systemUsers = useMemo(() => (systemUsersData || []), [systemUsersData]);
  const routeTracker = useMemo(() => (routesData || []) as RouteTrackerRow[], [routesData]);

  // Sync Payroll Items with Active Employee Directory
  useEffect(() => {
    if (!isAdmin) return;
    
    setPayrollItems(prevItems => {
      const currentEmployeeIds = new Set(employees.map(e => e.id));
      const syncedItems = prevItems.filter(item => currentEmployeeIds.has(item.employeeId));
      
      const existingItemEmployeeIds = new Set(syncedItems.map(item => item.employeeId));
      const newEmployeeItems = employees
        .filter(e => !existingItemEmployeeIds.has(e.id))
        .map(e => createPayrollItem(e, payrollRun, routeTracker));
        
      const finalItems = [...syncedItems, ...newEmployeeItems];
      
      // Ensure authUid is always synced for security rules
      const updatedItems = finalItems.map(item => {
        const emp = employees.find(e => e.id === item.employeeId);
        if (emp && emp.authUid !== item.authUid) {
          return { ...item, authUid: emp.authUid || "" };
        }
        return item;
      });
      
      if (JSON.stringify(updatedItems) !== JSON.stringify(prevItems)) {
        return updatedItems;
      }
      return prevItems;
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

  const handleSavePayrollRun = async () => {
    if (!isAdmin) return;
    
    const runRef = doc(db, "payrollRuns", payrollRun.id);
    setDocumentNonBlocking(runRef, payrollRun, { merge: true });
    
    payrollItems.forEach(item => {
      const itemRef = doc(db, "payrollRuns", payrollRun.id, "payrollItems", item.id);
      setDocumentNonBlocking(itemRef, item, { merge: true });
    });
    
    toast({ 
      title: "Payroll Published", 
      description: "Payroll records have been saved and are now visible to employees." 
    });
  };

  const handleRegisterAccess = (id: string, username: string) => {
    const docRef = doc(db, "system_users", id);
    setDocumentNonBlocking(docRef, { id, username: username || "" }, { merge: true });
    toast({ title: "Access Node Registered", description: `Username ${username} is now linked to node ${id}.` });
  };

  const handleTerminateAccess = (id: string) => {
    const targetNode = systemUsers.find(u => u.id === id);
    if (targetNode?.role === 'master' || allAdmins.find(a => a.id === targetNode?.authUid)?.role === 'master') {
      return toast({ title: "Operation Denied", description: "The Master Admin node cannot be terminated.", variant: "destructive" });
    }
    
    const userRef = doc(db, "system_users", id);
    const authUid = targetNode?.authUid;
    if (authUid) {
      const adminRef = doc(db, "roles_admin", authUid);
      deleteDocumentNonBlocking(adminRef);
    }
    
    deleteDocumentNonBlocking(userRef);
    toast({ title: "Access Revoked", description: "System privileges terminated. HR records preserved." });
  };

  const handleBootstrapMaster = () => {
    if (!user) return;
    const adminRef = doc(db, "roles_admin", user.uid);
    const rootSystemUid = "STUDIO-MASTER-2026";
    const userRef = doc(db, "system_users", rootSystemUid);
    const placeholderRef = doc(db, "roles_admin", "first_admin_placeholder");
    
    setDocumentNonBlocking(adminRef, { role: "master", createdAt: new Date().toISOString() }, { merge: true });
    setDocumentNonBlocking(userRef, { id: rootSystemUid, username: "MasterAdmin", authUid: user.uid }, { merge: true });
    setDocumentNonBlocking(placeholderRef, { active: true }, { merge: true });
    
    toast({ title: "System Initialized", description: "You are now the Master Admin." });
  };

  const handleAddEmployee = (newEmployee: Employee) => {
    const docRef = doc(db, "employees", newEmployee.id);
    setDocumentNonBlocking(docRef, newEmployee, { merge: true });
    toast({ title: "Staff Member Registered", description: `${newEmployee.fullName} added.` });
  };

  const handleLinkProfile = (targetSystemUid: string, employee: Employee) => {
    const newDocRef = doc(db, "employees", targetSystemUid);
    setDocumentNonBlocking(newDocRef, { ...employee, id: targetSystemUid, authUid: user?.uid || "" }, { merge: true });
    
    if (employee.id !== targetSystemUid) {
      const oldDocRef = doc(db, "employees", employee.id);
      deleteDocumentNonBlocking(oldDocRef);
    }
    
    toast({ title: "Profile Linked", description: "Staff record associated with system node." });
  };

  const handleUpdateEmployee = (updatedEmployee: Employee) => {
    const docRef = doc(db, "employees", updatedEmployee.id);
    updateDocumentNonBlocking(docRef, updatedEmployee);
  };

  const handleDeleteEmployee = (id: string) => {
    const docRef = doc(db, "employees", id);
    deleteDocumentNonBlocking(docRef);
    toast({ title: "Staff Member Removed", variant: "destructive" });
  };

  const handleGrantAdmin = (systemId: string) => {
    const targetNode = systemUsers.find(u => u.id === systemId);
    if (!targetNode?.authUid) {
      return toast({ title: "Action Deferred", description: "Admin rights activate after first login." });
    }
    const docRef = doc(db, "roles_admin", targetNode.authUid);
    setDocumentNonBlocking(docRef, { role: "admin", createdAt: new Date().toISOString() }, { merge: true });
    toast({ title: "Admin Privileges Granted" });
  };

  const handleRevokeAdmin = (systemId: string) => {
    const targetNode = systemUsers.find(u => u.id === systemId);
    const authUid = targetNode?.authUid;
    if (!authUid) return;

    const targetAdmin = allAdmins.find(a => a.id === authUid);
    if (targetAdmin?.role === 'master' || user?.uid === authUid) {
      return toast({ title: "Forbidden", variant: "destructive" });
    }
    const docRef = doc(db, "roles_admin", authUid);
    deleteDocumentNonBlocking(docRef);
    toast({ title: "Admin Privileges Revoked", variant: "destructive" });
  };

  const handleAddRoute = (newRoute: RouteTrackerRow) => {
    const docRef = doc(db, "routeTrackerRows", newRoute.id);
    setDocumentNonBlocking(docRef, newRoute, { merge: true });
  };

  const handleUpdateRoute = (updatedRoute: RouteTrackerRow) => {
    const docRef = doc(db, "routeTrackerRows", updatedRoute.id);
    updateDocumentNonBlocking(docRef, updatedRoute);
  };

  const handleDeleteRoute = (id: string) => {
    const docRef = doc(db, "routeTrackerRows", id);
    deleteDocumentNonBlocking(docRef);
  };

  const exportCsv = () => {
    const rows = [
      ["Employee", "Pay Period", "Pay Date", "Gross", "Deductions", "Net"],
      ...payrollItems.map((item) => {
        const totals = computeTotals(item);
        return [item.employeeNameSnapshot, `${payrollRun.payPeriodStart} to ${payrollRun.payPeriodEnd}`, payrollRun.payDate, totals.grossPay.toFixed(2), totals.totalDeductions.toFixed(2), totals.netPay.toFixed(2)];
      }),
    ];
    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `payroll_run_${payrollRun.payDate}.csv`);
    link.click();
  };

  const finalizeRun = () => {
    setPayrollRun((current) => ({ ...current, status: "Finalized" }));
    handleSavePayrollRun(); // Save when finalizing
    toast({ title: "Payroll Finalized", description: "Records locked and published." });
  };

  const handleSignOut = () => signOut(auth);

  if (isUserLoading || adminLoading || profileLoading || bootstrapLoading || nodeLoading || (isAdmin && allAdminsLoading)) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Verifying Identity...</p>
      </div>
    );
  }

  if (!user) return <LoginView />;

  if (isSystemFresh) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-md text-center space-y-6 animate-in fade-in duration-500">
          <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
            <Shield className="h-10 w-10" />
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tighter">System Initialization</h2>
          <p className="text-sm font-medium text-slate-500">Claim the Master Admin node to begin setup.</p>
          <Button onClick={handleBootstrapMaster} className="w-full h-14 rounded-2xl bg-slate-900 font-bold uppercase tracking-widest text-xs">
            Initialize Master Admin
          </Button>
          <Button variant="ghost" onClick={handleSignOut} className="text-xs font-bold text-slate-400 uppercase">Sign Out</Button>
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
    { id: "emp-dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "emp-payslips", label: "My Payslips", icon: Receipt, hidden: !isEmployee },
    { id: "emp-routes", label: "My Routes", icon: History, hidden: !isEmployee },
    { id: "emp-profile", label: "Profile", icon: UserCircle },
  ].filter(i => !i.hidden);

  return (
    <div className="min-h-screen w-full bg-slate-50/50 flex flex-col animate-in fade-in duration-500">
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-lg">
              <svg viewBox="0 0 100 100" className="h-6 w-6 fill-white">
                <circle cx="50" cy="50" r="40" fill="#4461B5"/><text x="35" y="68" style={{ fontFamily: 'Inter', fontWeight: 900, fontSize: '50px' }} fill="white">S</text>
              </svg>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xs font-black tracking-tighter text-slate-900 uppercase leading-none">Payout Tracker</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase">System Oriented</p>
            </div>
          </div>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <button key={item.id} onClick={() => setActiveView(item.id as ActiveView)} className={cn("flex items-center gap-2 px-4 h-10 rounded-xl transition-all font-bold text-[10px] uppercase tracking-wider", activeView === item.id ? "bg-slate-100 text-primary" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900")}>
                <item.icon className="h-4 w-4" /><span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <>
              <Button variant="outline" size="sm" className="rounded-xl h-9 text-[10px] font-bold uppercase" onClick={handleSavePayrollRun}><Save className="mr-2 h-3 w-3" /> Save & Publish</Button>
              <Button variant="outline" size="sm" className="rounded-xl h-9 text-[10px] font-bold uppercase" onClick={exportCsv}><Download className="mr-2 h-3 w-3" /> Export</Button>
              <Button size="sm" className="rounded-xl h-9 bg-accent text-white text-[10px] font-bold uppercase" onClick={finalizeRun} disabled={payrollRun.status === "Finalized"}><Lock className="mr-2 h-3 w-3" /> Finalize</Button>
            </>
          )}
          <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 text-slate-400 hover:text-rose-600" onClick={handleSignOut}><LogOut className="h-5 w-5" /></Button>
        </div>
      </header>

      <main className="flex-1 p-8 overflow-x-hidden max-w-[1600px] mx-auto w-full">
        {isAdmin ? (
          <>
            {activeView === "dashboard" && <DashboardView summary={payrollSummary} />}
            {activeView === "employees" && <EmployeeManager employees={employees} onAddEmployee={handleAddEmployee} onUpdateEmployee={handleUpdateEmployee} onDeleteEmployee={handleDeleteEmployee} isRoleManagement={false} />}
            {activeView === "payroll" && <PayrollRunsView payrollRun={payrollRun} setPayrollRun={setPayrollRun} payrollItems={payrollItems} setPayrollItems={setPayrollItems} employees={employees} routeTracker={routeTracker} />}
            {activeView === "routes" && <RouteTrackerView routeTracker={routeTracker} onAddRoute={handleAddRoute} onUpdateRoute={handleUpdateRoute} onDeleteRoute={handleDeleteRoute} employees={employees} />}
            {activeView === "admin-board" && <EmployeeManager employees={systemUsers as any} onAddEmployee={(e) => handleRegisterAccess(e.id, (e as any).username || e.fullName)} onUpdateEmployee={() => {}} onDeleteEmployee={handleTerminateAccess} isRoleManagement={true} allAdmins={allAdmins} onGrantAdmin={handleGrantAdmin} onRevokeAdmin={handleRevokeAdmin} directoryEmployees={employees} onLinkProfile={handleLinkProfile} />}
          </>
        ) : (
          <>
            {activeView === "emp-dashboard" && <EmployeeDashboard employee={employeeProfile} />}
            {activeView === "emp-payslips" && <MyPaystubsView employee={employeeProfile || null} />}
            {activeView === "emp-routes" && <MyRoutesView employee={employeeProfile || null} />}
            {activeView === "emp-profile" && <EmployeeProfileView employee={employeeProfile || null} />}
          </>
        )}
      </main>
    </div>
  );
}
