
"use client";

import { PayrollItem, PayrollRun } from "@/app/lib/types";
import { computeTotals, currency, shortDate } from "@/app/lib/payroll-utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Printer, Settings2 } from "lucide-react";

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
            size: A4;
            margin: 0;
          }
          /* Hide EVERYTHING except the specific document */
          body > *:not(div[role="dialog"]) {
            display: none !important;
          }
          /* Hide dialog overlays and other dialog contents */
          div[role="dialog"] > *:not(#paystub-container) {
            display: none !important;
          }
          /* Target the specific payslip container and force it to top */
          #paystub-container {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            display: block !important;
            visibility: visible !important;
            z-index: 9999 !important;
            background: white !important;
          }
          #paystub-document {
            width: 100% !important;
            height: auto !important;
            min-height: auto !important;
            border: none !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 15mm !important;
          }
          .no-print {
            display: none !important;
          }
          /* Ensure vertical divider prints */
          .print-divider {
            border-right-width: 2px !important;
            border-color: #cbd5e1 !important;
          }
        }
      `}</style>

      {/* Dialog Header with Print Button */}
      <div className="no-print flex items-center justify-between p-6 border-b bg-slate-50/50 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
            <Settings2 className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-tighter">Payslip Preview</h3>
            <p className="text-[10px] text-slate-500 font-medium">Review and print employee statement.</p>
          </div>
        </div>
        <Button size="sm" className="rounded-xl h-9 text-[10px] font-bold uppercase bg-accent hover:bg-accent/90 text-white shadow-lg shadow-accent/20" onClick={handlePrint}>
          <Printer className="mr-2 h-3.5 w-3.5" /> Print / Save PDF
        </Button>
      </div>

      <ScrollArea id="paystub-container" className="flex-1 bg-slate-100/50 p-6 sm:p-12 min-h-0">
        <div 
          id="paystub-document" 
          className="mx-auto bg-white p-12 shadow-2xl border border-slate-200 max-w-[800px] flex flex-col gap-10 min-h-[1050px] rounded-sm transition-all"
        >
          {/* Company Branding */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white shadow-xl shadow-primary/20">
              <Settings2 className="h-7 w-7" />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-black tracking-tight uppercase text-slate-900 leading-none">SYSTEM ORIENTED LLC</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Upper Marlboro, MD</p>
            </div>
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
              <span className="font-medium text-slate-700">{shortDate(run.payPeriodStart)} — {shortDate(run.payPeriodEnd)}</span>
              
              <span className="font-bold text-slate-400 text-[10px] uppercase tracking-widest">Pay Date</span>
              <span className="font-bold text-slate-900">{run.payDate}</span>
            </div>

            {/* Right: Summary Table */}
            <div className="border-2 border-slate-900 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-slate-50 border-b-2 border-slate-900 py-3 px-4 text-center">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900">Payslip Summary</span>
              </div>
              <div className="grid grid-cols-[1fr_120px] border-b-2 border-slate-900">
                <span className="px-4 py-3 text-xs font-bold text-slate-600">Total Gross</span>
                <span className="px-4 py-3 text-xs font-black text-right border-l-2 border-slate-900 bg-white">{currency(totals.grossPay)}</span>
              </div>
              <div className="grid grid-cols-[1fr_120px] border-b-2 border-slate-900">
                <span className="px-4 py-3 text-xs font-bold text-slate-600">Total Deductions</span>
                <span className="px-4 py-3 text-xs font-black text-right border-l-2 border-slate-900 bg-white">{currency(totals.totalDeductions)}</span>
              </div>
              <div className="grid grid-cols-[1fr_120px] bg-slate-900 text-white">
                <span className="px-4 py-3.5 text-[10px] font-black uppercase tracking-[0.2em]">Net Pay</span>
                <span className="px-4 py-3.5 text-xs font-black text-right border-l-2 border-white/20">{currency(totals.netPay)}</span>
              </div>
            </div>
          </div>

          {/* Breakdown Header */}
          <div className="flex flex-col gap-2 mt-2">
            <h2 className="text-3xl font-black tracking-tighter uppercase text-slate-900">Payslip Breakdown</h2>
            <div className="h-1 w-20 bg-primary rounded-full" />
          </div>

          {/* Breakdown Ledger Table */}
          <div className="border-2 border-slate-300 rounded-3xl overflow-hidden flex flex-col bg-white shadow-sm">
            {/* Table Headers */}
            <div className="grid grid-cols-2 bg-slate-100 border-b-2 border-slate-300">
              <div className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest border-r-2 border-slate-300 text-slate-600">Earnings</div>
              <div className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest text-slate-600">Deductions</div>
            </div>
            
            {/* Sub-headers */}
            <div className="grid grid-cols-2 text-[10px] font-black uppercase tracking-[0.2em] bg-white border-b-2 border-slate-300">
              <div className="grid grid-cols-[1fr_110px] border-r-2 border-slate-300">
                <span className="px-8 py-3 text-slate-400">Description</span>
                <span className="px-4 py-3 text-center border-l-2 border-slate-300 text-slate-400">Amount</span>
              </div>
              <div className="grid grid-cols-[1fr_110px]">
                <span className="px-8 py-3 text-slate-400">Description</span>
                <span className="px-4 py-3 text-center border-l-2 border-slate-300 text-slate-400">Amount</span>
              </div>
            </div>

            {/* Content with Continuous Vertical Dividers */}
            <div className="flex-1 min-h-[400px] flex relative">
              {/* Earnings Column Wrapper */}
              <div className="flex-1 border-r-2 border-slate-300 relative">
                {/* Fixed Continuous Divider */}
                <div className="absolute top-0 bottom-0 right-[110px] border-r-2 border-slate-300 pointer-events-none opacity-50 print-divider" />
                <div className="flex flex-col text-[11px] font-medium text-slate-600">
                  {item.earningsLines.map((line) => (
                    <div key={line.id} className="grid grid-cols-[1fr_110px]">
                      <span className="px-8 py-3 truncate">{line.description}</span>
                      <span className="px-4 py-3 text-right font-black text-slate-900">{currency(line.amount)}</span>
                    </div>
                  ))}
                  {item.otherEarningsLines.map((line) => (
                    <div key={line.id} className="grid grid-cols-[1fr_110px]">
                      <span className="px-8 py-3 truncate">{line.description}</span>
                      <span className="px-4 py-3 text-right font-black text-slate-900">{currency(line.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Deductions Column Wrapper */}
              <div className="flex-1 relative">
                {/* Fixed Continuous Divider */}
                <div className="absolute top-0 bottom-0 right-[110px] border-r-2 border-slate-300 pointer-events-none opacity-50 print-divider" />
                <div className="flex flex-col text-[11px] font-medium text-slate-600">
                  {item.deductionsLines.map((line) => (
                    <div key={line.id} className="grid grid-cols-[1fr_110px]">
                      <span className="px-8 py-3 truncate">{line.deductionName}</span>
                      <span className="px-4 py-3 text-right font-black text-rose-600">{currency(line.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Totals Summary Footer */}
            <div className="grid grid-cols-2 bg-slate-50 border-t-2 border-slate-300 text-xs font-black">
              <div className="grid grid-cols-[1fr_110px] border-r-2 border-slate-300">
                <span className="px-8 py-4 uppercase tracking-[0.2em] text-slate-500 text-[10px]">Total Gross</span>
                <span className="px-4 py-4 text-right border-l-2 border-slate-300 text-slate-900 bg-white font-black">{currency(totals.grossPay)}</span>
              </div>
              <div className="grid grid-cols-[1fr_110px]">
                <span className="px-8 py-4 uppercase tracking-[0.2em] text-slate-500 text-[10px]">Total Deductions</span>
                <span className="px-4 py-4 text-right border-l-2 border-slate-300 text-slate-900 bg-white font-black">{currency(totals.totalDeductions)}</span>
              </div>
            </div>
          </div>

          {/* Footer Branding */}
          <div className="mt-auto pt-10 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-slate-300" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Generated via System Oriented Payroll</span>
            </div>
            <span className="text-[10px] font-bold text-slate-300 uppercase">Page 1 of 1</span>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
