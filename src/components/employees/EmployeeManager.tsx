"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Employee } from "@/app/lib/types";
import { Plus, Search, MoreHorizontal, Pencil, UserMinus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EmployeeManagerProps {
  employees: Employee[];
  onAddEmployee: (employee: Employee) => void;
  onUpdateEmployee: (employee: Employee) => void;
  onDeleteEmployee: (id: string) => void;
}

export function EmployeeManager({ 
  employees, onAddEmployee, onUpdateEmployee, onDeleteEmployee
}: EmployeeManagerProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const { toast } = useToast();
  
  const [newStaff, setNewStaff] = useState<Omit<Employee, 'id'>>({
    fullName: "", role: "Driver", defaultDailyRate: "Varies", paymentMethod: "Direct Deposit"
  });

  const filtered = employees.filter(e => (e.fullName || "").toLowerCase().includes(search.toLowerCase()));

  const generateUID = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let res = '';
    for (let i = 0; i < 12; i++) res += chars.charAt(Math.floor(Math.random() * chars.length));
    return res;
  };

  const handleSubmitStaff = (e: React.FormEvent) => {
    e.preventDefault();
    const id = generateUID();
    onAddEmployee({ 
      id, 
      ...newStaff
    });
    setNewStaff({ fullName: "", role: "Driver", defaultDailyRate: "Varies", paymentMethod: "Direct Deposit" });
    setIsAddOpen(false);
    toast({ title: "Staff Created", description: `HR Profile for ${newStaff.fullName} has been initialized.` });
  };

  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingEmployee) {
      onUpdateEmployee({ ...editingEmployee });
      setIsEditOpen(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Employee Directory</h3>
          <p className="text-sm text-slate-500 font-medium">Manage staff records and payroll configurations.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input placeholder="Search directory..." className="pl-10 h-11 w-64 rounded-xl" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild><Button className="rounded-xl h-11 bg-primary px-6 font-bold shadow-lg"><Plus className="mr-2 h-4 w-4" /> Add Staff Member</Button></DialogTrigger>
            <DialogContent className="rounded-[2.5rem] p-8 bg-white max-w-2xl">
              <DialogHeader><DialogTitle className="text-2xl font-black uppercase tracking-tighter">Register Staff Member</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmitStaff} className="space-y-6 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label className="text-[10px] font-bold uppercase text-slate-400">Full Name</Label><Input required className="h-12 rounded-xl" value={newStaff.fullName || ""} onChange={(e) => setNewStaff({...newStaff, fullName: e.target.value})} /></div>
                  <div className="space-y-2"><Label className="text-[10px] font-bold uppercase text-slate-400">Role</Label>
                    <Select value={newStaff.role} onValueChange={(v: any) => setNewStaff({...newStaff, role: v})}>
                      <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="Driver">Driver</SelectItem><SelectItem value="Helper">Helper</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label className="text-[10px] font-bold uppercase text-slate-400">Daily Rate</Label><Input className="h-12 rounded-xl" value={newStaff.defaultDailyRate || ""} onChange={(e) => setNewStaff({...newStaff, defaultDailyRate: e.target.value})} /></div>
                  <div className="space-y-2"><Label className="text-[10px] font-bold uppercase text-slate-400">Payment Method</Label><Input className="h-12 rounded-xl" value={newStaff.paymentMethod || ""} onChange={(e) => setNewStaff({...newStaff, paymentMethod: e.target.value})} /></div>
                </div>
                <DialogFooter className="pt-4"><Button type="submit" className="w-full rounded-xl h-12 bg-slate-900 font-bold uppercase text-xs">Create HR Profile</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="rounded-[2.5rem] border-0 shadow-sm overflow-hidden bg-white">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/80 border-b">
                  <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Staff Member</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Role</th>
                  <th className="px-8 py-5 text-left text-[10px) font-black uppercase tracking-widest text-slate-400">Rate Basis</th>
                  <th className="px-8 py-5 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map(emp => {
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/50">
                      <td className="px-8 py-5">
                        <div className="font-bold text-slate-900">{emp.fullName}</div>
                      </td>
                      <td className="px-8 py-5 text-xs font-bold uppercase">{emp.role}</td>
                      <td className="px-8 py-5 text-xs font-medium text-slate-500">{emp.defaultDailyRate || "Varies"}</td>
                      <td className="px-8 py-5 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl p-2 w-56">
                            <DropdownMenuItem onClick={() => {setEditingEmployee(emp); setIsEditOpen(true);}}><Pencil className="mr-2 h-3 w-3" /> Edit Profile</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onDeleteEmployee(emp.id)} className="text-rose-600"><UserMinus className="mr-2 h-3 w-3" /> Remove Staff</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="rounded-[2.5rem] p-8 bg-white max-w-2xl">
          <DialogHeader><DialogTitle className="text-2xl font-black uppercase tracking-tighter">Edit HR Profile</DialogTitle></DialogHeader>
          {editingEmployee && (
            <form onSubmit={handleSubmitEdit} className="space-y-6 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label className="text-[10px] font-bold uppercase text-slate-400">Full Name</Label><Input required value={editingEmployee.fullName || ""} onChange={(e) => setEditingEmployee({...editingEmployee, fullName: e.target.value})} /></div>
                <div className="space-y-2"><Label className="text-[10px] font-bold uppercase text-slate-400">Role</Label>
                  <Select value={editingEmployee.role} onValueChange={(v: any) => setEditingEmployee({...editingEmployee, role: v})}>
                    <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="Driver">Driver</SelectItem><SelectItem value="Helper">Helper</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label className="text-[10px] font-bold uppercase text-slate-400">Daily Rate</Label><Input className="h-12 rounded-xl" value={editingEmployee.defaultDailyRate || ""} onChange={(e) => setEditingEmployee({...editingEmployee, defaultDailyRate: e.target.value})} /></div>
                <div className="space-y-2"><Label className="text-[10px] font-bold uppercase text-slate-400">Payment Method</Label><Input className="h-12 rounded-xl" value={editingEmployee.paymentMethod || ""} onChange={(e) => setEditingEmployee({...editingEmployee, paymentMethod: e.target.value})} /></div>
              </div>
              <DialogFooter className="pt-4"><Button type="submit" className="w-full rounded-xl h-12 bg-primary font-bold uppercase text-xs">Save Changes</Button></DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
