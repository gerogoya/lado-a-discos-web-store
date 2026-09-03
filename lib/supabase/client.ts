import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

declare global {
  var ladoASupabaseClient: SupabaseClient<Database> | undefined;
}

export function createSupabaseBrowserClient() {
  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error("Missing Supabase environment variables.");
  }

  if (!globalThis.ladoASupabaseClient) {
    globalThis.ladoASupabaseClient = createClient<Database>(supabaseUrl, supabasePublishableKey);
  }

  return globalThis.ladoASupabaseClient;
}
