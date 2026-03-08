
import { RouteTrackerRow, Employee, PayrollRun, EarningsLine, RoleType, PayrollItem, ComputedTotals, AdminSettings } from './types';
import { evaluateFormula, DEFAULT_ADMIN_SETTINGS } from './formula-evaluator';

export function currency(value: number) {
  const rounded = Math.round((value || 0) * 100) / 100;
  return new Intl.NumberFormat("en-US", { 
    style: "currency", 
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(rounded);
}

export function shortDate(input: string) {
  if (!input) return "";
  const parts = input.split("-");
  if (parts.length !== 3) return input;
  const [year, month, day] = parts;
  return `${parseInt(month)}/${parseInt(day)}/${year}`;
}

export function formatEarningsDate(input: string) {
  if (!input) return "";
  const d = new Date(`${input}T00:00:00`);
  if (isNaN(d.getTime())) return input;
  return d.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
}

export function getDayOfWeek(input: string) {
  if (!input) return "";
  const d = new Date(`${input}T00:00:00`);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
}

/**
 * Returns the Sunday-to-Saturday week range for a given date.
 */
export function getWeekRange(dateInput: string | Date = new Date()) {
  const d = typeof dateInput === 'string' ? new Date(`${dateInput}T12:00:00`) : new Date(dateInput);
  const start = new Date(d);
  start.setDate(d.getDate() - d.getDay());
  
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  const formatDate = (date: Date) => date.toISOString().split('T')[0];
  return { start: formatDate(start), end: formatDate(end) };
}

/**
 * Standard Mileage Cost for Truck Rental.
 * Fixed at $0.00 as per latest requirements.
 */
export function truckRentalMileageCost(miles: number): number {
  return 0;
}

/**
 * Helper to determine if a route is EV based on rules
 */
function isEVRoute(route: string, vehicle: string, routeType?: string, adminSettings?: AdminSettings): boolean {
  const r = (route || "").toUpperCase();
  const v = (vehicle || "").toUpperCase();
  const rt = (routeType || "").toUpperCase();
  
  if (rt === "EV") return true;
  if (rt === "GAS") return false;
  
  const evRule = adminSettings?.rxoEVMatchingRule || "starts with DMPEV";
  const isEVSuffix = r.includes("_EV") || r.startsWith("DMPEV") || (evRule.includes("DMPEV") && r.startsWith("DMPEV"));
  const isPureEV = r === "EV" && v === "EV";
  
  return isEVSuffix || isPureEV;
}

/**
 * Dynamic Estimate Pay based on settings
 */
export function estimatePay(stops: number, miles: number = 0, route: string = "", vehicle: string = "", adminSettings?: AdminSettings, routeType?: string) {
  const formula = adminSettings?.estimatedPayFormula || DEFAULT_ADMIN_SETTINGS.estimatedPayFormula;
  const result = evaluateFormula(formula, { stops, miles });
  return Number(result.toFixed(2));
}

export function estimateFuel(miles: number, adminSettings?: AdminSettings) {
  const formula = adminSettings?.estimatedFuelFormula || DEFAULT_ADMIN_SETTINGS.estimatedFuelFormula;
  const result = evaluateFormula(formula, { miles });
  return Number(result.toFixed(2));
}

/**
 * Driver Payout Logic
 */
export function driverPay(stops: number, miles: number = 0, route: string = "", vehicle: string = "", estPayOverride?: number, adminSettings?: AdminSettings, routeType?: string, employee?: Employee) {
  const estPay = (estPayOverride && estPayOverride > 0) ? estPayOverride : estimatePay(stops, miles, route, vehicle, adminSettings, routeType);
  
  const formula = adminSettings?.driverPayFormula || DEFAULT_ADMIN_SETTINGS.driverPayFormula;
  let percentage = 27; // Default fallback
  
  if (employee?.driverPayoutPercentage !== undefined) {
    percentage = employee.driverPayoutPercentage;
  } else if (route.toUpperCase() === "EV" && vehicle.toUpperCase() === "EV") {
    percentage = 33; // Node fallback
  }
  
  // If formula is percentage based, we use it. If hardcoded employee percent exists, we prioritize it.
  const result = employee?.driverPayoutPercentage !== undefined 
    ? estPay * (employee.driverPayoutPercentage / 100)
    : evaluateFormula(formula, { estimatedPay: estPay, stops, miles });
    
  return Number(result.toFixed(2));
}

/**
 * Helper Payout Logic
 */
export function helperPay(stops: number, miles: number = 0, route: string = "", vehicle: string = "", estPayOverride?: number, adminSettings?: AdminSettings, routeType?: string, employee?: Employee) {
  const estPay = (estPayOverride && estPayOverride > 0) ? estPayOverride : estimatePay(stops, miles, route, vehicle, adminSettings, routeType);
  
  const formula = adminSettings?.helperPayFormula || DEFAULT_ADMIN_SETTINGS.helperPayFormula;
  
  const result = employee?.helperPayoutPercentage !== undefined 
    ? estPay * (employee.helperPayoutPercentage / 100)
    : evaluateFormula(formula, { estimatedPay: estPay, stops, miles });
    
  return Number(result.toFixed(2));
}

function roleForEmployee(row: RouteTrackerRow, employeeName: string): RoleType | null {
  const isDriver = row.driver === employeeName;
  const isHelper = row.helper === employeeName;
  if (isDriver && isHelper) return "Driver&Helper";
  if (isDriver) return "Driver";
  if (isHelper) return "Helper";
  return null;
}

function amountForRole(row: RouteTrackerRow, role: RoleType, employee: Employee, adminSettings?: AdminSettings) {
  const estPay = row.estimatedPay || estimatePay(row.stops, row.miles, row.route, row.vehicleNumber, adminSettings, row.routeType);
  
  const isDriverPart = role === "Driver" || role === "Driver&Helper";
  const isHelperPart = role === "Helper" || role === "Driver&Helper";

  let dPay = 0;
  let hPay = 0;

  if (isDriverPart) {
    dPay = driverPay(row.stops, row.miles, row.route, row.vehicleNumber, estPay, adminSettings, row.routeType, employee);
  }

  if (isHelperPart) {
    hPay = helperPay(row.stops, row.miles, row.route, row.vehicleNumber, estPay, adminSettings, row.routeType, employee);
  }

  return Number((dPay + hPay).toFixed(2));
}

export function autoBuildEarnings(employee: Employee, run: PayrollRun, routes: RouteTrackerRow[], adminSettings?: AdminSettings): EarningsLine[] {
  return routes
    .filter((row) => row.date >= run.payPeriodStart && row.date <= run.payPeriodEnd)
    .map((row) => {
      const role = roleForEmployee(row, employee.fullName);
      if (!role) return null;
      const displayDate = formatEarningsDate(row.date);
      
      const format = adminSettings?.earningsDescriptionFormat || DEFAULT_ADMIN_SETTINGS.earningsDescriptionFormat;
      let description = format
        .replace('{MMM d}', displayDate)
        .replace('{client}', row.route)
        .replace('{role}', role);

      return {
        id: `${employee.id}-${row.id}`,
        date: row.date,
        client: row.route,
        role,
        description,
        amount: amountForRole(row, role, employee, adminSettings),
      } satisfies EarningsLine;
    })
    .filter(Boolean) as EarningsLine[];
}

export function computeTotals(item: PayrollItem): ComputedTotals {
  const earningsSum = item.earningsLines.reduce((sum, line) => sum + (line.amount || 0), 0);
  const otherEarningsSum = item.otherEarningsLines.reduce((sum, line) => sum + (line.amount || 0), 0);
  const totalEarnings = Number((earningsSum + otherEarningsSum).toFixed(2));
    
  const totalDeductions = Number(item.deductionsLines.reduce((sum, line) => sum + (line.amount || 0), 0).toFixed(2));
  const grossPay = totalEarnings;
  const netPay = Number((grossPay - totalDeductions).toFixed(2));
  
  return {
    totalEarnings,
    totalDeductions,
    grossPay,
    netPay,
  };
}
