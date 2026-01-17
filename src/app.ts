import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import googleAuthRouter from "./auth/google.controller";
import "dotenv/config";

const { swaggerSpec } = require("./docs/swagger");

console.log("🔥 APP.TS LOADED 🔥");

const app = express();

// middleware
app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:3000", // 운영 시 도메인으로 변경
    credentials: true,
  })
);

// Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// OpenAPI JSON
app.get("/api-docs.json", (req, res) => {
  res.json(swaggerSpec);
});

// Health Check
app.get("/health", (req, res) => {
  res.send("ok");
});

// Routes
app.use("/auth/google", googleAuthRouter);

// ⚠️ listen은 여기서 하지 않는다 (CI 안정성)
// 서버 실행은 server.ts 또는 pm2에서 담당
export default app;
