import { createFileRoute, Link } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { fetchBuildings, getBuildingName } from "@/lib/buildings";
import { PlantMap, type BuildingMarker } from "@/components/PlantMap";
import { TopBar } from "@/components/TopBar";
import {
  bearingBetween,
  buildSteps,
  closestOnPath,
  findRoute,
  formatArrival,
  formatDistance,
  formatEta,
  metersToNextTurn,
  remainingMeters,
  type Point,
  type Step,
} from "@/lib/routing";
import { CATEGORY_LABEL, MODE_LABEL, type TransportMode } from "@/lib/plant";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ArrowLeft,
  Car,
  CheckCircle2,
  CornerUpLeft,
  CornerUpRight,
  Crosshair,
  Flag,
  Footprints,
  MoveUp,
  Play,
  Pause,
  Phone,
  RefreshCcw,
  Truck,
  Forklift,
  X,
} from "lucide-react";
import type { BuildingRow } from "@/lib/types";

export const Route = createFileRoute("/nav/$destId")({
  component: NavPage,
});

const MODE_ICON: Record<TransportMode, typeof Car> = {
  pedestrian: Footprints,
  car: Car,
  truck: Truck,
  forklift: Forklift,
};

const OFF_ROUTE_METERS = 25; // pixels ≈ 40 crop-px; converted below
const OFF_ROUTE_PX = 45;

