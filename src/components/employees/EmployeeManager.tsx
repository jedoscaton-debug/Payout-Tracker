
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
  
  const [newAccess, setNewAccess] = useState({
    id: "",
    fullName: "",
  });

  const [newStaff, setNewStaff] = useState({
    fullName: "",
    defaultDailyRate: "Varies",
    paymentMethod: "Direct Deposit"
  });

  const filtered = employees.filter(e => 
    e.fullName.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmitAccess = (e: React.FormEvent) => {
    e.preventDefault();
    onAddEmployee({
      id: newAccess.id,
      fullName: newAccess.fullName,
      defaultDailyRate: "Varies",
      paymentMethod: "Direct Deposit"
    });
    setNewAccess({ id: "", fullName: "" });
    setIsAddOpen(false);
  };

  const handleSubmitStaff = (e: React.FormEvent) => {
    e.preventDefault();
    onAddEmployee({
      id: `emp-${Date.now()}`,
      ...newStaff
    });
    setNewStaff({ fullName: "", defaultDailyRate: "Varies", paymentMethod: "Direct Deposit" });
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
            {isRoleManagement ? "Admin Access Board" : "Employee Directory"}
          </h3>
          <p className="text-sm text-slate-500 font-medium">
            {isRoleManagement 
              ? "Manage system-wide permissions and grant administrative rights to registered names." 
              : "Manage staff details, default rates, and payment configurations for the workforce."}
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
                <Plus className="mr-2 h-4 w-4" /> {isRoleManagement ? "Register Access" : "Add Staff Member"}
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-[2.5rem] p-8 border-none shadow-2xl bg-white">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black uppercase tracking-tighter">
                  {isRoleManagement ? "Register Access Node" : "Register Staff Member"}
                </DialogTitle>
              </DialogHeader>
              
              {isRoleManagement ? (
                <form onSubmit={handleSubmitAccess} className="space-y-6 mt-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Username / Name</Label>
                    <Input 
                      required
                      placeholder="e.g. John Doe"
                      className="h-12 rounded-xl border-slate-100 bg-slate-50 focus:bg-white" 
                      value={newAccess.fullName}
                      onChange={(e) => setNewAccess({...newAccess, fullName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">System UID</Label>
                    <Input 
                      required
                      placeholder="pEdBZ1Y8AbeTrUKSC4..."
                      className="h-12 rounded-xl border-slate-100 bg-slate-50 focus:bg-white font-mono text-[11px]" 
                      value={newAccess.id}
                      onChange={(e) => setNewAccess({...newAccess, id: e.target.value})}
                    />
                  </div>
                  <DialogFooter className="pt-4">
                    <Button type="submit" className="w-full rounded-xl h-12 bg-slate-900 font-bold shadow-lg shadow-slate-900/20">
                      Link System Access
                    </Button>
                  </DialogFooter>
                </form>
              ) : (
                <form onSubmit={handleSubmitStaff} className="space-y-6 mt-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Full Name</Label>
                    <Input 
                      required
                      className="h-12 rounded-xl border-slate-100 bg-slate-50 focus:bg-white" 
                      value={newStaff.fullName}
                      onChange={(e) => setNewStaff({...newStaff, fullName: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Default Rate</Label>
                      <Input 
                        className="h-12 rounded-xl border-slate-100 bg-slate-50 focus:bg-white" 
                        value={newStaff.defaultDailyRate}
                        onChange={(e) => setNewStaff({...newStaff, defaultDailyRate: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Payment Method</Label>
                      <Input 
                        className="h-12 rounded-xl border-slate-100 bg-slate-50 focus:bg-white" 
                        value={newStaff.paymentMethod}
                        onChange={(e) => setNewStaff({...newStaff, paymentMethod: e.target.value})}
                      />
                    </div>
                  </div>
                  <DialogFooter className="pt-4">
                    <Button type="submit" className="w-full rounded-xl h-12 bg-slate-900 font-bold shadow-lg shadow-slate-900/20">
                      Create Staff Profile
                    </Button>
                  </DialogFooter>
                </form>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="rounded-[2.5rem] border-0 shadow-sm overflow-hidden bg-white">
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Member</th>
                {isRoleManagement ? (
                  <>
                    <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">System Access</th>
                    <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Linked UID</th>
                  </>
                ) : (
                  <>
                    <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Daily Rate</th>
                    <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Payment Method</th>
                  </>
                )}
                <th className="px-8 py-5 text-right text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((emp) => {
                const isSystemAdmin = isAdmin(emp.id);
                return (
                  <tr key={emp.id} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-5 font-bold text-slate-900">{emp.fullName}</td>
                    {isRoleManagement ? (
                      <>
                        <td className="px-8 py-5">
                          {isSystemAdmin ? (
                            <Badge className="rounded-full bg-slate-900 text-white text-[10px] font-black px-3 py-1 uppercase tracking-wider">
                              <Shield className="mr-1 h-3 w-3" /> Admin Access
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="rounded-full border-slate-200 text-slate-500 text-[10px] font-bold px-3 py-1 uppercase">
                              Standard Access
                            </Badge>
                          )}
                        </td>
                        <td className="px-8 py-5 text-[10px] font-mono text-slate-400">{emp.id}</td>
                      </>
                    ) : (
                      <>
                        <td className="px-8 py-5">
                          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">{emp.defaultDailyRate}</span>
                        </td>
                        <td className="px-8 py-5">
                          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">{emp.paymentMethod}</span>
                        </td>
                      </>
                    )}
                    <td className="px-8 py-5 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="rounded-full hover:bg-white hover:shadow-sm">
                            <MoreHorizontal className="h-4 w-4 text-slate-400" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl border-slate-100 shadow-xl p-2 w-56 bg-white">
                          {!isRoleManagement && (
                            <DropdownMenuItem 
                              className="rounded-lg font-bold text-xs uppercase tracking-wider text-slate-600 gap-2 cursor-pointer"
                              onClick={() => handleStartEdit(emp)}
                            >
                              <Pencil className="h-3 w-3" /> Edit Staff Profile
                            </DropdownMenuItem>
                          )}
                          
                          {isRoleManagement && (
                            <>
                              {isSystemAdmin ? (
                                <DropdownMenuItem 
                                  className="rounded-lg font-bold text-xs uppercase tracking-wider text-rose-600 gap-2 cursor-pointer"
                                  onClick={() => onRevokeAdmin?.(emp.id)}
                                >
                                  <ShieldAlert className="h-3 w-3" /> Revoke Admin Rights
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem 
                                  className="rounded-lg font-bold text-xs uppercase tracking-wider text-primary gap-2 cursor-pointer"
                                  onClick={() => onGrantAdmin?.(emp.id)}
                                >
                                  <Shield className="h-3 w-3" /> Grant Admin Rights
                                </DropdownMenuItem>
                              )}
                            </>
                          )}
                          
                          <DropdownMenuItem 
                            className="rounded-lg font-bold text-xs uppercase tracking-wider text-rose-600 gap-2 cursor-pointer focus:bg-rose-50 focus:text-rose-600"
                            onClick={() => onDeleteEmployee(emp.id)}
                          >
                            <UserMinus className="h-3 w-3" /> {isRoleManagement ? "Terminate Access" : "Remove Staff Member"}
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

      {/* Edit Dialog (Staff only) */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="rounded-[2.5rem] p-8 border-none shadow-2xl bg-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Edit Staff Record</DialogTitle>
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
                  Update Staff Record
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
