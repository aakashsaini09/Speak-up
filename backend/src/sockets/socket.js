// import { server } from "../index.js";
// import { Server } from "socket.io";
// const io = new Server(server, {
//     cors: {
//         origin: "http://localhost",
//         methods: ["GET", "POST"]
//     }
// })

// io.on("connection", (socket) => {
//     console.log("A user connected: ", socket)

//     socket.on("message", (data) => {
//         console.log("Message received from client: ", data.message)
//     })
//     socket.on("disconnect", () => {
//         console.log("User disconnected: ", socket)
//     })
// })
import { Server } from "socket.io";
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
    console.log(
      `${socket.id} joined room ${roomId}`
    );

    socket.join(roomId);

    io.to(roomId).emit(
      "room-message",
      `User ${socket.id} joined`
    );
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