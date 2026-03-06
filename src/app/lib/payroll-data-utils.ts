
import { Employee, RouteTrackerRow, PayrollRun, PayrollItem } from "./types";
import { autoBuildEarnings, DIRECT_DEPOSIT_FEE } from "./payroll-utils";

export const employeesSeed: Employee[] = [
  { id: "emp-1", fullName: "Jose Nolasco", defaultDailyRate: "Varies", paymentMethod: "Direct Deposit" },
  { id: "emp-2", fullName: "Geovani", defaultDailyRate: "Varies", paymentMethod: "Direct Deposit" },
  { id: "emp-3", fullName: "Steven Howard", defaultDailyRate: "Varies", paymentMethod: "Direct Deposit" },
  { id: "emp-4", fullName: "Labrinkley Marshall", defaultDailyRate: "Varies", paymentMethod: "Direct Deposit" },
  { id: "emp-5", fullName: "Dominique Roche", defaultDailyRate: "Varies", paymentMethod: "Direct Deposit" },
  { id: "emp-6", fullName: "Diego Guevara", defaultDailyRate: "Varies", paymentMethod: "Direct Deposit" },
  { id: "emp-7", fullName: "Edildo Geovani Morataya", defaultDailyRate: "Varies", paymentMethod: "Direct Deposit" },
];

export const routeTrackerSeed: RouteTrackerRow[] = [
  { id: "rt-1", date: "2026-02-22", client: "IKEA", miles: 104, stops: 23, driver: "Steven Howard", helper: "Labrinkley Marshall" },
  { id: "rt-2", date: "2026-02-23", client: "IKEA", miles: 179, stops: 10, driver: "Labrinkley Marshall", helper: "Steven Howard" },
  { id: "rt-3", date: "2026-02-23", client: "IKEA", miles: 0, stops: 16, driver: "Jose Nolasco", helper: "Geovani" },
  { id: "rt-4", date: "2026-02-24", client: "IKEA", miles: 0, stops: 18, driver: "Jose Nolasco", helper: "Geovani" },
  { id: "rt-5", date: "2026-02-25", client: "IKEA", miles: 222, stops: 13, driver: "Labrinkley Marshall", helper: "Dominique Roche" },
  { id: "rt-6", date: "2026-02-25", client: "IKEA", miles: 0, stops: 9, driver: "Jose Nolasco", helper: "Geovani" },
  { id: "rt-7", date: "2026-02-26", client: "IKEA", miles: 157, stops: 14, driver: "Steven Howard", helper: "Dominique Roche" },
  { id: "rt-8", date: "2026-02-26", client: "IKEA", miles: 77, stops: 16, driver: "Labrinkley Marshall", helper: "Labrinkley Marshall" },
  { id: "rt-9", date: "2026-02-26", client: "IKEA", miles: 0, stops: 12, driver: "Geovani", helper: "Diego Guevara" },
  { id: "rt-10", date: "2026-02-27", client: "IKEA", miles: 59, stops: 15, driver: "Steven Howard", helper: "Steven Howard" },
  { id: "rt-11", date: "2026-02-27", client: "IKEA", miles: 110, stops: 16, driver: "Labrinkley Marshall", helper: "Dominique Roche" },
  { id: "rt-12", date: "2026-02-27", client: "IKEA", miles: 0, stops: 18, driver: "Jose Nolasco", helper: "Geovani" },
  { id: "rt-13", date: "2026-02-28", client: "IKEA", miles: 0, stops: 13, driver: "Jose Nolasco", helper: "Geovani" },
];

export const initialPayrollRun: PayrollRun = {
  id: "run-1",
  payPeriodStart: "2026-02-22",
  payPeriodEnd: "2026-02-28",
  payDate: "2026-03-06",
  status: "Draft",
};

export function createPayrollItem(employee: Employee, payrollRun: PayrollRun, routes: RouteTrackerRow[]): PayrollItem {
  const earningsLines = autoBuildEarnings(employee, payrollRun, routes);
  return {
    id: `${payrollRun.id}-${employee.id}`,
    payrollRunId: payrollRun.id,
    employeeId: employee.id,
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
