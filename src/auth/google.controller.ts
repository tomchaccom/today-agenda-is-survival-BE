import { Router } from "express";
import "dotenv/config";
import * as jwt from "jsonwebtoken";

import { exchangeGoogleCode } from "./google.service";

const router = Router();

router.get("/", (req, res) => {
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  console.log("AUTH_URL:", authUrl.toString());

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

  console.log("AUTH_URL:", authUrl.toString());

  res.redirect(authUrl.toString());
});


router.get("/callback", async (req, res) => {
  console.log("CALLBACK ROUTE HIT");
  console.log("QUERY:", req.query);

  try {
    const code = typeof req.query.code === "string" ? req.query.code : "";
    if (!code) {
      res.status(400).send("Missing authorization code");
      return;
    }

    const user = await exchangeGoogleCode(code);

    const token = jwt.sign(
      {
        userId: user.providerId,
        email: user.email,
        provider: user.provider,
      },
      process.env.JWT_SECRET!,
      { expiresIn: "1h" }
    );

    res.cookie("access_token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: false, // local
      path: "/",
    });

    res.redirect(process.env.FRONTEND_REDIRECT_URL!);
  } catch (error) {
    console.error("AUTH ERROR:", error);
    res.status(500).send("Authentication failed");
  }
});

export default router;