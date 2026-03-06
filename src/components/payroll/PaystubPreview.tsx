
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
            margin: 10mm;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          /* Ensure the dialog content is the only thing visible and positioned correctly */
          div[role="dialog"] {
            position: static !important;
            display: block !important;
            overflow: visible !important;
          }
          #paystub-document {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 15mm !important;
            box-shadow: none !important;
            border: none !important;
            visibility: visible !important;
            z-index: 9999 !important;
          }
          /* Hide all other app elements */
          body > *:not(div[role="dialog"]) {
            display: none !important;
          }
        }
      `}</style>

      {/* Control Bar (Internal to Dialog) */}
      <div className="no-print flex items-center justify-between p-6 border-b bg-slate-50 sticky top-0 z-10">
        <div>
          <h3 className="text-sm font-black uppercase tracking-tighter">Payslip Preview</h3>
          <p className="text-[10px] text-slate-500">Review employee statement before finalizing.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="rounded-xl h-9 text-[10px] font-bold uppercase" onClick={handlePrint}>
            <Printer className="mr-2 h-3.5 w-3.5" /> Print / Save PDF
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 bg-slate-100 p-8 sm:p-12 min-h-0">
        <div 
          id="paystub-document" 
          className="mx-auto bg-white p-10 shadow-xl border border-slate-200 max-w-[700px] flex flex-col gap-10 min-h-[900px]"
        >
          {/* Header */}
          <div className="flex flex-col items-center gap-1">
            <h1 className="text-xl font-black text-center tracking-tight uppercase">SYSTEM ORIENTED LLC</h1>
            <p className="text-sm font-medium text-slate-600">Upper Marlboro, MD</p>
          </div>

          {/* Info & Summary Row */}
          <div className="grid grid-cols-[1fr_260px] gap-8 items-start">
            {/* Left: Info */}
            <div className="grid grid-cols-[100px_1fr] gap-x-2 gap-y-4 text-sm pt-4">
              <span className="font-bold text-slate-400 text-[10px] uppercase tracking-widest">Employee</span>
              <span className="font-bold">{item.employeeNameSnapshot}</span>
              
              <span className="font-bold text-slate-400 text-[10px] uppercase tracking-widest">Daily Rate</span>
              <span>{item.dailyRateSnapshot || "Varies"}</span>
              
              <span className="font-bold text-slate-400 text-[10px] uppercase tracking-widest">Pay Period</span>
              <span>{shortDate(run.payPeriodStart)} - {shortDate(run.payPeriodEnd)}</span>
              
              <span className="font-bold text-slate-400 text-[10px] uppercase tracking-widest">Pay Date</span>
              <span>{run.payDate}</span>
            </div>

            {/* Right: Summary Table */}
            <div className="border-2 border-black overflow-hidden rounded-sm">
              <div className="bg-slate-200 border-b-2 border-black py-2 px-4 text-center">
                <span className="text-sm font-black uppercase tracking-widest">PAYSLIP SUMMARY</span>
              </div>
              <div className="grid grid-cols-[1fr_100px] border-b-2 border-black">
                <span className="px-4 py-2 text-xs font-bold">Total Gross</span>
                <span className="px-4 py-2 text-xs font-black text-right border-l-2 border-black">{currency(totals.grossPay)}</span>
              </div>
              <div className="grid grid-cols-[1fr_100px] border-b-2 border-black">
                <span className="px-4 py-2 text-xs font-bold">Total Deductions</span>
                <span className="px-4 py-2 text-xs font-black text-right border-l-2 border-black">{currency(totals.totalDeductions)}</span>
              </div>
              <div className="grid grid-cols-[1fr_100px] bg-black text-white">
                <span className="px-4 py-2 text-xs font-black uppercase tracking-widest">NET PAY</span>
                <span className="px-4 py-2 text-xs font-black text-right border-l-2 border-white">{currency(totals.netPay)}</span>
              </div>
            </div>
          </div>

          {/* Breakdown Header */}
          <h2 className="text-2xl font-black tracking-tighter uppercase">Payslip Breakdown</h2>

          {/* Breakdown Table */}
          <div className="border-2 border-slate-300 rounded-sm overflow-hidden flex flex-col">
            {/* Main Section Headers */}
            <div className="grid grid-cols-2 bg-slate-200 border-b-2 border-slate-300">
              <div className="px-4 py-3 text-center text-xs font-black uppercase tracking-wider border-r-2 border-slate-300">Earnings</div>
              <div className="px-4 py-3 text-center text-xs font-black uppercase tracking-wider">Deductions</div>
            </div>
            
            {/* Column Labels */}
            <div className="grid grid-cols-2 text-[10px] font-black uppercase tracking-widest bg-slate-50 border-b-2 border-slate-300">
              <div className="grid grid-cols-[1fr_100px] border-r-2 border-slate-300">
                <span className="px-4 py-2">DAYS WORKED</span>
                <span className="px-4 py-2 text-right border-l-2 border-slate-300">AMOUNT</span>
              </div>
              <div className="grid grid-cols-[1fr_100px]">
                <span className="px-4 py-2">DESCRIPTION</span>
                <span className="px-4 py-2 text-right border-l-2 border-slate-300">AMOUNT</span>
              </div>
            </div>

            {/* Content Body */}
            <div className="flex-1 min-h-[350px] flex">
              {/* Earnings Column */}
              <div className="flex-1 border-r-2 border-slate-300">
                <div className="flex flex-col h-full">
                  {item.earningsLines.map((line) => (
                    <div key={line.id} className="grid grid-cols-[1fr_100px] text-[11px]">
                      <span className="px-4 py-2 font-medium text-slate-600">{line.description}</span>
                      <span className="px-4 py-2 text-right font-black border-l-2 border-slate-300">{currency(line.amount)}</span>
                    </div>
                  ))}
                  {item.otherEarningsLines.map((line) => (
                    <div key={line.id} className="grid grid-cols-[1fr_100px] text-[11px]">
                      <span className="px-4 py-2 font-medium text-slate-600">{line.description}</span>
                      <span className="px-4 py-2 text-right font-black border-l-2 border-slate-300">{currency(line.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Deductions Column */}
              <div className="flex-1">
                <div className="flex flex-col h-full">
                  {item.deductionsLines.map((line) => (
                    <div key={line.id} className="grid grid-cols-[1fr_100px] text-[11px]">
                      <span className="px-4 py-2 font-medium text-slate-600">{line.deductionName}</span>
                      <span className="px-4 py-2 text-right font-black border-l-2 border-slate-300">{currency(line.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Totals Summary Row (Bottom) */}
            <div className="grid grid-cols-2 bg-slate-50 border-t-2 border-slate-300 text-[11px] font-black">
              <div className="grid grid-cols-[1fr_100px] border-r-2 border-slate-300">
                <span className="px-4 py-3 uppercase tracking-tighter">TOTAL GROSS</span>
                <span className="px-4 py-3 text-right border-l-2 border-slate-300">{currency(totals.grossPay)}</span>
              </div>
              <div className="grid grid-cols-[1fr_100px]">
                <span className="px-4 py-3 uppercase tracking-tighter">TOTAL DEDUCTIONS</span>
                <span className="px-4 py-3 text-right border-l-2 border-slate-300">{currency(totals.totalDeductions)}</span>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
