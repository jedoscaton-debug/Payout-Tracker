"use client";

import { PayrollItem, PayrollRun } from "@/app/lib/types";
import { computeTotals, currency, shortDate } from "@/app/lib/payroll-utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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
      title: "Generating PDF...",
      description: "Please select 'Save as PDF' in the destination dropdown of the print dialog.",
    });
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const handleShare = async () => {
    const shareData = {
      title: `Paystub - ${item.employeeNameSnapshot}`,
      text: `Paystub for ${item.employeeNameSnapshot} for period ${shortDate(run.payPeriodStart)} to ${shortDate(run.payPeriodEnd)}. Net Pay: ${currency(totals.netPay)}`,
      url: window.location.href,
    };

    const copyToClipboard = () => {
      navigator.clipboard.writeText(`${shareData.text}\nView at: ${shareData.url}`);
      toast({
        title: "Link Copied!",
        description: "Paystub details and link copied to clipboard.",
      });
    };

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // Fallback if the user cancels or if permission is denied (NotAllowedError)
        copyToClipboard();
      }
    } else {
      copyToClipboard();
    }
  };

  return (
    <div className="grid h-full gap-0 overflow-hidden lg:grid-cols-[1fr_300px]">
      <ScrollArea className="h-full bg-slate-50 p-4 sm:p-8 print:bg-white print:p-0">
        <div id="paystub-content" className="mx-auto max-w-2xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm print:shadow-none print:border-none print:max-w-none print:p-0">
          <div className="text-center">
            <h2 className="text-2xl font-black tracking-tight text-slate-900 uppercase">SYSTEM ORIENTED LLC</h2>
            <p className="text-sm font-medium text-slate-500">Upper Marlboro, MD 20772</p>
          </div>

          <Separator className="my-8" />

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Employee Name</label>
              <p className="text-lg font-semibold text-slate-900">{item.employeeNameSnapshot}</p>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Pay Period</label>
              <p className="text-base font-medium text-slate-900">{shortDate(run.payPeriodStart)} — {shortDate(run.payPeriodEnd)}</p>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Pay Date</label>
              <p className="text-base font-medium text-slate-900">{shortDate(run.payDate)}</p>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Daily Rate</label>
              <p className="text-base font-medium text-slate-900">{item.dailyRateSnapshot}</p>
            </div>
          </div>

          <div className="mt-10 space-y-8">
            <section>
              <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-accent print:text-slate-900">Earnings Breakdown</h3>
              <div className="rounded-2xl border border-slate-100 bg-slate-50/50 overflow-hidden print:border-slate-300">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-100/50 print:bg-slate-100">
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Description</th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-600">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 print:divide-slate-300">
                    {item.earningsLines.map((line) => (
                      <tr key={line.id}>
                        <td className="px-4 py-3 text-slate-700">{line.description}</td>
                        <td className="px-4 py-3 text-right font-medium text-slate-900">{currency(line.amount)}</td>
                      </tr>
                    ))}
                    {item.otherEarningsLines.map((line) => (
                      <tr key={line.id}>
                        <td className="px-4 py-3 text-slate-700 italic">{line.description || "Other Earning"}</td>
                        <td className="px-4 py-3 text-right font-medium text-slate-900">{currency(line.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-accent/5 font-bold print:bg-slate-50">
                      <td className="px-4 py-4 text-accent uppercase tracking-wide print:text-slate-900">Total Gross Earnings</td>
                      <td className="px-4 py-4 text-right text-accent print:text-slate-900">{currency(totals.grossPay)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>

            <section>
              <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-rose-600 print:text-slate-900">Deductions</h3>
              <div className="rounded-2xl border border-slate-100 bg-slate-50/50 overflow-hidden print:border-slate-300">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-100/50 print:bg-slate-100">
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Description</th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-600">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 print:divide-slate-300">
                    {item.deductionsLines.map((line) => (
                      <tr key={line.id}>
                        <td className="px-4 py-3 text-slate-700">{line.deductionName || "Deduction"}</td>
                        <td className="px-4 py-3 text-right font-medium text-rose-600 print:text-slate-900">({currency(line.amount)})</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-rose-50 font-bold print:bg-slate-50">
                      <td className="px-4 py-4 text-rose-700 uppercase tracking-wide print:text-slate-900">Total Deductions</td>
                      <td className="px-4 py-4 text-right text-rose-700 print:text-slate-900">{currency(totals.totalDeductions)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>
          </div>

          <div className="mt-12 flex items-center justify-between rounded-3xl bg-slate-900 p-8 text-white shadow-xl shadow-slate-200 print:bg-white print:text-slate-900 print:border print:border-slate-300 print:shadow-none">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 print:text-slate-500">Net Payment Amount</p>
              <p className="text-4xl font-black tracking-tighter">{currency(totals.netPay)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-slate-400 print:text-slate-500">Direct Deposit</p>
              <p className="text-xs text-slate-500 uppercase tracking-wider mt-1 print:text-slate-400">Confirmed</p>
            </div>
          </div>

          {item.notes && (
            <div className="mt-8 p-6 rounded-2xl border border-slate-100 bg-slate-50/30 italic text-slate-600 text-sm print:border-slate-300 print:bg-white">
              <span className="font-bold uppercase tracking-tighter text-[10px] block mb-1 not-italic text-slate-400 print:text-slate-500">Special Instructions</span>
              {item.notes}
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="hidden flex-col gap-4 border-l border-slate-200 bg-white p-6 lg:flex print:hidden">
        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Quick Actions</h3>
        <Button className="w-full rounded-2xl h-12 bg-primary font-semibold hover:shadow-lg transition-all" onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" /> Print Paystub
        </Button>
        <Button variant="outline" className="w-full rounded-2xl h-12 border-slate-200 text-slate-600 hover:bg-slate-50" onClick={handleDownloadPDF}>
          <FileDown className="mr-2 h-4 w-4" /> Download PDF
        </Button>
        <Button variant="outline" className="w-full rounded-2xl h-12 border-slate-200 text-slate-600 hover:bg-slate-50" onClick={handleShare}>
          <Share2 className="mr-2 h-4 w-4" /> Share with Employee
        </Button>
        
        <div className="mt-auto rounded-2xl bg-slate-50 p-4">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Export Data (JSON)</h4>
          <pre className="text-[10px] bg-slate-900 text-slate-300 p-3 rounded-lg overflow-auto max-h-[200px] font-code">
            {JSON.stringify({ item, totals }, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
