import { useCallback, useSyncExternalStore } from "react";
import {
  getLanguage,
  setLanguage,
  subscribeLanguage,
  translate,
  type MessageKey,
} from "@/lib/i18n";

export function useLanguage() {
  const language = useSyncExternalStore(subscribeLanguage, getLanguage, getLanguage);
  const t = useCallback(
    (key: MessageKey, values?: Record<string, string | number>) => translate(key, values, language),
    [language],
  );
  return { language, setLanguage, t };
}
