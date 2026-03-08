
export type RoleType = "Driver" | "Helper" | "Driver&Helper";
export type PayrollStatus = "Draft" | "Finalized";
export type DeductionType = "Fixed" | "Installment" | "One-Time" | "Auto System Fee";
export type DeductionStatus = "Active" | "Completed" | "Paused" | "Cancelled";

export type RouteTrackerRow = {
  id: string;
  route: string;
  routeType: string;
  vehicleNumber: string;
  date: string;
  miles: number;
  stops: number;
  estimatedPay?: number;
  actualPayAudit: number;
  truckRental: number;
  insurance: number;
  driver: string;
  helper?: string;
  status?: "Active" | "Closed";
};

export type EarningsLine = {
  id: string;
  date: string;
  client: string;
  role: RoleType;
  description: string;
  amount: number;
};

export type OtherEarningLine = {
  id: string;
  description: string;
  amount: number;
};

export type DeductionLine = {
  id: string;
  deductionName: string;
  amount: number;
  type: "Fixed" | "Installment" | "One-Time" | "Auto System Fee";
  originalDeductionId?: string; // Linked to the DeductionBoard item
  installmentCount?: number;
  installmentsPaid?: number; // Represents the count after this payment is applied
  totalClaimAmount?: number; // The total amount of the claim
};

export type Employee = {
  id: string;
  fullName: string;
  role: "Driver" | "Helper";
  defaultDailyRate: string;
  paymentMethod?: string;
  authUid?: string;
  email?: string;
  contactNumber?: string;
  driverPayoutPercentage?: number;
  helperPayoutPercentage?: number;
};

export type DeductionRecord = {
  id: string;
  employeeId: string;
  employeeName: string;
  deductionName: string;
  type: DeductionType;
  totalClaimAmount: number;
  installmentCount: number;
  installmentsPaid: number;
  remainingBalance: number;
  perPayrollAmount: number;
  status: DeductionStatus;
  autoApply: boolean;
  isSystemDefault: boolean;
  lastAppliedPayDate?: string;
  startDate?: string;
  startPayrollRunId?: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type PayrollRun = {
  id: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  payDate: string;
  status: PayrollStatus;
};

export type PayrollItem = {
  id: string;
  payrollRunId: string;
  employeeId: string;
  employeeNameSnapshot: string;
  employeeEmailSnapshot?: string;
  dailyRateSnapshot: string;
  payDateSnapshot?: string;
  payPeriodStartSnapshot?: string;
  payPeriodEndSnapshot?: string;
  notes: string;
  earningsLines: EarningsLine[];
  otherEarningsLines: OtherEarningLine[];
  deductionsLines: DeductionLine[];
};

export type ComputedTotals = {
  totalEarnings: number;
  totalDeductions: number;
  grossPay: number;
  netPay: number;
};

export type AdminSettings = {
  id: string;
  // Company Settings
  companyName: string;
  companyAddress: string;
  companyLogo?: string;
  defaultCurrency: string;
  timeZone: string;
  dateFormat: string;

  // Payroll Formulas
  estimatedPayFormula: string;
  gasEstimatedPayFormula: string;
  driverPayFormula: string;
  helperPayFormula: string;
  combinedPayFormula: string;
  negativeNetPayRule: 'block' | 'confirm' | 'allow';

  // Route Formulas
  estimatedFuelFormula: string;
  deltaFormula: string;
  revenueSource: 'estimatedPay' | 'actualPayAudit' | 'manualOverride';

  // Deduction Defaults
  directDepositFee: number;
  autoApplyDirectDepositFee: boolean;
  directDepositFeeEditable: 'locked' | 'superAdminOnly' | 'adminEditable';
  installmentDeductionRule: string;
  installmentCompletionRule: string;

  // Payroll Schedule
  payrollCycleStartDay: string;
  payrollCycleEndDay: string;
  payDateRule: string;

  // RXO Audit Rules
  negativeDeltaThreshold: number;
  rxoRedStatusRule: string;
  rxoGreenStatusRule: string;
  rxoMatchStrategy: string;
  rxoEVMatchingRule: string;
  rxoGASMatchingRule: string;

  // Fleet / Profitability
  fleetRedThreshold: number;
  fleetYellowThreshold: number;
  reserveRate: number;
  estimatedWeeklyInsurance: number;
  trueNetProfitFormula: string;

  // Display / Formatting
  currencyFormat: string;
  decimalPlaces: number;
  earningsDescriptionFormat: string;
  weekDisplayFormat: string;
  tableSortDefault: string;

  createdAt: string;
  updatedAt: string;
  updatedBy: string;
};

export type AdminSettingsAuditLog = {
  id: string;
  settingName: string;
  oldValue: string;
  newValue: string;
  changedBy: string;
  changedAt: string;
  notes?: string;
};

// RXO Settlement Types
export type RXOSettlementReport = {
  id: string;
  payee: string;
  companyName: string;
  settlementPeriodStart: string;
  settlementPeriodEnd: string;
  anticipatedIssueDate: string;
  marketCount: number;
  routeCount: number;
  totalMiles: number;
  totalStops: number;
  rxoTotalPay: number;
  internalEstimatedTotalPay: number;
  totalDelta: number;
  fileName: string;
  importedAt: string;
  importedBy: string;
  notes: string;
  summaryTotalPay?: number;
  orderDetailsRateSum?: number;
  integrityStatus?: 'Verified' | 'Mismatch' | 'Pending';
};

export type RXORouteDetail = {
  id: string;
  reportId: string;
  routeId: string;
  market: string;
  routeDate: string;
  routeMiles: number;
  internalMiles?: number;
  stopCount: number;
  internalStops?: number;
  rxoSettlementPay: number;
  systemEstimatedPay: number;
  delta: number;
  deltaStatus: 'RED' | 'GREEN';
  internalRouteId?: string;
  matchStatus: 'Matched' | 'Partial Match' | 'Unmatched' | 'NOT MATCH' | 'VERIFIED MATCH';
  overrideEstimate?: number;
  finalEstimatedPay: number;
  notes?: string;
  createdAt: string;
};

export type RXOOrderDetail = {
  id: string;
  reportId: string;
  routeId: string;
  market: string;
  jobNumber: string;
  service: string;
  completion: string;
  completedOn: string;
  rate: number;
  mileage: number;
  supplement: number;
  createdAt: string;
};
