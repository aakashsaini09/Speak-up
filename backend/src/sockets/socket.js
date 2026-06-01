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
  // console.log("User connected:", socket.id);
  socket.on("join-room", (data) => {
    const {roomId, userId, name, imageUrl} = data;
    socket.join(roomId)
    console.log(`${socket.id} joined room ${roomId}`);

  if (!activeRooms.has(roomId)) {
  activeRooms.set(roomId, {
    participants: new Map(),
  });
  }
  activeRooms
  .get(roomId)
  .participants
  .set(userId, {
    userId,
    socketId: socket.id,
    name,
    imageUrl,
  });
  const participants = Array.from(activeRooms.get(roomId).participants.values());
  console.log("participants: ", participants)
  const count = activeRooms.get(roomId).participants.size;
  io.to(roomId).emit("participants-count",  count);
  io.to(roomId).emit("participants-update",  participants);
  io.to(roomId).emit("room-message", `User ${socket.id} joined`);
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