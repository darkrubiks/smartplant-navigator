import { Languages } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage();
  return (
    <div
      role="group"
      aria-label={t("Language")}
      className="pointer-events-auto flex shrink-0 items-center gap-0.5 rounded-full border border-border/60 bg-card/95 p-1 shadow-[var(--shadow-soft)] backdrop-blur"
    >
      <Languages
        className="ml-1 hidden h-4 w-4 text-[var(--mb-blue)] sm:block"
        aria-hidden="true"
      />
      {(
        [
          ["en", "EN", "English"],
          ["pt-BR", "PT-BR", "Português (Brasil)"],
        ] as const
      ).map(([value, label, name]) => (
        <button
          key={value}
          type="button"
          lang={value}
          aria-label={name}
          aria-pressed={language === value}
          onClick={() => setLanguage(value)}
          className={`rounded-full px-2 py-2 text-[11px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${language === value ? "bg-[var(--mb-blue)] text-white" : "text-muted-foreground hover:bg-accent"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
