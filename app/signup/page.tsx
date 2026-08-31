"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, Check, X } from 'lucide-react';
import { Reveal } from "@/components/Reveal";
import { BRAND } from "@/lib/data";
import { fadeInUp, staggerContainer } from "@/lib/motion";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

function getPasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
} {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score, label: "Weak", color: "#EF4444" };
  if (score <= 2) return { score, label: "Fair", color: "#F59E0B" };
  if (score <= 3) return { score, label: "Good", color: "#6366F1" };
  return { score, label: "Strong", color: "#10B981" };
}

const requirements = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One number", test: (p: string) => /[0-9]/.test(p) },
  { label: "One special character", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export default function SignUpPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const strength = getPasswordStrength(password);

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!fullName.trim()) errs.fullName = "Full name is required.";
    if (!email.trim()) errs.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Enter a valid email address.";
    if (!password) errs.password = "Password is required.";
    else if (password.length < 8) errs.password = "Password must be at least 8 characters.";
    if (!confirmPassword) errs.confirmPassword = "Please confirm your password.";
    else if (password !== confirmPassword) errs.confirmPassword = "Passwords do not match.";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!validate()) return;

    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      if (data.user) {
        const { error: profileError } = await supabase.from("profiles").upsert({
          id: data.user.id,
          full_name: fullName,
          preferred_currency: "USD",
          updated_at: new Date().toISOString(),
        });

        if (profileError) {
          console.error("Profile creation error:", profileError.message);
        }
      }

      router.push("/dashboard");
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen grid lg:grid-cols-2">
      {/* Left panel — brand */}
      <div className="hidden lg:flex flex-col justify-between bg-[var(--brand-dark)] p-12 relative overflow-hidden">
        {/* Decorative mesh */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle at 30% 20%, var(--accent) 0%, transparent 55%), radial-gradient(circle at 80% 80%, #6366F1 0%, transparent 50%)",
          }}
        />
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-2 group">
            <span className="text-2xl font-bold text-white tracking-tight">{BRAND.name}</span>
          </Link>
        </div>

        <motion.div
          className="relative z-10"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <motion.h2
            variants={fadeInUp}
            className="text-4xl font-bold text-white leading-tight tracking-tight text-balance"
          >
            Take control of every dollar you spend.
          </motion.h2>
          <motion.p
            variants={fadeInUp}
            className="mt-4 text-lg text-white/70 leading-relaxed text-pretty"
          >
            Join thousands of people who use {BRAND.name} to track expenses, set budgets, and reach their financial goals.
          </motion.p>

          <motion.div variants={fadeInUp} className="mt-10 space-y-4">
            {[
              { icon: "📊", text: "Visual spending breakdowns by category" },
              { icon: "🎯", text: "Monthly budget limits with real-time alerts" },
              { icon: "🔒", text: "Bank-level security for your financial data" },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-3">
                <span className="text-xl">{item.icon}</span>
                <span className="text-white/80 text-sm">{item.text}</span>
              </div>
            ))}
          </motion.div>
        </motion.div>

        <motion.div
          className="relative z-10 flex items-center gap-4"
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.5 }}
        >
          <div className="flex -space-x-2">
            {["AB", "CK", "MR", "JL"].map((initials) => (
              <div
                key={initials}
                className="w-8 h-8 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center text-white text-xs font-semibold"
              >
                {initials}
              </div>
            ))}
          </div>
          <p className="text-white/60 text-sm">
            <span className="text-white font-semibold">2,400+</span> users tracking smarter
          </p>
        </motion.div>
      </div>

      {/* Right panel — form */}
      <div className="flex items-center justify-center px-6 py-16 bg-[hsl(var(--background))]">
        <div className="w-full max-w-md">
          <Reveal>
            <div className="mb-8">
              <Link href="/" className="lg:hidden inline-flex items-center gap-2 mb-6">
                <span className="text-xl font-bold text-[var(--accent)] tracking-tight">{BRAND.name}</span>
              </Link>
              <h1 className="text-3xl font-bold text-[hsl(var(--foreground))] tracking-tight">
                Create your account
              </h1>
              <p className="mt-2 text-[hsl(var(--muted-foreground))]">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="text-[var(--accent)] font-medium hover:underline transition-colors"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              {/* Full Name */}
              <div>
                <label
                  htmlFor="fullName"
                  className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5"
                >
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                  <input
                    id="fullName"
                    type="text"
                    autoComplete="name"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (fieldErrors.fullName) setFieldErrors((prev) => ({ ...prev, fullName: "" }));
                    }}
                    placeholder="Jane Smith"
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm bg-[hsl(var(--card))] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] outline-none transition-all focus:ring-2 focus:ring-[var(--accent)]/40 ${
                      fieldErrors.fullName
                        ? "border-red-500"
                        : "border-[hsl(var(--border))] focus:border-[var(--accent)]"
                    }`}
                  />
                </div>
                {fieldErrors.fullName && (
                  <p className="mt-1 text-xs text-red-500">{fieldErrors.fullName}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5"
                >
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: "" }));
                    }}
                    placeholder="jane@example.com"
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm bg-[hsl(var(--card))] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] outline-none transition-all focus:ring-2 focus:ring-[var(--accent)]/40 ${
                      fieldErrors.email
                        ? "border-red-500"
                        : "border-[hsl(var(--border))] focus:border-[var(--accent)]"
                    }`}
                  />
                </div>
                {fieldErrors.email && (
                  <p className="mt-1 text-xs text-red-500">{fieldErrors.email}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: "" }));
                    }}
                    placeholder="Create a strong password"
                    className={`w-full pl-10 pr-10 py-2.5 rounded-xl border text-sm bg-[hsl(var(--card))] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] outline-none transition-all focus:ring-2 focus:ring-[var(--accent)]/40 ${
                      fieldErrors.password
                        ? "border-red-500"
                        : "border-[hsl(var(--border))] focus:border-[var(--accent)]"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="mt-1 text-xs text-red-500">{fieldErrors.password}</p>
                )}

                {/* Strength bar */}
                {password.length > 0 && (
                  <div className="mt-2.5 space-y-2">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((seg) => (
                        <div
                          key={seg}
                          className="h-1 flex-1 rounded-full transition-all duration-300"
                          style={{
                            backgroundColor:
                              seg <= strength.score ? strength.color : "hsl(var(--border))",
                          }}
                        />
                      ))}
                    </div>
                    <p className="text-xs" style={{ color: strength.color }}>
                      {strength.label} password
                    </p>
                    <ul className="space-y-1">
                      {requirements.map((req) => {
                        const met = req.test(password);
                        return (
                          <li key={req.label} className="flex items-center gap-1.5 text-xs">
                            {met ? (
                              <Check className="h-3 w-3 text-emerald-500 shrink-0" />
                            ) : (
                              <X className="h-3 w-3 text-[hsl(var(--muted-foreground))] shrink-0" />
                            )}
                            <span
                              className={
                                met
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-[hsl(var(--muted-foreground))]"
                              }
                            >
                              {req.label}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5"
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                  <input
                    id="confirmPassword"
                    type={showConfirm ? "text" : "password"}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (fieldErrors.confirmPassword)
                        setFieldErrors((prev) => ({ ...prev, confirmPassword: "" }));
                    }}
                    placeholder="Repeat your password"
                    className={`w-full pl-10 pr-10 py-2.5 rounded-xl border text-sm bg-[hsl(var(--card))] text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] outline-none transition-all focus:ring-2 focus:ring-[var(--accent)]/40 ${
                      fieldErrors.confirmPassword
                        ? "border-red-500"
                        : confirmPassword && confirmPassword === password
                        ? "border-emerald-500"
                        : "border-[hsl(var(--border))] focus:border-[var(--accent)]"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
                    aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {fieldErrors.confirmPassword && (
                  <p className="mt-1 text-xs text-red-500">{fieldErrors.confirmPassword}</p>
                )}
                {confirmPassword && confirmPassword === password && !fieldErrors.confirmPassword && (
                  <p className="mt-1 text-xs text-emerald-500 flex items-center gap-1">
                    <Check className="h-3 w-3" /> Passwords match
                  </p>
                )}
              </div>

              {/* Global error */}
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                  {error}
                </div>
              )}

              {/* Submit */}
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: loading ? 1 : 1.01 }}
                whileTap={{ scale: loading ? 1 : 0.98 }}
                className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-[var(--accent)] text-white font-semibold text-sm transition-all duration-200 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50 disabled:opacity-60 disabled:cursor-not-allowed shadow-[0_4px_14px_rgba(0,0,0,0.15)]"
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8H4z"
                      />
                    </svg>
                    Creating account...
                  </>
                ) : (
                  <>
                    Create Account
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </motion.button>

              <p className="text-center text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
                By creating an account you agree to our{" "}
                <Link href="#" className="underline hover:text-[var(--accent)] transition-colors">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="#" className="underline hover:text-[var(--accent)] transition-colors">
                  Privacy Policy
                </Link>
                .
              </p>
            </form>
          </Reveal>
        </div>
      </div>
    </main>
  );
}