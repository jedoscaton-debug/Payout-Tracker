"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Receipt, TrendingUp, MapPin, ArrowUpRight, Loader2, Wallet } from "lucide-react";
import { Employee, PayrollItem, RouteTrackerRow } from "@/app/lib/types";
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase";
import { collectionGroup, query, where, collection, limit, orderBy } from "firebase/firestore";
import { computeTotals, currency, shortDate } from "@/app/lib/payroll-utils";

interface EmployeeDashboardProps {
  employee: Employee | null;
}

export function EmployeeDashboard({ employee }: EmployeeDashboardProps) {
  const db = useFirestore();
  const { user } = useUser();
  const employeeName = employee?.fullName;
  const userEmail = user?.email?.toLowerCase().trim();

  // Fetch recent payroll items using email filter for security rules
  const itemsQuery = useMemoFirebase(() => 
    userEmail ? query(
      collectionGroup(db, "payrollItems"), 
      where("employeeEmailSnapshot", "==", userEmail),
      limit(10)
    ) : null, 
    [db, userEmail]
  );
  const { data: paystubs, isLoading: itemsLoading } = useCollection<PayrollItem>(itemsQuery, { enabled: !!userEmail });

  // Fetch recent routes
  const routesQuery = useMemoFirebase(() => 
    employeeName ? query(
      collection(db, "routeTrackerRows"), 
      where("driver", "==", employeeName), 
      limit(5)
    ) : null, 
    [db, employeeName]
  );
  const { data: recentRoutes, isLoading: routesLoading } = useCollection<RouteTrackerRow>(routesQuery, { enabled: !!employeeName });

  const stats = useMemo(() => {
    if (!paystubs) return { totalNet: 0, lastCheck: 0, count: 0 };
    const totals = paystubs.map(computeTotals);
    return {
      totalNet: totals.reduce((sum, t) => sum + t.netPay, 0),
      lastCheck: totals.length > 0 ? totals[0].netPay : 0,
      count: totals.length
    };
  }, [paystubs]);

  if (itemsLoading || routesLoading) {
    return <div className="p-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary/20" /></div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Welcome back, {employeeName?.split(' ')[0]}</h3>
        <p className="text-sm text-slate-500 font-medium">Overview of your latest earnings and route activity.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="rounded-[2rem] border-0 shadow-sm bg-white p-8">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500"><TrendingUp className="h-6 w-6" /></div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Earnings</p>
              <p className="text-2xl font-black text-slate-900 leading-none mt-1">{currency(stats.totalNet)}</p>
            </div>
          </div>
        </Card>
        <Card className="rounded-[2rem] border-0 shadow-sm bg-white p-8">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary"><Receipt className="h-6 w-6" /></div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Last Statement</p>
              <p className="text-2xl font-black text-slate-900 leading-none mt-1">{currency(stats.lastCheck)}</p>
            </div>
          </div>
        </Card>
        <Card className="rounded-[2rem] border-0 shadow-sm bg-white p-8">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500"><MapPin className="h-6 w-6" /></div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Recent Routes</p>
              <p className="text-2xl font-black text-slate-900 leading-none mt-1">{recentRoutes?.length || 0}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <Card className="rounded-[2.5rem] border-0 shadow-sm overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/50 border-b p-8"><CardTitle className="text-[10px] font-black uppercase text-slate-400">Latest Route Activity</CardTitle></CardHeader>
          <CardContent className="p-0">
            {!recentRoutes?.length ? <div className="p-12 text-center text-slate-400 uppercase text-[10px]">No recent routes</div> : (
              <div className="divide-y">
                {recentRoutes.map(route => (
                  <div key={route.id} className="p-6 hover:bg-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center"><ArrowUpRight className="h-5 w-5 text-slate-400" /></div>
                      <div><p className="font-bold text-sm">Route {route.route}</p><p className="text-[10px] font-bold text-slate-400 uppercase">{shortDate(route.date)}</p></div>
                    </div>
                    <div className="text-right"><p className="text-sm font-black">{route.stops} Stops</p><p className="text-[10px] font-bold text-slate-400 uppercase">{route.miles} Mi</p></div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="rounded-[2.5rem] border-0 shadow-sm overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/50 border-b p-8"><CardTitle className="text-[10px] font-black uppercase text-slate-400">Statement History</CardTitle></CardHeader>
          <CardContent className="p-0">
            {!paystubs?.length ? <div className="p-12 text-center text-slate-400 uppercase text-[10px]">No statements yet</div> : (
              <div className="divide-y">
                {paystubs.map(item => {
                  const totals = computeTotals(item);
                  return (
                    <div key={item.id} className="p-6 hover:bg-slate-50 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><Wallet className="h-5 w-5" /></div>
                        <div><p className="font-bold text-sm">{item.dailyRateSnapshot} Basis</p><p className="text-[10px] font-bold text-slate-400 uppercase">Run: {item.payrollRunId.split('-').pop()}</p></div>
                      </div>
                      <div className="text-right"><p className="text-sm font-black text-primary">{currency(totals.netPay)}</p><p className="text-[10px] font-bold text-emerald-500 uppercase">Final Net</p></div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
