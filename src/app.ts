import express from "express";
import authRouter from "./auth/auth.controller";
import roomRouter from "./rooms/room.controller";
import voteRouter from "./votes/vote.controller";
import "dotenv/config";

console.log("🔥 APP.TS LOADED 🔥");

const app = express();

app.use(express.json());

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
