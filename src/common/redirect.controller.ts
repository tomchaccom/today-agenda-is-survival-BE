import { Router } from "express";
import { requireAuth } from "../auth/jwt.middleware";

const router = Router();

router.get("/play", requireAuth, (req, res) => {
  console.log("[REDIRECT] user:", req.user);
  return res.redirect("http://localhost:3000/play");
});

export default router;
