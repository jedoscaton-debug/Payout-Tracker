
/**
 * Safe formula evaluator for payroll and route math.
 * Replaces recognized keywords with numeric values and performs arithmetic.
 */
export function evaluateFormula(formula: string, scope: Record<string, number>): number {
  try {
    if (!formula) return 0;

    let processed = formula.trim();
    if (processed.startsWith('=')) processed = processed.substring(1);

    // 1. Sanitize the formula to prevent injection
    const sanitized = processed.replace(/[^a-zA-Z0-9+\-*/().,\s]/g, '');
    processed = sanitized;

    // 2. Add aliases to scope for common variations
    const extendedScope: Record<string, number> = { ...scope };
    if (scope.miles !== undefined) {
      extendedScope['mile'] = scope.miles;
      extendedScope['miles'] = scope.miles;
    }
    if (scope.stops !== undefined) {
      extendedScope['stop'] = scope.stops;
      extendedScope['stops'] = scope.stops;
    }

    // 3. Handle ROUND function
    processed = processed.replace(/\bROUND\b/gi, 'Math.round');

    // 4. Replace variable names with values from scope
    const sortedKeys = Object.keys(extendedScope).sort((a, b) => b.length - a.length);
    
    sortedKeys.forEach(key => {
      const value = extendedScope[key] ?? 0;
      const regex = new RegExp(`\\b${key}\\b`, 'gi');
      processed = processed.replace(regex, `(${value})`);
    });

    // 5. Final safety check
    const checkString = processed.replace(/Math\.round/g, '');
    if (/[a-zA-Z]/.test(checkString)) {
      return 0;
    }

    // 6. Use Function constructor with Math context
    return Number(new Function('Math', `return ${processed}`)(Math)) || 0;
  } catch (e) {
    console.error("Formula evaluation failed:", e, { formula, scope });
    return 0;
  }
}

export const DEFAULT_ADMIN_SETTINGS: Omit<import("./types").AdminSettings, 'id' | 'createdAt' | 'updatedAt' | 'updatedBy'> = {
  companyName: "SYSTEM ORIENTED LLC",
  companyAddress: "Upper Marlboro, MD",
  defaultCurrency: "USD",
  timeZone: "America/New_York",
  dateFormat: "YYYY-MM-DD",

  estimatedPayFormula: "27 * stops",
  gasEstimatedPayFormula: "100 + (1.37 * ROUND(miles, 0)) + (12.5 * ROUND(stops, 0))",
  driverPayFormula: "estimatedPay * 0.27",
  helperPayFormula: "estimatedPay * 0.23",
  combinedPayFormula: "driverPay + helperPay",
  negativeNetPayRule: "confirm",

  estimatedFuelFormula: "(3.76 / 8) * miles",
  deltaFormula: "rxoSettlementPay - estimatedPay",
  revenueSource: "estimatedPay",

  directDepositFee: 4.00,
  autoApplyDirectDepositFee: true,
  directDepositFeeEditable: "superAdminOnly",
  installmentDeductionRule: "reduce remaining balance every completed payroll run",
  installmentCompletionRule: "remainingBalance <= 0",

  payrollCycleStartDay: "Sunday",
  payrollCycleEndDay: "Saturday",
  payDateRule: "Friday of the following week",

  negativeDeltaThreshold: -50,
  rxoRedStatusRule: "delta < -50",
  rxoGreenStatusRule: "delta >= -50",
  rxoMatchStrategy: "match by normalized route code + date",
  rxoEVMatchingRule: "starts with DMPEV",
  rxoGASMatchingRule: "starts with DMPGAS",

  fleetRedThreshold: 100,
  fleetYellowThreshold: 300,
  reserveRate: 0.15,
  estimatedWeeklyInsurance: 600,
  trueNetProfitFormula: "fleetNetProfit - estimatedWeeklyInsurance - (fleetRevenue * reserveRate)",

  currencyFormat: "USD",
  decimalPlaces: 2,
  earningsDescriptionFormat: "{MMM d} - {client} {role}",
  weekDisplayFormat: "Sunday to Saturday",
  tableSortDefault: "date-asc"
};
