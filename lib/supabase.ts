import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Client-side Supabase client, for use in Client Components. */
export function createClient() {
  // Client components still get executed once during build/SSR to produce
  // the initial HTML/RSC payload, even ones marked `force-dynamic` -- but
  // they only ever *use* this client for real inside a useEffect, which
  // never runs during that pass. If env vars aren't available at that
  // moment (e.g. a build that ran before they were configured), constructing
  // the real client would throw and take the whole build down; a harmless
  // placeholder here is never actually touched server-side.
  if (typeof window === "undefined" && (!supabaseUrl || !supabaseAnonKey)) {
    return createBrowserClient<Database>("https://placeholder.supabase.co", "placeholder-anon-key");
  }

  return createBrowserClient<Database>(supabaseUrl!, supabaseAnonKey!);
}
