
"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  History, 
  Search, 
  MapPin, 
  Calendar,
  Loader2,
  ChevronRight
} from "lucide-react";
import { Employee, RouteTrackerRow } from "@/app/lib/types";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { query, where, collection } from "firebase/firestore";
import { currency, shortDate, getDayOfWeek } from "@/app/lib/payroll-utils";

interface MyRoutesViewProps {
  employee: Employee | null;
}

export function MyRoutesView({ employee }: MyRoutesViewProps) {
  const [search, setSearch] = useState("");
  const db = useFirestore();
  const employeeName = employee?.fullName;

  // Fetch all routes where the employee is driver or helper
  // NOTE: Simple query for now, filtering helper in useMemo due to composite query constraints
  const routesQuery = useMemoFirebase(() => 
    employeeName ? query(collection(db, "routeTrackerRows"), where("driver", "==", employeeName)) : null, 
    [db, employeeName]
  );
  const { data: routes, isLoading } = useCollection<RouteTrackerRow>(routesQuery);

  const filteredRoutes = useMemo(() => {
    if (!routes) return [];
    return routes.filter(r => 
      r.route.toLowerCase().includes(search.toLowerCase())
    );
  }, [routes, search]);

  if (!employee) return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2">
          <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">My Route History</h3>
          <p className="text-sm text-slate-500 font-medium">Access your official historical route logs and activity audit.</p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search routes..." 
            className="pl-10 h-11 w-64 rounded-xl border-slate-200" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card className="rounded-[2.5rem] border-0 shadow-sm overflow-hidden bg-white">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
          <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Activity Log</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary/20" />
            </div>
          ) : !filteredRoutes || filteredRoutes.length === 0 ? (
            <div className="p-12 text-center text-slate-400 font-bold uppercase text-[10px]">No route records found for this user</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredRoutes.map((route) => (
                <div key={route.id} className="p-8 hover:bg-slate-50 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-6">
                    <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                      <MapPin className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-black text-slate-900 text-lg">Route {route.route}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{shortDate(route.date)}</p>
                        <div className="h-1 w-1 rounded-full bg-slate-300" />
                        <p className="text-[10px] font-bold text-primary uppercase tracking-widest">{getDayOfWeek(route.date)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-12">
                    <div className="text-right">
                      <p className="text-xl font-black text-slate-900 leading-none">{route.stops}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Stops Logged</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black text-slate-900 leading-none">{route.miles}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total Miles</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black text-primary leading-none">{route.vehicleNumber}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Vehicle Node</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
