import { useState, useCallback } from "react";
import { type Locale, type Messages, LOCALES, messages } from "./locales";

const SESSION_KEY = "app_locale";
const RESTRICTED_LOCALE_KEY = "is_restricted_region";

function detectLocale(): Locale {
  // Check if user is in restricted region (set by backend)
  const isRestricted = sessionStorage.getItem(RESTRICTED_LOCALE_KEY) === "true";
  if (isRestricted) {
    return "en"; // Force English for restricted regions
  }

  // 1. session preference
  const saved = sessionStorage.getItem(SESSION_KEY) as Locale | null;
  if (saved && messages[saved]) return saved;

  // 2. browser language
  const langs = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const lang of langs) {
    const lower = lang.toLowerCase();
    // Explicitly block Simplified Chinese → fall through to English
    if (lower === "zh-cn" || lower === "zh-hans" || lower.startsWith("zh-cn-") || lower.startsWith("zh-hans-")) {
      continue;
    }
    if (lower === "zh-tw" || lower === "zh-hant" || lower === "zh-hk" || lower === "zh-mo" || lower.startsWith("zh")) {
      return "zh-TW";
    }
    if (lower.startsWith("es")) return "es";
    if (lower.startsWith("pt")) return "pt";
    if (lower.startsWith("ru")) return "ru";
    if (lower.startsWith("en")) return "en";
  }
  return "en";
}

export function useLocale(): {
  locale: Locale;
  t: Messages;
  setLocale: (l: Locale) => void;
  locales: typeof LOCALES;
} {
  const [locale, setLocaleState] = useState<Locale>(detectLocale);

  const setLocale = useCallback((l: Locale) => {
    console.log("[i18n] Switching locale to:", l);
    if (!messages[l]) {
      console.error("[i18n] Messages not found for locale:", l);
      return;
    }
    sessionStorage.setItem(SESSION_KEY, l);
    setLocaleState(l);
  }, []);

  return { locale, t: messages[locale] || messages.en, setLocale, locales: LOCALES };
}
