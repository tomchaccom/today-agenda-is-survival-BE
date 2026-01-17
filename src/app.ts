import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import "dotenv/config";

import googleAuthRouter from "./auth/google.controller";
const { swaggerSpec } = require("./docs/swagger");

const app = express();

app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get("/api-docs.json", (req, res) => {
  res.json(swaggerSpec);
});

app.get("/health", (req, res) => {
  res.send("ok");
});

// 🔹 여기서 controller 연결
app.use("/auth", googleAuthRouter);

export default app;
