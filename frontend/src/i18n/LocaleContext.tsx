import { createContext, useContext, type ReactNode } from "react";
import { useLocale } from "./useLocale";
import type { Messages, Locale } from "./locales";
import { LOCALES } from "./locales";

interface LocaleContextValue {
  locale: Locale;
  t: Messages;
  setLocale: (l: Locale) => void;
  locales: typeof LOCALES;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const value = useLocale();
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useT(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useT must be used inside <LocaleProvider>");
  return ctx;
}
