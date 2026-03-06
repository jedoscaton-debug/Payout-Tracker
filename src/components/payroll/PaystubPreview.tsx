
"use client";

import { PayrollItem, PayrollRun } from "@/app/lib/types";
import { computeTotals, currency, shortDate } from "@/app/lib/payroll-utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { FileDown, Printer, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PaystubPreviewProps {
  item: PayrollItem;
  run: PayrollRun;
}

export function PaystubPreview({ item, run }: PaystubPreviewProps) {
  const totals = computeTotals(item);
  const { toast } = useToast();

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    toast({
      title: "Opening Print Dialog",
      description: "Select 'Save as PDF' in your browser's print destination.",
    });
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const handleShare = async () => {
    const shareText = `Paystub for ${item.employeeNameSnapshot} - Net Pay: ${currency(totals.netPay)}`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: `Paystub - ${item.employeeNameSnapshot}`, text: shareText, url: window.location.href });
        return;
      } catch (err) {}
    }
    try {
      await navigator.clipboard.writeText(shareText);
      toast({ title: "Copied to Clipboard", description: "Paystub details copied." });
    } catch (err) {}
  };

  return (
    <div className="flex flex-col lg:flex-row h-full w-full overflow-hidden bg-white">
      <style jsx global>{`
        @media print {
          @page {
            size: portrait;
            margin: 0;
          }
          body {
            background-color: white !important;
          }
          /* Hide everything in the app */
          body * {
            visibility: hidden !important;
          }
          /* Show the paystub document and its children */
          #paystub-document, #paystub-document * {
            visibility: visible !important;
          }
          /* Force the document to the very top left of the page */
          #paystub-document {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            margin: 0 !important;
            padding: 20mm !important;
            box-sizing: border-box !important;
            background: white !important;
            box-shadow: none !important;
            border: none !important;
            display: flex !important;
            flex-direction: column !important;
            overflow: hidden !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Main Document View */}
      <div className="flex-1 h-full overflow-hidden bg-white">
        <ScrollArea className="h-full p-4 sm:p-12">
          <div 
            id="paystub-document" 
            className="mx-auto max-w-[800px] bg-white p-12 shadow-2xl my-4 flex flex-col gap-10 min-h-[1050px] border border-slate-100"
          >
            {/* Header Section */}
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 bg-[#1a1f2e] rounded-xl flex items-center justify-center text-white font-black text-2xl">S</div>
                <div className="space-y-1">
                  <h2 className="text-xl font-black tracking-tight text-[#1a1f2e] uppercase">SYSTEM ORIENTED LLC</h2>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Upper Marlboro, MD
                  </div>
                </div>
              </div>
              <div className="bg-[#1a1f2e] text-white px-8 py-10 rounded-2xl min-w-[240px] flex items-center justify-center">
                <p className="text-xl font-black uppercase tracking-[0.15em] leading-tight text-center">PAYSLIP<br/>SUMMARY</p>
              </div>
            </div>

            <div className="w-full h-px bg-slate-200" />

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-12 px-2">
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-1">Employee Name</label>
                  <p className="text-sm font-bold text-[#1a1f2e]">{item.employeeNameSnapshot}</p>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-1">Daily Rate</label>
                  <p className="text-sm font-bold text-[#1a1f2e]">{item.dailyRateSnapshot}</p>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-1">Payment Type</label>
                  <p className="text-sm font-bold text-[#1a1f2e]">Direct Deposit</p>
                </div>
              </div>
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-1">Pay Period Range</label>
                  <p className="text-sm font-bold text-[#1a1f2e]">{shortDate(run.payPeriodStart)} — {shortDate(run.payPeriodEnd)}</p>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-1">Pay Date</label>
                  <p className="text-sm font-bold text-[#1a1f2e]">{shortDate(run.payDate)}</p>
                </div>
              </div>
            </div>

            {/* Earnings Table */}
            <div className="rounded-2xl border-2 border-[#1a1f2e] overflow-hidden">
              <div className="grid grid-cols-[1fr_130px] bg-[#1a1f2e] text-white text-[10px] font-black uppercase tracking-[0.15em]">
                <div className="px-6 py-4 border-r border-white/10">Earnings Description</div>
                <div className="px-6 py-4 text-right">Amount</div>
              </div>
              <div className="flex flex-col bg-white">
                {item.earningsLines.map((line) => (
                  <div key={line.id} className="grid grid-cols-[1fr_130px] text-xs">
                    <div className="px-6 py-4 font-bold text-slate-700 border-r-2 border-[#1a1f2e] whitespace-nowrap">{line.description}</div>
                    <div className="px-6 py-4 text-right font-black text-[#1a1f2e]">{currency(line.amount)}</div>
                  </div>
                ))}
                {item.otherEarningsLines.map((line) => (
                  <div key={line.id} className="grid grid-cols-[1fr_130px] text-xs">
                    <div className="px-6 py-4 font-bold text-slate-700 italic border-r-2 border-[#1a1f2e] whitespace-nowrap">{line.description || "Other Earning"}</div>
                    <div className="px-6 py-4 text-right font-black text-[#1a1f2e]">{currency(line.amount)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Deductions Table */}
            <div className="rounded-2xl border-2 border-slate-200 overflow-hidden">
              <div className="grid grid-cols-[1fr_130px] bg-slate-50 text-[#1a1f2e] text-[10px] font-black uppercase tracking-[0.15em] border-b border-slate-200">
                <div className="px-6 py-4 border-r-2 border-slate-200">Deductions / Withholdings</div>
                <div className="px-6 py-4 text-right">Amount</div>
              </div>
              <div className="flex flex-col bg-white">
                {item.deductionsLines.map((line) => (
                  <div key={line.id} className="grid grid-cols-[1fr_130px] text-xs">
                    <div className="px-6 py-4 font-bold text-slate-500 border-r-2 border-slate-200 whitespace-nowrap">{line.deductionName || "Deduction"}</div>
                    <div className="px-6 py-4 text-right font-black text-rose-600">({currency(line.amount)})</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary Block */}
            <div className="mt-auto">
              <div className="rounded-2xl border-2 border-[#1a1f2e] overflow-hidden">
                <div className="grid grid-cols-3 divide-x-2 divide-[#1a1f2e] bg-slate-50">
                  <div className="p-6 text-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Total Gross</p>
                    <p className="text-xl font-black text-[#1a1f2e]">{currency(totals.grossPay)}</p>
                  </div>
                  <div className="p-6 text-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Total Deductions</p>
                    <p className="text-xl font-black text-rose-600">({currency(totals.totalDeductions)})</p>
                  </div>
                  <div className="p-6 text-center bg-[#1a1f2e] text-white">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-1">Net Payment</p>
                    <p className="text-2xl font-black">{currency(totals.netPay)}</p>
                  </div>
                </div>
              </div>
              <p className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.5em] text-center mt-8">System Oriented LLC — Official Payroll Statement</p>
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Sidebar Controls */}
      <div className="w-full lg:w-[350px] bg-white p-10 no-print flex flex-col gap-6 border-l border-slate-100 z-10 shadow-xl">
        <div>
          <h3 className="text-xl font-black tracking-tighter text-slate-900 uppercase">Document Controls</h3>
          <p className="text-xs text-slate-500 font-medium mt-1">Export or archive this statement.</p>
        </div>
        
        <div className="space-y-3">
          <Button className="w-full rounded-2xl h-14 bg-slate-900 font-black text-xs uppercase tracking-widest hover:scale-[1.02] transition-all" onClick={handlePrint}>
            <Printer className="mr-3 h-5 w-5" /> Print Statement
          </Button>
          <Button variant="outline" className="w-full rounded-2xl h-14 border-slate-200 font-black text-xs uppercase tracking-widest text-slate-600 hover:bg-slate-50" onClick={handleDownloadPDF}>
            <FileDown className="mr-3 h-5 w-5" /> Save PDF
          </Button>
          <Button variant="outline" className="w-full rounded-2xl h-14 border-slate-200 font-black text-xs uppercase tracking-widest text-slate-600 hover:bg-slate-50" onClick={handleShare}>
            <Share2 className="mr-3 h-5 w-5" /> Share Link
          </Button>
        </div>

        <div className="mt-auto p-6 rounded-3xl bg-slate-50 border-2 border-slate-100 flex flex-col gap-4">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-center">Cycle Metrics</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-center">
              <p className="text-lg font-black text-slate-900">{currency(totals.grossPay)}</p>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Gross</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-center">
              <p className="text-lg font-black text-emerald-600">{currency(totals.netPay)}</p>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Net Pay</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
