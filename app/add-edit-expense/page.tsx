"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AddEditExpenseRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/expenses/add");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin" />
        <p className="text-sm text-[var(--muted-foreground)]">Redirecting...</p>
      </div>
    </div>
  );
}
