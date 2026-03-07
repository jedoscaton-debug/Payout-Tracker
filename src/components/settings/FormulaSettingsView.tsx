
"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Settings2, 
  RefreshCw, 
  RotateCcw, 
  Calculator, 
  ShieldCheck, 
  History, 
  Save,
  Info,
  Terminal,
  Play
} from "lucide-react";
import { FormulaSettings, FormulaAuditLog } from "@/app/lib/types";
import { DEFAULT_FORMULA_SETTINGS, evaluateFormula } from "@/app/lib/formula-evaluator";
import { useFirestore, setDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase";
import { doc, collection } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface FormulaSettingsViewProps {
  settings: FormulaSettings | null;
  auditLogs: FormulaAuditLog[];
}

export function FormulaSettingsView({ settings, auditLogs }: FormulaSettingsViewProps) {
  const [formData, setFormData] = useState<Partial<FormulaSettings>>(settings || DEFAULT_FORMULA_SETTINGS);
  const [testInputs, setTestInputs] = useState({
    miles: 68,
    stops: 27,
    actualPayAudit: 729,
    fleetRevenue: 3645,
    fleetNetProfit: 380,
    estimatedWeeklyInsurance: 600,
    reserveRate: 0.15,
    isEV: false
  });
  
  const db = useFirestore();
  const { toast } = useToast();

  const testOutputs = useMemo(() => {
    const scope = { stops: testInputs.stops, miles: testInputs.miles };
    
    // Choose formula based on EV toggle
    const estPay = testInputs.isEV
      ? evaluateFormula(formData.estimatedPayFormula || "", scope)
      : evaluateFormula(formData.gasEstimatedPayFormula || "", scope);
      
    const estFuel = evaluateFormula(formData.estimatedFuelFormula || "", scope);
    
    const driverPay = testInputs.isEV
      ? evaluateFormula(formData.evDriverPayFormula || "", { estimatedPay: estPay, ...scope })
      : evaluateFormula(formData.driverPayFormula || "", { estimatedPay: estPay, ...scope });
      
    const helperPay = testInputs.isEV
      ? evaluateFormula(formData.evHelperPayFormula || "", { estimatedPay: estPay, ...scope })
      : evaluateFormula(formData.helperPayFormula || "", { estimatedPay: estPay, ...scope });
      
    const delta = evaluateFormula(formData.deltaFormula || "", { actualPayAudit: testInputs.actualPayAudit, estimatedPay: estPay });
    const trueNet = evaluateFormula(formData.trueNetProfitFormula || "", { 
      fleetNetProfit: testInputs.fleetNetProfit, 
      estimatedWeeklyInsurance: testInputs.estimatedWeeklyInsurance,
      fleetRevenue: testInputs.fleetRevenue,
      reserveRate: testInputs.reserveRate
    });

    return { estPay, estFuel, driverPay, helperPay, delta, trueNet };
  }, [formData, testInputs]);

  const handleSave = () => {
    const id = "global-payroll-settings";
    const ref = doc(db, "payrollFormulaSettings", id);
    const now = new Date().toISOString();
    
    // Create Audit Log Entries
    if (settings) {
      Object.entries(formData).forEach(([key, value]) => {
        if (settings[key as keyof FormulaSettings] !== value && key !== 'updatedAt') {
          addDocumentNonBlocking(collection(db, "payrollFormulaAuditLog"), {
            settingName: key,
            oldValue: String(settings[key as keyof FormulaSettings] || "N/A"),
            newValue: String(value),
            changedAt: now,
            changedBy: "Master Admin"
          });
        }
      });
    }

    setDocumentNonBlocking(ref, { ...formData, id, updatedAt: now }, { merge: true });
    toast({ title: "Settings Saved", description: "All payroll formulas have been updated system-wide." });
  };

  const resetToDefaults = () => {
    setFormData(DEFAULT_FORMULA_SETTINGS);
    toast({ title: "Reset to Defaults", description: "Values restored to factory defaults." });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Payroll Formula Settings</h3>
          <p className="text-sm text-slate-500 font-medium">Control the core logic driving route estimates and payroll payouts.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="rounded-xl h-11 bg-white font-bold" onClick={resetToDefaults}>
            <RotateCcw className="mr-2 h-4 w-4" /> Reset Defaults
          </Button>
          <Button className="rounded-xl h-11 bg-primary px-8 font-bold shadow-lg" onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" /> Save Formulas
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <SummaryCard label="Active Formulas" value="15" icon={Terminal} color="text-blue-500" />
        <SummaryCard label="Route Formulas" value="5" icon={Calculator} color="text-indigo-500" />
        <SummaryCard label="Profitability Rules" value="6" icon={Settings2} color="text-emerald-500" />
        <SummaryCard label="Deduction Rules" value="2" icon={ShieldCheck} color="text-rose-500" />
        <SummaryCard label="Last Updated" value={settings?.updatedAt ? new Date(settings.updatedAt).toLocaleDateString() : "Just Now"} icon={History} color="text-amber-500" />
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          <Tabs defaultValue="routes" className="w-full">
            <TabsList className="bg-white border p-1 rounded-2xl h-14 mb-6">
              <TabsTrigger value="routes" className="rounded-xl h-full font-bold uppercase text-[10px]">Route Revenue & Cost</TabsTrigger>
              <TabsTrigger value="payroll" className="rounded-xl h-full font-bold uppercase text-[10px]">Payroll Payouts</TabsTrigger>
              <TabsTrigger value="fleet" className="rounded-xl h-full font-bold uppercase text-[10px]">Fleet Profitability</TabsTrigger>
              <TabsTrigger value="deductions" className="rounded-xl h-full font-bold uppercase text-[10px]">Deduction Defaults</TabsTrigger>
            </TabsList>

            <TabsContent value="routes">
              <Card className="rounded-[2rem] border-0 shadow-sm overflow-hidden bg-white">
                <CardHeader className="bg-slate-50/50 border-b p-8">
                  <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Calculation Logic</CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                  <FormulaField 
                    label="EST. PAY Formula (EV Routes)" 
                    value={formData.estimatedPayFormula || ""} 
                    onChange={v => setFormData({...formData, estimatedPayFormula: v})}
                    hint="Variables: stops, miles"
                  />
                  <FormulaField 
                    label="GAS PAY Formula (Non-EV Routes)" 
                    value={formData.gasEstimatedPayFormula || ""} 
                    onChange={v => setFormData({...formData, gasEstimatedPayFormula: v})}
                    hint="Variables: stops, miles"
                  />
                  <FormulaField 
                    label="EST. FUEL Formula" 
                    value={formData.estimatedFuelFormula || ""} 
                    onChange={v => setFormData({...formData, estimatedFuelFormula: v})}
                    hint="Variables: miles"
                  />
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400">Primary Revenue Source</Label>
                    <Select value={formData.revenueSource} onValueChange={(v: any) => setFormData({...formData, revenueSource: v})}>
                      <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="estimatedPay">Auto-Estimated Pay</SelectItem>
                        <SelectItem value="actualPayAudit">Actual Pay (Audit Field)</SelectItem>
                        <SelectItem value="manualOverride">Manual Admin Override</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payroll">
              <div className="space-y-8">
                <Card className="rounded-[2rem] border-0 shadow-sm overflow-hidden bg-white">
                  <CardHeader className="bg-slate-50/50 border-b p-8">
                    <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Standard Staff Payouts</CardTitle>
                  </CardHeader>
                  <CardContent className="p-8 space-y-8">
                    <FormulaField 
                      label="Driver Pay Formula" 
                      value={formData.driverPayFormula || ""} 
                      onChange={v => setFormData({...formData, driverPayFormula: v})}
                      hint="Variables: estimatedPay, stops, miles"
                    />
                    <FormulaField 
                      label="Helper Pay Formula" 
                      value={formData.helperPayFormula || ""} 
                      onChange={v => setFormData({...formData, helperPayFormula: v})}
                      hint="Variables: estimatedPay, stops, miles"
                    />
                  </CardContent>
                </Card>

                <Card className="rounded-[2rem] border-0 shadow-sm overflow-hidden bg-white">
                  <CardHeader className="bg-slate-50/50 border-b p-8">
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                      <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">EV Special Exceptions (Route=EV & Vehicle=EV)</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-8 space-y-8">
                    <FormulaField 
                      label="EV Driver Pay Formula" 
                      value={formData.evDriverPayFormula || ""} 
                      onChange={v => setFormData({...formData, evDriverPayFormula: v})}
                      hint="Variables: estimatedPay, stops, miles"
                    />
                    <FormulaField 
                      label="EV Helper Pay Formula" 
                      value={formData.evHelperPayFormula || ""} 
                      onChange={v => setFormData({...formData, evHelperPayFormula: v})}
                      hint="Variables: estimatedPay, stops, miles"
                    />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="fleet">
              <Card className="rounded-[2rem] border-0 shadow-sm overflow-hidden bg-white">
                <CardHeader className="bg-slate-50/50 border-b p-8">
                  <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Profitability Thresholds</CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-400">RED Status Threshold ($)</Label>
                      <Input type="number" className="h-12 rounded-xl bg-slate-50 border-none font-bold" value={formData.redThreshold} onChange={e => setFormData({...formData, redThreshold: Number(e.target.value)})} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-400">YELLOW Status Threshold ($)</Label>
                      <Input type="number" className="h-12 rounded-xl bg-slate-50 border-none font-bold" value={formData.yellowThreshold} onChange={e => setFormData({...formData, yellowThreshold: Number(e.target.value)})} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-400">RXO Risk Reserve (%)</Label>
                      <Input type="number" step="0.01" className="h-12 rounded-xl bg-slate-50 border-none font-bold" value={formData.reserveRate} onChange={e => setFormData({...formData, reserveRate: Number(e.target.value)})} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-400">Weekly Insurance Default ($)</Label>
                      <Input type="number" className="h-12 rounded-xl bg-slate-50 border-none font-bold" value={formData.estimatedWeeklyInsurance} onChange={e => setFormData({...formData, estimatedWeeklyInsurance: Number(e.target.value)})} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="deductions">
              <Card className="rounded-[2rem] border-0 shadow-sm overflow-hidden bg-white">
                <CardHeader className="bg-slate-50/50 border-b p-8">
                  <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Global Deduction Defaults</CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                  <div className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl">
                    <div>
                      <p className="text-sm font-bold">Direct Deposit Fee ($)</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">System default per payslip</p>
                    </div>
                    <Input type="number" step="0.01" className="w-32 h-12 rounded-xl bg-white border-none font-bold text-right" value={formData.directDepositFee} onChange={e => setFormData({...formData, directDepositFee: Number(e.target.value)})} />
                  </div>
                  <div className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl">
                    <div>
                      <p className="text-sm font-bold">Auto-Apply Fee</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Automatically include in each run</p>
                    </div>
                    <Switch checked={formData.autoApplyDirectDepositFee} onCheckedChange={v => setFormData({...formData, autoApplyDirectDepositFee: v})} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-8">
          <Card className="rounded-[2.5rem] border-0 shadow-xl bg-slate-900 text-white overflow-hidden sticky top-24">
            <CardHeader className="bg-white/5 p-8 border-b border-white/5">
              <div className="flex items-center gap-3">
                <Calculator className="h-5 w-5 text-primary" />
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-white/50">Live Formula Testing</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-10">
              <div className="space-y-4">
                <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Test Inputs</p>
                <div className="grid grid-cols-2 gap-4">
                  <TestInput label="Stops" value={testInputs.stops} onChange={v => setTestInputs({...testInputs, stops: v})} />
                  <TestInput label="Miles" value={testInputs.miles} onChange={v => setTestInputs({...testInputs, miles: v})} />
                </div>
                
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10 mt-2">
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-black text-white/50 uppercase">EV Test Mode</p>
                    <p className="text-[8px] text-white/30 font-medium">Simulate EV Route + Vehicle</p>
                  </div>
                  <Switch 
                    checked={testInputs.isEV} 
                    onCheckedChange={v => setTestInputs({...testInputs, isEV: v})}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
              </div>

              <div className="space-y-4 pt-6 border-t border-white/5">
                <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Calculated Results</p>
                <div className="space-y-4">
                  <ResultRow label="EST. PAY" value={testOutputs.estPay} />
                  <ResultRow label="EST. FUEL" value={testOutputs.estFuel} />
                  <ResultRow label={testInputs.isEV ? "EV DRIVER PAY" : "DRIVER PAY"} value={testOutputs.driverPay} />
                  <ResultRow label={testInputs.isEV ? "EV HELPER PAY" : "HELPER PAY"} value={testOutputs.helperPay} />
                  <ResultRow label="TRUE NET PROFIT" value={testOutputs.trueNet} isTotal />
                </div>
              </div>

              <div className="p-6 bg-primary/10 border border-primary/20 rounded-2xl flex items-start gap-3">
                <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p className="text-[10px] font-medium text-slate-400 leading-relaxed italic">
                  "Calculations update instantly as you type formulas. Use ROUND(x, 0) for rounding. Variables: stops, miles, estimatedPay."
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="rounded-[2.5rem] border-0 shadow-sm overflow-hidden bg-white">
        <CardHeader className="bg-slate-50/50 border-b p-8">
          <div className="flex items-center gap-3">
            <History className="h-5 w-5 text-slate-400" />
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Settings Audit Log</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/50 border-b">
                  <th className="px-8 py-4 text-left text-[9px] font-black uppercase text-slate-400">Setting</th>
                  <th className="px-4 py-4 text-left text-[9px] font-black uppercase text-slate-400">Old Value</th>
                  <th className="px-4 py-4 text-left text-[9px] font-black uppercase text-slate-400">New Value</th>
                  <th className="px-4 py-4 text-left text-[9px] font-black uppercase text-slate-400">Date</th>
                  <th className="px-8 py-4 text-right text-[9px] font-black uppercase text-slate-400">By</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {auditLogs.length === 0 ? (
                  <tr><td colSpan={5} className="px-8 py-12 text-center text-[10px] font-bold text-slate-400 uppercase italic">No history recorded yet</td></tr>
                ) : auditLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-4 font-black text-slate-900 text-xs uppercase tracking-tight">{log.settingName}</td>
                    <td className="px-4 py-4 text-xs text-slate-500 font-mono">{log.oldValue}</td>
                    <td className="px-4 py-4 text-xs text-emerald-600 font-mono font-bold">{log.newValue}</td>
                    <td className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase">{new Date(log.changedAt).toLocaleString()}</td>
                    <td className="px-8 py-4 text-right text-[10px] font-black uppercase text-slate-900">{log.changedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon, color }: any) {
  return (
    <Card className="rounded-[1.5rem] border-0 shadow-sm bg-white p-6">
      <div className="flex items-center gap-4">
        <div className={`h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
          <p className="text-lg font-black text-slate-900">{value}</p>
        </div>
      </div>
    </Card>
  );
}

function FormulaField({ label, value, onChange, hint }: { label: string, value: string, onChange: (v: string) => void, hint: string }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-[10px] font-black uppercase text-slate-400">{label}</Label>
        <span className="text-[9px] font-bold text-slate-300 uppercase italic">{hint}</span>
      </div>
      <div className="relative">
        <Terminal className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
        <Input 
          className="h-14 rounded-2xl pl-12 bg-slate-50 border-none font-mono text-xs font-bold text-slate-900 focus:bg-white" 
          value={value} 
          onChange={e => onChange(e.target.value)} 
        />
      </div>
    </div>
  );
}

function TestInput({ label, value, onChange }: { label: string, value: number, onChange: (v: number) => void }) {
  return (
    <div className="space-y-2">
      <Label className="text-[9px] font-black text-white/30 uppercase tracking-widest">{label}</Label>
      <Input 
        type="number" 
        className="h-10 bg-white/5 border-white/10 rounded-xl text-white font-bold" 
        value={value} 
        onChange={e => onChange(Number(e.target.value))} 
      />
    </div>
  );
}

function ResultRow({ label, value, isTotal }: { label: string, value: number, isTotal?: boolean }) {
  return (
    <div className={cn(
      "flex items-center justify-between py-2",
      isTotal && "pt-4 mt-2 border-t border-white/10"
    )}>
      <span className={cn(
        "text-[10px] uppercase font-bold",
        isTotal ? "text-white" : "text-white/40"
      )}>{label}</span>
      <span className={cn(
        "font-black tracking-tight",
        isTotal ? "text-primary text-xl" : "text-white text-sm"
      )}>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)}</span>
    </div>
  );
}
