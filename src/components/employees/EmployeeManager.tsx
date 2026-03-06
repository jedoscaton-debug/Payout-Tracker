
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
import { Plus, Search, MoreHorizontal, Pencil, Trash2, Shield, UserMinus, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmployeeManagerProps {
  employees: Employee[];
  onAddEmployee: (employee: Employee) => void;
  onUpdateEmployee: (employee: Employee) => void;
  onDeleteEmployee: (id: string) => void;
  isRoleManagement?: boolean;
  allAdmins?: any[];
  onGrantAdmin?: (uid: string) => void;
  onRevokeAdmin?: (uid: string) => void;
}

export function EmployeeManager({ 
  employees, 
  onAddEmployee, 
  onUpdateEmployee, 
  onDeleteEmployee,
  isRoleManagement = false,
  allAdmins = [],
  onGrantAdmin,
  onRevokeAdmin
}: EmployeeManagerProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [newEmp, setNewEmp] = useState({
    id: "", // For admin linking
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
      id: newEmp.id || `emp-${Date.now()}`,
      ...newEmp
    });
    setNewEmp({ id: "", fullName: "", defaultDailyRate: "Varies", paymentMethod: "Direct Deposit" });
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

  const isAdmin = (uid: string) => allAdmins.some(a => a.id === uid);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">
            {isRoleManagement ? "Administrative Control Board" : "Employee Directory"}
          </h3>
          <p className="text-sm text-slate-500 font-medium">
            {isRoleManagement 
              ? "Manage system-wide permissions, grant administrative rights, and revoke access." 
              : "Manage your workforce, default rates, and payment configurations."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search directory..." 
              className="pl-10 h-11 w-64 rounded-xl border-slate-200" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl h-11 bg-primary px-6 font-bold shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5">
                <Plus className="mr-2 h-4 w-4" /> Create Access
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-[2.5rem] p-8 border-none shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Register System Access</DialogTitle>
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
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">User UID (Optional - for account linking)</Label>
                  <Input 
                    placeholder="e.g. pEdBZ1Y8AbeTrUKSC4..."
                    className="h-12 rounded-xl border-slate-100 bg-slate-50 focus:bg-white font-mono text-[11px]" 
                    value={newEmp.id}
                    onChange={(e) => setNewEmp({...newEmp, id: e.target.value})}
                  />
                  <p className="text-[9px] text-slate-400 font-medium italic">Link an existing account by providing their unique ID found in the Auth console.</p>
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
                  <Button type="submit" className="w-full rounded-xl h-12 bg-slate-900 font-bold shadow-lg shadow-slate-900/20">
                    Register Record in System
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
                <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Role & Access</th>
                <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Pay Basis</th>
                <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">System UID</th>
                <th className="px-8 py-5 text-right text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Management</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((emp) => {
                const isSystemAdmin = isAdmin(emp.id);
                return (
                  <tr key={emp.id} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-5 font-bold text-slate-900">{emp.fullName}</td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        {isSystemAdmin && (
                          <Badge className="rounded-full bg-slate-900 text-white text-[10px] font-black px-3 py-1 uppercase tracking-wider">
                            <Shield className="mr-1 h-3 w-3" /> Admin
                          </Badge>
                        )}
                        <Badge variant="outline" className="rounded-full border-slate-200 text-slate-500 text-[10px] font-bold px-3 py-1 uppercase">
                          Employee
                        </Badge>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">{emp.defaultDailyRate}</span>
                    </td>
                    <td className="px-8 py-5 text-[10px] font-mono text-slate-400">{emp.id}</td>
                    <td className="px-8 py-5 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="rounded-full hover:bg-white hover:shadow-sm">
                            <MoreHorizontal className="h-4 w-4 text-slate-400" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl border-slate-100 shadow-xl p-2 w-56">
                          <DropdownMenuItem 
                            className="rounded-lg font-bold text-xs uppercase tracking-wider text-slate-600 gap-2 cursor-pointer"
                            onClick={() => handleStartEdit(emp)}
                          >
                            <Pencil className="h-3 w-3" /> Edit Profile
                          </DropdownMenuItem>
                          
                          {isRoleManagement && (
                            <>
                              {isSystemAdmin ? (
                                <DropdownMenuItem 
                                  className="rounded-lg font-bold text-xs uppercase tracking-wider text-rose-600 gap-2 cursor-pointer"
                                  onClick={() => onRevokeAdmin?.(emp.id)}
                                >
                                  <ShieldAlert className="h-3 w-3" /> Revoke Admin
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem 
                                  className="rounded-lg font-bold text-xs uppercase tracking-wider text-primary gap-2 cursor-pointer"
                                  onClick={() => onGrantAdmin?.(emp.id)}
                                >
                                  <Shield className="h-3 w-3" /> Grant Admin
                                </DropdownMenuItem>
                              )}
                            </>
                          )}
                          
                          <DropdownMenuItem 
                            className="rounded-lg font-bold text-xs uppercase tracking-wider text-rose-600 gap-2 cursor-pointer focus:bg-rose-50 focus:text-rose-600"
                            onClick={() => onDeleteEmployee(emp.id)}
                          >
                            <UserMinus className="h-3 w-3" /> Terminate Access
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="rounded-[2.5rem] p-8 border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Modify System Profile</DialogTitle>
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
