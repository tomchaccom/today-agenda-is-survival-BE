import express from "express";
import authRouter from "./auth/auth.controller";
import roomRouter from "./rooms/room.controller";
import voteRouter from "./votes/vote.controller";
import swaggerUi from 'swagger-ui-express';
import "dotenv/config";

console.log("🔥 APP.TS LOADED 🔥");

const app = express();

app.use(express.json());
const { swaggerSpec } = require('./docs/swagger');

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// OpenAPI JSON (문서 추출용)
app.get('/api-docs.json', (req, res) => {
  res.json(swaggerSpec);
});

app.listen(4000, () => {
  console.log('Server running on port 4000');
  console.log('Swagger UI: http://localhost:4000/api-docs');
  console.log('Swagger JSON: http://localhost:4000/api-docs.json');
});

app.get("/health", (req, res) => {
  res.send("ok");
});

app.use("/auth", authRouter);
app.use("/rooms", roomRouter);
app.use("/rooms", voteRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
