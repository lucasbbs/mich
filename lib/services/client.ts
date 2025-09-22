import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Create a custom Supabase client that works with Clerk authentication (server-side)
export async function createSupabaseClient(sessionToken: string | null): Promise<SupabaseClient> {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: sessionToken
          ? {
              Authorization: `Bearer ${sessionToken}`,
            }
          : {},
      },
    }
  )
}

// Default client without authentication (for public data)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)