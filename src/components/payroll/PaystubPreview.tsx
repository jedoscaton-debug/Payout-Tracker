
"use client";

import { PayrollItem, PayrollRun } from "@/app/lib/types";
import { computeTotals, currency, shortDate } from "@/app/lib/payroll-utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

interface PaystubPreviewProps {
  item: PayrollItem;
  run: PayrollRun;
}

export function PaystubPreview({ item, run }: PaystubPreviewProps) {
  const totals = computeTotals(item);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col w-full h-full bg-white text-black font-sans">
      <style jsx global>{`
        @media print {
          @page {
            size: portrait;
            margin: 0;
          }
          body * {
            visibility: hidden;
          }
          #paystub-document, #paystub-document * {
            visibility: visible;
          }
          #paystub-document {
            position: fixed;
            left: 0;
            top: 0;
            width: 210mm; /* A4 width */
            height: 297mm; /* A4 height */
            padding: 20mm !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Dialog Header with Print Button */}
      <div className="no-print flex items-center justify-between p-6 border-b bg-slate-50/50 sticky top-0 z-10">
        <div>
          <h3 className="text-sm font-black uppercase tracking-tighter">Payslip Preview</h3>
          <p className="text-[10px] text-slate-500">Review employee statement before finalizing.</p>
        </div>
        <Button size="sm" variant="outline" className="rounded-xl h-9 text-[10px] font-bold uppercase border-slate-200 bg-white shadow-sm hover:bg-slate-50" onClick={handlePrint}>
          <Printer className="mr-2 h-3.5 w-3.5" /> Print / Save PDF
        </Button>
      </div>

      <ScrollArea className="flex-1 bg-slate-100/50 p-6 sm:p-12 min-h-0">
        <div 
          id="paystub-document" 
          className="mx-auto bg-white p-12 shadow-2xl border border-slate-200 max-w-[800px] flex flex-col gap-12 min-h-[1000px] rounded-sm"
        >
          {/* Company Branding */}
          <div className="flex flex-col items-center gap-1">
            <h1 className="text-2xl font-black text-center tracking-tight uppercase">SYSTEM ORIENTED LLC</h1>
            <p className="text-sm font-medium text-slate-500">Upper Marlboro, MD</p>
          </div>

          {/* Employee & Summary Row */}
          <div className="grid grid-cols-2 gap-12 items-start">
            {/* Left: Employee Info */}
            <div className="grid grid-cols-[120px_1fr] gap-x-4 gap-y-6 text-sm pt-4">
              <span className="font-bold text-slate-400 text-[10px] uppercase tracking-widest">Employee</span>
              <span className="font-bold text-slate-900">{item.employeeNameSnapshot}</span>
              
              <span className="font-bold text-slate-400 text-[10px] uppercase tracking-widest">Daily Rate</span>
              <span className="font-medium text-slate-700">{item.dailyRateSnapshot || "Varies"}</span>
              
              <span className="font-bold text-slate-400 text-[10px] uppercase tracking-widest">Pay Period</span>
              <span className="font-medium text-slate-700">{shortDate(run.payPeriodStart)} - {shortDate(run.payPeriodEnd)}</span>
              
              <span className="font-bold text-slate-400 text-[10px] uppercase tracking-widest">Pay Date</span>
              <span className="font-medium text-slate-700">{run.payDate}</span>
            </div>

            {/* Right: Summary Table */}
            <div className="border-2 border-black rounded-lg overflow-hidden shadow-sm">
              <div className="bg-slate-100 border-b-2 border-black py-2.5 px-4 text-center">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900">Payslip Summary</span>
              </div>
              <div className="grid grid-cols-[1fr_120px] border-b-2 border-black">
                <span className="px-4 py-2.5 text-xs font-bold text-slate-900">Total Gross</span>
                <span className="px-4 py-2.5 text-xs font-black text-right border-l-2 border-black">{currency(totals.grossPay)}</span>
              </div>
              <div className="grid grid-cols-[1fr_120px] border-b-2 border-black">
                <span className="px-4 py-2.5 text-xs font-bold text-slate-900">Total Deductions</span>
                <span className="px-4 py-2.5 text-xs font-black text-right border-l-2 border-black">{currency(totals.totalDeductions)}</span>
              </div>
              <div className="grid grid-cols-[1fr_120px] bg-black text-white">
                <span className="px-4 py-3 text-xs font-black uppercase tracking-[0.2em]">Net Pay</span>
                <span className="px-4 py-3 text-xs font-black text-right border-l-2 border-white">{currency(totals.netPay)}</span>
              </div>
            </div>
          </div>

          {/* Breakdown Header */}
          <div className="flex flex-col gap-2 mt-4">
            <h2 className="text-3xl font-black tracking-tighter uppercase text-slate-900">Payslip Breakdown</h2>
          </div>

          {/* Breakdown Ledger Table */}
          <div className="border-2 border-slate-300 rounded-3xl overflow-hidden flex flex-col bg-white shadow-sm">
            {/* Table Headers */}
            <div className="grid grid-cols-2 bg-slate-100 border-b-2 border-slate-300">
              <div className="px-6 py-4 text-center text-xs font-black uppercase tracking-widest border-r-2 border-slate-300">Earnings</div>
              <div className="px-6 py-4 text-center text-xs font-black uppercase tracking-widest">Deductions</div>
            </div>
            
            {/* Sub-headers */}
            <div className="grid grid-cols-2 text-[10px] font-black uppercase tracking-[0.2em] bg-white border-b-2 border-slate-300">
              <div className="grid grid-cols-[1fr_120px] border-r-2 border-slate-300">
                <span className="px-8 py-2.5 text-slate-400">Days Worked</span>
                <span className="px-4 py-2.5 text-center border-l-2 border-slate-300 text-slate-400">Amount</span>
              </div>
              <div className="grid grid-cols-[1fr_120px]">
                <span className="px-8 py-2.5 text-slate-400">Description</span>
                <span className="px-4 py-2.5 text-center border-l-2 border-slate-300 text-slate-400">Amount</span>
              </div>
            </div>

            {/* Content with Continuous Vertical Dividers */}
            <div className="flex-1 min-h-[450px] flex relative">
              {/* Earnings Column Wrapper */}
              <div className="flex-1 border-r-2 border-slate-300 relative">
                {/* Fixed Continuous Divider */}
                <div className="absolute top-0 bottom-0 right-[120px] border-r-2 border-slate-300 pointer-events-none" />
                <div className="flex flex-col text-[11px] font-medium text-slate-600">
                  {item.earningsLines.map((line) => (
                    <div key={line.id} className="grid grid-cols-[1fr_120px]">
                      <span className="px-8 py-3 truncate">{line.description}</span>
                      <span className="px-4 py-3 text-right font-black text-slate-900">{currency(line.amount)}</span>
                    </div>
                  ))}
                  {item.otherEarningsLines.map((line) => (
                    <div key={line.id} className="grid grid-cols-[1fr_120px]">
                      <span className="px-8 py-3 truncate">{line.description}</span>
                      <span className="px-4 py-3 text-right font-black text-slate-900">{currency(line.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Deductions Column Wrapper */}
              <div className="flex-1 relative">
                {/* Fixed Continuous Divider */}
                <div className="absolute top-0 bottom-0 right-[120px] border-r-2 border-slate-300 pointer-events-none" />
                <div className="flex flex-col text-[11px] font-medium text-slate-600">
                  {item.deductionsLines.map((line) => (
                    <div key={line.id} className="grid grid-cols-[1fr_120px]">
                      <span className="px-8 py-3 truncate">{line.deductionName}</span>
                      <span className="px-4 py-3 text-right font-black text-rose-600">{currency(line.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Totals Summary Footer */}
            <div className="grid grid-cols-2 bg-slate-50 border-t-2 border-slate-300 text-xs font-black">
              <div className="grid grid-cols-[1fr_120px] border-r-2 border-slate-300">
                <span className="px-8 py-4 uppercase tracking-widest text-slate-900">Total Gross</span>
                <span className="px-4 py-4 text-right border-l-2 border-slate-300 text-slate-900 bg-white">{currency(totals.grossPay)}</span>
              </div>
              <div className="grid grid-cols-[1fr_120px]">
                <span className="px-8 py-4 uppercase tracking-widest text-slate-900">Total Deductions</span>
                <span className="px-4 py-4 text-right border-l-2 border-slate-300 text-slate-900 bg-white">{currency(totals.totalDeductions)}</span>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
