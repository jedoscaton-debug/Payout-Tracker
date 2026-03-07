
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
 * Helper to determine if a route is EV based on rules:
 * 1. Route Type is explicitly "EV"
 * 2. Route ID contains "_EV" or starts with "DMPEV"
 * 3. Route ID is "EV" and Vehicle # is "EV"
 */
function isEVRoute(route: string, vehicle: string, routeType?: string): boolean {
  const r = (route || "").toUpperCase();
  const v = (vehicle || "").toUpperCase();
  const rt = (routeType || "").toUpperCase();
  
  // Rule 0: Explicit selection in dropdown
  if (rt === "EV") return true;
  if (rt === "GAS") return false;
  
  // Rule 1: Route ID contains _EV or DMPEV prefix
  const isEVSuffix = r.includes("_EV") || r.startsWith("DMPEV");
  
  // Rule 2: Pure EV route and vehicle
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
    // EV Formula: Default 27 * stops
    const formula = settings?.estimatedPayFormula || DEFAULT_FORMULA_SETTINGS.estimatedPayFormula;
    result = evaluateFormula(formula, { stops, miles });
  } else {
    // GAS Formula: Default 100 + (1.37 * MILE) + (12.5 * STOPS)
    const formula = settings?.gasEstimatedPayFormula || DEFAULT_FORMULA_SETTINGS.gasEstimatedPayFormula;
    result = evaluateFormula(formula, { stops, miles });
  }

  return Number(result.toFixed(2));
}

/**
 * Dynamic Estimate Fuel based on settings
 */
export function estimateFuel(miles: number, settings?: FormulaSettings) {
  const formula = settings?.estimatedFuelFormula || DEFAULT_FORMULA_SETTINGS.estimatedFuelFormula;
  const result = evaluateFormula(formula, { miles });
  return Number(result.toFixed(2));
}

export function driverPay(stops: number, miles: number = 0, route: string = "", vehicle: string = "", estPayOverride?: number, settings?: FormulaSettings, routeType?: string) {
  const estPay = (estPayOverride && estPayOverride > 0) ? estPayOverride : estimatePay(stops, miles, route, vehicle, settings, routeType);
  const isEV = isEVRoute(route, vehicle, routeType);
  
  if (isEV) {
    const formula = settings?.evDriverPayFormula || DEFAULT_FORMULA_SETTINGS.evDriverPayFormula;
    return Number(evaluateFormula(formula, { estimatedPay: estPay, stops, miles }).toFixed(2));
  }
  
  const formula = settings?.driverPayFormula || DEFAULT_FORMULA_SETTINGS.driverPayFormula;
  return Number(evaluateFormula(formula, { estimatedPay: estPay, stops, miles }).toFixed(2));
}

export function helperPay(stops: number, miles: number = 0, route: string = "", vehicle: string = "", estPayOverride?: number, settings?: FormulaSettings, routeType?: string) {
  const estPay = (estPayOverride && estPayOverride > 0) ? estPayOverride : estimatePay(stops, miles, route, vehicle, settings, routeType);
  const isEV = isEVRoute(route, vehicle, routeType);
  
  if (isEV) {
    const formula = settings?.evHelperPayFormula || DEFAULT_FORMULA_SETTINGS.evHelperPayFormula;
    return Number(evaluateFormula(formula, { estimatedPay: estPay, stops, miles }).toFixed(2));
  }
  
  const formula = settings?.helperPayFormula || DEFAULT_FORMULA_SETTINGS.helperPayFormula;
  return Number(evaluateFormula(formula, { estimatedPay: estPay, stops, miles }).toFixed(2));
}

export function truckRentalMileageCost(miles: number) {
  return 0; // Default $0.00 as requested
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
    // Priority: Individual employee driver percentage override
    if (employee.driverPayoutPercentage !== undefined) {
      dPay = Number((estPay * (employee.driverPayoutPercentage / 100)).toFixed(2));
    } else {
      dPay = driverPay(row.stops, row.miles, row.route, row.vehicleNumber, estPay, settings, row.routeType);
    }
  }

  if (isHelperPart) {
    // Priority: Individual employee helper percentage override
    if (employee.helperPayoutPercentage !== undefined) {
      hPay = Number((estPay * (employee.helperPayoutPercentage / 100)).toFixed(2));
    } else {
      hPay = helperPay(row.stops, row.miles, row.route, row.vehicleNumber, estPay, settings, row.routeType);
    }
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
  const totalEarnings = earningsSum + otherEarningsSum;
    
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
