
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth, useFirestore, updateDocumentNonBlocking } from "@/firebase";
import { initiateEmailSignIn, initiateEmailSignUp } from "@/firebase/non-blocking-login";
import { Loader2, ShieldCheck, User, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { doc, getDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";

export function LoginView() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
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
    
    const systemUid = password.trim();
    const email = `${systemUid.toLowerCase()}@system.oriented`;
    const cleanUsername = username.toLowerCase().trim();
    
    try {
      // 1. Verify the System UID exists in our registry first
      const userDocRef = doc(db, "system_users", systemUid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        toast({
          variant: "destructive",
          title: "Access Denied",
          description: "This Access Key (System UID) is not registered in the system.",
        });
        setIsLoading(false);
        return;
      }

      const registeredData = userDoc.data();
      if (registeredData.username.toLowerCase() !== cleanUsername) {
        toast({
          variant: "destructive",
          title: "Verification Failed",
          description: "Username does not match the record for this Access Key.",
        });
        setIsLoading(false);
        return;
      }

      // 2. Perform Authentication
      let userCredential;
      try {
        userCredential = await initiateEmailSignIn(auth, email, systemUid);
      } catch (signInError: any) {
        if (signInError.code === 'auth/invalid-credential' || signInError.code === 'auth/user-not-found') {
          // Automatic registration for the first time
          userCredential = await initiateEmailSignUp(auth, email, systemUid);
        } else {
          throw signInError;
        }
      }

      // 3. Update the mapping between System UID and Firebase UID
      if (userCredential?.user) {
        updateDocumentNonBlocking(userDocRef, { authUid: userCredential.user.uid });
      }

      toast({
        title: "Access Authorized",
        description: `Authenticated as ${registeredData.username}.`
      });

    } catch (error: any) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Authentication Failed",
        description: "An error occurred during authentication. Please try again.",
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
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">System Access</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Payout Tracker | System Oriented LLC</p>
          </div>
        </div>

        <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-10 pb-8 text-center">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
              Identity Verification
            </CardTitle>
            <CardDescription className="text-xs font-medium text-slate-500 mt-2">
              Enter your assigned Username and System UID to access your dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-10 pt-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-1">Username</Label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    required
                    type="text"
                    placeholder="e.g. jdoe"
                    className="h-14 rounded-2xl pl-12 border-slate-100 bg-slate-50/50 focus:bg-white transition-all font-medium" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-1">System UID (Access Key)</Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    required
                    type="password"
                    placeholder="Enter assigned UID"
                    className="h-14 rounded-2xl pl-12 border-slate-100 bg-slate-50/50 focus:bg-white transition-all font-medium" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>
              
              <Button type="submit" className="w-full h-14 rounded-2xl bg-primary text-white font-bold shadow-xl shadow-primary/20 hover:-translate-y-0.5 transition-all" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <ShieldCheck className="mr-2 h-5 w-5" /> Authenticate Account
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
        
        <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
          Authorized Nodes Only. Access requires pre-approval from a system administrator.
        </p>
      </div>
    </div>
  );
}
