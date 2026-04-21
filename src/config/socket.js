// config/socket.js
import { Server } from "socket.io";

let ioInstance = null;

export const initSocket = (httpServer) => {
  ioInstance = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization"]
    },
    transports: ["websocket", "polling"]   // ← Add this line
  });

  ioInstance.on("connection", (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  // Client requests latest queue data
  socket.on("requestQueueUpdate", async () => {
    console.log("📥 Client requested latest queue data");
    await broadcastQueueUpdate();
  });

  socket.on("disconnect", () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

  console.log("✅ Socket.IO initialized with WebSocket + Polling");
  return ioInstance;
};

export const getIO = () => ioInstance;

export const broadcastQueueUpdate = async () => {
  const io = getIO();
  if (!io) return;

  try {
    const Queue = (await import("../models/Queue.js")).default;
    const activeQueue = await Queue.getActiveQueue();

    io.emit("queueUpdated", {
      success: true,
      data: activeQueue,
      count: activeQueue.length,
    });
  } catch (error) {
    console.error("Broadcast error:", error.message);
  }
};