"use client";

import { PayrollItem, PayrollRun } from "@/app/lib/types";
import { computeTotals, currency, shortDate } from "@/app/lib/payroll-utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { FileDown, Printer, Share2, X } from "lucide-react";
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
      } catch (err) {
        // Fall through to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(`${shareText}\nLink: ${window.location.href}`);
      toast({
        title: "Copied to Clipboard",
        description: "Paystub details and link copied. You can now paste them into a message.",
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
      {/* Main Content Area */}
      <div className="flex-1 h-full overflow-hidden bg-slate-50/50 border-r border-slate-100">
        <ScrollArea className="h-full p-4 sm:p-12 print:p-0 print:bg-white overflow-y-auto">
          {/* Print specific styles to ensure single page and proper visibility */}
          <style jsx global>{`
            @media print {
              @page {
                size: portrait;
                margin: 10mm;
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
                margin: 0;
                padding: 0;
                box-shadow: none !important;
                border: none !important;
              }
              .no-print {
                display: none !important;
              }
            }
          `}</style>

          <div 
            id="paystub-document" 
            className="mx-auto max-w-[800px] rounded-[1.5rem] border border-slate-200 bg-white p-10 shadow-2xl shadow-slate-200/50 print:shadow-none print:border-none print:p-0"
          >
            <div className="text-center space-y-1">
              <h2 className="text-xl font-black tracking-[0.1em] text-slate-900 uppercase">SYSTEM ORIENTED LLC</h2>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Upper Marlboro, MD 20772</p>
            </div>

            <div className="grid grid-cols-2 gap-y-8 gap-x-12 mt-12 mb-10">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 block">Employee Name</label>
                <p className="text-lg font-bold text-slate-900 leading-tight">{item.employeeNameSnapshot}</p>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 block">Pay Period</label>
                <p className="text-base font-bold text-slate-900 leading-tight">{shortDate(run.payPeriodStart)} — {shortDate(run.payPeriodEnd)}</p>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 block">Pay Date</label>
                <p className="text-base font-bold text-slate-900 leading-tight">{shortDate(run.payDate)}</p>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 block">Daily Rate</label>
                <p className="text-base font-bold text-slate-900 leading-tight">{item.dailyRateSnapshot}</p>
              </div>
            </div>

            <div className="space-y-10">
              <section>
                <h3 className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-900">Earnings Breakdown</h3>
                <div className="rounded-xl border border-slate-100 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-5 py-3 text-left font-bold text-slate-400 uppercase tracking-wider">Description</th>
                        <th className="px-5 py-3 text-right font-bold text-slate-400 uppercase tracking-wider">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {item.earningsLines.map((line) => (
                        <tr key={line.id}>
                          <td className="px-5 py-3 text-slate-600 font-medium">{line.description}</td>
                          <td className="px-5 py-3 text-right font-bold text-slate-900">{currency(line.amount)}</td>
                        </tr>
                      ))}
                      {item.otherEarningsLines.map((line) => (
                        <tr key={line.id}>
                          <td className="px-5 py-3 text-slate-600 font-medium italic">{line.description || "Other Earning"}</td>
                          <td className="px-5 py-3 text-right font-bold text-slate-900">{currency(line.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50/80 font-black border-t-2 border-slate-100">
                        <td className="px-5 py-4 text-slate-900 uppercase tracking-widest text-[10px]">Total Gross Earnings</td>
                        <td className="px-5 py-4 text-right text-slate-900">{currency(totals.grossPay)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </section>

              <section>
                <h3 className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-900">Deductions</h3>
                <div className="rounded-xl border border-slate-100 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-5 py-3 text-left font-bold text-slate-400 uppercase tracking-wider">Description</th>
                        <th className="px-5 py-3 text-right font-bold text-slate-400 uppercase tracking-wider">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {item.deductionsLines.map((line) => (
                        <tr key={line.id}>
                          <td className="px-5 py-3 text-slate-600 font-medium">{line.deductionName || "Deduction"}</td>
                          <td className="px-5 py-3 text-right font-bold text-slate-900">({currency(line.amount)})</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50/80 font-black border-t-2 border-slate-100">
                        <td className="px-5 py-4 text-slate-900 uppercase tracking-widest text-[10px]">Total Deductions</td>
                        <td className="px-5 py-4 text-right text-slate-900">{currency(totals.totalDeductions)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </section>
            </div>

            <div className="mt-12 flex items-center justify-between rounded-[1.25rem] border border-slate-200 bg-slate-50/50 p-8">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400 mb-1">Net Payment Amount</p>
                <p className="text-4xl font-black tracking-tighter text-slate-900">{currency(totals.netPay)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-slate-900">Direct Deposit</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] mt-0.5">Confirmed</p>
              </div>
            </div>

            {item.notes && (
              <div className="mt-8 p-6 rounded-xl border border-slate-100 bg-slate-50/30 text-slate-500 text-[11px] leading-relaxed italic">
                <span className="font-black uppercase tracking-[0.15em] text-[9px] block mb-2 not-italic text-slate-400">Special Instructions</span>
                {item.notes}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Sidebar Actions */}
      <div className="w-full lg:w-[320px] bg-white p-8 no-print flex flex-col gap-6 shadow-xl lg:shadow-none z-10">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Document Actions</h3>
        </div>
        
        <div className="space-y-3">
          <Button 
            className="w-full rounded-xl h-12 bg-primary font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 hover:translate-y-[-1px] transition-all" 
            onClick={handlePrint}
          >
            <Printer className="mr-2 h-4 w-4" /> Print Document
          </Button>
          <Button 
            variant="outline" 
            className="w-full rounded-xl h-12 border-slate-200 font-black text-[10px] uppercase tracking-widest text-slate-600 hover:bg-slate-50" 
            onClick={handleDownloadPDF}
          >
            <FileDown className="mr-2 h-4 w-4" /> Save as PDF
          </Button>
          <Button 
            variant="outline" 
            className="w-full rounded-xl h-12 border-slate-200 font-black text-[10px] uppercase tracking-widest text-slate-600 hover:bg-slate-50" 
            onClick={handleShare}
          >
            <Share2 className="mr-2 h-4 w-4" /> Share with Staff
          </Button>
        </div>

        <div className="mt-auto p-5 rounded-[1.25rem] bg-slate-50 border border-slate-100">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 text-center">Export Metadata</p>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-[10px] font-black text-slate-900">{currency(totals.grossPay)}</p>
              <p className="text-[8px] font-bold text-slate-400 uppercase">Gross</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-900">{currency(totals.netPay)}</p>
              <p className="text-[8px] font-bold text-slate-400 uppercase">Net</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
