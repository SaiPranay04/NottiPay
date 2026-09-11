import { emailAllowed } from "./env";
import { createServerSupabase } from "./supabase/server";

export async function currentUser() {
  const supabase = await createServerSupabase();
  if (!supabase) return { supabase: null, user: null };

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user || !emailAllowed(data.user.email)) {
    return { supabase, user: null };
  }
  return { supabase, user: data.user };
}
