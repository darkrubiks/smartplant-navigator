import { useLanguage } from "@/hooks/use-language";
import { useEffect, useMemo, useRef, useState } from "react";
import { Search, MapPin, QrCode, X, Loader2 } from "lucide-react";
import { useRouter } from "@tanstack/react-router";
import type { BuildingRow } from "@/lib/types";
import { getBuildingName, getDepartmentName, searchBuildings } from "@/lib/buildings";
import { getCategoryLabel } from "@/lib/plant";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SearchBarProps {
  buildings: BuildingRow[];
  loading?: boolean;
  onSelect: (b: BuildingRow) => void;
  onScanQR?: () => void;
  onUseLocation?: () => void;
}

export function SearchBar({
  buildings,
  loading,
  onSelect,
  onScanQR,
  onUseLocation,
}: SearchBarProps) {
  const { language, t } = useLanguage();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const results = useMemo(() => searchBuildings(buildings, q, 8), [buildings, q]);
  const router = useRouter();

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function selectResult(b: BuildingRow) {
    void supabase.from("search_logs").insert({
      query: q,
      result_building_id: b.id,
    });
    setQ("");
    setOpen(false);
    onSelect(b);
    router.navigate({ to: "/nav/$destId", params: { destId: b.id } });
  }

  const scanQR = () => {
    if (onScanQR) return onScanQR();
    const demo = window.prompt(
      t("Paste the QR Code token (use MB-DEMO-MOTOR-001 or MB-DEMO-CHASSI-002 for the demo)"),
      "MB-DEMO-MOTOR-001",
    );
    if (demo) router.navigate({ to: "/checkin/$token", params: { token: demo.trim() } });
  };

  const useLoc = () => {
    if (onUseLocation) return onUseLocation();
    toast.success(t("Location detected: Main Gate (P1)"));
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-2 rounded-2xl bg-card border border-border/70 shadow-[var(--shadow-elegant)] px-4 py-3">
        <Search className="h-5 w-5 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={t("Where would you like to go?")}
          className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
        />
        {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        {q && !loading && (
          <button
            onClick={() => setQ("")}
            className="text-muted-foreground hover:text-foreground"
            aria-label={t("Clear")}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mt-2 flex gap-2">
        <button
          onClick={useLoc}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-card border border-border/70 py-2 text-sm font-medium text-foreground shadow-[var(--shadow-soft)] hover:bg-accent transition"
        >
          <MapPin className="h-4 w-4 text-[var(--mb-blue)]" /> {t("My location")}
        </button>
        <button
          onClick={scanQR}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl text-white py-2 text-sm font-medium shadow-[var(--shadow-elegant)] bg-[var(--mb-blue)] hover:bg-[var(--mb-blue-dark)] transition"
        >
          <QrCode className="h-4 w-4" /> {t("Scan QR Code")}
        </button>
      </div>

      {open && q && results.length > 0 && (
        <div className="absolute inset-x-0 top-full mt-2 rounded-2xl bg-popover border border-border/70 shadow-[var(--shadow-elegant)] max-h-80 overflow-y-auto z-[600]">
          {results.map((b) => (
            <button
              key={b.id}
              onClick={() => selectResult(b)}
              className="flex w-full items-center gap-3 px-4 py-3 hover:bg-accent text-left transition border-b border-border/40 last:border-0"
            >
              <span
                className={`mb-marker ${b.category}`}
                style={{ minWidth: 34, height: 34, fontSize: 12 }}
              >
                {b.number}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{getBuildingName(b)}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {getCategoryLabel(b.category)}
                  {b.department ? ` · ${getDepartmentName(b.department)}` : ""}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
      {open && q && results.length === 0 && !loading && (
        <div className="absolute inset-x-0 top-full mt-2 rounded-2xl bg-popover border border-border/70 shadow-[var(--shadow-soft)] p-4 text-sm text-muted-foreground z-[600]">
          {t('No results for "{query}". Try a building number, name, or department.', { query: q })}
        </div>
      )}
    </div>
  );
}
