import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MBLogo } from "@/components/TopBar";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Users, MapPin, Search, TrendingUp, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — SmartPlant Navigator" }] }),
  component: DashboardPage,
});

type Kpis = { arrivals: number; searches: number; suppliers: number; buildings: number };

function DashboardPage() {
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [topDest, setTopDest] = useState<Array<{ name: string; count: number }>>([]);

  useEffect(() => {
    (async () => {
      const [arrivals, searches, suppliers, buildings] = await Promise.all([
        supabase.from("arrivals").select("id", { count: "exact", head: true }),
        supabase.from("search_logs").select("id", { count: "exact", head: true }),
        supabase.from("supplier_tokens").select("id", { count: "exact", head: true }),
        supabase.from("buildings").select("id", { count: "exact", head: true }),
      ]);
      setKpis({
        arrivals: arrivals.count ?? 0,
        searches: searches.count ?? 0,
        suppliers: suppliers.count ?? 0,
        buildings: buildings.count ?? 0,
      });

      const { data } = await supabase
        .from("arrivals")
        .select("building_id, buildings(name_pt, name_en, number)")
        .limit(500);
      const map = new Map<string, number>();
      (data ?? []).forEach((r) => {
        const b = (
          r as { buildings?: { name_pt: string; name_en: string | null; number: string } | null }
        ).buildings;
        if (!b) return;
        const key = `${b.number} — ${b.name_en?.trim() || b.name_pt}`;
        map.set(key, (map.get(key) ?? 0) + 1);
      });
      setTopDest(
        [...map.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([name, count]) => ({ name, count })),
      );
    })();
  }, []);

  return (
    <div className="min-h-screen bg-secondary/30">
      <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
        <Link to="/" className="rounded-full p-2 hover:bg-accent">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <MBLogo />
        <div className="ml-auto text-sm text-muted-foreground">Operations dashboard</div>
      </header>
      <main className="mx-auto max-w-6xl space-y-6 p-6">
        {!kpis ? (
          <div className="grid place-items-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Kpi icon={<MapPin className="h-5 w-5" />} label="Arrivals" value={kpis.arrivals} />
            <Kpi icon={<Search className="h-5 w-5" />} label="Searches" value={kpis.searches} />
            <Kpi
              icon={<Users className="h-5 w-5" />}
              label="Supplier tokens"
              value={kpis.suppliers}
            />
            <Kpi
              icon={<TrendingUp className="h-5 w-5" />}
              label="Registered buildings"
              value={kpis.buildings}
            />
          </div>
        )}

        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            <TrendingUp className="h-4 w-4" /> Most visited destinations
          </div>
          {topDest.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No data yet. Record arrivals to view the chart.
            </div>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topDest}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    height={70}
                  />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#1a68c7" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--mb-blue)]/10 text-[var(--mb-blue)]">
          {icon}
        </span>
        {label}
      </div>
      <div className="mt-2 text-3xl font-semibold">{value.toLocaleString("en-US")}</div>
    </Card>
  );
}
