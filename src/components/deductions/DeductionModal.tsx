
"use client";

import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { DeductionRecord, Employee, DeductionType, DeductionStatus } from "@/app/lib/types";

interface DeductionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<DeductionRecord>) => void;
  employees: Employee[];
  editingDeduction: DeductionRecord | null;
}

export function DeductionModal({ isOpen, onClose, onSave, employees, editingDeduction }: DeductionModalProps) {
  const [formData, setFormData] = useState<Partial<DeductionRecord>>({
    deductionName: "",
    type: "Fixed",
    status: "Active",
    autoApply: true,
    totalClaimAmount: 0,
    perPayrollAmount: 0,
    installmentCount: 1,
    installmentsPaid: 0,
    remainingBalance: 0,
    notes: ""
  });

  useEffect(() => {
    if (editingDeduction) {
      setFormData(editingDeduction);
    } else {
      setFormData({
        deductionName: "",
        type: "Fixed",
        status: "Active",
        autoApply: true,
        totalClaimAmount: 0,
        perPayrollAmount: 0,
        installmentCount: 1,
        installmentsPaid: 0,
        remainingBalance: 0,
        notes: ""
      });
    }
  }, [editingDeduction, isOpen]);

  // Auto-calculate remaining balance
  useEffect(() => {
    if (formData.type === "Installment") {
      const balance = (formData.totalClaimAmount || 0) - ((formData.installmentsPaid || 0) * (formData.perPayrollAmount || 0));
      setFormData(prev => ({ ...prev, remainingBalance: Math.max(0, balance) }));
    }
  }, [formData.totalClaimAmount, formData.installmentsPaid, formData.perPayrollAmount, formData.type]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl rounded-[2.5rem] p-8 bg-white overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black uppercase tracking-tighter">
            {editingDeduction ? "Edit Deduction Rule" : "Create Deduction Claim"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400">Employee</Label>
              <Select value={formData.employeeId} onValueChange={(v) => {
                const emp = employees.find(e => e.id === v);
                setFormData({ ...formData, employeeId: v, employeeName: emp?.fullName || "" });
              }}>
                <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Select staff..." /></SelectTrigger>
                <SelectContent>
                  {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.fullName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400">Deduction Name</Label>
              <Input required className="h-12 rounded-xl" value={formData.deductionName} onChange={(e) => setFormData({ ...formData, deductionName: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400">Type</Label>
              <Select value={formData.type} onValueChange={(v: DeductionType) => setFormData({ ...formData, type: v })}>
                <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Fixed">Fixed Amount</SelectItem>
                  <SelectItem value="Installment">Installment Plan</SelectItem>
                  <SelectItem value="One-Time">One-Time Payment</SelectItem>
                  <SelectItem value="Auto System Fee">Auto System Fee</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400">Status</Label>
              <Select value={formData.status} onValueChange={(v: DeductionStatus) => setFormData({ ...formData, status: v })}>
                <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Paused">Paused</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {formData.type === "Installment" && (
            <div className="grid grid-cols-3 gap-4 p-6 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400">Total Claim ($)</Label>
                <Input type="number" step="0.01" className="h-10 bg-white" value={formData.totalClaimAmount} onChange={(e) => setFormData({ ...formData, totalClaimAmount: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400">Count</Label>
                <Input type="number" className="h-10 bg-white" value={formData.installmentCount} onChange={(e) => setFormData({ ...formData, installmentCount: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400">Paid Count</Label>
                <Input type="number" className="h-10 bg-white" value={formData.installmentsPaid} onChange={(e) => setFormData({ ...formData, installmentsPaid: Number(e.target.value) })} />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400">Amount Per Payroll ($)</Label>
              <Input type="number" step="0.01" className="h-12 rounded-xl font-black text-rose-600" value={formData.perPayrollAmount} onChange={(e) => setFormData({ ...formData, perPayrollAmount: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400">Remaining Balance ($)</Label>
              <Input disabled className="h-12 rounded-xl bg-slate-100 font-black" value={formData.remainingBalance?.toFixed(2)} />
            </div>
          </div>

          <div className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl">
            <div className="space-y-0.5">
              <Label className="text-sm font-bold">Auto-Apply to Payroll</Label>
              <p className="text-[10px] text-slate-500 uppercase font-bold">Include in sync automatically</p>
            </div>
            <Switch checked={formData.autoApply} onCheckedChange={(v) => setFormData({ ...formData, autoApply: v })} />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-slate-400">Internal Audit Notes</Label>
            <Textarea className="rounded-xl min-h-[100px]" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
          </div>

          <DialogFooter className="pt-6">
            <Button variant="ghost" onClick={onClose} className="rounded-xl h-12">Cancel</Button>
            <Button type="submit" className="rounded-xl h-12 bg-slate-900 px-10 font-bold uppercase text-xs">
              {editingDeduction ? "Save Rule Changes" : "Create System Claim"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
