import { supabase } from "@/integrations/supabase/client";
import type { BuildingRow } from "@/lib/types";

const REMOVED_BUILDING_NUMBERS = new Set(["79-14", "79-33", "148"]);

export async function fetchBuildings(): Promise<BuildingRow[]> {
  const { data, error } = await supabase.from("buildings").select("*").order("number");
  if (error) throw error;
  return ((data ?? []) as BuildingRow[]).filter(
    (building) => !REMOVED_BUILDING_NUMBERS.has(building.number),
  );
}

export function getBuildingName(building: Pick<BuildingRow, "name_en" | "name_pt">): string {
  return building.name_en?.trim() || building.name_pt;
}

const DEPARTMENT_NAMES: Record<string, string> = {
  Segurança: "Security",
  Logística: "Logistics",
  Produção: "Production",
  Qualidade: "Quality",
  Administrativo: "Administration",
  "RH / Saúde": "HR / Health",
  Serviços: "Services",
  Eventos: "Events",
  RH: "HR",
  Marketing: "Marketing",
  Engenharia: "Engineering",
  Manutenção: "Maintenance",
  Utilidades: "Utilities",
};

export function getDepartmentName(department: string | null): string | null {
  if (!department) return null;
  return DEPARTMENT_NAMES[department] ?? department;
}

export function searchBuildings(list: BuildingRow[], q: string, limit = 10): BuildingRow[] {
  const query = q.trim().toLowerCase();
  if (!query) return [];
  const scored = list
    .map((b) => {
      const hay = [
        b.number,
        b.name_pt,
        b.name_en ?? "",
        b.department ?? "",
        b.description ?? "",
        b.responsible ?? "",
        ...(b.keywords ?? []),
      ]
        .join(" ")
        .toLowerCase();
      let score = 0;
      if (b.number.toLowerCase() === query) score += 100;
      if (b.number.toLowerCase().startsWith(query)) score += 40;
      if ((b.name_en ?? "").toLowerCase().includes(query)) score += 20;
      if (b.name_pt.toLowerCase().includes(query)) score += 10;
      if (hay.includes(query)) score += 10;
      const tokens = query.split(/\s+/).filter(Boolean);
      for (const t of tokens) if (hay.includes(t)) score += 2;
      return { b, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.b);
  return scored;
}
