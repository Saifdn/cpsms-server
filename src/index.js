// index.js  (or server.js)
import "./env.js";
import express from "express";
import http from "http";
import cors from "cors";
import session from "express-session";
import { mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

import connectDB from "./config/db.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const LOGO_SVG = `<?xml version="1.0" encoding="UTF-8" standalone="no"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd"><svg width="100%" height="100%" viewBox="0 0 2917 830" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve" xmlns:serif="http://www.serif.com/" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;"><path d="M439.893,257.91l6.66,-200.619l254.3,0.284l48.722,94.391l154.468,-0.547l60.119,95.614l-211.892,79.899c-55.113,21.084 -87.296,71.642 -88.19,119.978c-0.978,52.874 26.621,102.383 86.821,124.162l186.699,66.524l-43.384,135.593l-727.307,0l-35.57,-231.428l57.12,0l11.566,52.587l0,-215.081c-21.611,-7.866 -30.183,-20.626 -30.273,-36.568c-0.583,-8.671 1.683,-15.785 6.636,-21.43c5.283,-6.022 13.623,-10.372 24.822,-13.161l82.643,-154.32l26.369,0l0,-26.382l19.53,0l0,-9.876l33.135,0l0,8.858l18.416,0l0,25.76l49.855,0l-7.591,192.475l-49.258,0l0,32.382l45.348,0l-6.573,116.725l-38.617,0l0,122.684c2.234,11.686 7.821,19.26 17.303,22.056l47.932,0c-11.505,-5.897 -19.211,-13.968 -23.243,-24.139l20.855,-342.416l42.037,0l40.912,340.076c-4.57,12.788 -12.744,20.764 -23.8,24.887l34.513,0l-41.487,-378.983l-49.596,0.015Zm-296.203,294.91l31.889,210.653l707.876,0l37.48,-115.019l-723.171,0l-16.387,-95.634l-37.687,0Zm56.086,-223.656c-8.469,1.596 -13.577,4.915 -13.333,14.296c0.204,7.856 5.971,13.099 13.333,12.067l0,-26.363Zm277.48,107.069l-13.936,147.316c1.835,8.715 7.231,13.013 16.983,12.911c9.037,-0.094 14.469,-2.626 17.623,-11.614l-20.67,-148.612Zm57.072,-352.645l0.64,58.526l171.51,0l-31.21,-58.526l-140.94,0Z" style="fill:#680202;"/><path d="M1275.982,480.653c-18.422,140.56 -152.747,206.299 -265.698,172.037l-250.906,-88.02c-57.018,-22.819 -80.802,-61.669 -81.163,-103.661c-2.074,-66.674 30.63,-107.324 89.338,-128.515l243.179,-91.051c45.677,-15.621 79.021,-10.133 104.73,-6.388c71.014,10.345 138.386,83.779 159.624,173.594c3.034,12.83 3.873,49.285 0.895,72.004Zm-381.665,-36.937c-1.738,112.041 110.667,179.443 194.11,167.412c90.293,-13.019 157.227,-98.739 151.502,-166.225c-9.062,-106.817 -76.986,-168.67 -167.352,-168.969c-94.13,-0.311 -176.685,66.253 -178.26,167.781Z" style="fill:#680202;"/><g transform="matrix(83.561384,0,0,83.561384,755.910285,739.602259)"></g><text x="300.892px" y="739.602px" style="font-family:'TimesNewRomanPS-ItalicMT', 'Times New Roman', serif;font-style:italic;font-size:83.561px;fill:#680202;">K R E <tspan x="519.874px 569.407px 590.297px 635.26px 656.151px " y="739.602px 739.602px 739.602px 739.602px 739.602px ">A T I</tspan> F</text><g transform="matrix(528.898173,0,0,528.898173,2804.133788,604.030026)"></g><text x="1344.189px" y="604.03px" style="font-family:'Arial-BoldMT', 'Arial', sans-serif;font-weight:700;font-size:528.898px;fill:#680202;">S<tspan x="1659.937px 1799.041px 2085.091px 2371.14px 2481.062px " y="604.03px 604.03px 604.03px 604.03px 604.03px ">tudio</tspan></text></svg>`;

async function generateLogo() {
  const { default: sharp } = await import("sharp");
  const buf = await sharp(Buffer.from(LOGO_SVG))
    .resize(480, 136, { fit: "contain", background: { r: 139, g: 48, b: 32, alpha: 0 } })
    .png()
    .toBuffer();
  const publicDir = join(__dirname, "..", "public");
  mkdirSync(publicDir, { recursive: true });
  writeFileSync(join(publicDir, "logo.png"), buf);
}
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
import { errorHandler } from "./middleware/errorHandler.js";

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

app.use(express.static(join(__dirname, "..", "public")));
app.get("/", (req, res) => res.send("CPSMS API Running"));

// Register routes AFTER DB connection
const startServer = async () => {
  try {
    await connectDB();
    console.log("✅ MongoDB Connected");

    await generateLogo();

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

    app.use((req, res) => res.status(404).json({ success: false, message: "Route not found" }));
    app.use(errorHandler);

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