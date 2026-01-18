import { Router } from "express";
import "dotenv/config";

import { HttpError } from "../common/http-error";
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
  console.log("[AUTH][GOOGLE] STEP 0: /auth/google entered");
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
    // STEP 1: callback 라우트 진입 확인
    console.log("[AUTH][CALLBACK] STEP 1: callback route entered");

    // STEP 2: req.query.code 값 출력
    console.log("[AUTH][CALLBACK] STEP 2: code raw =", req.query.code);
    const code = req.query.code;

    if (typeof code !== "string") {
      return res.status(400).json({ error: "Invalid authorization code" });
    }

    // STEP 3: Google token exchange 직전
    console.log("[AUTH][CALLBACK] STEP 3: exchanging Google code");
    // 1️⃣ Google 사용자 정보 조회
    const googleUser = await exchangeGoogleCode(code);
    const email = googleUser.email;

    // STEP 4: Google token exchange 성공 후 (access_token 존재 여부)
    console.log(
      "[AUTH][CALLBACK] STEP 4: exchange success, providerId exists =",
      Boolean(googleUser.providerId)
    );

    // STEP 5: Google userinfo 조회 성공 (email, sub 출력)
    console.log(
      "[AUTH][CALLBACK] STEP 5: userinfo",
      { email: googleUser.email, sub: googleUser.providerId }
    );

    if (!email) {
      return res.status(400).json({ error: "Email not provided by Google" });
    }

    // STEP 6: DB에서 사용자 조회 시작
    console.log("[AUTH][CALLBACK] STEP 6: user lookup start");
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
      // STEP 7: 기존 사용자 존재 / 신규 사용자 생성 여부
      console.log("[AUTH][CALLBACK] STEP 7: new user created");
    } else {
      userId = user.id; // ✅ uuid
      // STEP 7: 기존 사용자 존재 / 신규 사용자 생성 여부
      console.log("[AUTH][CALLBACK] STEP 7: existing user found");
    }

    // STEP 8: JWT 발급 직전
    console.log("[AUTH][CALLBACK] STEP 8: issuing JWTs");
    // 4️⃣ uuid 기준 JWT 발급
    const authUser: AuthUser = {
      id: userId, // 🔥 이제 uuid
      email,
    };

    const { accessToken, refreshToken } = await issueTokens(authUser);
    // STEP 9: JWT 발급 성공
    console.log(
      "[AUTH][CALLBACK] STEP 9: JWT issued",
      { accessToken: Boolean(accessToken), refreshToken: Boolean(refreshToken) }
    );

    // 5️⃣ Refresh Token 쿠키 설정
    res.cookie("refresh_token", refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: isProd,
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // STEP 10: 최종 응답 직전
    console.log("[AUTH][CALLBACK] STEP 10: responding");
    // 6️⃣ 응답
    res.status(200).json({
      ok: true,
      step: "callback-finished",
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: "Bearer",
      isNewUser,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.status).json({
        error: error.message || "Request failed",
      });
    }

    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
