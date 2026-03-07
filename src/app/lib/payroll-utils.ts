
import { RouteTrackerRow, Employee, PayrollRun, EarningsLine, RoleType, PayrollItem, ComputedTotals, FormulaSettings } from './types';
import { evaluateFormula, DEFAULT_FORMULA_SETTINGS } from './formula-evaluator';

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
 * Dynamic Estimate Pay based on settings
 */
export function estimatePay(stops: number, settings?: FormulaSettings) {
  const formula = settings?.estimatedPayFormula || DEFAULT_FORMULA_SETTINGS.estimatedPayFormula;
  return evaluateFormula(formula, { stops });
}

/**
 * Dynamic Estimate Fuel based on settings
 */
export function estimateFuel(miles: number, settings?: FormulaSettings) {
  const formula = settings?.estimatedFuelFormula || DEFAULT_FORMULA_SETTINGS.estimatedFuelFormula;
  return evaluateFormula(formula, { miles });
}

export function driverPay(stops: number, route: string = "", vehicle: string = "", estPayOverride?: number, settings?: FormulaSettings) {
  const estPay = (estPayOverride && estPayOverride > 0) ? estPayOverride : estimatePay(stops, settings);
  
  // Special Rule for EV
  if (route === "EV" && vehicle === "EV") {
    const formula = settings?.evDriverPayFormula || DEFAULT_FORMULA_SETTINGS.evDriverPayFormula;
    return Number(evaluateFormula(formula, { estimatedPay: estPay, stops }).toFixed(2));
  }
  
  const formula = settings?.driverPayFormula || DEFAULT_FORMULA_SETTINGS.driverPayFormula;
  return Number(evaluateFormula(formula, { estimatedPay: estPay, stops }).toFixed(2));
}

export function helperPay(stops: number, route: string = "", vehicle: string = "", estPayOverride?: number, settings?: FormulaSettings) {
  const estPay = (estPayOverride && estPayOverride > 0) ? estPayOverride : estimatePay(stops, settings);
  
  // Special Rule for EV
  if (route === "EV" && vehicle === "EV") {
    const formula = settings?.evHelperPayFormula || DEFAULT_FORMULA_SETTINGS.evHelperPayFormula;
    return Number(evaluateFormula(formula, { estimatedPay: estPay, stops }).toFixed(2));
  }
  
  const formula = settings?.helperPayFormula || DEFAULT_FORMULA_SETTINGS.helperPayFormula;
  return Number(evaluateFormula(formula, { estimatedPay: estPay, stops }).toFixed(2));
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
  const estPay = row.estimatedPay || estimatePay(row.stops, settings);
  if (role === "Driver") return driverPay(row.stops, row.route, row.vehicleNumber, estPay, settings);
  if (role === "Helper") return helperPay(row.stops, row.route, row.vehicleNumber, estPay, settings);
  
  const dPay = driverPay(row.stops, row.route, row.vehicleNumber, estPay, settings);
  const hPay = helperPay(row.stops, row.route, row.vehicleNumber, estPay, settings);
  return dPay + hPay;
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
        amount: Number(amountForRole(row, role, settings).toFixed(2)),
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
