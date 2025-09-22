import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_EDGE_URL?.replace(/\/functions\/v1$/, "") ??
  process.env.SUPABASE_URL ??
  process.env.SUPABASE_EDGE_URL?.replace(/\/functions\/v1$/, "");

const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

if ((!SUPABASE_URL || !SUPABASE_ANON_KEY) && typeof window !== "undefined") {
  console.warn("Supabase configuration missing. Supabase operations are disabled.");
}

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Supabase environment variables are not configured.");
  }

  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return client;
}
