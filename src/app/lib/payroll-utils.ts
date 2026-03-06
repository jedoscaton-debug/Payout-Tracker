import { RouteTrackerRow, Employee, PayrollRun, EarningsLine, RoleType, PayrollItem, ComputedTotals } from './types';

export const DIRECT_DEPOSIT_FEE = 4;
export const TRUCK_RENTAL_FIXED = 52;
export const TRUCK_MILEAGE_RATE = 0.25;

export function currency(value: number) {
  return new Intl.NumberFormat("en-US", { 
    style: "currency", 
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value || 0);
}

export function shortDate(input: string) {
  if (!input) return "";
  const d = new Date(`${input}T00:00:00`);
  return d.toLocaleDateString("en-US", { month: "n/j/Y" });
}

export function getDayOfWeek(input: string) {
  if (!input) return "";
  const d = new Date(`${input}T00:00:00`);
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

export function estimatePay(stops: number) {
  return 27 * stops;
}

export function estimateFuel(miles: number) {
  return 0.47 * miles;
}

export function driverPay(stops: number) {
  return estimatePay(stops) * 0.27;
}

export function helperPay(stops: number) {
  return estimatePay(stops) * 0.23;
}

export function truckRentalMileageCost(miles: number) {
  return miles * TRUCK_MILEAGE_RATE;
}

function roleForEmployee(row: RouteTrackerRow, employeeName: string): RoleType | null {
  const isDriver = row.driver === employeeName;
  const isHelper = row.helper === employeeName;
  if (isDriver && isHelper) return "Driver&Helper";
  if (isDriver) return "Driver";
  if (isHelper) return "Helper";
  return null;
}

function amountForRole(row: RouteTrackerRow, role: RoleType) {
  if (role === "Driver") return driverPay(row.stops);
  if (role === "Helper") return helperPay(row.stops);
  return driverPay(row.stops) + helperPay(row.stops);
}

export function autoBuildEarnings(employee: Employee, run: PayrollRun, routes: RouteTrackerRow[]): EarningsLine[] {
  return routes
    .filter((row) => row.date >= run.payPeriodStart && row.date <= run.payPeriodEnd)
    .map((row) => {
      const role = roleForEmployee(row, employee.fullName);
      if (!role) return null;
      const displayDate = new Date(`${row.date}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      return {
        id: `${employee.id}-${row.id}`,
        date: row.date,
        client: row.route,
        role,
        description: `${displayDate} - Route ${row.route} ${role}`,
        amount: Number(amountForRole(row, role).toFixed(2)),
      } satisfies EarningsLine;
    })
    .filter(Boolean) as EarningsLine[];
}

export function computeTotals(item: PayrollItem): ComputedTotals {
  const totalEarnings = 
    item.earningsLines.reduce((sum, line) => sum + (line.amount || 0), 0) + 
    item.otherEarningsLines.reduce((sum, line) => sum + (line.amount || 0), 0);
    
  const totalDeductions = item.deductionsLines.reduce((sum, line) => sum + (line.amount || 0), 0);
  const grossPay = totalEarnings;
  const netPay = grossPay - totalDeductions;
  
  return {
    totalEarnings: Number(totalEarnings.toFixed(2)),
    totalDeductions: Number(totalDeductions.toFixed(2)),
    grossPay: Number(grossPay.toFixed(2)),
    netPay: Number(netPay.toFixed(2)),
  };
}
