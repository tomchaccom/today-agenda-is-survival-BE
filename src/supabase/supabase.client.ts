import { createClient, SupabaseClient } from "@supabase/supabase-js";

const getEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
};

const supabaseUrl = getEnv("SUPABASE_URL");
const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
const anonKey = getEnv("SUPABASE_ANON_KEY");

const baseOptions = {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
};

export const supabaseAdmin: SupabaseClient = createClient(
  supabaseUrl,
  serviceRoleKey,
  baseOptions
);

export const createUserClient = (
  jwt: string
): SupabaseClient =>
  createClient(supabaseUrl, anonKey, {
    ...baseOptions,
    global: {
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
    },
  });
