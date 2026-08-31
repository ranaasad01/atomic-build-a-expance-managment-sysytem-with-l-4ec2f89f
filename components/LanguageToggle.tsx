'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function LanguageToggle() {
  const [locale, setLocale] = useState('en');

  useEffect(() => {
    const stored = localStorage.getItem('locale') ?? 'en';
    setLocale(stored);
  }, []);

  const toggle = () => {
    const next = locale === 'en' ? 'es' : 'en';
    localStorage.setItem('locale', next);
    setLocale(next);
    window.location.reload();
  };

  return (
    <motion.button
      onClick={toggle}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.95 }}
      className="fixed bottom-6 right-6 z-50 w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shadow-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:border-[var(--primary)] transition-colors duration-200"
      aria-label="Toggle language"
      title={locale === 'en' ? 'Switch to Spanish' : 'Switch to English'}
    >
      {locale === 'en' ? 'ES' : 'EN'}
    </motion.button>
  );
}
