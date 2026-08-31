"use client";

import { NextIntlClientProvider, type AbstractIntlMessages } from "next-intl";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const MESSAGES: Record<string, AbstractIntlMessages> = {
  en: (await import("@/messages/en.json")).default as unknown as AbstractIntlMessages,
  es: (await import("@/messages/es.json")).default as unknown as AbstractIntlMessages,
};

const DEFAULT_LOCALE = process.env.NEXT_PUBLIC_DEFAULT_LOCALE || "en";
const LOCALES = (process.env.NEXT_PUBLIC_LOCALES || "en,es")
  .split(",").map((s) => s.trim()).filter(Boolean);

type Ctx = { locale: string; setLocale: (l: string) => void; locales: string[] };
const LocaleCtx = createContext<Ctx>({ locale: DEFAULT_LOCALE, setLocale: () => {}, locales: LOCALES });
export const useSiteLocale = () => useContext(LocaleCtx);

export default function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState(DEFAULT_LOCALE);
  const [messages, setMessages] = useState<AbstractIntlMessages>(MESSAGES[DEFAULT_LOCALE] || {});

  useEffect(() => {
    try {
      const s = localStorage.getItem("site_locale");
      if (s && LOCALES.includes(s)) {
        setLocaleState(s);
        setMessages(MESSAGES[s] || MESSAGES[DEFAULT_LOCALE] || {});
      }
    } catch {}
  }, []);

  const setLocale = (l: string) => {
    setLocaleState(l);
    setMessages(MESSAGES[l] || MESSAGES[DEFAULT_LOCALE] || {});
    try { localStorage.setItem("site_locale", l); } catch {}
  };

  return (
    <LocaleCtx.Provider value={{ locale, setLocale, locales: LOCALES }}>
      <NextIntlClientProvider
        locale={locale}
        messages={messages}
        timeZone="UTC"
        onError={() => {}}
        getMessageFallback={({ key }) => key.split(".").pop() || key}
      >
        {children}
      </NextIntlClientProvider>
    </LocaleCtx.Provider>
  );
}
