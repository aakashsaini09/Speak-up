import { Server } from "socket.io";
import { activeRooms, worldChatUsers } from "./activeRooms.js";
import Room from "../models/room.model.js";
import { updateUserCount } from "./updateInDB.js";
let io;
export const initializeSocket = async (server) => {
  io = new Server(server, {
    cors: {
      origin: "http://localhost:3000",
      credentials: true,
    },
  });
  io.on("connection", (socket) => {
  socket.on("join-room", (data) => {
    const {roomId, userId, name, imageUrl} = data;
    socket.roomId = roomId;
    socket.userId = userId;
    socket.join(roomId)
    console.log("RoomId: ", roomId, "userId: ", userId);

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
  const count = activeRooms.get(roomId).participants.size;
  updateUserCount(count, roomId)
  io.to(roomId).emit("participants-count", count);
  io.to(roomId).emit("participants-update",  participants);
  io.to(roomId).emit("room-message", `User ${socket.id} joined`);
  // console.log( "participants map:",  activeRooms.get(roomId).participants);
  // console.log( "participants array:",  participants);
  // console.log( "count:", count);
  });
  socket.on("room-message", (data)=> {
    io.emit("room-message", data)
  })
  socket.on("world-chat-join", user => {
    worldChatUsers.set(user.userId, user);
    // console.log("User joined: ", worldChatUsers)
    io.emit("world-chat-count", worldChatUsers.size);
  }
);
  socket.on("world-chat-message", data => {
    // console.log("Data in server side: ", data)
    io.emit("world-chat-message", data)
  });
  socket.on("leave-room", async () => {
  const roomId = socket.roomId;
  const userId = socket.userId;
  if ( roomId && activeRooms.has(roomId)) {
    activeRooms.get(roomId).participants.delete(userId);
    const participants = Array.from(activeRooms.get(roomId).participants.values());
    const count = participants.length;
    await updateUserCount(count, roomId );
    if ( activeRooms.get(roomId).participants.size === 0) {
      activeRooms.delete(roomId); 
    }
    io.to(roomId).emit( "participants-count", count);
    io.to(roomId).emit("participants-update",  participants );
    socket.leave(roomId);
  }
});
  socket.on("disconnect", async () => {
  const roomId = socket.roomId;
  const userId = socket.userId;
  if (roomId && activeRooms.has(roomId)) {
    activeRooms
      .get(roomId)
      .participants
      .delete(userId);
    const count =
      activeRooms.get(roomId).participants.size;
      if ( activeRooms.get(roomId).participants.size === 0) {
        activeRooms.delete(roomId);
      }
    await updateUserCount(count, roomId);
    const participants =
      Array.from(
        activeRooms
          .get(roomId)
          .participants
          .values()
      );
    io.to(roomId).emit(
      "participants-count",
      count
    );
    io.to(roomId).emit(
      "participants-update",
      participants
    );
  }
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