export type RoleType = "Driver" | "Helper" | "Driver&Helper";
export type PayrollStatus = "Draft" | "Finalized";

export type RouteTrackerRow = {
  id: string;
  route: string;
  routeType: string;
  vehicleNumber: string;
  date: string;
  miles: number;
  stops: number;
  estimatedPay?: number; // Optional override
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
  type: "Fixed" | "Installment";
};

export type Employee = {
  id: string;
  fullName: string;
  defaultDailyRate: string;
  paymentMethod?: string;
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
