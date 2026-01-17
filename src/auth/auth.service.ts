import { PostgrestError } from "@supabase/supabase-js";

import { NormalizedGoogleUser } from "./google.service";
import { supabase } from "../supabase/supabase.client";
import { JwtPayload, signAccessToken, signRefreshToken } from "./jwt.util";

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type DbUser = {
  id: string;
  email: string;
  provider: string;
  provider_user_id: string;
  name: string | null;
  created_at: string;
};

const toJwtPayload = (user: DbUser): JwtPayload => ({
  userId: user.id,
  email: user.email,
  provider: "google",
});

const fetchUserByEmail = async (
  email: string
): Promise<DbUser | null> => {
  const { data, error } = await supabase
    .from("users")
    .select("id,email,provider,provider_user_id,name,created_at")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
};

const createUser = async (
  user: NormalizedGoogleUser
): Promise<DbUser> => {
  const { data, error } = await supabase
    .from("users")
    .insert({
      email: user.email,
      provider: "google",
      provider_user_id: user.providerId,
      name: user.name,
    })
    .select("id,email,provider,provider_user_id,name,created_at")
    .single();

  if (error) {
    throw error;
  }

  return data;
};

const ensureUser = async (
  user: NormalizedGoogleUser
): Promise<DbUser> => {
  const existing = await fetchUserByEmail(user.email);
  if (existing) {
    return existing;
  }

  try {
    return await createUser(user);
  } catch (error) {
    const pgError = error as PostgrestError;
    if (pgError?.code === "23505") {
      const afterConflict = await fetchUserByEmail(user.email);
      if (afterConflict) {
        return afterConflict;
      }
    }
    throw error;
  }
};

export const issueTokens = async (
  user: NormalizedGoogleUser
): Promise<AuthTokens> => {
  const dbUser = await ensureUser(user);
  const payload = toJwtPayload(dbUser);

  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
};
