// config/socket.js
import { Server } from "socket.io";

let ioInstance = null;

export const initSocket = (httpServer) => {
  ioInstance = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  ioInstance.on("connection", (socket) => {
    console.log(`🔌 Socket.IO Client connected: ${socket.id}`);

    socket.on("disconnect", () => {
      console.log(`🔌 Socket.IO Client disconnected: ${socket.id}`);
    });
  });

  console.log("✅ Socket.IO initialized");
  return ioInstance;
};

// Getter to access io from anywhere
export const getIO = () => {
  if (!ioInstance) {
    console.warn("Socket.IO has not been initialized yet!");
  }
  return ioInstance;
};

// Broadcast queue updates to all connected clients
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
      timestamp: new Date().toISOString(),
    });

    console.log(`📡 Broadcasted queue update - ${activeQueue.length} items`);
  } catch (error) {
    console.error("❌ Error broadcasting queue update:", error);
  }
};