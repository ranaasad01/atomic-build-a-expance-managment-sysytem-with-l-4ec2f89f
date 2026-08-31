"use client";
import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, CheckCircle, Sparkles } from 'lucide-react';
import { Reveal } from "@/components/Reveal";
import { BRAND } from "@/lib/data";
import { createClient } from "@/lib/supabase/client";

const PERKS = [
  "Track every expense in real time",
  "Set smart monthly budgets per category",
  "Visualize spending with clear charts",
  "Secure, private, and always in sync",
];

export default function SignUpPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (signUpError) {
        setError(signUpError.message);
      } else {
        setSuccess(true);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[hsl(var(--background))] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

        {/* Left — brand panel */}
        <Reveal className="hidden lg:flex flex-col gap-8">
          <div>
            <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-[var(--accent)] mb-4">
              <Sparkles className="w-3.5 h-3.5" /> {BRAND.name}
            </span>
            <h1 className="text-4xl font-bold tracking-tight text-[hsl(var(--foreground))] leading-tight text-balance">
              Take control of your finances today.
            </h1>
            <p className="mt-4 text-[hsl(var(--muted-foreground))] leading-relaxed text-pretty">
              {BRAND.description} Join thousands of users who finally know where their money goes.
            </p>
          </div>

          <ul className="space-y-3">
            {PERKS.map((perk, i) => (
              <motion.li
                key={perk}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.08, duration: 0.45, ease: "easeOut" }}
                className="flex items-center gap-3 text-sm text-[hsl(var(--foreground))]"
              >
                <CheckCircle className="w-4 h-4 text-[var(--accent)] shrink-0" />
                {perk}
              </motion.li>
            ))}
          </ul>

          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.10)]">
            <p className="text-sm text-[hsl(var(--muted-foreground))] italic leading-relaxed">
              "ExpenseIQ changed how I think about spending. I cut my monthly overspend by 30% in the first month."
            </p>
            <div className="mt-3 flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[var(--accent)]/20 flex items-center justify-center text-xs font-bold text-[var(--accent)]">
                A
              </div>
              <span className="text-xs font-medium text-[hsl(var(--foreground))]">Alex M. — Product Designer</span>
            </div>
          </div>
        </Reveal>

        {/* Right — form card */}
        <Reveal delay={0.1}>
          <div className="w-full rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-8 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_16px_48px_-12px_rgba(0,0,0,0.14)]">

            {success ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="flex flex-col items-center text-center gap-4 py-8"
              >
                <div className="w-14 h-14 rounded-full bg-[var(--accent)]/15 flex items-center justify-center">
                  <CheckCircle className="w-7 h-7 text-[var(--accent)]" />
                </div>
                <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">Check your inbox</h2>
                <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed max-w-xs">
                  We sent a confirmation link to <strong className="text-[hsl(var(--foreground))]">{email}</strong>. Click it to activate your account and start tracking.
                </p>
                <Link
                  href="/login"
                  className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent)] hover:underline transition-all"
                >
                  Go to sign in <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>
            ) : (
              <>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold tracking-tight text-[hsl(var(--foreground))]">Create your account</h2>
                  <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                    Already have one?{" "}
                    <Link href="/login" className="text-[var(--accent)] font-medium hover:underline">
                      Sign in
                    </Link>
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                  {/* Full name */}
                  <div className="space-y-1.5">
                    <label htmlFor="fullName" className="text-xs font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                      <input
                        id="fullName"
                        type="text"
                        autoComplete="name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Jane Smith"
                        className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] pl-10 pr-4 py-2.5 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]/60 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40 transition-all"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                      <input
                        id="email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="jane@example.com"
                        className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] pl-10 pr-4 py-2.5 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]/60 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40 transition-all"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Min. 8 characters"
                        className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] pl-10 pr-10 py-2.5 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]/60 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {/* Strength hint */}
                    {password.length > 0 && (
                      <div className="flex gap-1 mt-1.5">
                        {[1, 2, 3, 4].map((level) => (
                          <div
                            key={level}
                            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                              password.length >= level * 3
                                ? password.length >= 12
                                  ? "bg-emerald-500"
                                  : password.length >= 8
                                  ? "bg-amber-400"
                                  : "bg-red-400"
                                : "bg-[hsl(var(--border))]"
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Error */}
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"
                    >
                      {error}
                    </motion.p>
                  )}

                  {/* Submit */}
                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={{ scale: loading ? 1 : 1.02 }}
                    whileTap={{ scale: loading ? 1 : 0.98 }}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white shadow-[0_2px_12px_rgba(0,0,0,0.15)] hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50 disabled:opacity-60 transition-all duration-200"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        Creating account...
                      </span>
                    ) : (
                      <>
                        Create Account <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </motion.button>

                  <p className="text-center text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
                    By signing up you agree to our{" "}
                    <Link href="#" className="underline hover:text-[hsl(var(--foreground))] transition-colors">
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link href="#" className="underline hover:text-[hsl(var(--foreground))] transition-colors">
                      Privacy Policy
                    </Link>
                    .
                  </p>
                </form>
              </>
            )}
          </div>
        </Reveal>
      </div>
    </main>
  );
}