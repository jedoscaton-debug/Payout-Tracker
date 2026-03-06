
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
      description: "Select 'Save as PDF' in your browser's print destination to download this paystub.",
    });
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const handleShare = async () => {
    const shareText = `Paystub for ${item.employeeNameSnapshot} for period ${shortDate(run.payPeriodStart)} to ${shortDate(run.payPeriodEnd)}. Net Pay: ${currency(totals.netPay)}`;
    
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Paystub - ${item.employeeNameSnapshot}`,
          text: shareText,
          url: window.location.href,
        });
        return;
      } catch (err) {}
    }

    try {
      await navigator.clipboard.writeText(`${shareText}\nLink: ${window.location.href}`);
      toast({
        title: "Copied to Clipboard",
        description: "Paystub details and link copied.",
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Copy Failed",
        description: "Please select and copy the text manually.",
      });
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-full w-full overflow-hidden bg-white">
      {/* Main Document View */}
      <div className="flex-1 h-full overflow-hidden bg-white">
        <ScrollArea className="h-full p-4 sm:p-12 print:p-0 print:bg-white">
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
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                margin: 0;
                padding: 20mm !important;
                box-shadow: none !important;
                border: none !important;
                background: white !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .no-print {
                display: none !important;
              }
            }
          `}</style>

          <div 
            id="paystub-document" 
            className="mx-auto max-w-[800px] bg-white p-12 shadow-2xl print:shadow-none print:border-none my-4 flex flex-col gap-12 min-h-[1050px]"
          >
            {/* Header Section */}
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 bg-black rounded-xl flex items-center justify-center text-white font-black text-2xl shadow-lg">S</div>
                <div className="space-y-1">
                  <h2 className="text-2xl font-black tracking-tight text-slate-900 uppercase">SYSTEM ORIENTED LLC</h2>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                    Upper Marlboro, MD
                  </div>
                </div>
              </div>
              <div className="bg-[#1a1f2e] text-white p-10 rounded-2xl min-w-[280px] flex items-center justify-center shadow-xl">
                <p className="text-2xl font-black uppercase tracking-[0.15em] leading-tight text-center">PAYSLIP<br/>SUMMARY</p>
              </div>
            </div>

            <div className="w-full h-px bg-slate-200" />

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-12 px-2">
              <div className="grid grid-cols-1 gap-y-6">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-1">Employee Name</label>
                  <p className="text-sm font-bold text-slate-900">{item.employeeNameSnapshot}</p>
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-1">Daily Rate</label>
                  <p className="text-sm font-bold text-slate-900">{item.dailyRateSnapshot}</p>
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-1">Payment Type</label>
                  <p className="text-sm font-bold text-slate-900">Direct Deposit</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-y-6">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-1">Pay Period Range</label>
                  <p className="text-sm font-bold text-slate-900">{shortDate(run.payPeriodStart)} — {shortDate(run.payPeriodEnd)}</p>
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-1">Pay Date</label>
                  <p className="text-sm font-bold text-slate-900">{shortDate(run.payDate)}</p>
                </div>
              </div>
            </div>

            {/* Earnings and Deductions Ledger */}
            <div className="flex flex-col gap-10">
              {/* Earnings Table */}
              <div className="rounded-2xl border-2 border-[#1a1f2e] overflow-hidden">
                <div className="grid grid-cols-[1fr_130px] bg-[#1a1f2e] text-white text-[10px] font-black uppercase tracking-[0.15em]">
                  <div className="px-6 py-4 border-r border-white/10">Earnings Description</div>
                  <div className="px-6 py-4 text-right">Amount</div>
                </div>
                <div className="flex flex-col bg-white">
                  {item.earningsLines.map((line) => (
                    <div key={line.id} className="grid grid-cols-[1fr_130px] text-xs">
                      <div className="px-6 py-3.5 font-bold text-slate-700 border-r-2 border-[#1a1f2e] whitespace-nowrap">{line.description}</div>
                      <div className="px-6 py-3.5 text-right font-black text-slate-900">{currency(line.amount)}</div>
                    </div>
                  ))}
                  {item.otherEarningsLines.map((line) => (
                    <div key={line.id} className="grid grid-cols-[1fr_130px] text-xs">
                      <div className="px-6 py-3.5 font-bold text-slate-700 italic border-r-2 border-[#1a1f2e] whitespace-nowrap">{line.description || "Other Earning"}</div>
                      <div className="px-6 py-3.5 text-right font-black text-slate-900">{currency(line.amount)}</div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-[1fr_130px] bg-slate-50 border-t-2 border-[#1a1f2e] font-black text-xs">
                  <div className="px-6 py-4 uppercase tracking-[0.15em] text-[9px] text-slate-500 border-r-2 border-[#1a1f2e]">Total Gross Earnings</div>
                  <div className="px-6 py-4 text-right text-[#1a1f2e]">{currency(totals.grossPay)}</div>
                </div>
              </div>

              {/* Deductions Table */}
              <div className="rounded-2xl border-2 border-slate-200 overflow-hidden">
                <div className="grid grid-cols-[1fr_130px] bg-slate-100 text-[#1a1f2e] text-[10px] font-black uppercase tracking-[0.15em] border-b border-slate-200">
                  <div className="px-6 py-3.5 border-r-2 border-slate-200">Deductions / Withholdings</div>
                  <div className="px-6 py-3.5 text-right">Amount</div>
                </div>
                <div className="flex flex-col bg-white">
                  {item.deductionsLines.map((line) => (
                    <div key={line.id} className="grid grid-cols-[1fr_130px] text-xs">
                      <div className="px-6 py-3 font-bold text-slate-500 border-r-2 border-slate-200 whitespace-nowrap">{line.deductionName || "Deduction"}</div>
                      <div className="px-6 py-3 text-right font-black text-rose-600">({currency(line.amount)})</div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-[1fr_130px] bg-slate-50 border-t border-slate-200 font-black text-xs">
                  <div className="px-6 py-4 uppercase tracking-[0.15em] text-[9px] text-slate-400 border-r-2 border-slate-200">Total Deductions</div>
                  <div className="px-6 py-4 text-right text-rose-600">({currency(totals.totalDeductions)})</div>
                </div>
              </div>
            </div>

            {/* Final Net Pay Highlight */}
            <div className="mt-auto pt-10 border-t-2 border-slate-100">
              <div className="flex flex-col items-center gap-2">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">NET PAYMENT DISBURSED</p>
                <p className="text-5xl font-black tracking-tighter text-[#1a1f2e]">{currency(totals.netPay)}</p>
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Sidebar Controls */}
      <div className="w-full lg:w-[350px] bg-white p-10 no-print flex flex-col gap-6 shadow-2xl z-10 border-l border-slate-100">
        <div>
          <h3 className="text-xl font-black tracking-tighter text-slate-900 uppercase">Document Controls</h3>
          <p className="text-xs text-slate-500 font-medium mt-1">Export, share, or archive this statement.</p>
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
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
              <p className="text-lg font-black text-slate-900">{currency(totals.grossPay)}</p>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Gross</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
              <p className="text-lg font-black text-emerald-600">{currency(totals.netPay)}</p>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Net Pay</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
