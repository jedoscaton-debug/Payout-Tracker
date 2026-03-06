
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth, useFirestore, updateDocumentNonBlocking, useMemoFirebase, useDoc } from "@/firebase";
import { initiateEmailSignIn, initiateEmailSignUp } from "@/firebase/non-blocking-login";
import { Loader2, ShieldCheck, Mail, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { collection, query, where, getDocs, doc } from "firebase/firestore";

export function LoginView() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(""); // This is the Access Key (UID)
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const auth = useAuth();
  const db = useFirestore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password.length < 6) {
      toast({
        variant: "destructive",
        title: "Invalid Access Key",
        description: "Your System UID must be at least 6 characters long.",
      });
      return;
    }

    setIsLoading(true);
    const cleanEmail = email.toLowerCase().trim();
    const accessKey = password.trim();
    
    try {
      // 0. Master Admin Logic
      if (cleanEmail === "masteradmin@system.oriented" && accessKey === "STUDIO-MASTER-2026") {
        await initiateEmailSignIn(auth, cleanEmail, accessKey).catch(() => initiateEmailSignUp(auth, cleanEmail, accessKey));
        toast({ title: "Master Access Granted" });
        setIsLoading(false);
        return;
      }

      // 1. Verify Email exists in Employee Registry
      const employeesRef = collection(db, "employees");
      const q = query(employeesRef, where("email", "==", cleanEmail));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        toast({
          variant: "destructive",
          title: "Access Denied",
          description: "No registered staff member found with this email address.",
        });
        setIsLoading(false);
        return;
      }

      const employeeDoc = snapshot.docs[0];
      const employeeData = employeeDoc.data();
      
      // Verify the Access Key matches the ID
      if (employeeDoc.id !== accessKey) {
        toast({
          variant: "destructive",
          title: "Verification Failed",
          description: "The Access Key provided is incorrect for this email address.",
        });
        setIsLoading(false);
        return;
      }

      // 2. Perform Authentication
      const userCredential = await initiateEmailSignIn(auth, cleanEmail, accessKey).catch(async (error) => {
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found') {
          return await initiateEmailSignUp(auth, cleanEmail, accessKey);
        }
        throw error;
      });

      // 3. Link profile to auth UID
      if (userCredential?.user) {
        const docRef = doc(db, "employees", employeeDoc.id);
        updateDocumentNonBlocking(docRef, { authUid: userCredential.user.uid });
      }

      toast({ title: "Authorized", description: `Welcome back, ${employeeData.fullName}.` });

    } catch (error: any) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Login Error",
        description: error.message || "An error occurred during authentication.",
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
            <svg viewBox="0 0 100 100" className="h-10 w-10 fill-white">
              <circle cx="50" cy="50" r="40" fill="#4461B5"/>
              <text x="35" y="68" style={{ fontFamily: 'Inter', fontWeight: 900, fontSize: '50px' }} fill="white">S</text>
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Staff Portal</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Payout Tracker | System Oriented LLC</p>
          </div>
        </div>

        <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-10 pb-8 text-center">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Identity Verification</CardTitle>
            <CardDescription className="text-xs font-medium text-slate-500 mt-2">Enter your registered email and provided Access Key.</CardDescription>
          </CardHeader>
          <CardContent className="p-10 pt-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-1">Registered Email</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    required type="email" placeholder="name@example.com"
                    className="h-14 rounded-2xl pl-12 border-slate-100 bg-slate-50/50 focus:bg-white transition-all font-medium" 
                    value={email} onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-1">Access Key (UID)</Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    required type="password" placeholder="Enter assigned UID"
                    className="h-14 rounded-2xl pl-12 border-slate-100 bg-slate-50/50 focus:bg-white transition-all font-medium" 
                    value={password} onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full h-14 rounded-2xl bg-primary text-white font-bold shadow-xl shadow-primary/20 hover:-translate-y-0.5 transition-all" disabled={isLoading}>
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><ShieldCheck className="mr-2 h-5 w-5" /> Sign In</>}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
