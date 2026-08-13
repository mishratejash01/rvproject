/** Server-side environment access. Fails loudly rather than silently misbehaving. */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Set it in Vercel project settings or .env for local development.`,
    );
  }
  return value;
}

export const env = {
  get supabaseUrl() {
    return required("SUPABASE_URL");
  },
  get supabaseSecretKey() {
    return required("SUPABASE_SECRET_KEY");
  },
  get geminiApiKey() {
    return required("GEMINI_API_KEY");
  },
};
