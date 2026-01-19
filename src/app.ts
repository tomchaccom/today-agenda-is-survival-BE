import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import dotenv from "dotenv";

import authRouter from "./auth/auth.controller";
import { swaggerSpec } from "./config/swagger";
import roomRouter from "./rooms/room.controller";
import gameRouter from "./game/game.controller";
import jwt from "jsonwebtoken";
import chaptersRouter from "./chapters/chapters.controller";





dotenv.config();

const app = express();

/* ========================
   Middleware
======================== */
app.use(express.json());

app.use(
  cors({
    origin: [
      "http://localhost:3000",     // 로컬 프론트
      "https://qltkek.shop",       // 배포 프론트
      "https://www.qltkek.shop",
    ],
    credentials: true,
  })
);
app.use("/rooms", chaptersRouter);

app.use("/rooms", roomRouter);
app.use("/rooms", gameRouter);

/* ========================
   Swagger (API Docs)
======================== */
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/auth", authRouter);


app.get("/api-docs.json", (req, res) => {
  res.json(swaggerSpec);
});

/* ========================
   Health Check
======================== */
app.get("/health", (req, res) => {
  res.send("ok");
});

/* ========================
   Routes
======================== */
app.use("/auth", authRouter);

export default app;

app.listen(4000, () => {
  console.log("Server running on port 4000");
});

app.get("/__debug/jwt", (req, res) => {
  console.log("[DEBUG] headers =", req.headers);

  try {
    const auth = req.headers.authorization;
    if (!auth?.startsWith("Bearer ")) {
      return res.status(400).json({ error: "no bearer" });
    }

    const token = auth.slice(7);
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET!);

    return res.json({
      ok: true,
      decoded,
    });
  } catch (e) {
    console.error("[DEBUG] jwt error", e);
    return res.status(401).json({ error: String(e) });
  }
});
