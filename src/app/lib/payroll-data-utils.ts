import { Employee, RouteTrackerRow, PayrollRun, PayrollItem } from "./types";
import { autoBuildEarnings, DIRECT_DEPOSIT_FEE, TRUCK_RENTAL_FIXED } from "./payroll-utils";

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
  { id: "rt-1", date: "2026-02-22", route: "A01_EV", routeType: "IKEA", vehicleNumber: "2", miles: 104, stops: 23, actualPayAudit: 0, truckRental: TRUCK_RENTAL_FIXED, insurance: 0, driver: "Steven Howard", helper: "Labrinkley Marshall" },
  { id: "rt-2", date: "2026-02-23", route: "A01_EV", routeType: "IKEA", vehicleNumber: "2", miles: 179, stops: 10, actualPayAudit: 0, truckRental: TRUCK_RENTAL_FIXED, insurance: 0, driver: "Labrinkley Marshall", helper: "Steven Howard" },
  { id: "rt-3", date: "2026-02-23", route: "EV", routeType: "IKEA", vehicleNumber: "EV", miles: 0, stops: 16, actualPayAudit: 432, truckRental: TRUCK_RENTAL_FIXED, insurance: 0, driver: "Jose Nolasco", helper: "Geovani" },
  { id: "rt-4", date: "2026-02-24", route: "EV", routeType: "IKEA", vehicleNumber: "EV", miles: 0, stops: 18, actualPayAudit: 486, truckRental: TRUCK_RENTAL_FIXED, insurance: 0, driver: "Jose Nolasco", helper: "Geovani" },
  { id: "rt-5", date: "2026-02-25", route: "A03_EV", routeType: "IKEA", vehicleNumber: "4", miles: 222, stops: 13, actualPayAudit: 0, truckRental: TRUCK_RENTAL_FIXED, insurance: 0, driver: "Labrinkley Marshall", helper: "Dominique Roche" },
  { id: "rt-6", date: "2026-02-25", route: "GAS", routeType: "IKEA", vehicleNumber: "GAS", miles: 0, stops: 9, actualPayAudit: 400, truckRental: TRUCK_RENTAL_FIXED, insurance: 0, driver: "Jose Nolasco", helper: "Geovani" },
  { id: "rt-7", date: "2026-02-26", route: "A01_EV", routeType: "IKEA", vehicleNumber: "2", miles: 157, stops: 14, actualPayAudit: 0, truckRental: TRUCK_RENTAL_FIXED, insurance: 0, driver: "Steven Howard", helper: "Dominique Roche" },
  { id: "rt-8", date: "2026-02-26", route: "A02_EV", routeType: "IKEA", vehicleNumber: "4", miles: 77, stops: 16, actualPayAudit: 0, truckRental: TRUCK_RENTAL_FIXED, insurance: 0, driver: "Labrinkley Marshall", helper: "Labrinkley Marshall" },
  { id: "rt-9", date: "2026-02-26", route: "EV", routeType: "IKEA", vehicleNumber: "EV", miles: 0, stops: 12, actualPayAudit: 450, truckRental: TRUCK_RENTAL_FIXED, insurance: 0, driver: "Geovani", helper: "Jose Helper - Diego Guevara" },
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
