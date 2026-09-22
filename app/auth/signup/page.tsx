"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import Button from "@/components/ui/Button";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({ email, password });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }

    if (!data.session) {
      // Email confirmation is required before a session exists.
      setNeedsConfirmation(true);
      return;
    }

    router.push("/auth/onboarding");
    router.refresh();
  }

  if (needsConfirmation) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface px-6 text-center">
        <h1 className="font-display text-2xl font-semibold text-deep">Swirl</h1>
        <p className="max-w-sm text-[15px] text-slate">
          Check your email to confirm your account, then sign in to pick your route.
        </p>
        <Link href="/auth/login" className="font-semibold text-blue">
          Back to sign in
        </Link>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-surface px-6 py-12">
      <div className="w-full max-w-sm">
        <h1 className="mb-10 text-center font-display text-2xl font-semibold text-deep">Swirl</h1>

        <form onSubmit={handleSignUp} className="flex flex-col gap-4">
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-card border border-mist bg-white px-4 py-3 text-[16px] text-deep placeholder:text-slate focus:border-blue focus:outline-none"
          />
          <input
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-card border border-mist bg-white px-4 py-3 text-[16px] text-deep placeholder:text-slate focus:border-blue focus:outline-none"
          />

          {error && <p className="text-[14px] text-[#d92d20]">{error}</p>}

          <Button type="submit" fullWidth loading={loading}>
            Sign up
          </Button>
        </form>

        <p className="mt-8 text-center text-[15px] text-slate">
          Already swimming?{" "}
          <Link href="/auth/login" className="font-semibold text-blue">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
