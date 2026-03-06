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

/**
 * Robust date formatter that avoids RangeError by using manual parsing.
 * Returns date in M/D/YYYY format.
 */
export function shortDate(input: string) {
  if (!input) return "";
  const parts = input.split("-");
  if (parts.length !== 3) return input;
  const [year, month, day] = parts;
  // Ensure we remove leading zeros for a cleaner professional look
  return `${parseInt(month)}/${parseInt(day)}/${year}`;
}

export function getDayOfWeek(input: string) {
  if (!input) return "";
  const d = new Date(`${input}T00:00:00`);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
}

export function estimatePay(stops: number) {
  return 27 * (stops || 0);
}

export function estimateFuel(miles: number) {
  return 0.47 * (miles || 0);
}

export function driverPay(stops: number, route: string = "", vehicle: string = "", estPayOverride?: number) {
  const basePay = (estPayOverride && estPayOverride > 0) ? estPayOverride : estimatePay(stops);
  // Special Rule: EV Route + EV Vehicle = 33% Driver Rate
  const rate = (route === "EV" && vehicle === "EV") ? 0.33 : 0.27;
  return Number((basePay * rate).toFixed(2));
}

export function helperPay(stops: number, route: string = "", vehicle: string = "", estPayOverride?: number) {
  const basePay = (estPayOverride && estPayOverride > 0) ? estPayOverride : estimatePay(stops);
  // Special Rule: EV Route + EV Vehicle = 27% Helper Rate
  const rate = (route === "EV" && vehicle === "EV") ? 0.27 : 0.23;
  return Number((basePay * rate).toFixed(2));
}

export function truckRentalMileageCost(miles: number) {
  return Number(((miles || 0) * TRUCK_MILEAGE_RATE).toFixed(2));
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
  const estPay = row.estimatedPay || estimatePay(row.stops);
  if (role === "Driver") return driverPay(row.stops, row.route, row.vehicleNumber, estPay);
  if (role === "Helper") return helperPay(row.stops, row.route, row.vehicleNumber, estPay);
  return driverPay(row.stops, row.route, row.vehicleNumber, estPay) + helperPay(row.stops, row.route, row.vehicleNumber, estPay);
}

export function autoBuildEarnings(employee: Employee, run: PayrollRun, routes: RouteTrackerRow[]): EarningsLine[] {
  return routes
    .filter((row) => row.date >= run.payPeriodStart && row.date <= run.payPeriodEnd)
    .map((row) => {
      const role = roleForEmployee(row, employee.fullName);
      if (!role) return null;
      const displayDate = shortDate(row.date);
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