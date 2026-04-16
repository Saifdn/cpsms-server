import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";

import connectDB from "./config/db.js";
import { initSocket } from "./config/socket.js";   // your socket config

// Import routes
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import studioRoutes from "./routes/studioRoutes.js";
import packageRoutes from "./routes/packageRoutes.js";
import addonRoutes from "./routes/addonRoutes.js";
import promoRoutes from "./routes/promoRoutes.js";
import sessionRoutes from "./routes/sessionRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import queueRoutes from "./routes/queueRoutes.js";

import cookieParser from "cookie-parser";
import helmet from "helmet";

dotenv.config();

const app = express();

// Middleware
app.use(helmet());
app.use(cookieParser());
app.use(express.json());

app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true
}));

// ==================== IMPORTANT: Connect to DB FIRST ====================
const startServer = async () => {
  try {
    await connectDB();           // ← Wait for DB connection
    console.log("✅ MongoDB Connected Successfully");

    // Now register routes (after DB is connected)
    app.use("/api/auth", authRoutes);
    app.use("/api/users", userRoutes);
    app.use("/api/studios", studioRoutes);
    app.use("/api/packages", packageRoutes);
    app.use("/api/addons", addonRoutes);
    app.use("/api/promos", promoRoutes);
    app.use("/api/sessions", sessionRoutes);
    app.use("/api/bookings", bookingRoutes);
    app.use("/api/queue", queueRoutes);

    app.get("/", (req, res) => {
      res.send("CPSMS API Running");
    });

    // Create HTTP server + Socket.IO
    const httpServer = http.createServer(app);
    initSocket(httpServer);

    const PORT = process.env.PORT || 8000;

    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🔌 Socket.IO is ready`);
    });

  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();