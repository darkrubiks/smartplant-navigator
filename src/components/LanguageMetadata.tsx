import { useEffect } from "react";
import { useLanguage } from "@/hooks/use-language";

export function LanguageMetadata() {
  const { language, t } = useLanguage();
  useEffect(() => {
    document.documentElement.lang = language;
    document.title = t("Mercedes SmartPlant Navigator — São Bernardo plant map");
    document
      .querySelectorAll('meta[name="description"], meta[property="og:description"]')
      .forEach((meta) => {
        meta.setAttribute("content", t("Plant map and route guidance for São Bernardo do Campo."));
      });
  }, [language, t]);
  return null;
}
