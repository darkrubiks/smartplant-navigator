import { useLanguage } from "@/hooks/use-language";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { fetchBuildings, getBuildingName, getBuildingDetails } from "@/lib/buildings";
import { SearchBar } from "@/components/SearchBar";
import { TopBar } from "@/components/TopBar";
import { PlantMap, type BuildingMarker } from "@/components/PlantMap";
import { BuildingDirectory } from "@/components/BuildingDirectory";
import { Star, History, Zap } from "lucide-react";
import type { BuildingRow } from "@/lib/types";

export const Route = createFileRoute("/")({
  component: Home,
});

const QUICK_NUMBERS = ["P1", "39", "45", "118", "P2", "104"];

function useRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem("mb-recent") ?? "[]") as string[];
  } catch {
    return [];
  }
}

function Home() {
  const { language, t } = useLanguage();
  const router = useRouter();
  const { data: buildings = [], isLoading } = useQuery({
    queryKey: ["buildings"],
    queryFn: fetchBuildings,
  });
  const [focused, setFocused] = useState<BuildingMarker | null>(null);
  const recentIds = useRecent();
  const [favorites] = useState<string[]>([]);

  const markers: BuildingMarker[] = useMemo(
    () =>
      buildings.map((b) => ({
        id: b.id,
        number: b.number,
        name: getBuildingName(b),
        category: b.category,
        x: b.x,
        y: b.y,
        phone: b.phone,
        ...getBuildingDetails(b, language),
      })),
    [buildings, language],
  );

  const quickBuildings = useMemo(
    () =>
      QUICK_NUMBERS.map((n) => buildings.find((b) => b.number === n)).filter(
        (b): b is BuildingRow => !!b,
      ),
    [buildings],
  );

  const goTo = (b: BuildingRow) =>
    router.navigate({ to: "/nav/$destId", params: { destId: b.id } });

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-background">
      <TopBar />

      <ClientOnly
        fallback={
          <div className="grid h-full w-full place-items-center text-sm text-muted-foreground">
            {t("Loading map…")}
          </div>
        }
      >
        <PlantMap
          buildings={markers}
          focusedBuilding={focused}
          onDirections={(b) => {
            const full = buildings.find((x) => x.id === b.id);
            if (full) goTo(full);
          }}
        />
      </ClientOnly>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[500] flex justify-center px-3 pb-4 sm:pb-6">
        <div className="pointer-events-auto w-full max-w-2xl space-y-3">
          <SearchBar
            buildings={buildings}
            loading={isLoading}
            onSelect={(b) =>
              setFocused({
                id: b.id,
                number: b.number,
                name: getBuildingName(b),
                category: b.category,
                x: b.x,
                y: b.y,
              })
            }
          />

          <div className="rounded-2xl bg-card/95 border border-border/70 shadow-[var(--shadow-elegant)] backdrop-blur p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <Zap className="h-3.5 w-3.5 text-[var(--mb-blue)]" /> {t("Quick destinations")}
              </div>
              <BuildingDirectory buildings={buildings} loading={isLoading} onSelect={goTo} />
            </div>
            <div className="flex flex-wrap gap-2">
              {quickBuildings.map((b) => (
                <button
                  key={b.id}
                  onClick={() => goTo(b)}
                  className="group flex items-center gap-2 rounded-full border border-border/60 bg-background px-3 py-1.5 text-xs font-medium hover:border-[var(--mb-blue)] hover:text-[var(--mb-blue)] transition"
                >
                  <span
                    className={`mb-marker ${b.category}`}
                    style={{ minWidth: 22, height: 22, fontSize: 10 }}
                  >
                    {b.number}
                  </span>
                  <span className="truncate max-w-[140px]">{getBuildingName(b)}</span>
                </button>
              ))}
            </div>
            {(recentIds.length > 0 || favorites.length > 0) && (
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <History className="h-3 w-3" /> {t("Recent")}: {recentIds.length}
                </div>
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3" /> {t("Favorites")}: {favorites.length}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
