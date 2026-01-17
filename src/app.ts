import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import "dotenv/config";

import authRouter from "./auth/auth.controller";
const { swaggerSpec } = require("./docs/swagger");

const app = express();

app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

// Swagger
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get("/api-docs.json", (req, res) => {
  res.json(swaggerSpec);
});

// Health check
app.get("/health", (req, res) => {
  res.send("ok");
});

// ✅ Auth Router (Google OAuth 포함)
app.use("/auth", authRouter);

export default app;
