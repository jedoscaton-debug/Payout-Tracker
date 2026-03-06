
"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { 
  Plus, 
  Search, 
  Download, 
  MoreHorizontal, 
  Pencil, 
  Pause, 
  Play, 
  CheckCircle2, 
  Trash2, 
  Wallet,
  Calendar,
  Layers,
  Activity,
  ArrowRight
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { DeductionRecord, Employee } from "@/app/lib/types";
import { currency } from "@/app/lib/payroll-utils";
import { useFirestore, setDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase";
import { doc } from "firebase/firestore";
import { DeductionModal } from "./DeductionModal";
import { useToast } from "@/hooks/use-toast";

interface DeductionBoardProps {
  employees: Employee[];
  deductions: DeductionRecord[];
}

export function DeductionBoard({ employees, deductions }: DeductionBoardProps) {
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDeduction, setEditingDeduction] = useState<DeductionRecord | null>(null);
  const db = useFirestore();
  const { toast } = useToast();

  const filtered = useMemo(() => {
    return deductions.filter(d => 
      d.employeeName.toLowerCase().includes(search.toLowerCase()) ||
      d.deductionName.toLowerCase().includes(search.toLowerCase())
    );
  }, [deductions, search]);

  const stats = useMemo(() => {
    return {
      active: deductions.filter(d => d.status === "Active").length,
      installments: deductions.filter(d => d.type === "Installment").length,
      fixed: deductions.filter(d => d.type === "Fixed").length,
      totalOutstanding: deductions.reduce((sum, d) => sum + (d.remainingBalance || 0), 0),
      appliedThisPeriod: deductions.filter(d => d.lastAppliedPayDate).length // Mock logic
    };
  }, [deductions]);

  const handleSave = (data: Partial<DeductionRecord>) => {
    const id = data.id || `ded-${Date.now()}`;
    const ref = doc(db, "deductions", id);
    const now = new Date().toISOString();
    
    const payload = {
      ...data,
      id,
      updatedAt: now,
      createdAt: data.createdAt || now,
    };

    setDocumentNonBlocking(ref, payload, { merge: true });
    setIsModalOpen(false);
    setEditingDeduction(null);
    toast({ title: data.id ? "Deduction Updated" : "Deduction Created" });
  };

  const updateStatus = (id: string, status: DeductionRecord['status']) => {
    updateDocumentNonBlocking(doc(db, "deductions", id), { status });
    toast({ title: `Deduction ${status}` });
  };

  const handleExport = () => {
    const headers = ["ID", "Employee", "Name", "Type", "Status", "Balance"];
    const rows = filtered.map(d => [d.id, d.employeeName, d.deductionName, d.type, d.status, d.remainingBalance]);
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "deductions_audit.csv";
    link.click();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Deduction Board</h3>
          <p className="text-sm text-slate-500 font-medium">Manage installments, fixed fees, and automatic system claims.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input placeholder="Search claims..." className="pl-10 h-11 w-64 rounded-xl" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button variant="outline" className="rounded-xl h-11 bg-white font-bold" onClick={handleExport}><Download className="mr-2 h-4 w-4" /> Export</Button>
          <Button className="rounded-xl h-11 bg-primary px-6 font-bold shadow-lg" onClick={() => { setEditingDeduction(null); setIsModalOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Add Deduction
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <StatCard label="Active Claims" value={stats.active} icon={Activity} color="text-blue-500" />
        <StatCard label="Installments" value={stats.installments} icon={Layers} color="text-indigo-500" />
        <StatCard label="Fixed Fees" value={stats.fixed} icon={Wallet} color="text-emerald-500" />
        <StatCard label="Total Balance" value={currency(stats.totalOutstanding)} icon={Calendar} color="text-rose-500" />
        <StatCard label="Applied Today" value={stats.appliedThisPeriod} icon={CheckCircle2} color="text-amber-500" />
      </div>

      <Card className="rounded-[2.5rem] border-0 shadow-sm overflow-hidden bg-white">
        <CardContent className="p-0">
          <ScrollArea className="w-full">
            <div className="min-w-[1800px] pb-6">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b">
                    <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Employee</th>
                    <th className="px-4 py-5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Deduction Name</th>
                    <th className="px-4 py-5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Type</th>
                    <th className="px-4 py-5 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Total Claim</th>
                    <th className="px-4 py-5 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Installments</th>
                    <th className="px-4 py-5 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Per Payroll</th>
                    <th className="px-4 py-5 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Remaining</th>
                    <th className="px-4 py-5 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                    <th className="px-4 py-5 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Auto</th>
                    <th className="px-8 py-5 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/50 group">
                      <td className="px-8 py-5 font-bold text-slate-900">{item.employeeName}</td>
                      <td className="px-4 py-5">
                        <div className="flex items-center gap-2">
                          {item.isSystemDefault && <Badge variant="outline" className="bg-slate-100 text-[8px] uppercase">System</Badge>}
                          <span className="text-sm font-medium">{item.deductionName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-5 text-xs font-bold uppercase text-slate-400">{item.type}</td>
                      <td className="px-4 py-5 text-right font-bold">{currency(item.totalClaimAmount)}</td>
                      <td className="px-4 py-5 text-center text-xs font-bold text-slate-500">
                        {item.type === "Installment" ? `${item.installmentsPaid} / ${item.installmentCount}` : "N/A"}
                      </td>
                      <td className="px-4 py-5 text-right font-black text-rose-500">{currency(item.perPayrollAmount)}</td>
                      <td className="px-4 py-5 text-right font-black text-slate-900">{currency(item.remainingBalance)}</td>
                      <td className="px-4 py-5 text-center">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="px-4 py-5 text-center">
                        <Badge className={item.autoApply ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-400"}>
                          {item.autoApply ? "YES" : "NO"}
                        </Badge>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl w-48">
                            <DropdownMenuItem onClick={() => { setEditingDeduction(item); setIsModalOpen(true); }}><Pencil className="mr-2 h-3 w-3" /> Edit Rule</DropdownMenuItem>
                            {item.status === "Active" ? (
                              <DropdownMenuItem onClick={() => updateStatus(item.id, "Paused")} className="text-amber-600"><Pause className="mr-2 h-3 w-3" /> Pause Claim</DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => updateStatus(item.id, "Active")} className="text-emerald-600"><Play className="mr-2 h-3 w-3" /> Resume Claim</DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => updateStatus(item.id, "Completed")} className="text-blue-600"><CheckCircle2 className="mr-2 h-3 w-3" /> Mark Complete</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => deleteDocumentNonBlocking(doc(db, "deductions", item.id))} className="text-rose-600"><Trash2 className="mr-2 h-3 w-3" /> Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>

      <DeductionModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleSave} 
        employees={employees}
        editingDeduction={editingDeduction}
      />
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: any) {
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

function StatusBadge({ status }: { status: DeductionRecord['status'] }) {
  const styles: any = {
    Active: "bg-emerald-50 text-emerald-600 border-emerald-100",
    Completed: "bg-blue-50 text-blue-600 border-blue-100",
    Paused: "bg-amber-50 text-amber-600 border-amber-100",
    Cancelled: "bg-rose-50 text-rose-600 border-rose-100",
  };
  return <Badge variant="outline" className={`${styles[status]} text-[9px] font-black uppercase tracking-wider`}>{status}</Badge>;
}
