import { RouteTrackerRow, Employee, PayrollRun, EarningsLine, RoleType, PayrollItem, ComputedTotals, FormulaSettings } from './types';
import { evaluateFormula, DEFAULT_FORMULA_SETTINGS } from './formula-evaluator';

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
 * Standard Mileage Cost for Truck Rental.
 * Calculating at $0.25 per mile.
 */
export function truckRentalMileageCost(miles: number): number {
  return Number(((miles || 0) * 0.25).toFixed(2));
}

/**
 * Helper to determine if a route is EV based on rules:
 * 1. Route Type is explicitly "EV"
 * 2. Route ID contains "_EV" or starts with "DMPEV"
 * 3. Route ID is "EV" and Vehicle # is "EV"
 */
function isEVRoute(route: string, vehicle: string, routeType?: string): boolean {
  const r = (route || "").toUpperCase();
  const v = (vehicle || "").toUpperCase();
  const rt = (routeType || "").toUpperCase();
  
  if (rt === "EV") return true;
  if (rt === "GAS") return false;
  
  const isEVSuffix = r.includes("_EV") || r.startsWith("DMPEV");
  const isPureEV = r === "EV" && v === "EV";
  
  return isEVSuffix || isPureEV;
}

/**
 * Dynamic Estimate Pay based on settings and route type (EV vs GAS)
 */
export function estimatePay(stops: number, miles: number = 0, route: string = "", vehicle: string = "", settings?: FormulaSettings, routeType?: string) {
  const isEV = isEVRoute(route, vehicle, routeType);
  let result = 0;

  if (isEV) {
    const formula = settings?.estimatedPayFormula || DEFAULT_FORMULA_SETTINGS.estimatedPayFormula;
    result = evaluateFormula(formula, { stops, miles });
  } else {
    const formula = settings?.gasEstimatedPayFormula || DEFAULT_FORMULA_SETTINGS.gasEstimatedPayFormula;
    result = evaluateFormula(formula, { stops, miles });
  }

  return Number(result.toFixed(2));
}

export function estimateFuel(miles: number, settings?: FormulaSettings) {
  const formula = settings?.estimatedFuelFormula || DEFAULT_FORMULA_SETTINGS.estimatedFuelFormula;
  const result = evaluateFormula(formula, { miles });
  return Number(result.toFixed(2));
}

/**
 * Driver Payout Logic
 * Priorities:
 * 1. Employee Specific Share -> Employee % (from Directory)
 * 2. Pure EV Node (EV/EV) -> 33% (System Incentive)
 * 3. Default -> 27%
 */
export function driverPay(stops: number, miles: number = 0, route: string = "", vehicle: string = "", estPayOverride?: number, settings?: FormulaSettings, routeType?: string, employee?: Employee) {
  const estPay = (estPayOverride && estPayOverride > 0) ? estPayOverride : estimatePay(stops, miles, route, vehicle, settings, routeType);
  
  const r = (route || "").toUpperCase();
  const v = (vehicle || "").toUpperCase();
  
  let percentage = 27; // Default
  
  if (employee?.driverPayoutPercentage !== undefined) {
    percentage = employee.driverPayoutPercentage;
  } else if (r === "EV" && v === "EV") {
    percentage = 33; // Node incentive fallback
  }
  
  return Number((estPay * (percentage / 100)).toFixed(2));
}

/**
 * Helper Payout Logic
 * Priorities:
 * 1. Employee Specific Share -> Employee % (from Directory)
 * 2. Pure EV Node (EV/EV) -> 27% (System Incentive)
 * 3. Default -> 23%
 */
export function helperPay(stops: number, miles: number = 0, route: string = "", vehicle: string = "", estPayOverride?: number, settings?: FormulaSettings, routeType?: string, employee?: Employee) {
  const estPay = (estPayOverride && estPayOverride > 0) ? estPayOverride : estimatePay(stops, miles, route, vehicle, settings, routeType);
  
  const r = (route || "").toUpperCase();
  const v = (vehicle || "").toUpperCase();
  
  let percentage = 23; // Default
  
  if (employee?.helperPayoutPercentage !== undefined) {
    percentage = employee.helperPayoutPercentage;
  } else if (r === "EV" && v === "EV") {
    percentage = 27; // Node incentive fallback
  }
  
  return Number((estPay * (percentage / 100)).toFixed(2));
}

function roleForEmployee(row: RouteTrackerRow, employeeName: string): RoleType | null {
  const isDriver = row.driver === employeeName;
  const isHelper = row.helper === employeeName;
  if (isDriver && isHelper) return "Driver&Helper";
  if (isDriver) return "Driver";
  if (isHelper) return "Helper";
  return null;
}

function amountForRole(row: RouteTrackerRow, role: RoleType, employee: Employee, settings?: FormulaSettings) {
  const estPay = row.estimatedPay || estimatePay(row.stops, row.miles, row.route, row.vehicleNumber, settings, row.routeType);
  
  const isDriverPart = role === "Driver" || role === "Driver&Helper";
  const isHelperPart = role === "Helper" || role === "Driver&Helper";

  let dPay = 0;
  let hPay = 0;

  if (isDriverPart) {
    dPay = driverPay(row.stops, row.miles, row.route, row.vehicleNumber, estPay, settings, row.routeType, employee);
  }

  if (isHelperPart) {
    hPay = helperPay(row.stops, row.miles, row.route, row.vehicleNumber, estPay, settings, row.routeType, employee);
  }

  return Number((dPay + hPay).toFixed(2));
}

export function autoBuildEarnings(employee: Employee, run: PayrollRun, routes: RouteTrackerRow[], settings?: FormulaSettings): EarningsLine[] {
  return routes
    .filter((row) => row.date >= run.payPeriodStart && row.date <= run.payPeriodEnd)
    .map((row) => {
      const role = roleForEmployee(row, employee.fullName);
      if (!role) return null;
      const displayDate = formatEarningsDate(row.date);
      return {
        id: `${employee.id}-${row.id}`,
        date: row.date,
        client: row.route,
        role,
        description: `${displayDate} - ${row.routeType} ${role}`,
        amount: amountForRole(row, role, employee, settings),
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
