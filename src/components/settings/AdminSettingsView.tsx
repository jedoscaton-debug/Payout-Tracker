
"use client";

import React, { useState, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Settings2, 
  RotateCcw, 
  Calculator, 
  ShieldCheck, 
  History, 
  Save,
  Info,
  Terminal,
  Building2,
  CalendarDays,
  Percent,
  Truck,
  Wallet,
  Upload,
  Image as ImageIcon,
  X
} from "lucide-react";
import { AdminSettings, AdminSettingsAuditLog } from "@/app/lib/types";
import { DEFAULT_ADMIN_SETTINGS, evaluateFormula } from "@/app/lib/formula-evaluator";
import { useFirestore, setDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase";
import { doc, collection } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface AdminSettingsViewProps {
  settings: AdminSettings | null;
  auditLogs: AdminSettingsAuditLog[];
}

export function AdminSettingsView({ settings, auditLogs }: AdminSettingsViewProps) {
  const [formData, setFormData] = useState<Partial<AdminSettings>>(settings || DEFAULT_ADMIN_SETTINGS);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [testInputs, setTestInputs] = useState({
    stops: 27,
    miles: 68,
    rxoSettlementPay: 729,
    fleetRevenue: 3645,
    fleetNetProfit: 380,
    estimatedWeeklyInsurance: 600,
    reserveRate: 0.15
  });
  
  const db = useFirestore();
  const { toast } = useToast();

  const testOutputs = useMemo(() => {
    const scope = { stops: testInputs.stops, miles: testInputs.miles };
    
    const estPay = evaluateFormula(formData.estimatedPayFormula || "", scope);
    const estFuel = evaluateFormula(formData.estimatedFuelFormula || "", scope);
    
    const dPay = evaluateFormula(formData.driverPayFormula || "", { ...scope, estimatedPay: estPay });
    const hPay = evaluateFormula(formData.helperPayFormula || "", { ...scope, estimatedPay: estPay });
    
    const delta = evaluateFormula(formData.deltaFormula || "", { 
      rxoSettlementPay: testInputs.rxoSettlementPay, 
      estimatedPay: estPay 
    });
      
    const trueNet = evaluateFormula(formData.trueNetProfitFormula || "", { 
      fleetNetProfit: testInputs.fleetNetProfit, 
      estimatedWeeklyInsurance: testInputs.estimatedWeeklyInsurance,
      fleetRevenue: testInputs.fleetRevenue,
      reserveRate: testInputs.reserveRate
    });

    return { estPay, estFuel, dPay, hPay, delta, trueNet };
  }, [formData, testInputs]);

  const handleSave = () => {
    const id = "global-config";
    const ref = doc(db, "adminSettings", id);
    const now = new Date().toISOString();
    
    // Audit Logging
    if (settings) {
      Object.entries(formData).forEach(([key, value]) => {
        if (settings[key as keyof AdminSettings] !== value && key !== 'updatedAt') {
          addDocumentNonBlocking(collection(db, "adminSettingsAuditLog"), {
            settingName: key,
            oldValue: String(settings[key as keyof AdminSettings] || "N/A"),
            newValue: String(value),
            changedAt: now,
            changedBy: "System Admin"
          });
        }
      });
    }

    setDocumentNonBlocking(ref, { ...formData, id, updatedAt: now }, { merge: true });
    toast({ title: "Configuration Saved", description: "Global settings updated across all modules." });
  };

  const resetToDefaults = () => {
    setFormData(DEFAULT_ADMIN_SETTINGS);
    toast({ title: "Reset to Defaults" });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      toast({ variant: "destructive", title: "File too large", description: "Please upload an image smaller than 1MB." });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({ ...prev, companyLogo: reader.result as string }));
      toast({ title: "Logo Uploaded", description: "New branding applied to the preview." });
    };
    reader.readAsDataURL(file);
  };

  const clearLogo = () => {
    setFormData(prev => ({ ...prev, companyLogo: undefined }));
    toast({ title: "Logo Removed" });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-primary shadow-sm">
            <Settings2 className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Command Control</h3>
            <p className="text-sm text-slate-500 font-medium">Manage global formulas, thresholds, and operational rules.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="rounded-xl h-11 bg-white font-bold" onClick={resetToDefaults}>
            <RotateCcw className="mr-2 h-4 w-4" /> Reset Factory Defaults
          </Button>
          <Button className="rounded-xl h-11 bg-primary px-8 font-bold shadow-lg" onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" /> Commit Changes
          </Button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
        <div className="space-y-8">
          <Tabs defaultValue="payroll" className="w-full">
            <TabsList className="bg-white border p-1 rounded-2xl h-14 mb-6 flex overflow-x-auto no-scrollbar">
              <TabsTrigger value="payroll" className="rounded-xl h-full font-bold uppercase text-[10px]">Payroll Formulas</TabsTrigger>
              <TabsTrigger value="routes" className="rounded-xl h-full font-bold uppercase text-[10px]">Route Rules</TabsTrigger>
              <TabsTrigger value="deductions" className="rounded-xl h-full font-bold uppercase text-[10px]">Deductions</TabsTrigger>
              <TabsTrigger value="schedule" className="rounded-xl h-full font-bold uppercase text-[10px]">Schedule</TabsTrigger>
              <TabsTrigger value="rxo" className="rounded-xl h-full font-bold uppercase text-[10px]">RXO Audit</TabsTrigger>
              <TabsTrigger value="fleet" className="rounded-xl h-full font-bold uppercase text-[10px]">Fleet</TabsTrigger>
              <TabsTrigger value="company" className="rounded-xl h-full font-bold uppercase text-[10px]">Company</TabsTrigger>
              <TabsTrigger value="formatting" className="rounded-xl h-full font-bold uppercase text-[10px]">Display</TabsTrigger>
            </TabsList>

            <TabsContent value="payroll">
              <SettingsCard title="Payroll Calculation Logic" icon={Calculator}>
                <div className="space-y-8">
                  <FormulaField label="EST. PAY Formula" value={formData.estimatedPayFormula || ""} onChange={v => setFormData({...formData, estimatedPayFormula: v})} hint="Variables: stops, miles" />
                  <div className="grid grid-cols-2 gap-6">
                    <FormulaField label="DRIVER PAY Share" value={formData.driverPayFormula || ""} onChange={v => setFormData({...formData, driverPayFormula: v})} hint="e.g. estimatedPay * 0.27" />
                    <FormulaField label="HELPER PAY Share" value={formData.helperPayFormula || ""} onChange={v => setFormData({...formData, helperPayFormula: v})} hint="e.g. estimatedPay * 0.23" />
                  </div>
                  <FormulaField label="COMBINED PAY Formula" value={formData.combinedPayFormula || ""} onChange={v => setFormData({...formData, combinedPayFormula: v})} hint="e.g. driverPay + helperPay" />
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400">Negative Net Pay Rule</Label>
                    <Select value={formData.negativeNetPayRule} onValueChange={(v: any) => setFormData({...formData, negativeNetPayRule: v})}>
                      <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none font-bold"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="block">Block Finalization</SelectItem>
                        <SelectItem value="confirm">Require Admin Confirmation</SelectItem>
                        <SelectItem value="allow">Allow Always</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </SettingsCard>
            </TabsContent>

            <TabsContent value="routes">
              <SettingsCard title="Route Performance Rules" icon={Truck}>
                <div className="space-y-8">
                  <FormulaField label="EST. FUEL Formula" value={formData.estimatedFuelFormula || ""} onChange={v => setFormData({...formData, estimatedFuelFormula: v})} hint="Variables: miles" />
                  <FormulaField label="DELTA Calculation" value={formData.deltaFormula || ""} onChange={v => setFormData({...formData, deltaFormula: v})} hint="rxoSettlementPay - estimatedPay" />
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400">Primary Revenue Source</Label>
                    <Select value={formData.revenueSource} onValueChange={(v: any) => setFormData({...formData, revenueSource: v})}>
                      <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none font-bold"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="estimatedPay">System Estimated Pay</SelectItem>
                        <SelectItem value="actualPayAudit">RXO Actual (Audit Field)</SelectItem>
                        <SelectItem value="manualOverride">Manual Override Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </SettingsCard>
            </TabsContent>

            <TabsContent value="deductions">
              <SettingsCard title="Deduction Defaults" icon={Wallet}>
                <div className="space-y-8">
                  <div className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl">
                    <div className="space-y-1">
                      <p className="text-sm font-bold">Direct Deposit Fee ($)</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">System standard per payslip</p>
                    </div>
                    <Input type="number" step="0.01" className="w-32 h-12 rounded-xl bg-white border-none font-bold text-right" value={formData.directDepositFee} onChange={e => setFormData({...formData, directDepositFee: Number(e.target.value)})} />
                  </div>
                  <div className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl">
                    <div className="space-y-1">
                      <p className="text-sm font-bold">Auto-Apply Fee</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Include automatically in every run</p>
                    </div>
                    <Switch checked={formData.autoApplyDirectDepositFee} onCheckedChange={v => setFormData({...formData, autoApplyDirectDepositFee: v})} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400">Deduction Completion Rule</Label>
                    <Input className="h-12 rounded-xl bg-slate-50 border-none font-bold" value={formData.installmentCompletionRule} onChange={e => setFormData({...formData, installmentCompletionRule: e.target.value})} />
                  </div>
                </div>
              </SettingsCard>
            </TabsContent>

            <TabsContent value="schedule">
              <SettingsCard title="Payroll Cycle Configuration" icon={CalendarDays}>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400">Cycle Start Day</Label>
                    <Select value={formData.payrollCycleStartDay} onValueChange={v => setFormData({...formData, payrollCycleStartDay: v})}>
                      <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none font-bold"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400">Cycle End Day</Label>
                    <Select value={formData.payrollCycleEndDay} onValueChange={v => setFormData({...formData, payrollCycleEndDay: v})}>
                      <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none font-bold"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="mt-8 space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Pay Date Rule</Label>
                  <Input className="h-12 rounded-xl bg-slate-50 border-none font-bold" value={formData.payDateRule} onChange={e => setFormData({...formData, payDateRule: e.target.value})} />
                </div>
              </SettingsCard>
            </TabsContent>

            <TabsContent value="rxo">
              <SettingsCard title="RXO Settlement Audit Rules" icon={ShieldCheck}>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400">Negative Delta Threshold ($)</Label>
                    <Input type="number" className="h-12 rounded-xl bg-slate-50 border-none font-bold" value={formData.negativeDeltaThreshold} onChange={e => setFormData({...formData, negativeDeltaThreshold: Number(e.target.value)})} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400">Red Status Trigger</Label>
                    <Input className="h-12 rounded-xl bg-slate-50 border-none font-bold" value={formData.rxoRedStatusRule} onChange={e => setFormData({...formData, rxoRedStatusRule: e.target.value})} />
                  </div>
                </div>
                <div className="mt-8 grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400">EV Match Prefix</Label>
                    <Input className="h-12 rounded-xl bg-slate-50 border-none font-bold" value={formData.rxoEVMatchingRule} onChange={e => setFormData({...formData, rxoEVMatchingRule: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400">GAS Match Prefix</Label>
                    <Input className="h-12 rounded-xl bg-slate-50 border-none font-bold" value={formData.rxoGASMatchingRule} onChange={e => setFormData({...formData, rxoGASMatchingRule: e.target.value})} />
                  </div>
                </div>
              </SettingsCard>
            </TabsContent>

            <TabsContent value="fleet">
              <SettingsCard title="Profitability Thresholds" icon={Percent}>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400">RED Critical Level ($)</Label>
                    <Input type="number" className="h-12 rounded-xl bg-slate-50 border-none font-bold" value={formData.fleetRedThreshold} onChange={e => setFormData({...formData, fleetRedThreshold: Number(e.target.value)})} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400">YELLOW Watch Level ($)</Label>
                    <Input type="number" className="h-12 rounded-xl bg-slate-50 border-none font-bold" value={formData.fleetYellowThreshold} onChange={e => setFormData({...formData, fleetYellowThreshold: Number(e.target.value)})} />
                  </div>
                </div>
                <div className="mt-8 grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400">RXO Risk Reserve (%)</Label>
                    <Input type="number" step="0.01" className="h-12 rounded-xl bg-slate-50 border-none font-bold" value={formData.reserveRate} onChange={e => setFormData({...formData, reserveRate: Number(e.target.value)})} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400">Weekly Insurance Default ($)</Label>
                    <Input type="number" className="h-12 rounded-xl bg-slate-50 border-none font-bold" value={formData.estimatedWeeklyInsurance} onChange={e => setFormData({...formData, estimatedWeeklyInsurance: Number(e.target.value)})} />
                  </div>
                </div>
                <div className="mt-8">
                  <FormulaField label="TRUE NET PROFIT Formula" value={formData.trueNetProfitFormula || ""} onChange={v => setFormData({...formData, trueNetProfitFormula: v})} hint="Variables: fleetNetProfit, estimatedWeeklyInsurance, fleetRevenue, reserveRate" />
                </div>
              </SettingsCard>
            </TabsContent>

            <TabsContent value="company">
              <SettingsCard title="Organization Identity" icon={Building2}>
                <div className="space-y-10">
                  <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase text-slate-400 px-1">Brand Identity</Label>
                    <div className="flex items-center gap-8 p-8 bg-slate-50 rounded-3xl border border-slate-100">
                      <div className="relative group">
                        <div className="h-32 w-32 rounded-[2rem] bg-white border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden transition-all group-hover:border-primary">
                          {formData.companyLogo ? (
                            <img src={formData.companyLogo} alt="Logo Preview" className="h-full w-full object-contain" />
                          ) : (
                            <ImageIcon className="h-10 w-10 text-slate-300" />
                          )}
                        </div>
                        {formData.companyLogo && (
                          <button 
                            onClick={clearLogo}
                            className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg border-4 border-white transition-transform hover:scale-110"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      <div className="flex-1 space-y-4">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">Official Company Logo</h4>
                          <p className="text-[10px] font-medium text-slate-500 mt-1 leading-relaxed">
                            Upload a high-resolution PNG or JPG. This logo will appear on all official payslips and the system dashboard. (Max 1MB)
                          </p>
                        </div>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                        <Button 
                          onClick={() => fileInputRef.current?.click()}
                          variant="outline" 
                          className="h-11 rounded-xl bg-white font-bold border-slate-200 shadow-sm"
                        >
                          <Upload className="mr-2 h-4 w-4" /> Upload New Image
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-400">Legal Company Name</Label>
                      <Input className="h-12 rounded-xl bg-slate-50 border-none font-bold" value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-400">Official Address</Label>
                      <Input className="h-12 rounded-xl bg-slate-50 border-none font-bold" value={formData.companyAddress} onChange={e => setFormData({...formData, companyAddress: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-slate-400">Primary Timezone</Label>
                        <Input className="h-12 rounded-xl bg-slate-50 border-none font-bold" value={formData.timeZone} onChange={e => setFormData({...formData, timeZone: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-slate-400">Default Currency</Label>
                        <Input className="h-12 rounded-xl bg-slate-50 border-none font-bold" value={formData.defaultCurrency} onChange={e => setFormData({...formData, defaultCurrency: e.target.value})} />
                      </div>
                    </div>
                  </div>
                </div>
              </SettingsCard>
            </TabsContent>

            <TabsContent value="formatting">
              <SettingsCard title="Display & Formatting" icon={History}>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400">Decimal Precision</Label>
                    <Input type="number" className="h-12 rounded-xl bg-slate-50 border-none font-bold" value={formData.decimalPlaces} onChange={e => setFormData({...formData, decimalPlaces: Number(e.target.value)})} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400">Date Format</Label>
                    <Input className="h-12 rounded-xl bg-slate-50 border-none font-bold" value={formData.dateFormat} onChange={e => setFormData({...formData, dateFormat: e.target.value})} />
                  </div>
                </div>
                <div className="mt-8 space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Earnings Row Format</Label>
                  <Input className="h-12 rounded-xl bg-slate-50 border-none font-bold" value={formData.earningsDescriptionFormat} onChange={e => setFormData({...formData, earningsDescriptionFormat: e.target.value})} />
                </div>
              </SettingsCard>
            </TabsContent>
          </Tabs>

          <Card className="rounded-[2.5rem] border-0 shadow-sm overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/50 border-b p-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <History className="h-5 w-5 text-primary" />
                  <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Change History / Audit Log</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b text-[10px] font-black uppercase text-slate-400">
                      <th className="px-8 py-4 text-left">Setting Name</th>
                      <th className="px-4 py-4 text-left">Previous</th>
                      <th className="px-4 py-4 text-left">Applied Value</th>
                      <th className="px-4 py-4 text-left">Timestamp</th>
                      <th className="px-8 py-4 text-right">Modified By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {auditLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-4 font-bold text-slate-900 text-xs">{log.settingName}</td>
                        <td className="px-4 py-4 text-[10px] text-slate-400 line-through truncate max-w-[150px]">{log.oldValue}</td>
                        <td className="px-4 py-4 text-[10px] font-bold text-emerald-600 truncate max-w-[150px]">{log.newValue}</td>
                        <td className="px-4 py-4 text-[10px] font-medium text-slate-500">{new Date(log.changedAt).toLocaleString()}</td>
                        <td className="px-8 py-4 text-right text-[10px] font-black text-slate-900">{log.changedBy}</td>
                      </tr>
                    ))}
                    {auditLogs.length === 0 && (
                      <tr><td colSpan={5} className="py-20 text-center text-[10px] font-bold text-slate-400 uppercase">No audit entries found.</td></tr>
                    )}
                  </tbody>
                </table>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <Card className="rounded-[2.5rem] border-0 shadow-xl bg-slate-900 text-white overflow-hidden sticky top-24">
            <CardHeader className="bg-white/5 p-8 border-b border-white/5">
              <div className="flex items-center gap-3">
                <Calculator className="h-5 w-5 text-primary" />
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-white/50">Formula Lab (Live)</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="space-y-4">
                <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Input Signals</p>
                <div className="grid grid-cols-2 gap-4">
                  <TestInput label="Stops" value={testInputs.stops} onChange={v => setTestInputs({...testInputs, stops: v})} />
                  <TestInput label="Miles" value={testInputs.miles} onChange={v => setTestInputs({...testInputs, miles: v})} />
                </div>
                <TestInput label="RXO Settlement ($)" value={testInputs.rxoSettlementPay} onChange={v => setTestInputs({...testInputs, rxoSettlementPay: v})} />
              </div>

              <div className="space-y-4 pt-6 border-t border-white/5">
                <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">Calculated Outputs</p>
                <div className="space-y-3">
                  <ResultRow label="EST. PAY" value={testOutputs.estPay} />
                  <ResultRow label="EST. FUEL" value={testOutputs.estFuel} />
                  <ResultRow label="DRIVER PAY" value={testOutputs.dPay} />
                  <ResultRow label="HELPER PAY" value={testOutputs.hPay} />
                  <div className="h-px bg-white/5 my-2" />
                  <ResultRow label="DELTA Variance" value={testOutputs.delta} isNegative={testOutputs.delta < 0} />
                  <ResultRow label="TRUE NET PROFIT" value={testOutputs.trueNet} isTotal />
                </div>
              </div>

              <div className="p-6 bg-primary/10 border border-primary/20 rounded-2xl flex items-start gap-3">
                <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p className="text-[10px] font-medium text-slate-400 leading-relaxed italic">
                  "Outputs update in real-time as you modify formulas. Ensure variables match the hint text provided in each field."
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SettingsCard({ title, icon: Icon, children }: any) {
  return (
    <Card className="rounded-[2.5rem] border-0 shadow-sm overflow-hidden bg-white">
      <CardHeader className="bg-slate-50/50 border-b p-8">
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 text-primary" />
          <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-8">{children}</CardContent>
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

function ResultRow({ label, value, isTotal, isNegative }: { label: string, value: number, isTotal?: boolean, isNegative?: boolean }) {
  return (
    <div className={cn(
      "flex items-center justify-between py-1",
      isTotal && "pt-4 mt-2 border-t border-white/10"
    )}>
      <span className={cn(
        "text-[10px] uppercase font-bold",
        isTotal ? "text-white" : "text-white/40"
      )}>{label}</span>
      <span className={cn(
        "font-black tracking-tight",
        isTotal ? "text-primary text-xl" : isNegative ? "text-rose-400" : "text-white text-sm"
      )}>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)}</span>
    </div>
  );
}