function NavPage() {
  const { destId } = Route.useParams();
  const { data: buildings = [] } = useQuery({
    queryKey: ["buildings"],
    queryFn: fetchBuildings,
  });

  const [mode, setMode] = useState<TransportMode>("pedestrian");
  const [arrived, setArrived] = useState(false);
  const [recalcKey, setRecalcKey] = useState(0);
  const [follow, setFollow] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [simIndex, setSimIndex] = useState(0);
  const [userPos, setUserPos] = useState<Point | null>(null);
  const [userHeading, setUserHeading] = useState(0);
  const [recalcMsg, setRecalcMsg] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const destination = useMemo(() => buildings.find((b) => b.id === destId), [buildings, destId]);
  const origin = useMemo(
    () => buildings.find((b) => b.number === "P1") ?? buildings[0],
    [buildings],
  );

  // Route is computed from the current user position (if any) or the origin.
  const routeOrigin: Point | null = userPos
    ? userPos
    : origin
      ? { x: origin.x, y: origin.y }
      : null;

  const route = useMemo(() => {
    if (!routeOrigin || !destination) return null;
    return findRoute(routeOrigin, { x: destination.x, y: destination.y }, mode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeOrigin?.x, routeOrigin?.y, destination?.id, mode, recalcKey]);

  const steps: Step[] = useMemo(() => (route ? buildSteps(route.path) : []), [route]);

  // Position on route + next-turn calculation
  const nav = useMemo(() => {
    if (!route || !userPos) return null;
    const proj = closestOnPath(route.path, userPos);
    const remaining = remainingMeters(route.path, proj.segIndex, proj.t);
    // Next non-consumed step
    let nextStep: Step | undefined;
    for (const s of steps) {
      if (s.atIndex > proj.segIndex || (s.atIndex === proj.segIndex && proj.t < 0.95)) {
        if (s.turn !== "straight" || s === steps[0]) {
          nextStep = s;
          if (s.turn !== "straight") break;
        }
      }
    }
    const upcomingTurn =
      steps.find(
        (s) =>
          s.turn !== "straight" &&
          (s.atIndex > proj.segIndex || (s.atIndex === proj.segIndex && proj.t < 0.95)),
      ) ?? steps[steps.length - 1];
    const metersToTurn = metersToNextTurn(route.path, proj.segIndex, proj.t, upcomingTurn.atIndex);
    return {
      proj,
      remaining,
      nextStep: nextStep ?? steps[0],
      upcomingTurn,
      metersToTurn,
      offRoutePx: proj.distance,
    };
  }, [route, userPos, steps]);

  // Auto-recalc when off-route
  useEffect(() => {
    if (!nav || !userPos) return;
    if (nav.offRoutePx > OFF_ROUTE_PX) {
      setRecalcMsg("Recalculating route…");
      const t = setTimeout(() => {
        setRecalcKey((k) => k + 1);
        setRecalcMsg(null);
      }, 700);
      return () => clearTimeout(t);
    }
  }, [nav?.offRoutePx, userPos]);

  // Track recent
  useEffect(() => {
    if (typeof window === "undefined" || !destination) return;
    try {
      const raw = JSON.parse(localStorage.getItem("mb-recent") ?? "[]") as string[];
      const next = [destination.id, ...raw.filter((x) => x !== destination.id)].slice(0, 5);
      localStorage.setItem("mb-recent", JSON.stringify(next));
    } catch {
      /* noop */
    }
  }, [destination]);

  // Simulation mode: walk along the route
  const simTimer = useRef<number | null>(null);
  useEffect(() => {
    if (!simulating || !route) return;
    simTimer.current = window.setInterval(() => {
      setSimIndex((i) => {
        const path = route.path;
        if (i >= path.length - 1) {
          setSimulating(false);
          return i;
        }
        const a = path[i];
        const b = path[i + 1];
        setUserPos(b);
        setUserHeading(bearingBetween(a, b) + 90); // rotate so 0=north on our arrow
        return i + 1;
      });
    }, 900);
    return () => {
      if (simTimer.current) window.clearInterval(simTimer.current);
    };
  }, [simulating, route]);

  const startSimulation = () => {
    if (!route) return;
    setSimIndex(0);
    setUserPos(route.path[0]);
    if (route.path.length > 1) {
      setUserHeading(bearingBetween(route.path[0], route.path[1]) + 90);
    }
    setSimulating(true);
    setFollow(true);
  };

  const centerOnUser = () => setFollow(true);

  async function confirmArrival() {
    if (!destination) return;
    await supabase.from("arrivals").insert({
      building_id: destination.id,
      source: "web",
    });
    setArrived(true);
    setSimulating(false);
    toast.success("Arrival recorded!");
  }

  // Auto-arrival when very close to destination
  useEffect(() => {
    if (!nav || !destination || arrived) return;
    if (nav.remaining < 10) {
      setArrived(true);
      setSimulating(false);
      toast.success("You have arrived at your destination!");
    }
  }, [nav?.remaining, destination, arrived]);

  if (!destination || !origin) {
    return (
      <div className="grid h-screen place-items-center">
        <div className="text-muted-foreground text-sm">Loading destination…</div>
      </div>
    );
  }

  const markers: BuildingMarker[] = buildings.map((b) => ({
    id: b.id,
    number: b.number,
    name: getBuildingName(b),
    category: b.category,
    x: b.x,
    y: b.y,
    description: b.description,
    department: b.department,
    responsible: b.responsible,
    phone: b.phone,
    hours: b.hours,
    dock: b.dock,
  }));

  const displayStep = nav?.upcomingTurn ?? steps[0];
  const distanceToTurn = nav?.metersToTurn ?? 0;
  const remaining = nav?.remaining ?? route?.distance ?? 0;
  const remainingSec = route ? Math.round((remaining / route.distance) * route.etaSeconds) : 0;

  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-background">
      <TopBar />

      <div className="absolute inset-0">
        <ClientOnly
          fallback={
            <div className="grid h-full place-items-center text-sm text-muted-foreground">
              Loading map…
            </div>
          }
        >
          <PlantMap
            buildings={markers}
            routePath={route?.path}
            origin={{ x: origin.x, y: origin.y }}
            destination={{ x: destination.x, y: destination.y }}
            userPosition={userPos ?? undefined}
            userHeading={userHeading}
            followUser={follow && !!userPos}
            followZoom={1.5}
            fitBounds={!userPos}
            fitBoundsKey={recalcKey}
          />
        </ClientOnly>
      </div>

      {/* Top Waze-style instruction panel */}
      <div className="pointer-events-none absolute inset-x-0 top-16 z-[500] flex justify-center px-3 sm:top-20">
        <div className="pointer-events-auto flex w-full max-w-xl items-center gap-3 rounded-2xl border border-border bg-[var(--mb-blue)] px-4 py-3 text-white shadow-[var(--shadow-elegant)]">
          <TurnGlyph turn={displayStep?.turn ?? "straight"} />
          <div className="min-w-0 flex-1">
            <div className="text-2xl font-bold leading-none">
              {distanceToTurn > 0 ? `${distanceToTurn} m` : "Now"}
            </div>
            <div className="text-sm opacity-90 truncate">
              {displayStep?.text ?? "Calculating route…"}
            </div>
          </div>
          <button
            onClick={centerOnUser}
            className="rounded-full bg-white/15 p-2 hover:bg-white/25"
            aria-label="Center on user"
            title="Center"
          >
            <Crosshair className="h-4 w-4" />
          </button>
        </div>
        {recalcMsg && (
          <div className="pointer-events-none absolute -bottom-8 rounded-full bg-black/70 px-3 py-1 text-xs text-white">
            {recalcMsg}
          </div>
        )}
      </div>

      {/* Bottom sheet with route summary + controls */}
      <aside className="pointer-events-none absolute inset-x-0 bottom-0 z-[500] flex justify-center p-3 sm:p-4">
        <div className="pointer-events-auto flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-elegant)]">
          {arrived ? (
            <ArrivalCard building={destination} onBack={() => window.history.back()} />
          ) : (
            <>
              <div className="flex items-center gap-3 border-b border-border p-3">
                <Link to="/" className="rounded-full p-2 hover:bg-accent" aria-label="Back">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
                <span
                  className={`mb-marker ${destination.category}`}
                  style={{ minWidth: 40, height: 40, fontSize: 13 }}
                >
                  {destination.number}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    {CATEGORY_LABEL[destination.category]}
                  </div>
                  <div className="text-sm font-semibold leading-tight truncate">
                    {getBuildingName(destination)}
                  </div>
                </div>
                <button
                  onClick={() => setExpanded((v) => !v)}
                  className="rounded-md border border-border px-2 py-1 text-xs hover:bg-accent"
                >
                  {expanded ? "Less" : "More"}
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 border-b border-border p-3">
                <Stat label="Distance" value={formatDistance(remaining)} emphasis />
                <Stat label="Time" value={formatEta(remainingSec)} />
                <Stat label="Arrival" value={formatArrival(remainingSec)} />
              </div>

              <div className="flex flex-wrap items-center gap-1.5 border-b border-border bg-secondary/40 p-3">
                {(["pedestrian", "car", "truck", "forklift"] as TransportMode[]).map((m) => {
                  const Icon = MODE_ICON[m];
                  const active = mode === m;
                  const disabled = m === "forklift";
                  return (
                    <button
                      key={m}
                      disabled={disabled}
                      onClick={() => setMode(m)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                        active
                          ? "border-[var(--mb-blue)] bg-[var(--mb-blue)] text-white"
                          : "border-border bg-background hover:border-[var(--mb-blue)]"
                      } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {MODE_LABEL[m]}
                    </button>
                  );
                })}
              </div>

              {expanded && (
                <div className="max-h-56 overflow-y-auto border-b border-border p-3">
                  <ol className="space-y-2 text-sm">
                    {steps.map((s, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <StepGlyph turn={s.turn} />
                        <div className="flex-1">
                          <div>{s.text}</div>
                          {s.distanceM > 0 && (
                            <div className="text-xs text-muted-foreground">{s.distanceM} m</div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              <div className="flex flex-wrap gap-2 p-3">
                <Button variant="outline" size="sm" onClick={() => setRecalcKey((k) => k + 1)}>
                  <RefreshCcw className="mr-1 h-4 w-4" /> Recalculate
                </Button>
                <Button variant="outline" size="sm" onClick={centerOnUser}>
                  <Crosshair className="mr-1 h-4 w-4" /> Center
                </Button>
                {simulating ? (
                  <Button variant="outline" size="sm" onClick={() => setSimulating(false)}>
                    <Pause className="mr-1 h-4 w-4" /> Pause
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={startSimulation}>
                    <Play className="mr-1 h-4 w-4" /> Simulate route
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={confirmArrival}
                  className="ml-auto bg-[var(--mb-blue)] hover:bg-[var(--mb-blue-dark)] text-white"
                >
                  <CheckCircle2 className="mr-1 h-4 w-4" /> Confirm arrival
                </Button>
                <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
                  <X className="mr-1 h-4 w-4" /> End
                </Button>
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

function Stat({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`text-lg font-semibold ${emphasis ? "text-[var(--mb-blue)]" : ""}`}>
        {value}
      </div>
    </div>
  );
}

function TurnGlyph({ turn }: { turn: Step["turn"] }) {
  const Icon =
    turn === "left"
      ? CornerUpLeft
      : turn === "right"
        ? CornerUpRight
        : turn === "arrive"
          ? Flag
          : MoveUp;
  return (
    <div className="grid h-12 w-12 place-items-center rounded-xl bg-white/15">
      <Icon className="h-6 w-6" />
    </div>
  );
}

function StepGlyph({ turn }: { turn: Step["turn"] }) {
  const Icon =
    turn === "left"
      ? CornerUpLeft
      : turn === "right"
        ? CornerUpRight
        : turn === "arrive"
          ? Flag
          : MoveUp;
  return (
    <div className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--mb-blue)] text-white">
      <Icon className="h-3.5 w-3.5" />
    </div>
  );
}

function ArrivalCard({ building, onBack }: { building: BuildingRow; onBack: () => void }) {
  return (
    <div className="p-5 text-sm">
      <div className="mb-2 flex items-center gap-2 text-green-700 dark:text-green-300">
        <CheckCircle2 className="h-6 w-6" />
        <div className="text-base font-semibold">You have arrived at your destination</div>
      </div>
      <p className="text-muted-foreground">
        Welcome to Building {building.number} — {getBuildingName(building)}. Please wait for
        unloading authorization, if applicable.
      </p>
      {building.phone && (
        <a
          href={`tel:${building.phone}`}
          className="mt-3 inline-flex items-center gap-2 text-[var(--mb-blue)]"
        >
          <Phone className="h-4 w-4" /> {building.phone}
        </a>
      )}
      <div className="mt-4 flex justify-end">
        <Button onClick={onBack} variant="outline">
          Back to map
        </Button>
      </div>
    </div>
  );
}
