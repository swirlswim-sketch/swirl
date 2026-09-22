"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import Button from "@/components/ui/Button";

const PENDING_ROUTE_KEY = "swirl_pending_route_id";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setLoading(false);
      setError(error.message);
      return;
    }

    const pendingRouteId = localStorage.getItem(PENDING_ROUTE_KEY);
    if (pendingRouteId && data.user) {
      await supabase.from("user_routes").insert({
        user_id: data.user.id,
        route_id: pendingRouteId,
        current_distance_m: 0,
        is_active: true,
      });
      localStorage.removeItem(PENDING_ROUTE_KEY);
    }

    setLoading(false);
    router.push("/dashboard");
    router.refresh();
  }

  async function handleGoogleSignIn() {
    setError(null);
    setGoogleLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });

    if (error) {
      setError(error.message);
      setGoogleLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-surface px-6 py-12">
      <div className="w-full max-w-sm">
        <h1 className="mb-10 text-center font-display text-2xl font-semibold text-deep">Swirl</h1>

        <form onSubmit={handleSignIn} className="flex flex-col gap-4">
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
            autoComplete="current-password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-card border border-mist bg-white px-4 py-3 text-[16px] text-deep placeholder:text-slate focus:border-blue focus:outline-none"
          />

          {error && <p className="text-[14px] text-[#d92d20]">{error}</p>}

          <Button type="submit" fullWidth loading={loading}>
            Sign in
          </Button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-mist" />
          <span className="text-[12px] font-medium text-slate">or</span>
          <div className="h-px flex-1 bg-mist" />
        </div>

        <Button
          type="button"
          variant="secondary"
          fullWidth
          loading={googleLoading}
          onClick={handleGoogleSignIn}
        >
          Continue with Google
        </Button>

        <p className="mt-8 text-center text-[15px] text-slate">
          New here?{" "}
          <Link href="/auth/signup" className="font-semibold text-blue">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
