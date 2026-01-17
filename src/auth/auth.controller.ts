import { Router } from "express";
import "dotenv/config";

import { exchangeGoogleCode } from "./google.service";
import { issueTokens } from "./auth.service";

const router = Router();

const isProd = process.env.NODE_ENV === "production";

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

router.get("/google/callback", async (req, res) => {
  try {
    const code = typeof req.query.code === "string" ? req.query.code : "";
    if (!code) {
      res.status(400).send("Missing authorization code");
      return;
    }

    const user = await exchangeGoogleCode(code);
    const { accessToken, refreshToken } = await issueTokens(user);

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
