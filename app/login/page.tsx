"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, ArrowRight, TrendingUp, Shield, Zap } from 'lucide-react';
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { BRAND } from "@/lib/data";
import { Reveal } from "@/components/Reveal";
import { fadeInUp, staggerContainer } from "@/lib/motion";

export default function LoginPage() {
  const t = useTranslations();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "error" | "success" } | null>(null);

  const showToast = (message: string, type: "error" | "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        if (authError.message.toLowerCase().includes("email not confirmed")) {
          setError(t("login.errorEmailNotConfirmed"));
          showToast(t("login.errorEmailNotConfirmed"), "error");
        } else if (
          authError.message.toLowerCase().includes("invalid login credentials") ||
          authError.message.toLowerCase().includes("invalid email or password")
        ) {
          setError(t("login.errorInvalidCredentials"));
          showToast(t("login.errorInvalidCredentials"), "error");
        } else {
          setError(authError.message);
          showToast(authError.message, "error");
        }
        setLoading(false);
        return;
      }

      showToast(t("login.successMessage"), "success");
      window.location.href = "/dashboard";
    } catch {
      const msg = t("login.errorGeneric");
      setError(msg);
      showToast(msg, "error");
      setLoading(false);
    }
  };

  const features = [
    { icon: TrendingUp, text: t("login.feature1") },
    { icon: Shield, text: t("login.feature2") },
    { icon: Zap, text: t("login.feature3") },
  ];

  return (
    <main className="min-h-screen flex">
      {/* Toast */}
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -20, x: "-50%" }}
          animate={{ opacity: 1, y: 0, x: "-50%" }}
          exit={{ opacity: 0, y: -20, x: "-50%" }}
          className={`fixed top-6 left-1/2 z-50 px-5 py-3 rounded-xl text-sm font-medium shadow-lg border ${
            toast.type === "error"
              ? "bg-red-950/90 border-red-800/60 text-red-200"
              : "bg-emerald-950/90 border-emerald-800/60 text-emerald-200"
          }`}
        >
          {toast.message}
        </motion.div>
      )}

      {/* Left — Form Panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-16 bg-[hsl(var(--background))]">
        <Reveal className="w-full max-w-md">
          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-[0_2px_4px_rgba(0,0,0,0.04),0_16px_48px_-12px_rgba(0,0,0,0.14)] p-8 md:p-10">
            {/* Logo */}
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 mb-6">
                <div className="h-8 w-8 rounded-lg bg-[var(--accent)] flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-white" aria-hidden="true" />
                </div>
                <span className="text-lg font-bold text-[hsl(var(--foreground))]">{BRAND.name}</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-[hsl(var(--foreground))]">
                {t("login.heading")}
              </h1>
              <p className="mt-1.5 text-sm text-[hsl(var(--muted-foreground))]">
                {t("login.subheading")}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              {/* Email */}
              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-[hsl(var(--foreground))]"
                >
                  {t("login.emailLabel")}
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]"
                    aria-hidden="true"
                  />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("login.emailPlaceholder")}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] text-sm placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40 focus:border-[var(--accent)] transition-all duration-200"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-[hsl(var(--foreground))]"
                  >
                    {t("login.passwordLabel")}
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-[var(--accent)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40 rounded"
                  >
                    {t("login.forgotPassword")}
                  </Link>
                </div>
                <div className="relative">
                  <Lock
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]"
                    aria-hidden="true"
                  />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("login.passwordPlaceholder")}
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] text-sm placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40 focus:border-[var(--accent)] transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? t("login.hidePassword") : t("login.showPassword")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-red-400 bg-red-950/30 border border-red-800/40 rounded-lg px-3 py-2"
                >
                  {error}
                </motion.p>
              )}

              {/* Submit */}
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: loading ? 1 : 1.01 }}
                whileTap={{ scale: loading ? 1 : 0.98 }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[var(--accent)] text-white font-semibold text-sm shadow-[0_2px_8px_rgba(99,102,241,0.35)] hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    {t("login.signingIn")}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    {t("login.submitButton")}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </span>
                )}
              </motion.button>
            </form>

            {/* Divider */}
            <div className="my-6 flex items-center gap-3">
              <div className="flex-1 h-px bg-[hsl(var(--border))]" />
              <span className="text-xs text-[hsl(var(--muted-foreground))]">{t("login.orDivider")}</span>
              <div className="flex-1 h-px bg-[hsl(var(--border))]" />
            </div>

            {/* Sign up redirect */}
            <p className="text-center text-sm text-[hsl(var(--muted-foreground))]">
              {t("login.noAccount")}{" "}
              <Link
                href="/signup"
                className="font-semibold text-[var(--accent)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40 rounded"
              >
                {t("login.signUpLink")}
              </Link>
            </p>
          </div>
        </Reveal>
      </div>

      {/* Right — Branded Hero Panel */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden items-center justify-center">
        {/* Animated gradient background */}
        <motion.div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, #1e1b4b 0%, #312e81 25%, #4338ca 50%, #6366f1 75%, #818cf8 100%)",
          }}
          animate={{
            backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        />

        {/* Mesh glow orbs */}
        <motion.div
          className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(129,140,248,0.35) 0%, transparent 70%)" }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-56 h-56 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(99,102,241,0.4) 0%, transparent 70%)" }}
          animate={{ scale: [1.1, 1, 1.1], opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Content */}
        <motion.div
          className="relative z-10 px-12 text-center max-w-md"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {/* Logo mark */}
          <motion.div variants={fadeInUp} className="flex justify-center mb-8">
            <div className="h-16 w-16 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
              <TrendingUp className="h-8 w-8 text-white" aria-hidden="true" />
            </div>
          </motion.div>

          <motion.h2
            variants={fadeInUp}
            className="text-4xl font-bold text-white tracking-tight leading-tight"
          >
            {BRAND.name}
          </motion.h2>

          <motion.p
            variants={fadeInUp}
            className="mt-3 text-lg text-indigo-200 leading-relaxed"
          >
            {BRAND.tagline}
          </motion.p>

          <motion.p
            variants={fadeInUp}
            className="mt-2 text-sm text-indigo-300/80 leading-relaxed"
          >
            {BRAND.description}
          </motion.p>

          {/* Feature pills */}
          <motion.div variants={fadeInUp} className="mt-10 flex flex-col gap-3">
            {features.map((feat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.12, duration: 0.5, ease: "easeOut" }}
                className="flex items-center gap-3 bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl px-4 py-3 text-left"
              >
                <div className="h-8 w-8 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
                  <feat.icon className="h-4 w-4 text-white" aria-hidden="true" />
                </div>
                <span className="text-sm text-white/90 font-medium">{feat.text}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* Bottom badge */}
          <motion.div
            variants={fadeInUp}
            className="mt-10 inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-2"
          >
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-white/80 font-medium">{t("login.heroBadge")}</span>
          </motion.div>
        </motion.div>
      </div>
    </main>
  );
}