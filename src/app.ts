import express from "express";
import googleAuthRouter from "./auth/google.controller";
import "dotenv/config";

console.log("🔥 APP.TS LOADED 🔥");

const app = express();

app.use(express.json());
<<<<<<< Updated upstream

=======
const { swaggerSpec } = require('./docs/swagger');

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// CORS
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true,
}));

// OpenAPI JSON
app.get('/api-docs.json', (req, res) => {
  res.json(swaggerSpec);
});

// Health Check
>>>>>>> Stashed changes
app.get("/health", (req, res) => {
  res.send("ok");
});

<<<<<<< Updated upstream
app.use("/auth/google", googleAuthRouter);
=======
// Routers
app.use("/auth", authRouter);
app.use("/rooms", roomRouter);
app.use("/rooms", gameRouter);
>>>>>>> Stashed changes

// ✅ listen은 딱 한 번
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Swagger UI: http://localhost:${PORT}/api-docs`);
});
export default app;