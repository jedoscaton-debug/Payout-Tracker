
/**
 * Safe formula evaluator for payroll and route math.
 * Replaces recognized keywords with numeric values and performs arithmetic.
 */
export function evaluateFormula(formula: string, scope: Record<string, number>): number {
  try {
    if (!formula) return 0;

    // 1. Sanitize the formula to prevent injection
    // Only allow letters, numbers, basic operators, parentheses, spaces, and dots
    const sanitized = formula.replace(/[^a-zA-Z0-9+\-*/().\s]/g, '');
    
    let processed = sanitized;

    // 2. Replace variable names with values from scope
    // We sort keys by length descending to prevent partial replacement (e.g., 'estimatedPay' vs 'pay')
    const sortedKeys = Object.keys(scope).sort((a, b) => b.length - a.length);
    
    sortedKeys.forEach(key => {
      const value = scope[key] ?? 0;
      // Regex matches the keyword only if it's a whole word
      const regex = new RegExp(`\\b${key}\\b`, 'g');
      processed = processed.replace(regex, `(${value})`);
    });

    // 3. Final safety check: After replacement, the formula should only contain math tokens
    if (/[a-zA-Z]/.test(processed)) {
      // If letters remain, it means there are unrecognized variables
      return 0;
    }

    // 4. Use Function constructor as a safer alternative to eval for basic arithmetic
    // Note: In this restricted context with a sanitized numeric-only string, it is safe.
    return Number(new Function(`return ${processed}`)()) || 0;
  } catch (e) {
    console.error("Formula evaluation failed:", e, { formula, scope });
    return 0;
  }
}

export const DEFAULT_FORMULA_SETTINGS: Omit<import("./types").FormulaSettings, 'id' | 'updatedAt'> = {
  estimatedPayFormula: "27 * stops",
  estimatedFuelFormula: "(3.76 / 8) * miles",
  driverPayFormula: "estimatedPay * 0.27",
  helperPayFormula: "estimatedPay * 0.23",
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
