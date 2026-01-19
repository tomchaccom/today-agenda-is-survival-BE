import { Router } from "express";
import "dotenv/config";

import { HttpError } from "../common/http-error";
import { exchangeGoogleCode } from "./google.service";
import { issueTokens } from "./auth.service";
import type { AuthUser } from "./auth.service";
import { supabaseAdmin } from "../supabase/supabase.client";

const router = Router();
const isProd = process.env.NODE_ENV === "production";

// ✅ 프론트 URL 환경 분기
const FRONT_URL = isProd
  ? "https://qltkek.shop"
  : "http://localhost:3000";

/**
 * Google OAuth 시작
 */
router.get("/google", (req, res) => {
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
/**
 * Google OAuth 콜백
 */
router.get("/google/callback", async (req, res) => {
  try {
    const code = req.query.code;
    if (typeof code !== "string") {
      return res.status(400).json({ error: "Invalid authorization code" });
    }

    const googleUser = await exchangeGoogleCode(code);

    const email = googleUser.email;
    const providerUserId = googleUser.providerId;
    const displayName = googleUser.name ?? null;

    if (!providerUserId) {
      return res.status(400).json({ error: "Invalid Google user" });
    }

    // 🔍 사용자 조회
    const { data: user } = await supabaseAdmin
      .from("users")
      .select("id, email")
      .eq("provider", "google")
      .eq("provider_user_id", providerUserId)
      .maybeSingle();

    let userId: string;

    if (!user) {
      const { data: newUser, error } = await supabaseAdmin
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

      if (error || !newUser) {
        return res.status(500).json({ error: "User creation failed" });
      }

      userId = newUser.id;
    } else {
      userId = user.id;
    }

    // 🔐 JWT 발급
    const authUser: AuthUser = { id: userId, email };
    const { accessToken, refreshToken } = await issueTokens(authUser);

    /* ===============================
       ✅ OAuth 쿠키 옵션 (단 하나)
       =============================== */
    const cookieOptions = {
      domain: ".qltkek.shop",
      path: "/",
      secure: true,
      sameSite: "none" as const,
    };

    /* ===============================
       🧹 과거 쿠키 정리 (중요)
       =============================== */
    res.clearCookie("refresh_token", cookieOptions);
    res.clearCookie("access_token", cookieOptions);

    // 혹시 예전에 domain 없이 만든 쿠키까지 제거
    res.clearCookie("refresh_token", { path: "/" });
    res.clearCookie("access_token", { path: "/" });

    /* ===============================
       🍪 새 쿠키 세팅
       =============================== */

    // refresh token
    res.cookie("refresh_token", refreshToken, {
      ...cookieOptions,
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // access token
    res.cookie("access_token", accessToken, {
      ...cookieOptions,
      httpOnly: true,
      maxAge: 15 * 60 * 1000,
    });

    // ✅ 프론트로 이동
    return res.redirect(`${FRONT_URL}/play`);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});


/**
 * 🧪 개발용 로그인 (POST 유지 권장)
 */

const allowDevLogin =
  process.env.NODE_ENV !== "production" ||
  process.env.ALLOW_DEV_LOGIN === "true";

router.post("/dev/login", async (req, res) => {
  // 🚫 production + ALLOW_DEV_LOGIN !== true → 차단
  if (!allowDevLogin) {
    return res.status(404).end();
  }

  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "email is required" });
  }

  const { data: user, error } = await supabaseAdmin
    .from("users")
    .select("id, email")
    .eq("email", email)
    .single();

  if (error || !user) {
    return res.status(404).json({ error: "User not found" });
  }

  const { accessToken, refreshToken } = await issueTokens({
    id: user.id,
    email: user.email,
  });

  // ❗ dev/login은 JSON 반환만 (쿠키 X)
  return res.json({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
});
export default router;