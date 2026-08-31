"use client";

import { useSiteLocale } from "@/components/LocaleProvider";

const LABELS: Record<string, string> = { en: "EN", es: "ES", fr: "FR", de: "DE", pt: "PT" };

export default function LanguageToggle() {
  const { locale, setLocale, locales } = useSiteLocale();
  if (locales.length < 2) return null;
  return (
    <div className="fixed bottom-5 left-5 z-50 flex gap-1 rounded-full border border-gray-200 bg-white/90 px-1 py-1 shadow-lg backdrop-blur">
      {locales.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLocale(l)}
          className={"rounded-full px-2.5 py-1 text-xs font-semibold transition-colors " + (locale === l ? "bg-black text-white" : "text-gray-700 hover:bg-gray-100")}
        >
          {LABELS[l] ?? l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
