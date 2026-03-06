
"use client";

import { useState } from "react";
import { PayrollItem, PayrollRun } from "@/app/lib/types";
import { computeTotals, currency, shortDate } from "@/app/lib/payroll-utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Printer, Download, Loader2 } from "lucide-react";

interface PaystubPreviewProps {
  item: PayrollItem;
  run: PayrollRun;
}

export function PaystubPreview({ item, run }: PaystubPreviewProps) {
  const totals = computeTotals(item);
  const [isDownloading, setIsDownloading] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const downloadPaystub = async () => {
    const element = document.getElementById("paystub-document");
    if (!element) return;
    
    setIsDownloading(true);
    
    try {
      // @ts-ignore
      const html2pdf = (await import('html2pdf.js')).default;
      
      const opt = {
        margin: 10,
        filename: `payslip_${item.employeeNameSnapshot.replace(/\s+/g, '_')}_${run.payDate}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true, 
          logging: false,
          letterRendering: true,
          scrollY: 0,
          scrollX: 0
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: 'avoid-all' }
      };

      await html2pdf().from(element).set(opt).save();
    } catch (error) {
      console.error("PDF generation failed:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex flex-col w-full h-full bg-white text-black font-sans">
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          html, body {
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            background: white !important;
          }
          header, main, nav, aside, footer, .no-print, [role="dialog"] > *:not(#paystub-print-container) {
            display: none !important;
          }
          #paystub-print-container {
            display: block !important;
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
            z-index: 9999999 !important;
          }
          #paystub-document {
            margin: 0 auto !important;
            padding: 10mm !important;
            width: 210mm !important;
            height: auto !important;
            max-width: none !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            position: relative !important;
            overflow: visible !important;
          }
        }
      `}</style>

      {/* Toolbar */}
      <div className="no-print flex items-center justify-between p-6 border-b bg-slate-50/50 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-lg">
            <span className="text-xl font-black">S</span>
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-tighter">Payslip Statement</h3>
            <p className="text-[10px] text-slate-500 font-medium tracking-wider uppercase">Official Business Record</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline"
            size="sm" 
            className="rounded-xl h-10 text-[10px] font-bold uppercase border-slate-200 px-6" 
            onClick={handlePrint}
          >
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
          <Button 
            size="sm" 
            className="rounded-xl h-10 text-[10px] font-bold uppercase bg-slate-900 hover:bg-black text-white px-6" 
            onClick={downloadPaystub}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Download PDF
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 bg-slate-100/50 p-6 sm:p-8 min-h-0" id="paystub-print-container">
        <div 
          id="paystub-document" 
          className="mx-auto bg-white p-8 sm:p-10 shadow-2xl border border-slate-200 w-full max-w-[800px] flex flex-col gap-3 rounded-sm transition-all relative overflow-hidden"
        >
          {/* Header Branding */}
          <div className="flex flex-col items-center gap-2 mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-xl">
               <span className="text-2xl font-black">S</span>
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-black tracking-tight uppercase text-slate-900 leading-none">SYSTEM ORIENTED LLC</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Upper Marlboro, MD</p>
            </div>
          </div>

          {/* Info Section */}
          <div className="grid grid-cols-[1.3fr_1fr] gap-6 items-start">
            <div className="grid grid-cols-[110px_1fr] gap-x-4 gap-y-3 text-sm">
              <span className="font-bold text-slate-400 text-[9px] uppercase tracking-widest">Employee</span>
              <span className="font-black text-slate-900 uppercase tracking-tight">{item.employeeNameSnapshot}</span>
              
              <span className="font-bold text-slate-400 text-[9px] uppercase tracking-widest">Contract Basis</span>
              <span className="font-bold text-slate-700">{item.dailyRateSnapshot || "Varies"}</span>
              
              <span className="font-bold text-slate-400 text-[9px] uppercase tracking-widest">Pay Period</span>
              <span className="font-bold text-slate-700">{shortDate(run.payPeriodStart)} — {shortDate(run.payPeriodEnd)}</span>
              
              <span className="font-bold text-slate-400 text-[9px] uppercase tracking-widest">Pay Date</span>
              <span className="font-black text-slate-900">{run.payDate}</span>
            </div>

            <div className="border-2 border-slate-900 rounded-xl overflow-hidden shadow-sm bg-white">
              <div className="bg-slate-50 border-b-2 border-slate-900 py-1.5 px-4 text-center">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-900">Payslip Summary</span>
              </div>
              <div className="grid grid-cols-[1fr_90px] border-b-2 border-slate-900">
                <span className="px-4 py-1.5 text-[9px] font-bold text-slate-500 uppercase">Total Gross</span>
                <span className="px-4 py-1.5 text-xs font-black text-right border-l-2 border-slate-900">{currency(totals.grossPay)}</span>
              </div>
              <div className="grid grid-cols-[1fr_90px] border-b-2 border-slate-900">
                <span className="px-4 py-1.5 text-[9px] font-bold text-slate-500 uppercase">Total Deductions</span>
                <span className="px-4 py-1.5 text-xs font-black text-right border-l-2 border-slate-900">{currency(totals.totalDeductions)}</span>
              </div>
              <div className="grid grid-cols-[1fr_90px] bg-slate-900 text-white">
                <span className="px-4 py-2 text-[9px] font-black uppercase tracking-[0.3em]">Net Pay</span>
                <span className="px-4 py-2 text-xs font-black text-right border-l-2 border-white/20">{currency(totals.netPay)}</span>
              </div>
            </div>
          </div>

          {/* Breakdown Ledger */}
          <div className="flex flex-col mt-2">
            <h2 className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-400 mb-2">Payslip Breakdown</h2>
            
            <div className="border-2 border-slate-900 rounded-xl overflow-hidden flex flex-col bg-white shadow-sm min-h-[250px]">
              <div className="grid grid-cols-2 bg-slate-50 border-b-2 border-slate-900">
                <div className="px-4 py-2 text-center text-[10px] font-black uppercase tracking-widest border-r-2 border-slate-900 text-slate-900">Earnings</div>
                <div className="px-4 py-2 text-center text-[10px] font-black uppercase tracking-widest text-slate-900">Deductions</div>
              </div>
              
              <div className="grid grid-cols-2 text-[8px] font-black uppercase tracking-[0.25em] bg-white border-b-2 border-slate-900 text-slate-400">
                <div className="grid grid-cols-[1fr_90px] border-r-2 border-slate-900">
                  <span className="px-6 py-2">Description</span>
                  <span className="px-2 py-2 text-center border-l-2 border-slate-900">Amount</span>
                </div>
                <div className="grid grid-cols-[1fr_90px]">
                  <span className="px-6 py-2">Description</span>
                  <span className="px-2 py-2 text-center border-l-2 border-slate-900">Amount</span>
                </div>
              </div>

              <div className="flex-1 flex relative">
                {/* Vertical Divider Lines (Absolute for continuous look) */}
                <div className="absolute top-0 bottom-0 left-[50%] w-0.5 bg-slate-900 z-10" />
                <div className="absolute top-0 bottom-0 left-[calc(50%-90px)] w-0.5 bg-slate-900 z-10" />
                <div className="absolute top-0 bottom-0 right-[90px] w-0.5 bg-slate-900 z-10" />

                <div className="flex-1 relative">
                  <div className="flex flex-col text-[10px] font-bold text-slate-700 py-1">
                    {item.earningsLines.map((line) => (
                      <div key={line.id} className="grid grid-cols-[1fr_90px]">
                        <span className="px-6 py-1.5 truncate">{line.description}</span>
                        <span className="px-4 py-1.5 text-right font-black text-slate-900">{currency(line.amount)}</span>
                      </div>
                    ))}
                    {item.otherEarningsLines.map((line) => (
                      <div key={line.id} className="grid grid-cols-[1fr_90px]">
                        <span className="px-6 py-1.5 truncate">{line.description}</span>
                        <span className="px-4 py-1.5 text-right font-black text-slate-900">{currency(line.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex-1 relative">
                  <div className="flex flex-col text-[10px] font-bold text-slate-700 py-1">
                    {item.deductionsLines.map((line) => (
                      <div key={line.id} className="grid grid-cols-[1fr_90px]">
                        <span className="px-6 py-1.5 truncate">{line.deductionName}</span>
                        <span className="px-4 py-1.5 text-right font-black text-rose-600">{currency(line.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 bg-slate-50 border-t-2 border-slate-900">
                <div className="grid grid-cols-[1fr_90px] border-r-2 border-slate-900">
                  <span className="px-6 py-2 uppercase tracking-[0.2em] text-slate-500 font-black text-[9px]">Total Gross</span>
                  <span className="px-4 py-2 text-right border-l-2 border-slate-900 bg-white font-black text-slate-900 text-xs">{currency(totals.grossPay)}</span>
                </div>
                <div className="grid grid-cols-[1fr_90px]">
                  <span className="px-6 py-2 uppercase tracking-[0.2em] text-slate-500 font-black text-[9px]">Total Deductions</span>
                  <span className="px-4 py-2 text-right border-l-2 border-slate-900 bg-white font-black text-slate-900 text-xs">{currency(totals.totalDeductions)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Statement Summary */}
          <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-slate-100">
             <div className="grid grid-cols-3 border-2 border-slate-900 rounded-xl overflow-hidden text-center bg-white shadow-sm">
                <div className="flex flex-col border-r-2 border-slate-900">
                  <div className="bg-slate-50 border-b-2 border-slate-900 py-1.5 text-[9px] font-black uppercase tracking-widest text-slate-900">Gross Amount</div>
                  <div className="py-2.5 text-sm font-black text-slate-900">{currency(totals.grossPay)}</div>
                </div>
                <div className="flex flex-col border-r-2 border-slate-900">
                  <div className="bg-slate-50 border-b-2 border-slate-900 py-1.5 text-[9px] font-black uppercase tracking-widest text-slate-900">Total Deductions</div>
                  <div className="py-2.5 text-sm font-black text-rose-600">{currency(totals.totalDeductions)}</div>
                </div>
                <div className="flex flex-col bg-slate-900 text-white">
                  <div className="border-b-2 border-white/20 py-1.5 text-[9px] font-black uppercase tracking-[0.3em]">Net Amount</div>
                  <div className="py-2.5 text-sm font-black">{currency(totals.netPay)}</div>
                </div>
             </div>

            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded bg-slate-900" />
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">SYSTEM ORIENTED OFFICIAL STATEMENT</span>
              </div>
              <span className="text-[9px] font-bold text-slate-300 uppercase">Page 1 of 1</span>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
