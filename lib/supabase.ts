import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseService = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnon) {
  console.warn("Supabase env vars missing. Some API routes will fail.");
}

export const supabaseClient =
  supabaseUrl && supabaseAnon
    ? createClient(supabaseUrl, supabaseAnon, {
        auth: { persistSession: false }
      })
    : null;

export const supabaseServiceClient = supabaseService
  ? createClient(supabaseUrl ?? "", supabaseService, {
      auth: { persistSession: false }
    })
  : null;

export const supabaseReadClient = supabaseServiceClient ?? supabaseClient;
