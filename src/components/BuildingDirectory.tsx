import { useMemo, useState } from "react";
import { Building2, Loader2, Search } from "lucide-react";
import type { BuildingRow } from "@/lib/types";
import { BuildingCard } from "@/components/BuildingCard";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface BuildingDirectoryProps {
  buildings: BuildingRow[];
  loading?: boolean;
  onSelect: (building: BuildingRow) => void;
}

export function BuildingDirectory({ buildings, loading, onSelect }: BuildingDirectoryProps) {
  const [query, setQuery] = useState("");
  const filteredBuildings = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return buildings;

    return buildings.filter((building) =>
      [
        building.number,
        building.name_en,
        building.name_pt,
        building.description,
        building.department,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [buildings, query]);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background px-3 py-1.5 text-xs font-semibold transition hover:border-[var(--mb-blue)] hover:text-[var(--mb-blue)]"
        >
          <Building2 className="h-3.5 w-3.5" />
          View all buildings
          <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
            {buildings.length}
          </span>
        </button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="z-[1001] flex h-full w-full max-w-5xl flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl lg:max-w-5xl"
      >
        <SheetHeader className="border-b border-border px-5 py-5 pr-12 sm:px-7">
          <SheetTitle className="flex items-center gap-2 text-xl">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--mb-blue)] text-white">
              <Building2 className="h-5 w-5" />
            </span>
            Building directory
          </SheetTitle>
          <SheetDescription>Browse every plant building and choose a destination.</SheetDescription>

          <label className="mt-3 flex items-center gap-2 rounded-xl border border-input bg-background px-3 py-2.5 focus-within:ring-2 focus-within:ring-ring">
            <Search className="h-4 w-4 text-muted-foreground" />
            <span className="sr-only">Search buildings</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by building, number, or description"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </label>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto bg-secondary/25 p-4 sm:p-6">
          {loading ? (
            <div className="grid h-64 place-items-center text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading buildings…
              </div>
            </div>
          ) : filteredBuildings.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredBuildings.map((building) => (
                <BuildingCard key={building.id} building={building} onSelect={onSelect} />
              ))}
            </div>
          ) : (
            <div className="grid h-64 place-items-center px-6 text-center">
              <div>
                <Building2 className="mx-auto mb-3 h-8 w-8 text-muted-foreground/60" />
                <p className="font-medium">No buildings found</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Try a different building name or number.
                </p>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
