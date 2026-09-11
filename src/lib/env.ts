export function hasSupabase(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function allowedEmail(): string | null {
  const email = process.env.ALLOWED_EMAIL?.trim().toLowerCase();
  return email || null;
}

export function emailAllowed(email: string | undefined | null): boolean {
  const allowed = allowedEmail();
  if (!allowed || !email) return false;
  return email.trim().toLowerCase() === allowed;
}

export function groqConfigured(): boolean {
  return Boolean(process.env.GROQ_API_KEY);
}

export function cronAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  const header = req.headers.get("authorization");
  return header === `Bearer ${secret}`;
}
