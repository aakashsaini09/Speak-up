import express from "express";
import http from "http";
import cors from "cors";
import "dotenv/config";

import { PORT } from "./config/env.js";
import { connectToDatabase } from "./config/db.js";
import router from "./routes/user.route.js";
import roomRoutes from "./routes/room.route.js";
import { initializeSocket } from "./sockets/socket.js";
import { startRoomCleanupJob } from "./services/cleanUpRooms.js";
import messageRouter from "./routes/message.route.js";
import friendRoutes from "./routes/friends.route.js";
const app = express();
const allowedOrigins = [
  "http://localhost:3000",
  "https://speak-up.online",
  "https://www.speak-up.online",
];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use("/api/clerk", router);
app.use(express.json());
app.use("/api/room", roomRoutes);
app.use("/api/messages", messageRouter);
app.use("/api/friend", friendRoutes);
const server = http.createServer(app);

// Initialize Socket.IO
initializeSocket(server);
connectToDatabase();
startRoomCleanupJob();
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});