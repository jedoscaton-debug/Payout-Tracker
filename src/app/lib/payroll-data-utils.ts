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
  { id: "rt-1", date: "2026-02-22", route: "101", routeType: "Home Delivery", vehicleNumber: "T-01", miles: 104, stops: 23, actualPayAudit: 650, truckRental: 150, insurance: 45, driver: "Steven Howard", helper: "Labrinkley Marshall" },
  { id: "rt-2", date: "2026-02-23", route: "102", routeType: "Home Delivery", vehicleNumber: "T-02", miles: 179, stops: 10, actualPayAudit: 300, truckRental: 150, insurance: 45, driver: "Labrinkley Marshall", helper: "Steven Howard" },
  { id: "rt-3", date: "2026-02-23", route: "103", routeType: "Home Delivery", vehicleNumber: "T-03", miles: 50, stops: 16, actualPayAudit: 450, truckRental: 150, insurance: 45, driver: "Jose Nolasco", helper: "Geovani" },
  { id: "rt-4", date: "2026-02-24", route: "104", routeType: "Home Delivery", vehicleNumber: "T-04", miles: 40, stops: 18, actualPayAudit: 500, truckRental: 150, insurance: 45, driver: "Jose Nolasco", helper: "Geovani" },
  { id: "rt-5", date: "2026-02-25", route: "105", routeType: "Home Delivery", vehicleNumber: "T-05", miles: 222, stops: 13, actualPayAudit: 380, truckRental: 150, insurance: 45, driver: "Labrinkley Marshall", helper: "Dominique Roche" },
  { id: "rt-6", date: "2026-02-25", route: "106", routeType: "Home Delivery", vehicleNumber: "T-06", miles: 30, stops: 9, actualPayAudit: 260, truckRental: 150, insurance: 45, driver: "Jose Nolasco", helper: "Geovani" },
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
