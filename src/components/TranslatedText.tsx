import { useLanguage } from "@/hooks/use-language";
import type { MessageKey } from "@/lib/i18n";

export function TranslatedText({ message }: { message: MessageKey }) {
  const { t } = useLanguage();
  return t(message);
}
