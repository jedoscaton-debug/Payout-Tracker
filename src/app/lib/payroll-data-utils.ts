import { Employee, RouteTrackerRow, PayrollRun, PayrollItem } from "./types";
import { autoBuildEarnings, DIRECT_DEPOSIT_FEE, TRUCK_RENTAL_FIXED } from "./payroll-utils";

export const employeesSeed: Employee[] = [
  { id: "emp-1", fullName: "Jose Nolasco", role: "Driver", email: "jose@system.oriented", contactNumber: "", defaultDailyRate: "Varies", paymentMethod: "Direct Deposit" },
  { id: "emp-2", fullName: "Geovani", role: "Driver", email: "geovani@system.oriented", contactNumber: "", defaultDailyRate: "Varies", paymentMethod: "Direct Deposit" },
  { id: "emp-3", fullName: "Steven Howard", role: "Driver", email: "steven@system.oriented", contactNumber: "", defaultDailyRate: "Varies", paymentMethod: "Direct Deposit" },
  { id: "emp-4", fullName: "Labrinkley Marshall", role: "Driver", email: "labrinkley@system.oriented", contactNumber: "", defaultDailyRate: "Varies", paymentMethod: "Direct Deposit" },
  { id: "emp-5", fullName: "Dominique Roche", role: "Driver", email: "dominique@system.oriented", contactNumber: "", defaultDailyRate: "Varies", paymentMethod: "Direct Deposit" },
  { id: "emp-6", fullName: "Diego Guevara", role: "Driver", email: "diego@system.oriented", contactNumber: "", defaultDailyRate: "Varies", paymentMethod: "Direct Deposit" },
];

export const routeTrackerSeed: RouteTrackerRow[] = [
  // February Data
  { id: "rt-feb-1", date: "2026-02-23", route: "A01_EV", routeType: "IKEA", vehicleNumber: "2", miles: 85, stops: 18, actualPayAudit: 0, truckRental: TRUCK_RENTAL_FIXED, insurance: 0, driver: "Jose Nolasco", helper: "Diego Guevara" },
  { id: "rt-feb-2", date: "2026-02-24", route: "EV", routeType: "IKEA", vehicleNumber: "EV", miles: 0, stops: 10, actualPayAudit: 0, truckRental: TRUCK_RENTAL_FIXED, insurance: 0, driver: "Steven Howard", helper: "Geovani" },
  { id: "rt-feb-3", date: "2026-02-25", route: "A05_EV", routeType: "IKEA", vehicleNumber: "4", miles: 120, stops: 20, actualPayAudit: 0, truckRental: TRUCK_RENTAL_FIXED, insurance: 0, driver: "Labrinkley Marshall", helper: "Dominique Roche" },
  
  // March Data
  { id: "rt-1", date: "2026-03-01", route: "A05_EV", routeType: "IKEA", vehicleNumber: "4", miles: 138, stops: 24, actualPayAudit: 0, truckRental: TRUCK_RENTAL_FIXED, insurance: 0, driver: "Labrinkley Marshall", helper: "Labrinkley Marshall" },
  { id: "rt-2", date: "2026-03-01", route: "EV", routeType: "IKEA", vehicleNumber: "EV", miles: 0, stops: 12, actualPayAudit: 0, truckRental: TRUCK_RENTAL_FIXED, insurance: 0, driver: "Jose Nolasco", helper: "Diego Guevara" },
  { id: "rt-3", date: "2026-03-03", route: "A01_EV", routeType: "IKEA", vehicleNumber: "2", miles: 73, stops: 14, actualPayAudit: 0, truckRental: TRUCK_RENTAL_FIXED, insurance: 0, driver: "Steven Howard", helper: "Dominique Roche" },
  { id: "rt-4", date: "2026-03-03", route: "EV", routeType: "IKEA", vehicleNumber: "EV", miles: 0, stops: 15, actualPayAudit: 0, truckRental: TRUCK_RENTAL_FIXED, insurance: 0, driver: "Jose Nolasco", helper: "Diego Guevara" },
  { id: "rt-5", date: "2026-03-04", route: "A01_EV", routeType: "IKEA", vehicleNumber: "4", miles: 71, stops: 14, actualPayAudit: 0, truckRental: TRUCK_RENTAL_FIXED, insurance: 0, driver: "Labrinkley Marshall", helper: "Dominique Roche" },
  { id: "rt-6", date: "2026-03-04", route: "EV", routeType: "IKEA", vehicleNumber: "EV", miles: 0, stops: 14, actualPayAudit: 0, truckRental: TRUCK_RENTAL_FIXED, insurance: 0, driver: "Jose Nolasco", helper: "Geovani" },
  { id: "rt-7", date: "2026-03-05", route: "A01_EV", routeType: "IKEA", vehicleNumber: "2", miles: 111, stops: 15, actualPayAudit: 0, truckRental: TRUCK_RENTAL_FIXED, insurance: 0, driver: "Steven Howard", helper: "Labrinkley Marshall" },
];

export const initialPayrollRun: PayrollRun = {
  id: "run-1",
  payPeriodStart: "2026-03-01",
  payPeriodEnd: "2026-03-07",
  payDate: "2026-03-13",
  status: "Draft",
};

export function createPayrollItem(employee: Employee, payrollRun: PayrollRun, routes: RouteTrackerRow[]): PayrollItem {
  const earningsLines = autoBuildEarnings(employee, payrollRun, routes);
  return {
    id: `${payrollRun.id}-${employee.id}`,
    payrollRunId: payrollRun.id,
    employeeId: employee.id,
    authUid: employee.authUid || "",
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
