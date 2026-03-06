
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Employee } from "@/app/lib/types";
import { Plus, Search, MoreHorizontal, Pencil, Shield, UserMinus, Key, Copy, Check, ShieldAlert, Mail, Phone, Briefcase, Link as LinkIcon, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface EmployeeManagerProps {
  employees: Employee[];
  onAddEmployee: (employee: Employee) => void;
  onUpdateEmployee: (employee: Employee) => void;
  onDeleteEmployee: (id: string) => void;
  isRoleManagement?: boolean;
  allAdmins?: any[];
  onGrantAdmin?: (uid: string) => void;
  onRevokeAdmin?: (uid: string) => void;
  directoryEmployees?: Employee[];
  onLinkProfile?: (uid: string, employee: Employee) => void;
}

export function EmployeeManager({ 
  employees, 
  onAddEmployee, 
  onUpdateEmployee, 
  onDeleteEmployee,
  isRoleManagement = false,
  allAdmins = [],
  onGrantAdmin,
  onRevokeAdmin,
  directoryEmployees = [],
  onLinkProfile
}: EmployeeManagerProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isLinkOpen, setIsLinkOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [linkingUID, setLinkingUID] = useState<string | null>(null);
  const [selectedEmployeeForLinking, setSelectedEmployeeForLinking] = useState<Employee | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { toast } = useToast();
  
  const [newAccess, setNewAccess] = useState({
    username: "",
  });

  const [newStaff, setNewStaff] = useState<Omit<Employee, 'id'>>({
    fullName: "",
    role: "Driver",
    email: "",
    contactNumber: "",
    defaultDailyRate: "Varies",
    paymentMethod: "Direct Deposit"
  });

  const filtered = employees.filter(e => 
    (isRoleManagement ? (e.fullName || (e as any).username || e.id) : e.fullName).toLowerCase().includes(search.toLowerCase())
  );

  const generateUID = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleCopy = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    toast({ title: "UID Copied", description: "System UID copied to clipboard." });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSubmitAccess = (e: React.FormEvent) => {
    e.preventDefault();
    const generatedId = generateUID();
    onAddEmployee({
      id: generatedId,
      fullName: newAccess.username,
      role: "Driver",
      email: `${newAccess.username.toLowerCase()}@system.oriented`,
      contactNumber: "",
      defaultDailyRate: "Varies",
      paymentMethod: "Direct Deposit"
    });
    setNewAccess({ username: "" });
    setIsAddOpen(false);
    toast({ 
      title: "Access Node Created", 
      description: `User "${newAccess.username}" registered with UID: ${generatedId}.`,
    });
  };

  const handleSubmitStaff = (e: React.FormEvent) => {
    e.preventDefault();
    onAddEmployee({
      id: `emp-${Date.now()}`,
      ...newStaff
    });
    setNewStaff({ 
      fullName: "", 
      role: "Driver", 
      email: "", 
      contactNumber: "", 
      defaultDailyRate: "Varies", 
      paymentMethod: "Direct Deposit" 
    });
    setIsAddOpen(false);
  };

  const handleSubmitLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (linkingUID && selectedEmployeeForLinking && onLinkProfile) {
      onLinkProfile(linkingUID, selectedEmployeeForLinking);
      setIsLinkOpen(false);
      setLinkingUID(null);
      setSelectedEmployeeForLinking(null);
    }
  };

  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingEmployee) {
      onUpdateEmployee(editingEmployee);
      setIsEditOpen(false);
      setEditingEmployee(null);
    }
  };

  const getAdminRole = (uid: string) => allAdmins.find(a => a.id === uid)?.role || null;
  const isProfileLinked = (uid: string) => directoryEmployees.some(e => e.id === uid);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">
            {isRoleManagement ? "Master Access Board" : "Employee Directory"}
          </h3>
          <p className="text-sm text-slate-500 font-medium">
            {isRoleManagement 
              ? "Register access nodes and connect staff members to usernames." 
              : "Manage detailed staff records and HR configurations."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder={isRoleManagement ? "Search nodes..." : "Search directory..."}
              className="pl-10 h-11 w-64 rounded-xl" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl h-11 bg-primary px-6 font-bold shadow-lg shadow-primary/20">
                <Plus className="mr-2 h-4 w-4" /> {isRoleManagement ? "Register Access" : "Add Staff Member"}
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-[2.5rem] p-8 border-none shadow-2xl bg-white max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black uppercase tracking-tighter">
                  {isRoleManagement ? "Register Access Node" : "Register Staff Member"}
                </DialogTitle>
              </DialogHeader>
              
              {isRoleManagement ? (
                <form onSubmit={handleSubmitAccess} className="space-y-6 mt-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Username</Label>
                    <Input required placeholder="e.g. alemer" className="h-12 rounded-xl" value={newAccess.username || ""} onChange={(e) => setNewAccess({username: e.target.value})} />
                  </div>
                  <DialogFooter className="pt-4">
                    <Button type="submit" className="w-full rounded-xl h-12 bg-slate-900 font-bold uppercase tracking-widest text-xs">Authorize Access Node</Button>
                  </DialogFooter>
                </form>
              ) : (
                <form onSubmit={handleSubmitStaff} className="space-y-6 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Full Name</Label>
                      <Input required className="h-12 rounded-xl" value={newStaff.fullName || ""} onChange={(e) => setNewStaff({...newStaff, fullName: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Role</Label>
                      <Select value={newStaff.role} onValueChange={(v: any) => setNewStaff({...newStaff, role: v})}>
                        <SelectTrigger className="h-12 rounded-xl">
                          <SelectValue placeholder="Select Role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Driver">Driver</SelectItem>
                          <SelectItem value="Helper">Helper</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Email Address</Label>
                      <Input required type="email" className="h-12 rounded-xl" value={newStaff.email || ""} onChange={(e) => setNewStaff({...newStaff, email: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Contact Number</Label>
                      <Input required className="h-12 rounded-xl" value={newStaff.contactNumber || ""} onChange={(e) => setNewStaff({...newStaff, contactNumber: e.target.value})} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Daily Rate</Label>
                      <Input className="h-12 rounded-xl" value={newStaff.defaultDailyRate || ""} onChange={(e) => setNewStaff({...newStaff, defaultDailyRate: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Payment Method</Label>
                      <Input className="h-12 rounded-xl" value={newStaff.paymentMethod || ""} onChange={(e) => setNewStaff({...newStaff, paymentMethod: e.target.value})} />
                    </div>
                  </div>
                  <DialogFooter className="pt-4">
                    <Button type="submit" className="w-full rounded-xl h-12 bg-slate-900 font-bold uppercase tracking-widest text-xs">Create HR Profile</Button>
                  </DialogFooter>
                </form>
              )}
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
                  <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{isRoleManagement ? "Username" : "Staff Member"}</th>
                  {isRoleManagement ? (
                    <>
                      <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Tier</th>
                      <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Profile Status</th>
                      <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">System UID</th>
                    </>
                  ) : (
                    <>
                      <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Role</th>
                      <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Contact</th>
                      <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Rate</th>
                      <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Payment</th>
                    </>
                  )}
                  <th className="px-8 py-5 text-right text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((emp) => {
                  const role = getAdminRole(emp.id);
                  const isMaster = role === 'master';
                  const isAdmin = role === 'admin';
                  const linked = isProfileLinked(emp.id);

                  return (
                    <tr key={emp.id} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-5 font-bold text-slate-900">
                        {isRoleManagement ? ((emp as any).username || emp.fullName) : emp.fullName}
                        {!isRoleManagement && (
                          <div className="flex items-center gap-2 mt-1">
                            <Mail className="h-3 w-3 text-slate-300" />
                            <span className="text-[10px] font-medium text-slate-400 lowercase">{emp.email}</span>
                          </div>
                        )}
                      </td>
                      {isRoleManagement ? (
                        <>
                          <td className="px-8 py-5">
                            {isMaster ? (
                              <Badge className="rounded-full bg-slate-900 text-white text-[10px] font-black px-3 py-1 uppercase tracking-widest border-none shadow-lg shadow-slate-900/10">
                                <ShieldAlert className="mr-1.5 h-3 w-3" /> Master
                              </Badge>
                            ) : isAdmin ? (
                              <Badge className="rounded-full bg-primary text-white text-[10px] font-black px-3 py-1 uppercase tracking-widest border-none">
                                <Shield className="mr-1.5 h-3 w-3" /> Admin
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest text-slate-400 border-slate-200">Standard</Badge>
                            )}
                          </td>
                          <td className="px-8 py-5">
                            {linked ? (
                              <div className="flex items-center gap-2 text-emerald-500 font-bold text-[10px] uppercase">
                                <LinkIcon className="h-3 w-3" /> Connected
                              </div>
                            ) : (
                              <Button variant="ghost" size="sm" className="h-7 text-primary font-bold text-[10px] uppercase tracking-widest p-0 hover:bg-transparent" onClick={() => {setLinkingUID(emp.id); setIsLinkOpen(true);}}>
                                <UserPlus className="mr-1.5 h-3 w-3" /> Link Profile
                              </Button>
                            )}
                          </td>
                          <td className="px-8 py-5 font-mono text-[10px] text-slate-400">
                            <div className="flex items-center gap-2">
                              <Key className="h-3 w-3" />
                              <span>{emp.id}</span>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 text-slate-300 hover:text-primary"
                                onClick={() => handleCopy(emp.id)}
                              >
                                {copiedId === emp.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                              </Button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-2">
                              <Briefcase className="h-3 w-3 text-primary/40" />
                              <span className="text-xs font-bold text-slate-600 uppercase">{emp.role || "Driver"}</span>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-2">
                              <Phone className="h-3 w-3 text-slate-300" />
                              <span className="text-[10px] font-bold text-slate-500">{emp.contactNumber || "N/A"}</span>
                            </div>
                          </td>
                          <td className="px-8 py-5 text-xs font-bold text-slate-600 uppercase">{emp.defaultDailyRate || "Varies"}</td>
                          <td className="px-8 py-5 text-xs font-bold text-slate-600 uppercase">{emp.paymentMethod || "Direct Deposit"}</td>
                        </>
                      )}
                      <td className="px-8 py-5 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4 text-slate-400" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl p-2 w-56">
                            {!isRoleManagement && <DropdownMenuItem onClick={() => {setEditingEmployee(emp); setIsEditOpen(true);}}><Pencil className="mr-2 h-3 w-3" /> Edit Profile</DropdownMenuItem>}
                            {isRoleManagement && !isMaster && (
                              <DropdownMenuItem onClick={() => isAdmin ? onRevokeAdmin?.(emp.id) : onGrantAdmin?.(emp.id)} className={isAdmin ? "text-rose-600" : "text-primary"}>
                                <Shield className="mr-2 h-3 w-3" /> {isAdmin ? "Revoke Admin" : "Grant Admin"}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => onDeleteEmployee(emp.id)} className="text-rose-600" disabled={isMaster}>
                              <UserMinus className="mr-2 h-3 w-3" /> {isRoleManagement ? "Terminate Access" : "Remove Staff"}
                            </DropdownMenuItem>
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

      {/* Linking Dialog - UPDATED TO DROPDOWN */}
      <Dialog open={isLinkOpen} onOpenChange={setIsLinkOpen}>
        <DialogContent className="rounded-[2.5rem] p-8 border-none shadow-2xl bg-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Connect Staff Record</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitLink} className="space-y-6 mt-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Select Staff Member</Label>
              <Select onValueChange={(val) => {
                const emp = directoryEmployees.find(e => e.id === val);
                if (emp) setSelectedEmployeeForLinking(emp);
              }}>
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue placeholder="Choose an employee..." />
                </SelectTrigger>
                <SelectContent>
                  {directoryEmployees.filter(emp => !employees.some(node => node.id === emp.id)).map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.fullName} ({emp.role})</SelectItem>
                  ))}
                  {directoryEmployees.filter(emp => !employees.some(node => node.id === emp.id)).length === 0 && (
                    <p className="p-4 text-[10px] font-bold text-slate-400 uppercase text-center">No available profiles</p>
                  )}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="pt-4">
              <Button type="submit" disabled={!selectedEmployeeForLinking} className="w-full rounded-xl h-12 bg-slate-900 font-bold uppercase tracking-widest text-xs">Authorize & Connect Profile</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="rounded-[2.5rem] p-8 border-none shadow-2xl bg-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Edit HR Profile</DialogTitle>
          </DialogHeader>
          {editingEmployee && (
            <form onSubmit={handleSubmitEdit} className="space-y-6 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Full Name</Label>
                  <Input required value={editingEmployee.fullName || ""} onChange={(e) => setEditingEmployee({...editingEmployee, fullName: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Role</Label>
                  <Select value={editingEmployee.role} onValueChange={(v: any) => setEditingEmployee({...editingEmployee, role: v})}>
                    <SelectTrigger className="h-12 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Driver">Driver</SelectItem>
                      <SelectItem value="Helper">Helper</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Email Address</Label>
                  <Input required type="email" value={editingEmployee.email || ""} onChange={(e) => setEditingEmployee({...editingEmployee, email: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Contact Number</Label>
                  <Input required value={editingEmployee.contactNumber || ""} onChange={(e) => setEditingEmployee({...editingEmployee, contactNumber: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Daily Rate</Label>
                  <Input value={editingEmployee.defaultDailyRate || ""} onChange={(e) => setEditingEmployee({...editingEmployee, defaultDailyRate: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Payment Method</Label>
                  <Input value={editingEmployee.paymentMethod || ""} onChange={(e) => setEditingEmployee({...editingEmployee, paymentMethod: e.target.value})} />
                </div>
              </div>
              <DialogFooter className="pt-4"><Button type="submit" className="w-full rounded-xl h-12 bg-primary font-bold uppercase tracking-widest text-xs">Save Changes</Button></DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
