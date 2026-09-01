export const BRAND = {
  name: "ExpenseIQ",
  tagline: "Your finances, finally under control.",
  description:
    "Real-time expense tracking, smart budgets, and clear financial insight — all in one place.",
} as const;

export interface NavLink {
  label: string;
  href: string;
  key: string;
}

export const navLinks: NavLink[] = [
  { label: "Dashboard", href: "/dashboard", key: "dashboard" },
  { label: "Expenses", href: "/expenses", key: "expenses" },
  { label: "Budget", href: "/budget", key: "budget" },
  { label: "Analytics", href: "/analytics", key: "analytics" },
  { label: "Reports", href: "/reports", key: "reports" },
  { label: "Recurring", href: "/recurring", key: "recurring" },
  { label: "Profile", href: "/profile", key: "profile" },
];

export const authNavLinks: NavLink[] = [
  { label: "Sign In", href: "/login", key: "signin" },
  { label: "Sign Up", href: "/signup", key: "signup" },
];

export const EXPENSE_CATEGORIES = [
  { name: "Food & Dining", icon: "🍔", color: "#10B981" },
  { name: "Transport", icon: "🚗", color: "#6366F1" },
  { name: "Shopping", icon: "🛍️", color: "#F59E0B" },
  { name: "Bills", icon: "⚡", color: "#F59E0B" },
  { name: "Health", icon: "💊", color: "#10B981" },
  { name: "Entertainment", icon: "🎬", color: "#8B5CF6" },
  { name: "Other", icon: "📦", color: "#94A3B8" },
] as const;

export const CURRENCIES = [
  { code: "USD", symbol: "$", label: "US Dollar" },
  { code: "EUR", symbol: "€", label: "Euro" },
  { code: "GBP", symbol: "£", label: "British Pound" },
  { code: "INR", symbol: "₹", label: "Indian Rupee" },
  { code: "AED", symbol: "د.إ", label: "UAE Dirham" },
  { code: "PKR", symbol: "Rs", label: "Pakistani Rupee" },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]["code"];
