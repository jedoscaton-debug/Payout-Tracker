
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
};

export type Employee = {
  id: string;
  fullName: string;
  role: "Driver" | "Helper";
  defaultDailyRate: string;
  paymentMethod?: string;
  authUid?: string;
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
  dailyRateSnapshot: string;
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
