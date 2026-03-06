
"use client";

import React, { useMemo, useState, useEffect } from "react";
import { 
  SidebarProvider, 
  Sidebar, 
  SidebarContent, 
  SidebarHeader, 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent
} from "@/components/ui/sidebar";
import { 
  LayoutDashboard, 
  Users, 
  Receipt, 
  Route, 
  Settings2,
  Lock,
  Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

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

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-slate-50/50">
        <Sidebar collapsible="icon" className="border-r border-slate-200 bg-white z-50">
          <SidebarHeader className="p-0 border-b border-slate-50">
            <div className="flex items-center gap-3 h-16 px-4 overflow-hidden group-data-[collapsible=icon]:px-1 group-data-[collapsible=icon]:justify-center">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-lg shadow-primary/20">
                <Settings2 className="h-5 w-5" />
              </div>
              <div className="group-data-[collapsible=icon]:hidden transition-opacity duration-200">
                <h1 className="text-sm font-black tracking-tighter text-slate-900 uppercase whitespace-nowrap">Payout Tracker</h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase">System Oriented</p>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent className="px-3 pt-4">
            <SidebarGroup>
              <SidebarGroupLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 px-4 group-data-[collapsible=icon]:hidden">
                Main Navigation
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton 
                      isActive={activeView === "dashboard"} 
                      onClick={() => setActiveView("dashboard")}
                      className="rounded-xl h-11 px-4"
                      tooltip="Dashboard"
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      <span className="font-bold text-xs uppercase tracking-wider group-data-[collapsible=icon]:hidden">Dashboard</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton 
                      isActive={activeView === "employees"} 
                      onClick={() => setActiveView("employees")}
                      className="rounded-xl h-11 px-4"
                      tooltip="Employees"
                    >
                      <Users className="h-4 w-4" />
                      <span className="font-bold text-xs uppercase tracking-wider group-data-[collapsible=icon]:hidden">Employees</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton 
                      isActive={activeView === "payroll"} 
                      onClick={() => setActiveView("payroll")}
                      className="rounded-xl h-11 px-4"
                      tooltip="Payroll Runs"
                    >
                      <Receipt className="h-4 w-4" />
                      <span className="font-bold text-xs uppercase tracking-wider group-data-[collapsible=icon]:hidden">Payroll Runs</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton 
                      isActive={activeView === "routes"} 
                      onClick={() => setActiveView("routes")}
                      className="rounded-xl h-11 px-4"
                      tooltip="Route Tracker"
                    >
                      <Route className="h-4 w-4" />
                      <span className="font-bold text-xs uppercase tracking-wider group-data-[collapsible=icon]:hidden">Route Tracker</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <SidebarInset className="bg-slate-50/50">
          <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-8 backdrop-blur-md">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <div className="h-4 w-px bg-slate-200 mx-2" />
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                {activeView === "payroll" ? "Payroll Runs" : activeView === "routes" ? "Route Tracker" : activeView.toUpperCase()}
              </h2>
            </div>
            
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" className="rounded-xl h-9 border-slate-200 font-bold text-[10px] uppercase tracking-wider" onClick={exportCsv}>
                <Download className="mr-2 h-3 w-3" /> Export
              </Button>
              <Button size="sm" className="rounded-xl h-9 bg-accent hover:bg-accent/90 text-white font-bold text-[10px] uppercase tracking-wider" onClick={finalizeRun} disabled={payrollRun.status === "Finalized"}>
                <Lock className="mr-2 h-3 w-3" /> Finalize
              </Button>
            </div>
          </header>

          <main className="p-8">
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
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
