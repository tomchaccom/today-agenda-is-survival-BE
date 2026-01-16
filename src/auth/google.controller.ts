import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
  res.send("google auth start");
});

router.get("/callback", (req, res) => {
  res.send("google auth callback");
});

export default router;
