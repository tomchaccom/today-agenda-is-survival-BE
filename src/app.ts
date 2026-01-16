import express from "express";
import googleAuthRouter from "./auth/google.controller";
import "dotenv/config";

console.log("🔥 APP.TS LOADED 🔥");

const app = express();

app.use(express.json());

app.get("/health", (req, res) => {
  res.send("ok");
});

app.use("/auth/google", googleAuthRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
