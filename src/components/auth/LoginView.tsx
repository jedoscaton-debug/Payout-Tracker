"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/firebase";
import { initiateEmailSignIn, initiateEmailSignUp } from "@/firebase/non-blocking-login";
import { Loader2, ShieldCheck, Mail, Lock, UserPlus } from "lucide-react";

export function LoginView() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const auth = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    if (isSignUp) {
      initiateEmailSignUp(auth, email, password);
    } else {
      initiateEmailSignIn(auth, email, password);
    }
    
    setTimeout(() => setIsLoading(false), 2000);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50/50 p-6">
      <div className="w-full max-w-[450px] space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-[2rem] bg-primary text-white shadow-2xl shadow-primary/30">
            <svg viewBox="0 0 100 100" className="h-10 w-10 fill-white">
              <circle cx="50" cy="50" r="40" fill="#4461B5"/>
              <text x="35" y="68" style={{ fontFamily: 'Inter', fontWeight: 900, fontSize: '50px' }} fill="white">S</text>
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">System Access</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Payout Tracker | System Oriented LLC</p>
          </div>
        </div>

        <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-10 pb-8 text-center">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
              {isSignUp ? "Create Account" : "Secure Authentication"}
            </CardTitle>
            <CardDescription className="text-xs font-medium text-slate-500 mt-2">
              {isSignUp ? "Register your professional credentials below." : "Enter your professional credentials to manage payroll logs."}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-10 pt-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-1">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    required
                    type="email"
                    placeholder="name@systemoriented.com"
                    className="h-14 rounded-2xl pl-12 border-slate-100 bg-slate-50/50 focus:bg-white transition-all font-medium" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Password</Label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    required
                    type="password"
                    placeholder="••••••••"
                    className="h-14 rounded-2xl pl-12 border-slate-100 bg-slate-50/50 focus:bg-white transition-all font-medium" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <Button type="submit" className="w-full h-14 rounded-2xl bg-primary text-white font-bold shadow-xl shadow-primary/20 hover:-translate-y-0.5 transition-all" disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : isSignUp ? (
                    <>
                      <UserPlus className="mr-2 h-5 w-5" /> Create Profile
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="mr-2 h-5 w-5" /> Authenticate Account
                    </>
                  )}
                </Button>
                
                <Button 
                  type="button" 
                  variant="ghost" 
                  className="w-full text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary hover:bg-slate-50 rounded-xl"
                  onClick={() => setIsSignUp(!isSignUp)}
                >
                  {isSignUp ? "Already have an account? Log In" : "Need an account? Sign Up"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
        
        <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Authorized Personnel Only. Contact system administrator for access.
        </p>
      </div>
    </div>
  );
}
