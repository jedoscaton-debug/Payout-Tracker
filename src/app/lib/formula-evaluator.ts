
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
    // Allow letters, numbers, basic operators, parentheses, spaces, dots, and commas (for ROUND)
    const sanitized = processed.replace(/[^a-zA-Z0-9+\-*/().,\s]/g, '');
    
    processed = sanitized;

    // 2. Add aliases to scope for common variations (Excel style vs JS style)
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
    // Replace ROUND(x, y) with Math.round(x). JS Math.round ignores second arg if provided.
    processed = processed.replace(/\bROUND\b/gi, 'Math.round');

    // 4. Replace variable names with values from scope
    // We sort keys by length descending to prevent partial replacement
    const sortedKeys = Object.keys(extendedScope).sort((a, b) => b.length - a.length);
    
    sortedKeys.forEach(key => {
      const value = extendedScope[key] ?? 0;
      // Regex matches the keyword only if it's a whole word, case-insensitive
      const regex = new RegExp(`\\b${key}\\b`, 'gi');
      processed = processed.replace(regex, `(${value})`);
    });

    // 5. Final safety check: After replacement, the formula should only contain math tokens and allowed functions
    const checkString = processed.replace(/Math\.round/g, '');
    if (/[a-zA-Z]/.test(checkString)) {
      // If letters remain, it means there are unrecognized variables
      return 0;
    }

    // 6. Use Function constructor with Math context
    return Number(new Function('Math', `return ${processed}`)(Math)) || 0;
  } catch (e) {
    console.error("Formula evaluation failed:", e, { formula, scope });
    return 0;
  }
}

export const DEFAULT_FORMULA_SETTINGS: Omit<import("./types").FormulaSettings, 'id' | 'updatedAt'> = {
  estimatedPayFormula: "27 * stops",
  gasEstimatedPayFormula: "100 + (1.37 * ROUND(miles, 0)) + (12.5 * ROUND(stops, 0))",
  estimatedFuelFormula: "(3.76 / 8) * miles",
  driverPayFormula: "estimatedPay * 0.27",
  helperPayFormula: "estimatedPay * 0.23",
  evDriverPayFormula: "estimatedPay * 0.33",
  evHelperPayFormula: "estimatedPay * 0.27",
  combinedPayMode: "sum",
  customCombinedFormula: "driverPay + helperPay",
  revenueSource: "estimatedPay",
  deltaFormula: "actualPayAudit - estimatedPay",
  redThreshold: 100,
  yellowThreshold: 300,
  reserveRate: 0.15,
  estimatedWeeklyInsurance: 600,
  trueNetProfitFormula: "fleetNetProfit - estimatedWeeklyInsurance - (fleetRevenue * reserveRate)",
  directDepositFee: 4.00,
  autoApplyDirectDepositFee: true,
  directDepositFeeEditable: "superAdminOnly",
  installmentCompletionRule: "remainingBalance <= 0",
  currencyFormat: "USD",
  decimalPlaces: 2,
  earningsDescriptionFormat: "{MMM d} - {client} {role}"
};
