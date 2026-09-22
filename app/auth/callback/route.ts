import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

/** Exchanges the OAuth code for a session (Google sign-in), then routes new vs. returning users. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const { data: activeRoute } = await supabase
        .from("user_routes")
        .select("id")
        .eq("user_id", data.user.id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      return NextResponse.redirect(`${origin}${activeRoute ? "/dashboard" : "/auth/onboarding"}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=oauth`);
}
