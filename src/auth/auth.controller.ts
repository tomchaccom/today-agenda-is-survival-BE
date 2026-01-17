import { Router } from "express";
import "dotenv/config";

import { exchangeGoogleCode } from "./google.service";
import { issueTokens } from "./auth.service";

const router = Router();
const isProd = process.env.NODE_ENV === "production";

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: 인증 및 토큰 발급 API
 */

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *
 *   schemas:
 *     AuthTokenResponse:
 *       type: object
 *       properties:
 *         access_token:
 *           type: string
 *           description: JWT Access Token
 *           example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *         refresh_token:
 *           type: string
 *           description: JWT Refresh Token (also set as HttpOnly cookie)
 *           example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *         token_type:
 *           type: string
 *           example: Bearer
 */

/**
 * @swagger
 * /auth/google:
 *   get:
 *     summary: Google OAuth 로그인 시작
 *     description: |
 *       Google OAuth 인증 페이지로 리다이렉트한다.
 *
 *       **이 API는 브라우저에서 직접 호출해야 하며**
 *       Swagger의 Try it out 용도가 아니다.
 *     tags: [Auth]
 *     responses:
 *       302:
 *         description: Google OAuth 인증 페이지로 리다이렉트
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
 * @swagger
 * /auth/google/callback:
 *   get:
 *     summary: Google OAuth 콜백 및 JWT 발급
 *     description: |
 *       Google OAuth 인증 후 전달된 `code`를 이용해
 *       사용자 정보를 조회하고 JWT 토큰을 발급한다.
 *
 *       - Refresh Token은 HttpOnly Cookie로 설정된다.
 *       - Access Token은 응답 Body로 반환된다.
 *     tags: [Auth]
 *     parameters:
 *       - in: query
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Google OAuth Authorization Code
 *     responses:
 *       200:
 *         description: JWT 토큰 발급 성공
 *         headers:
 *           Set-Cookie:
 *             description: refresh_token HttpOnly Cookie
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthTokenResponse'
 *       400:
 *         description: Authorization code 누락
 *       500:
 *         description: 인증 실패
 */
router.get("/google/callback", async (req, res) => {
  try {
    const code = typeof req.query.code === "string" ? req.query.code : "";
    if (!code) {
      res.status(400).send("Missing authorization code");
      return;
    }

    const googleUser = await exchangeGoogleCode(code);

    const authUser = {
      id: googleUser.email,
      email: googleUser.email,
    };
    
    const { accessToken, refreshToken } = await issueTokens(authUser);
    
    

    res.cookie("refresh_token", refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: isProd,
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: "Bearer",
    });
  } catch (error) {
    console.error("AUTH ERROR:", error);
    res.status(500).send("Authentication failed");
  }
});

export default router;
