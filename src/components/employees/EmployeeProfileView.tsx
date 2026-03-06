
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
  
  if (!employee) return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Account Profile</h3>
        <p className="text-sm text-slate-500 font-medium">Manage your personal system profile and employment settings.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          <Card className="rounded-[2.5rem] border-0 shadow-sm overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-1.5">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Full Name</p>
                  <p className="text-lg font-black text-slate-900 uppercase tracking-tight">{employee.fullName}</p>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Primary Role</p>
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-primary" />
                    <p className="text-lg font-black text-slate-900 uppercase tracking-tight">{employee.role}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-1.5">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Email Address</p>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-slate-400" />
                    <p className="text-sm font-bold text-slate-900">{employee.email}</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Contact Number</p>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-slate-400" />
                    <p className="text-sm font-bold text-slate-900">{employee.contactNumber}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-1.5">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Employment Status</p>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    <p className="text-sm font-bold text-slate-900 uppercase tracking-widest">Active Member</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">System ID</p>
                  <p className="text-lg font-mono text-slate-900 tracking-tight">{employee.id.slice(0, 12)}...</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[2.5rem] border-0 shadow-sm overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Payment & Contract</CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="grid grid-cols-2 gap-8">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Contract Basis</p>
                    <p className="text-sm font-black text-slate-900 uppercase">{employee.defaultDailyRate} Rate</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Payment Method</p>
                    <p className="text-sm font-black text-slate-900 uppercase">{employee.paymentMethod || "Direct Deposit"}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <Card className="rounded-[2.5rem] border-0 shadow-sm overflow-hidden bg-slate-900 text-white p-10 text-center flex flex-col items-center gap-6">
            <div className="h-24 w-24 rounded-[2.5rem] bg-white/10 flex items-center justify-center text-white shadow-2xl">
              <User className="h-12 w-12" />
            </div>
            <div>
              <h4 className="text-xl font-black uppercase tracking-tighter">{employee.fullName}</h4>
              <p className="text-[10px] font-bold text-white/50 uppercase tracking-[0.2em] mt-1">System Oriented Member</p>
            </div>
            <div className="h-px w-full bg-white/10" />
            <div className="w-full space-y-4">
              <Button variant="outline" className="w-full h-12 rounded-xl border-white/20 hover:bg-white/10 text-white font-bold text-[10px] uppercase tracking-widest" onClick={() => signOut(auth)}>
                <LogOut className="mr-2 h-4 w-4" /> Sign Out
              </Button>
            </div>
          </Card>

          <div className="bg-primary/5 rounded-[2rem] p-8 space-y-4">
            <div className="flex items-center gap-3">
              <Fingerprint className="h-5 w-5 text-primary" />
              <p className="text-[10px] font-black uppercase tracking-widest text-primary">Security Node</p>
            </div>
            <p className="text-xs font-medium text-slate-500 leading-relaxed">
              Your credentials are managed by System Oriented LLC. To update your name or banking details, please contact an administrator.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
