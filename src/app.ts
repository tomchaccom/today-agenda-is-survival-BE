import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import dotenv from "dotenv";

import authRouter from "./auth/auth.controller";
import { swaggerSpec } from "./config/swagger";


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

/* ========================
   Swagger (API Docs)
======================== */
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

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
