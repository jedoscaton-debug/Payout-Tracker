
import { Employee, RouteTrackerRow, PayrollRun, PayrollItem } from "./types";
import { autoBuildEarnings, DIRECT_DEPOSIT_FEE } from "./payroll-utils";

export const employeesSeed: Employee[] = [
  { id: "emp-1", fullName: "Jose Nolasco", role: "Driver", email: "jose@system.oriented", contactNumber: "", defaultDailyRate: "Varies", paymentMethod: "Direct Deposit" },
];

/**
 * Default state for a new payroll run.
 */
export const initialPayrollRun: PayrollRun = {
  id: `run-${new Date().toISOString().split('T')[0]}-${Math.random().toString(36).substr(2, 5)}`,
  payPeriodStart: new Date().toISOString().split('T')[0],
  payPeriodEnd: new Date().toISOString().split('T')[0],
  payDate: new Date().toISOString().split('T')[0],
  status: "Draft",
};

/**
 * Generates a payroll item for an employee based on tracked routes.
 */
export function createPayrollItem(employee: Employee, payrollRun: PayrollRun, routes: RouteTrackerRow[]): PayrollItem {
  const earningsLines = autoBuildEarnings(employee, payrollRun, routes);
  return {
    id: `${payrollRun.id}-${employee.id}`,
    payrollRunId: payrollRun.id,
    employeeId: employee.id,
    employeeEmailSnapshot: (employee.email || "").toLowerCase().trim(),
    employeeNameSnapshot: employee.fullName,
    dailyRateSnapshot: employee.defaultDailyRate,
    notes: "",
    earningsLines,
    otherEarningsLines: [],
    deductionsLines: [
      { id: `${employee.id}-dd-fee`, deductionName: "Direct Deposit Fee", amount: DIRECT_DEPOSIT_FEE, type: "Fixed" },
    ],
  };
}
