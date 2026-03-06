
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  UserCircle, 
  Settings, 
  CreditCard, 
  ShieldCheck, 
  LogOut,
  Mail,
  User,
  Fingerprint,
  Phone,
  Briefcase
} from "lucide-react";
import { Employee } from "@/app/lib/types";
import { useAuth } from "@/firebase";
import { signOut } from "firebase/auth";

interface EmployeeProfileViewProps {
  employee: Employee | null;
}

export function EmployeeProfileView({ employee }: EmployeeProfileViewProps) {
  const auth = useAuth();
  
  if (!employee || !employee.fullName) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center space-y-6 bg-white rounded-[2.5rem] shadow-sm animate-in fade-in duration-700">
        <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
          <UserCircle className="h-10 w-10" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900">Profile Not Found</h3>
          <p className="text-sm font-medium text-slate-500 max-w-xs mx-auto">Your node is active, but your HR record is not yet connected. Please contact an administrator to link your profile.</p>
        </div>
        <Button variant="outline" className="rounded-xl h-12 px-8 font-bold text-xs uppercase tracking-widest" onClick={() => signOut(auth)}>
          <LogOut className="mr-2 h-4 w-4" /> Sign Out
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Personal Identity</h3>
        <p className="text-sm text-slate-500 font-medium">Manage your system credentials and verified employment record.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          <Card className="rounded-[2.5rem] border-0 shadow-sm overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Employment Record</CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-10">
              <div className="grid grid-cols-2 gap-10">
                <div className="space-y-2">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Legal Full Name</p>
                  <p className="text-lg font-black text-slate-900 uppercase tracking-tight">{employee.fullName || "Unregistered"}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Primary Role</p>
                  <div className="flex items-center gap-2.5">
                    <Briefcase className="h-4 w-4 text-primary" />
                    <p className="text-lg font-black text-slate-900 uppercase tracking-tight">{employee.role || "Standard Member"}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-10 pt-4 border-t border-slate-50">
                <div className="space-y-2">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Registered Email</p>
                  <div className="flex items-center gap-2.5">
                    <Mail className="h-4 w-4 text-slate-400" />
                    <p className="text-sm font-bold text-slate-900">{employee.email || "No email provided"}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Contact Number</p>
                  <div className="flex items-center gap-2.5">
                    <Phone className="h-4 w-4 text-slate-400" />
                    <p className="text-sm font-bold text-slate-900">{employee.contactNumber || "No number provided"}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-10 pt-4 border-t border-slate-50">
                <div className="space-y-2">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">System Status</p>
                  <div className="flex items-center gap-2.5">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <p className="text-sm font-bold text-slate-900 uppercase tracking-widest">Active System Node</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Node Identifier</p>
                  <p className="text-lg font-mono text-slate-900 tracking-tight">{employee.id}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[2.5rem] border-0 shadow-sm overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Payment & Contract Basis</CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="grid grid-cols-2 gap-10">
                <div className="flex items-start gap-4 p-6 rounded-2xl bg-slate-50/50">
                  <div className="h-10 w-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-primary shadow-sm">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Pay Basis</p>
                    <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{employee.defaultDailyRate || "Varies"} Rate</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-6 rounded-2xl bg-slate-50/50">
                  <div className="h-10 w-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-primary shadow-sm">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Preferred Payout</p>
                    <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{employee.paymentMethod || "Direct Deposit"}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <Card className="rounded-[2.5rem] border-0 shadow-sm overflow-hidden bg-slate-900 text-white p-12 text-center flex flex-col items-center gap-8">
            <div className="h-28 w-28 rounded-[2.5rem] bg-white/10 flex items-center justify-center text-white shadow-2xl backdrop-blur-md">
              <User className="h-14 w-14" />
            </div>
            <div className="space-y-2">
              <h4 className="text-2xl font-black uppercase tracking-tighter leading-none">{employee.fullName}</h4>
              <p className="text-[10px] font-bold text-white/50 uppercase tracking-[0.2em]">Verified System Member</p>
            </div>
            <div className="h-px w-full bg-white/10" />
            <div className="w-full space-y-4">
              <Button variant="outline" className="w-full h-14 rounded-2xl border-white/20 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-widest transition-all" onClick={() => signOut(auth)}>
                <LogOut className="mr-3 h-4 w-4" /> Terminate Session
              </Button>
            </div>
          </Card>

          <div className="bg-primary/5 border border-primary/10 rounded-[2.5rem] p-10 space-y-5">
            <div className="flex items-center gap-3">
              <Fingerprint className="h-5 w-5 text-primary" />
              <p className="text-[10px] font-black uppercase tracking-widest text-primary">Secure Access Node</p>
            </div>
            <p className="text-xs font-medium text-slate-500 leading-relaxed italic">
              "Your system identity is linked via a unique node ID. All modifications to your HR record or access level must be authorized by a Master Administrator."
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
