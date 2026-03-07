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
 * 1. Route ID contains "_EV" (e.g. A01_EV)
 * 2. Route ID is "EV" and Vehicle # is "EV"
 */
function isEVRoute(route: string, vehicle: string): boolean {
  const r = (route || "").toUpperCase();
  const v = (vehicle || "").toUpperCase();
  
  // Condition 1: Route ID contains _EV (covers A01_EV with any vehicle type)
  const isEVSuffix = r.includes("_EV");
  
  // Condition 2: Pure EV route and vehicle
  const isPureEV = r === "EV" && v === "EV";
  
  return isEVSuffix || isPureEV;
}

/**
 * Dynamic Estimate Pay based on settings and route type (EV vs GAS)
 */
export function estimatePay(stops: number, miles: number = 0, route: string = "", vehicle: string = "", settings?: FormulaSettings) {
  const isEV = isEVRoute(route, vehicle);
  let result = 0;

  if (isEV) {
    // EV Formula: Default 27 * stops
    const formula = settings?.estimatedPayFormula || DEFAULT_FORMULA_SETTINGS.estimatedPayFormula;
    result = evaluateFormula(formula, { stops, miles });
  } else {
    // GAS Formula: Used for routes like A01 (no _EV) or GAS/GAS
    // Default: 100 + (1.37 * ROUND(miles, 0)) + (12.5 * ROUND(stops, 0))
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

export function driverPay(stops: number, miles: number = 0, route: string = "", vehicle: string = "", estPayOverride?: number, settings?: FormulaSettings) {
  const estPay = (estPayOverride && estPayOverride > 0) ? estPayOverride : estimatePay(stops, miles, route, vehicle, settings);
  const isEV = isEVRoute(route, vehicle);
  
  if (isEV) {
    const formula = settings?.evDriverPayFormula || DEFAULT_FORMULA_SETTINGS.evDriverPayFormula;
    return Number(evaluateFormula(formula, { estimatedPay: estPay, stops, miles }).toFixed(2));
  }
  
  const formula = settings?.driverPayFormula || DEFAULT_FORMULA_SETTINGS.driverPayFormula;
  return Number(evaluateFormula(formula, { estimatedPay: estPay, stops, miles }).toFixed(2));
}

export function helperPay(stops: number, miles: number = 0, route: string = "", vehicle: string = "", estPayOverride?: number, settings?: FormulaSettings) {
  const estPay = (estPayOverride && estPayOverride > 0) ? estPayOverride : estimatePay(stops, miles, route, vehicle, settings);
  const isEV = isEVRoute(route, vehicle);
  
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

function amountForRole(row: RouteTrackerRow, role: RoleType, settings?: FormulaSettings) {
  const estPay = row.estimatedPay || estimatePay(row.stops, row.miles, row.route, row.vehicleNumber, settings);
  if (role === "Driver") return driverPay(row.stops, row.miles, row.route, row.vehicleNumber, estPay, settings);
  if (role === "Helper") return helperPay(row.stops, row.miles, row.route, row.vehicleNumber, estPay, settings);
  
  const dPay = driverPay(row.stops, row.miles, row.route, row.vehicleNumber, estPay, settings);
  const hPay = helperPay(row.stops, row.miles, row.route, row.vehicleNumber, estPay, settings);
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
        amount: amountForRole(row, role, settings),
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
