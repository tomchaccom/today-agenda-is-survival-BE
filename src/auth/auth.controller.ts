import { Router } from "express";
import "dotenv/config";

import { HttpError } from "../common/http-error";
import { exchangeGoogleCode } from "./google.service";
import { issueTokens } from "./auth.service";
import type { AuthUser } from "./auth.service";
import { supabaseAdmin } from "../supabase/supabase.client";

const router = Router();
const isProd = process.env.NODE_ENV === "production";

/**
 * Google OAuth 시작
 */
router.get("/google", (req, res) => {
  console.log("[AUTH][GOOGLE] STEP 0: redirect to Google OAuth");

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.append("client_id", process.env.GOOGLE_CLIENT_ID!);
  authUrl.searchParams.append("redirect_uri", process.env.GOOGLE_REDIRECT_URI!);
  authUrl.searchParams.append("response_type", "code");
  authUrl.searchParams.append("scope", "openid email profile");
  authUrl.searchParams.append("access_type", "offline");
  authUrl.searchParams.append("prompt", "consent");

  res.redirect(authUrl.toString());
});

/**
 * Google OAuth 콜백
 */
/**
 * Google OAuth 콜백
 */
router.get("/google/callback", async (req, res) => {
  try {
    console.log("[AUTH][CALLBACK] STEP 1: callback entered");

    const code = req.query.code;
    console.log("[AUTH][CALLBACK] STEP 2: raw code =", code);

    if (typeof code !== "string") {
      console.error("[AUTH][CALLBACK] INVALID CODE");
      return res.status(400).json({ error: "Invalid authorization code" });
    }

    console.log("[AUTH][CALLBACK] STEP 3: exchanging Google code");
    const googleUser = await exchangeGoogleCode(code);

    const email = googleUser.email;
    const providerUserId = googleUser.providerId;
    const displayName = googleUser.name ?? null;

    if (!providerUserId) {
      return res.status(400).json({ error: "Invalid Google user" });
    }

    console.log("[AUTH][CALLBACK] STEP 4: user lookup start");

    const { data: user, error: selectError } = await supabaseAdmin
      .from("users")
      .select("id, email")
      .eq("provider", "google")
      .eq("provider_user_id", providerUserId)
      .maybeSingle();

    if (selectError) {
      return res.status(500).json({ error: "User lookup failed" });
    }

    let userId: string;

    if (!user) {
      console.log("[AUTH][CALLBACK] STEP 5: new user, creating");

      const { data: newUser, error: insertError } = await supabaseAdmin
        .from("users")
        .insert({
          email,
          name: displayName,
          provider: "google",
          provider_user_id: providerUserId,
          role: "user",
        })
        .select("id")
        .single();

      if (insertError) {
        return res.status(500).json({ error: "User creation failed" });
      }

      userId = newUser.id;
    } else {
      userId = user.id;
    }

    console.log("[AUTH][CALLBACK] STEP 6: issuing JWT");

    const authUser: AuthUser = {
      id: userId,
      email: email ?? "",
    };

    const { accessToken, refreshToken } = await issueTokens(authUser);

    /* ===============================
       ✅ STEP 7: 토큰을 쿠키로 설정
       =============================== */

    // 🔐 refresh token (HttpOnly)
    res.cookie("refresh_token", refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: isProd,
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // 🔓 access token (프론트에서 사용)
    res.cookie("access_token", accessToken, {
      httpOnly: false,        // 프론트 JS에서 읽어야 하면 false
      sameSite: "lax",
      secure: isProd,
      path: "/",
      maxAge: 15 * 60 * 1000, // 15분
    });

    /* ===============================
       ✅ STEP 8: 프론트로 리다이렉트
       =============================== */

    console.log("[AUTH][CALLBACK] STEP 8: redirect to /play");

    return res.redirect("http://localhost:3000/play");

  } catch (error) {
    console.error("[AUTH][CALLBACK] UNHANDLED ERROR", error);

    if (error instanceof HttpError) {
      return res.status(error.status).json({
        error: error.message || "Request failed",
      });
    }

    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/dev/login", async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(404).end();
  }

  const { email } = req.body;

  const { data: user } = await supabaseAdmin
    .from("users")
    .select("id, email")
    .eq("email", email)
    .single();

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const { accessToken, refreshToken } = await issueTokens({
    id: user.id,
    email: user.email,
  });

  return res.json({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
});

export default router;