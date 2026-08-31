'use client';
import { NextIntlClientProvider } from 'next-intl';
import type { AbstractIntlMessages } from 'next-intl';
import { useState, useEffect, type ReactNode } from 'react';
import en from '@/messages/en.json';
import es from '@/messages/es.json';

const messagesMap: Record<string, AbstractIntlMessages> = {
  en: en as AbstractIntlMessages,
  es: es as AbstractIntlMessages,
};

export default function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState('en');

  useEffect(() => {
    const stored = localStorage.getItem('locale');
    const defaultLocale = process.env.NEXT_PUBLIC_DEFAULT_LOCALE ?? 'en';
    const resolved = stored ?? defaultLocale;
    if (messagesMap[resolved]) setLocale(resolved);
  }, []);

  const messages = messagesMap[locale] ?? en;

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
