
import { Employee, RouteTrackerRow, PayrollRun, PayrollItem, DeductionRecord, DeductionLine, AdminSettings } from "./types";
import { autoBuildEarnings } from "./payroll-utils";

/**
 * Generates a new unique payroll run state
 */
export function createNewPayrollRun(): PayrollRun {
  const now = new Date();
  
  // Find this week's Sunday
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay());
  
  // Saturday of the same week
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  
  // Friday of the following week
  const pay = new Date(end);
  pay.setDate(end.getDate() + 6);

  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  return {
    id: `run-${formatDate(now)}-${Math.random().toString(36).substr(2, 5)}`,
    payPeriodStart: formatDate(start),
    payPeriodEnd: formatDate(end),
    payDate: formatDate(pay),
    status: "Draft",
  };
}

export const initialPayrollRun: PayrollRun = createNewPayrollRun();

/**
 * Generates a payroll item for an employee
 */
export function createPayrollItem(
  employee: Employee, 
  payrollRun: PayrollRun, 
  routes: RouteTrackerRow[],
  allDeductions: DeductionRecord[],
  adminSettings?: AdminSettings
): PayrollItem {
  const earningsLines = autoBuildEarnings(employee, payrollRun, routes, adminSettings);
  
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
      installmentsPaid: (d.installmentsPaid || 0) + 1,
      totalClaimAmount: d.totalClaimAmount
    }));

  const hasDD = deductionsLines.some(d => d.deductionName === "Direct Deposit Fee");
  if (!hasDD && (adminSettings?.autoApplyDirectDepositFee !== false)) {
    deductionsLines.push({
      id: `${employee.id}-default-dd-${payrollRun.id}`,
      deductionName: "Direct Deposit Fee",
      amount: adminSettings?.directDepositFee || 4.00,
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
