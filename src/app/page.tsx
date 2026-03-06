
"use client";

import React, { useMemo, useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  Users, 
  Receipt, 
  Route, 
  Settings2,
  Lock,
  Download,
  ChevronRight
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
  employeesSeed,
  routeTrackerSeed,
  initialPayrollRun
} from "@/app/lib/payroll-data-utils";
import { computeTotals } from "@/app/lib/payroll-utils";

import { DashboardView } from "@/components/dashboard/DashboardView";
import { EmployeeManager } from "@/components/employees/EmployeeManager";
import { PayrollRunsView } from "@/components/payroll/PayrollRunsView";
import { RouteTrackerView } from "@/components/payroll/RouteTrackerView";

type ActiveView = "dashboard" | "employees" | "payroll" | "routes";

export default function AppShell() {
  const [activeView, setActiveView] = useState<ActiveView>("dashboard");
  const { toast } = useToast();
  
  // App State
  const [employees, setEmployees] = useState<Employee[]>(employeesSeed);
  const [routeTracker, setRouteTracker] = useState<RouteTrackerRow[]>(routeTrackerSeed);
  const [payrollRun, setPayrollRun] = useState<PayrollRun>(initialPayrollRun);
  const [payrollItems, setPayrollItems] = useState<PayrollItem[]>([]);

  // Initialize Payroll Items
  useEffect(() => {
    setPayrollItems(employees.map(e => createPayrollItem(e, payrollRun, routeTracker)));
  }, [employees, payrollRun, routeTracker]);

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
    setEmployees(prev => [...prev, newEmployee]);
    toast({
      title: "Employee Added",
      description: `${newEmployee.fullName} has been added to the system.`
    });
  };

  const handleUpdateEmployee = (updatedEmployee: Employee) => {
    setEmployees(prev => prev.map(e => e.id === updatedEmployee.id ? updatedEmployee : e));
    toast({
      title: "Profile Updated",
      description: `Changes to ${updatedEmployee.fullName} have been saved.`
    });
  };

  const handleDeleteEmployee = (id: string) => {
    setEmployees(prev => prev.filter(e => e.id !== id));
    toast({
      title: "Record Deleted",
      description: "Employee record has been removed from the directory.",
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

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "employees", label: "Employees", icon: Users },
    { id: "payroll", label: "Payroll Runs", icon: Receipt },
    { id: "routes", label: "Route Tracker", icon: Route },
  ];

  return (
    <div className="min-h-screen w-full bg-slate-50/50 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-lg shadow-primary/20">
                <svg viewBox="0 0 100 100" className="h-5 w-5 fill-white">
                  <circle cx="50" cy="50" r="40" fill="#4461B5"/>
                  <text x="35" y="68" fontFamily="Inter" fontWeight="900" fontSize="50" fill="white">S</text>
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
            <Button variant="outline" size="sm" className="rounded-xl h-9 border-slate-200 font-bold text-[10px] uppercase tracking-wider" onClick={exportCsv}>
              <Download className="mr-2 h-3 w-3" /> Export
            </Button>
            <Button size="sm" className="rounded-xl h-9 bg-accent hover:bg-accent/90 text-white font-bold text-[10px] uppercase tracking-wider" onClick={finalizeRun} disabled={payrollRun.status === "Finalized"}>
              <Lock className="mr-2 h-3 w-3" /> Finalize
            </Button>
          </div>
        </div>
      </header>

      {/* Sub-header Breadcrumb */}
      <div className="bg-white border-b border-slate-100 px-8 py-3 flex items-center gap-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">System</span>
        <ChevronRight className="h-3 w-3 text-slate-300" />
        <h2 className="text-[10px] font-black uppercase tracking-widest text-primary">
          {activeView === "payroll" ? "Payroll Runs" : activeView === "routes" ? "Route Tracker" : activeView.toUpperCase()}
        </h2>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 p-8 overflow-x-hidden">
        <div className="max-w-[1600px] mx-auto">
          {activeView === "dashboard" && (
            <DashboardView summary={payrollSummary} />
          )}
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
            <RouteTrackerView routeTracker={routeTracker} />
          )}
        </div>
      </main>
    </div>
  );
}
