
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/firebase";
import { initiateEmailSignIn, initiateEmailSignUp } from "@/firebase/non-blocking-login";
import { Loader2, ShieldCheck, Mail, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function LoginView() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const auth = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsLoading(true);
    const cleanEmail = email.toLowerCase().trim();
    const accessKey = password.trim();
    
    try {
      // Restricted Master Admin Login
      if (cleanEmail === "masteradmin@system.oriented" && accessKey === "STUDIO-MASTER-2026") {
        await initiateEmailSignIn(auth, cleanEmail, accessKey).catch(() => initiateEmailSignUp(auth, cleanEmail, accessKey));
        toast({ title: "Master Access Granted" });
      } else if (cleanEmail === "admin@systemoriented.com" || cleanEmail === "jedocaton1997@gmail.com") {
        // Allow hardcoded master admins if they have an existing account
        await initiateEmailSignIn(auth, cleanEmail, accessKey);
        toast({ title: "Admin Authorized" });
      } else {
        toast({
          variant: "destructive",
          title: "Access Denied",
          description: "This portal is restricted to authorized administrators only.",
        });
      }
    } catch (error: any) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Authentication Failed",
        description: "Invalid credentials or unauthorized access attempt.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50/50 p-6">
      <div className="w-full max-w-[450px] space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-[2rem] bg-primary text-white shadow-2xl shadow-primary/30">
            <ShieldCheck className="h-10 w-10" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Admin Portal</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Management Terminal | System Oriented LLC</p>
          </div>
        </div>

        <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-10 pb-8 text-center">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Security Checkpoint</CardTitle>
            <CardDescription className="text-xs font-medium text-slate-500 mt-2">Enter authorized administrative credentials.</CardDescription>
          </CardHeader>
          <CardContent className="p-10 pt-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-1">Admin Email</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    required type="email" placeholder="admin@example.com"
                    className="h-14 rounded-2xl pl-12 border-slate-100 bg-slate-50/50 focus:bg-white transition-all font-medium" 
                    value={email} onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-1">Security Key</Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    required type="password" placeholder="••••••••"
                    className="h-14 rounded-2xl pl-12 border-slate-100 bg-slate-50/50 focus:bg-white transition-all font-medium" 
                    value={password} onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full h-14 rounded-2xl bg-primary text-white font-bold shadow-xl shadow-primary/20 hover:-translate-y-0.5 transition-all" disabled={isLoading}>
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><ShieldCheck className="mr-2 h-5 w-5" /> Authorized Login</>}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
