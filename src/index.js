// index.js  (or server.js)
import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import session from "express-session";

import connectDB from "./config/db.js";
import { initSocket } from "./config/socket.js";

import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import studioRoutes from "./routes/studioRoutes.js";
import packageRoutes from "./routes/packageRoutes.js";
import addonRoutes from "./routes/addonRoutes.js";
import promoRoutes from "./routes/promoRoutes.js";
import sessionRoutes from "./routes/sessionRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import queueRoutes from "./routes/queueRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import shipmentRoutes from "./routes/shipmentRoutes.js";
import easyParcelRoutes from "./routes/easyParcelRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";

import cookieParser from "cookie-parser";
import helmet from "helmet";

dotenv.config();

const app = express();

app.use(helmet());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'default-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24  // 24 hours
  }
}));

app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true
}));

app.get("/", (req, res) => res.send("CPSMS API Running"));

// Register routes AFTER DB connection
const startServer = async () => {
  try {
    await connectDB();
    console.log("✅ MongoDB Connected");

    app.use("/api/auth", authRoutes);
    app.use("/api/users", userRoutes);
    app.use("/api/studios", studioRoutes);
    app.use("/api/packages", packageRoutes);
    app.use("/api/addons", addonRoutes);
    app.use("/api/promos", promoRoutes);
    app.use("/api/sessions", sessionRoutes);
    app.use("/api/bookings", bookingRoutes);
    app.use("/api/queue", queueRoutes);
    app.use("/api/payments", paymentRoutes);
    app.use("/api/shipments", shipmentRoutes);
    app.use("/api/dashboard", dashboardRoutes);
    app.use("/api/tasks", taskRoutes);
    app.use("/easyparcel", easyParcelRoutes);

    // === CRITICAL: Create HTTP server FIRST ===
    const httpServer = http.createServer(app);
    initSocket(httpServer);           // ← Socket.IO must be attached here

    const PORT = process.env.PORT || 8000;

    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`🔌 Socket.IO ready`);
    });

  } catch (error) {
    console.error("Server failed to start:", error);
    process.exit(1);
  }
};

startServer();