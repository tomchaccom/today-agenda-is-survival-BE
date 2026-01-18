import { Router } from "express";
import "dotenv/config";

import { exchangeGoogleCode } from "./google.service";
import { issueTokens } from "./auth.service";
import type { AuthUser } from "./auth.service";
import { supabaseAdmin } from "../supabase/supabase.client";

const supabase = supabaseAdmin;
const router = Router();
const isProd = process.env.NODE_ENV === "production";

/**
 * Google OAuth 시작 (로그인 페이지로 리다이렉트)
 */
router.get("/google", (req, res) => {
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");

  authUrl.searchParams.append(
    "client_id",
    process.env.GOOGLE_CLIENT_ID!
  );
  authUrl.searchParams.append(
    "redirect_uri",
    process.env.GOOGLE_REDIRECT_URI!
  );
  authUrl.searchParams.append("response_type", "code");
  authUrl.searchParams.append("scope", "openid email profile");
  authUrl.searchParams.append("access_type", "offline");
  authUrl.searchParams.append("prompt", "consent");

  res.redirect(authUrl.toString());
});

/**
 * Google OAuth 콜백
 * - 회원 존재 여부 확인
 * - 없으면 회원가입
 * - uuid 기준 JWT 발급
 */
router.get("/google/callback", async (req, res) => {
  try {
    const code = req.query.code;

    if (typeof code !== "string") {
      return res.status(400).json({ error: "Invalid authorization code" });
    }

    // 1️⃣ Google 사용자 정보 조회
    const googleUser = await exchangeGoogleCode(code);
    const email = googleUser.email;

    if (!email) {
      return res.status(400).json({ error: "Email not provided by Google" });
    }

    // 2️⃣ email로 사용자 조회
    const { data: user, error: selectError } = await supabase
      .from("users")
      .select("id, email")
      .eq("email", email)
      .maybeSingle();

    if (selectError) {
      console.error(selectError);
      return res.status(500).json({ error: "User lookup failed" });
    }

    let userId: string;
    let isNewUser = false;

    // 3️⃣ 없으면 회원가입
    if (!user) {
      const { data: newUser, error: insertError } = await supabase
        .from("users")
        .insert({
          email,
          provider: "google",
          role: "user",
        })
        .select("id")
        .single();

      if (insertError || !newUser) {
        console.error(insertError);
        return res.status(500).json({ error: "User creation failed" });
      }

      userId = newUser.id; // ✅ uuid
      isNewUser = true;
    } else {
      userId = user.id; // ✅ uuid
    }

    // 4️⃣ uuid 기준 JWT 발급
    const authUser: AuthUser = {
      id: userId, // 🔥 이제 uuid
      email,
    };

    const { accessToken, refreshToken } = await issueTokens(authUser);

    // 5️⃣ Refresh Token 쿠키 설정
    res.cookie("refresh_token", refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: isProd,
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // 6️⃣ 응답
    res.status(200).json({
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: "Bearer",
      isNewUser,
    });
  } catch (error) {
    console.error("AUTH ERROR:", error);
    res.status(500).send("Authentication failed");
  }
});

export default router;
