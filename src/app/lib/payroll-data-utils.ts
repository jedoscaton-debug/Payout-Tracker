
import { Employee, RouteTrackerRow, PayrollRun, PayrollItem, DeductionRecord, DeductionLine, FormulaSettings } from "./types";
import { autoBuildEarnings } from "./payroll-utils";

/**
 * Generates a new unique payroll run state.
 */
export function createNewPayrollRun(): PayrollRun {
  return {
    id: `run-${new Date().toISOString().split('T')[0]}-${Math.random().toString(36).substr(2, 5)}`,
    payPeriodStart: new Date().toISOString().split('T')[0],
    payPeriodEnd: new Date().toISOString().split('T')[0],
    payDate: new Date().toISOString().split('T')[0],
    status: "Draft",
  };
}

export const initialPayrollRun: PayrollRun = createNewPayrollRun();

/**
 * Generates a payroll item for an employee based on tracked routes and active deductions.
 */
export function createPayrollItem(
  employee: Employee, 
  payrollRun: PayrollRun, 
  routes: RouteTrackerRow[],
  allDeductions: DeductionRecord[],
  settings?: FormulaSettings
): PayrollItem {
  const earningsLines = autoBuildEarnings(employee, payrollRun, routes, settings);
  
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
      originalDeductionId: d.id,
      installmentCount: d.installmentCount,
      installmentsPaid: (d.installmentsPaid || 0) + 1, // This is the installment currently being paid
      totalClaimAmount: d.totalClaimAmount
    }));

  // Ensure system default "Direct Deposit Fee" exists if not already present
  const hasDD = deductionsLines.some(d => d.deductionName === "Direct Deposit Fee");
  if (!hasDD) {
    deductionsLines.push({
      id: `${employee.id}-default-dd-${payrollRun.id}`,
      deductionName: "Direct Deposit Fee",
      amount: settings?.directDepositFee || 4.00,
      type: "Auto System Fee"
    });
  }

  return {
    id: `${payrollRun.id}-${employee.id}`,
    payrollRunId: payrollRun.id,
    employeeId: employee.id,
    employeeNameSnapshot: employee.fullName,
    employeeEmailSnapshot: employee.email || "",
    dailyRateSnapshot: employee.defaultDailyRate,
    payDateSnapshot: payrollRun.payDate,
    payPeriodStartSnapshot: payrollRun.payPeriodStart,
    payPeriodEndSnapshot: payrollRun.payPeriodEnd,
    notes: "",
    earningsLines,
    otherEarningsLines: [],
    deductionsLines,
  };
}
