
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/firebase";
import { initiateEmailSignIn, initiateEmailSignUp } from "@/firebase/non-blocking-login";
import { Loader2, ShieldCheck, User, Lock, UserPlus, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function LoginView() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const { toast } = useToast();
  const auth = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password.length < 6) {
      toast({
        variant: "destructive",
        title: "Weak System UID",
        description: "The System UID must be at least 6 characters long for security purposes.",
      });
      return;
    }

    setIsLoading(true);
    
    // Internal mapping to allow username-style login with Firebase Auth
    const email = `${username.toLowerCase().trim()}@system.oriented`;
    
    try {
      if (isSignUp) {
        await initiateEmailSignUp(auth, email, password);
        toast({
          title: "Registration Success",
          description: "System node created. Waiting for admin authorization."
        });
      } else {
        await initiateEmailSignIn(auth, email, password);
        toast({
          title: "Access Granted",
          description: "Authenticated successfully. Syncing roles..."
        });
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      let message = "An error occurred during authentication.";
      
      // Handle Firebase merged error codes
      if (error.code === 'auth/invalid-credential') {
        message = isSignUp 
          ? "This node may already be registered. Try Logging In instead." 
          : "Invalid username or system UID. If this is your first time, please Register your node first.";
      } else if (error.code === 'auth/weak-password') {
        message = "The System UID must be at least 6 characters long.";
      } else if (error.code === 'auth/email-already-in-use') {
        message = "This username is already registered in the system. Try logging in.";
      }

      toast({
        variant: "destructive",
        title: "Authentication Failed",
        description: message,
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
              {isSignUp ? "Register Node" : "Secure Authentication"}
            </CardTitle>
            <CardDescription className="text-xs font-medium text-slate-500 mt-2">
              {isSignUp 
                ? "First-time setup: Create your professional system identity." 
                : "Enter your professional credentials to manage payroll logs."}
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
                    placeholder="e.g. alemer"
                    className="h-14 rounded-2xl pl-12 border-slate-100 bg-slate-50/50 focus:bg-white transition-all font-medium" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">System UID (Password)</Label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    required
                    type="password"
                    placeholder="Minimum 6 characters"
                    className="h-14 rounded-2xl pl-12 border-slate-100 bg-slate-50/50 focus:bg-white transition-all font-medium" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                {password.length > 0 && password.length < 6 && (
                  <p className="text-[9px] font-bold text-rose-500 uppercase px-1 mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> UID too short (Min 6 chars)
                  </p>
                )}
              </div>
              
              <div className="space-y-4">
                <Button type="submit" className="w-full h-14 rounded-2xl bg-primary text-white font-bold shadow-xl shadow-primary/20 hover:-translate-y-0.5 transition-all" disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : isSignUp ? (
                    <>
                      <UserPlus className="mr-2 h-5 w-5" /> Register Account
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
                  {isSignUp ? "Already registered? Log In" : "Need to register for the first time? Sign Up"}
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
