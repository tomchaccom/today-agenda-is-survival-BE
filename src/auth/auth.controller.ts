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
router.get("/google/callback", async (req, res) => {
  try {
    /* STEP 1 */
    console.log("[AUTH][CALLBACK] STEP 1: callback entered");

    /* STEP 2 */
    const code = req.query.code;
    console.log("[AUTH][CALLBACK] STEP 2: raw code =", code);

    if (typeof code !== "string") {
      console.error("[AUTH][CALLBACK] INVALID CODE");
      return res.status(400).json({ error: "Invalid authorization code" });
    }

    /* STEP 3 */
    console.log("[AUTH][CALLBACK] STEP 3: exchanging Google code");
    const googleUser = await exchangeGoogleCode(code);

    const email = googleUser.email;
    const providerUserId = googleUser.providerId;

    console.log("[AUTH][CALLBACK] STEP 3-1: googleUser =", {
      email,
      providerUserId,
    });

    if (!providerUserId) {
      console.error("[AUTH][CALLBACK] provider_user_id missing");
      return res.status(400).json({ error: "Invalid Google user" });
    }

    // ✅ 타입에 맞는 displayName (이게 정답)
    const displayName = googleUser.name ?? null;

    /* STEP 4 */
    console.log("[AUTH][CALLBACK] STEP 4: user lookup start");

    const { data: user, error: selectError } = await supabaseAdmin
      .from("users")
      .select("id, email")
      .eq("provider", "google")
      .eq("provider_user_id", providerUserId)
      .maybeSingle();

    if (selectError) {
      console.error("[AUTH][CALLBACK] USER LOOKUP FAILED", selectError);
      return res.status(500).json({ error: "User lookup failed" });
    }

    console.log("[AUTH][CALLBACK] STEP 4-1: lookup result =", user);

    let userId: string;
    let isNewUser = false;

    /* STEP 5 */
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
        console.error("[AUTH][CALLBACK] USER CREATION FAILED", insertError);
        return res.status(500).json({ error: "User creation failed" });
      }

      userId = newUser.id;
      isNewUser = true;

      console.log("[AUTH][CALLBACK] STEP 5-1: user created id =", userId);
    } else {
      userId = user.id;
      console.log("[AUTH][CALLBACK] STEP 5-1: existing user id =", userId);
    }

    /* STEP 6 */
    console.log("[AUTH][CALLBACK] STEP 6: issuing JWT");

    const authUser: AuthUser = {
      id: userId,
      email: email ?? "",
    };

    const { accessToken, refreshToken } = await issueTokens(authUser);

    console.log("[AUTH][CALLBACK] STEP 6-1: tokens issued", {
      accessToken: Boolean(accessToken),
      refreshToken: Boolean(refreshToken),
    });

    /* STEP 7 */
    console.log("[AUTH][CALLBACK] STEP 7: setting refresh token cookie");

    res.cookie("refresh_token", refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: isProd,
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    /* STEP 8 */
    console.log("[AUTH][CALLBACK] STEP 8: response send");

    return res.status(200).json({
      ok: true,
      access_token: accessToken,
      token_type: "Bearer",
      isNewUser,
    });
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

export default router;
