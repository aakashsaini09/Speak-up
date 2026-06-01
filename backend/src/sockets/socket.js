import { Server } from "socket.io";
import { activeRooms } from "./activeRooms.js";
let io;
export const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: "http://localhost:3000",
      credentials: true,
    },
  });
  io.on("connection", (socket) => {
  console.log("User connected:", socket.id);
  socket.on("join-room", ({ roomId }) => {
  console.log(`${socket.id} joined room ${roomId}`);

  
    io.to(roomId).emit("room-message", `User ${socket.id} joined` );
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});
  return io;
};
export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }
  return io;
};