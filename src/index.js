import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimiter from "./middleware/rateLimiter.js";

dotenv.config();

const app = express();

app.use(helmet());
app.use(cookieParser());
app.use(express.json());

app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true
}));

// app.use(rateLimiter);
app.use("/api/auth", authRoutes);

connectDB();

app.get("/", (req, res) => {
  res.send("CPSMS API Running");
});

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});