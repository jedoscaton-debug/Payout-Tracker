
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Employee } from "@/app/lib/types";
import { Plus, Search, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

interface EmployeeManagerProps {
  employees: Employee[];
  onAddEmployee: (employee: Employee) => void;
  onUpdateEmployee: (employee: Employee) => void;
  onDeleteEmployee: (id: string) => void;
}

export function EmployeeManager({ 
  employees, 
  onAddEmployee, 
  onUpdateEmployee, 
  onDeleteEmployee 
}: EmployeeManagerProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [newEmp, setNewEmp] = useState({
    fullName: "",
    defaultDailyRate: "Varies",
    paymentMethod: "Direct Deposit"
  });

  const filtered = employees.filter(e => 
    e.fullName.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    onAddEmployee({
      id: `emp-${Date.now()}`,
      ...newEmp
    });
    setNewEmp({ fullName: "", defaultDailyRate: "Varies", paymentMethod: "Direct Deposit" });
    setIsAddOpen(false);
  };

  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingEmployee) {
      onUpdateEmployee(editingEmployee);
      setIsEditOpen(false);
      setEditingEmployee(null);
    }
  };

  const handleStartEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setIsEditOpen(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Employee Directory</h3>
          <p className="text-sm text-slate-500 font-medium">Manage your workforce, default rates, and payment configurations.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search employees..." 
              className="pl-10 h-11 w-64 rounded-xl border-slate-200" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl h-11 bg-primary px-6 font-bold shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5">
                <Plus className="mr-2 h-4 w-4" /> Add Employee
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-[2.5rem] p-8 border-none shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Register Employee</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmitAdd} className="space-y-6 mt-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Full Name</Label>
                  <Input 
                    required
                    className="h-12 rounded-xl border-slate-100 bg-slate-50 focus:bg-white" 
                    value={newEmp.fullName}
                    onChange={(e) => setNewEmp({...newEmp, fullName: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Daily Rate</Label>
                    <Input 
                      className="h-12 rounded-xl border-slate-100 bg-slate-50 focus:bg-white" 
                      value={newEmp.defaultDailyRate}
                      onChange={(e) => setNewEmp({...newEmp, defaultDailyRate: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Payment Method</Label>
                    <Input 
                      className="h-12 rounded-xl border-slate-100 bg-slate-50 focus:bg-white" 
                      value={newEmp.paymentMethod}
                      onChange={(e) => setNewEmp({...newEmp, paymentMethod: e.target.value})}
                    />
                  </div>
                </div>
                <DialogFooter className="pt-4">
                  <Button type="submit" className="w-full rounded-xl h-12 bg-accent font-bold shadow-lg shadow-accent/20">
                    Add Record to System
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="rounded-[2.5rem] border-0 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Staff Member</th>
                <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Contract Type</th>
                <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Pay Method</th>
                <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">ID Reference</th>
                <th className="px-8 py-5 text-right text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((emp) => (
                <tr key={emp.id} className="group hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-5 font-bold text-slate-900">{emp.fullName}</td>
                  <td className="px-8 py-5">
                    <Badge variant="outline" className="rounded-full border-slate-200 text-slate-500 text-[10px] font-bold px-3 py-1 uppercase">
                      {emp.defaultDailyRate}
                    </Badge>
                  </td>
                  <td className="px-8 py-5 text-sm font-medium text-slate-500">{emp.paymentMethod}</td>
                  <td className="px-8 py-5 text-[10px] font-mono text-slate-400">{emp.id}</td>
                  <td className="px-8 py-5 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-full hover:bg-white hover:shadow-sm">
                          <MoreHorizontal className="h-4 w-4 text-slate-400" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl border-slate-100 shadow-xl p-2">
                        <DropdownMenuItem 
                          className="rounded-lg font-bold text-xs uppercase tracking-wider text-slate-600 gap-2 cursor-pointer"
                          onClick={() => handleStartEdit(emp)}
                        >
                          <Pencil className="h-3 w-3" /> Edit Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="rounded-lg font-bold text-xs uppercase tracking-wider text-rose-600 gap-2 cursor-pointer focus:bg-rose-50 focus:text-rose-600"
                          onClick={() => onDeleteEmployee(emp.id)}
                        >
                          <Trash2 className="h-3 w-3" /> Terminate Record
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="rounded-[2.5rem] p-8 border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Edit Employee</DialogTitle>
          </DialogHeader>
          {editingEmployee && (
            <form onSubmit={handleSubmitEdit} className="space-y-6 mt-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Full Name</Label>
                <Input 
                  required
                  className="h-12 rounded-xl border-slate-100 bg-slate-50 focus:bg-white" 
                  value={editingEmployee.fullName}
                  onChange={(e) => setEditingEmployee({...editingEmployee, fullName: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Daily Rate</Label>
                  <Input 
                    className="h-12 rounded-xl border-slate-100 bg-slate-50 focus:bg-white" 
                    value={editingEmployee.defaultDailyRate}
                    onChange={(e) => setEditingEmployee({...editingEmployee, defaultDailyRate: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Payment Method</Label>
                  <Input 
                    className="h-12 rounded-xl border-slate-100 bg-slate-50 focus:bg-white" 
                    value={editingEmployee.paymentMethod || ""}
                    onChange={(e) => setEditingEmployee({...editingEmployee, paymentMethod: e.target.value})}
                  />
                </div>
              </div>
              <DialogFooter className="pt-4">
                <Button type="submit" className="w-full rounded-xl h-12 bg-primary font-bold shadow-lg shadow-primary/20">
                  Update System Record
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
