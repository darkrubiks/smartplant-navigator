import { getLanguage } from "./i18n.js";
import { translateCatalogText, normalizeSearch, formatHours } from "./catalog-translations.js";
export function getBuildingName(building, language = getLanguage()) {
  const preferred = language === "pt-BR" ? building.name_pt : building.name_en;
  return (
    translateCatalogText(preferred?.trim() || building.name_pt || building.name_en, language) || ""
  );
}
export function getDepartmentName(department, language = getLanguage()) {
  return translateCatalogText(department, language);
}
export function getBuildingDescription(building, language = getLanguage()) {
  const preferred = language === "pt-BR" ? building.description_pt : building.description_en;
  return preferred?.trim() || translateCatalogText(building.description, language);
}
export function getBuildingDetails(building, language = getLanguage()) {
  return {
    description: getBuildingDescription(building, language),
    department: getDepartmentName(building.department, language),
    responsible: translateCatalogText(building.responsible, language),
    hours: formatHours(building.hours, language),
    dock: translateCatalogText(building.dock, language),
  };
}
export function searchBuildings(list, q, limit = 10) {
  const query = normalizeSearch(q);
  if (!query) return [];
  const scored = list
    .map((b) => {
      const hay = [
        b.number,
        b.name_pt,
        b.name_en ?? "",
        getBuildingName(b, "en"),
        getBuildingName(b, "pt-BR"),
        b.department ?? "",
        b.description ?? "",
        b.description_en ?? "",
        b.description_pt ?? "",
        getBuildingDescription(b, "en") ?? "",
        getBuildingDescription(b, "pt-BR") ?? "",
        getDepartmentName(b.department, "en") ?? "",
        getDepartmentName(b.department, "pt-BR") ?? "",
        b.responsible ?? "",
        ...(b.keywords ?? []),
      ].join(" ");
      const normalizedHay = normalizeSearch(hay);
      let score = 0;
      if (b.number.toLowerCase() === query) score += 100;
      if (b.number.toLowerCase().startsWith(query)) score += 40;
      if (normalizeSearch(b.name_en ?? "").includes(query)) score += 20;
      if (normalizeSearch(b.name_pt).includes(query)) score += 10;
      if (normalizedHay.includes(query)) score += 10;
      const tokens = query.split(/\s+/).filter(Boolean);
      for (const t of tokens) if (normalizedHay.includes(t)) score += 2;
      return { b, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.b);
  return scored;
}
