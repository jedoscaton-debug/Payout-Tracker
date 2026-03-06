
import { Employee, RouteTrackerRow, PayrollRun, PayrollItem, DeductionRecord, DeductionLine } from "./types";
import { autoBuildEarnings } from "./payroll-utils";

export const employeesSeed: Employee[] = [
  { id: "emp-1", fullName: "Jose Nolasco", role: "Driver", defaultDailyRate: "Varies", paymentMethod: "Direct Deposit" },
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
 * Generates a payroll item for an employee based on tracked routes and active deductions.
 */
export function createPayrollItem(
  employee: Employee, 
  payrollRun: PayrollRun, 
  routes: RouteTrackerRow[],
  allDeductions: DeductionRecord[]
): PayrollItem {
  const earningsLines = autoBuildEarnings(employee, payrollRun, routes);
  
  // Logic to fetch active, auto-apply deductions for this employee
  const deductionsLines: DeductionLine[] = allDeductions
    .filter(d => 
      d.employeeId === employee.id && 
      d.status === "Active" && 
      d.autoApply &&
      (d.remainingBalance > 0 || d.type === "Fixed" || d.type === "Auto System Fee")
    )
    .map(d => ({
      id: `${employee.id}-${d.id}-${payrollRun.id}`,
      deductionName: d.deductionName,
      amount: d.perPayrollAmount,
      type: d.type,
      originalDeductionId: d.id
    }));

  // Ensure system default "Direct Deposit Fee" exists if not already present
  const hasDD = deductionsLines.some(d => d.deductionName === "Direct Deposit Fee");
  if (!hasDD) {
    deductionsLines.push({
      id: `${employee.id}-default-dd-${payrollRun.id}`,
      deductionName: "Direct Deposit Fee",
      amount: 4.00,
      type: "Auto System Fee"
    });
  }

  return {
    id: `${payrollRun.id}-${employee.id}`,
    payrollRunId: payrollRun.id,
    employeeId: employee.id,
    employeeNameSnapshot: employee.fullName,
    dailyRateSnapshot: employee.defaultDailyRate,
    notes: "",
    earningsLines,
    otherEarningsLines: [],
    deductionsLines,
  };
}
