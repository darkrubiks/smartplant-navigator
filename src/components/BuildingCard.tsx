import { useLanguage } from "@/hooks/use-language";
import { ArrowUpRight, Building2, MapPin } from "lucide-react";
import type { BuildingRow } from "@/lib/types";
import { getBuildingName, getBuildingDescription } from "@/lib/buildings";
import { getCategoryLabel } from "@/lib/plant";
import { cn } from "@/lib/utils";

const CATEGORY_ACCENT: Record<BuildingRow["category"], string> = {
  industrial: "bg-cat-industrial",
  social: "bg-cat-social",
  auxiliary: "bg-cat-auxiliary",
  gate: "bg-cat-gate",
};

interface BuildingCardProps {
  building: BuildingRow;
  onSelect: (building: BuildingRow) => void;
}

export function BuildingCard({ building, onSelect }: BuildingCardProps) {
  const { language, t } = useLanguage();
  return (
    <article className="group flex min-h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[var(--shadow-soft)] transition duration-200 hover:-translate-y-0.5 hover:border-[var(--mb-blue)]/35 hover:shadow-[var(--shadow-elegant)]">
      <div className="relative aspect-[16/9] overflow-hidden bg-secondary">
        {building.photo_url ? (
          <img
            src={building.photo_url}
            alt={t("{name} — Building {number}", {
              name: getBuildingName(building),
              number: building.number,
            })}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
            loading="lazy"
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = `${import.meta.env.BASE_URL}planta-sbc.jpg`;
              event.currentTarget.classList.add("opacity-50", "grayscale");
            }}
          />
        ) : (
          <div className="relative grid h-full place-items-center overflow-hidden bg-[linear-gradient(145deg,var(--color-secondary),var(--color-muted))]">
            <img
              src={`${import.meta.env.BASE_URL}planta-sbc.jpg`}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover opacity-25 grayscale"
              loading="lazy"
            />
            <div className="relative grid h-14 w-14 place-items-center rounded-2xl border border-white/60 bg-card/90 text-[var(--mb-blue)] shadow-lg backdrop-blur">
              <Building2 className="h-7 w-7" aria-hidden="true" />
            </div>
          </div>
        )}

        <div className="absolute left-3 top-3 flex items-center gap-2">
          <span
            className={cn(
              "inline-flex min-w-9 items-center justify-center rounded-full border-2 border-white px-2 py-1 text-xs font-bold text-white shadow-md",
              CATEGORY_ACCENT[building.category],
              building.category === "social" && "text-foreground",
            )}
          >
            {building.number}
          </span>
          <span className="rounded-full bg-black/65 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur">
            {getCategoryLabel(building.category)}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-base font-semibold leading-snug">{getBuildingName(building)}</h3>
        <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-muted-foreground">
          {getBuildingDescription(building, language) ||
            t("No description is available for this building yet.")}
        </p>
        <button
          type="button"
          onClick={() => onSelect(building)}
          className="mt-4 inline-flex items-center justify-between rounded-xl border border-border bg-secondary/50 px-3 py-2 text-sm font-semibold transition hover:border-[var(--mb-blue)] hover:bg-[var(--mb-blue)] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label={t("Get directions to Building {number}, {name}", {
            number: building.number,
            name: getBuildingName(building),
          })}
        >
          <span className="inline-flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            {t("Get directions")}
          </span>
          <ArrowUpRight className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}
