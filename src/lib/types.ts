import type { Database } from "@/integrations/supabase/types";

export type BuildingRow = {
  id: string;
  number: string;
  name_pt: string;
  name_en: string | null;
  category: "industrial" | "social" | "auxiliary" | "gate";
  description: string | null;
  department: string | null;
  responsible: string | null;
  phone: string | null;
  hours: string | null;
  notes: string | null;
  photo_url: string | null;
  dock: string | null;
  x: number;
  y: number;
  keywords: string[] | null;
};

export type _Database = Database;
