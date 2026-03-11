/**
 * lib/supabase.js
 * Initializes and exports the Supabase client.
 * Used by the RAG pipeline to perform vector similarity searches.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables.");
}

export const supabase = createClient(supabaseUrl, supabaseKey);