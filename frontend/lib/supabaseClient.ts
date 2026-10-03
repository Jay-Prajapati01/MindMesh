import { createClient } from "@supabase/supabase-js";

type ContactSubmission = {
  name: string;
  email: string;
  company: string | null;
  topic: string;
  message: string;
};

type Database = {
  public: {
    Tables: {
      contact_submissions: {
        Row: ContactSubmission;
        Insert: ContactSubmission;
        Update: Partial<ContactSubmission>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};

let client: ReturnType<typeof createClient<Database>> | null = null;

/**
 * Lazily-created Supabase client for the public contact form.
 * Created on first use (never at build time) so missing env vars
 * can't break prerendering — the contact page surfaces an error state.
 */
export function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase is not configured (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)."
    );
  }
  if (!client) client = createClient<Database>(url, key);
  return client;
}
