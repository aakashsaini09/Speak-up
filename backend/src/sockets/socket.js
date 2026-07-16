import { Server } from "socket.io";
import { activeRooms, worldChatUsers } from "./activeRooms.js";
import Room from "../models/room.model.js";
import User from "../models/userModel.js";
import { saveWorldChatMsg, updateUserCount } from "./updateInDB.js";
import Conversation from "../models/conversation.model.js";
import { saveChatMessage } from "../controllers/chatController.js";

// Per-room ban lists: roomId → Set<userId>
const roomBans = new Map();

// Resolves a MongoDB ObjectId (room.creatorId) back to the Clerk userId string
// so the frontend can match it against participant.userId
async function resolveAdminClerkId(creatorMongoId) {
  try {
    const user = await User.findById(creatorMongoId).select("clerkId");
    return user?.clerkId ?? null;
  } catch {
    return null;
  }
}

let io;

export const initializeSocket = async (server) => {
  io = new Server(server, {
    cors: {
      origin: [
        "http://localhost:3000",
        "https://speak-up.online",
        "https://www.speak-up.online",
      ],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {

    // ── Direct chat ────────────────────────────────────────────────────────

    socket.on("join-chat", async (payload) => {
      const conversationId = typeof payload === "string" ? payload : payload?.conversationId;
      const clerkId = typeof payload === "object" ? payload?.clerkId : undefined;

      if (!conversationId || !clerkId) return;

      try {
        const [user, conversation] = await Promise.all([
          User.findOne({ clerkId }).select("_id clerkId"),
          Conversation.findById(conversationId).select("participants"),
        ]);

        if (!user || !conversation) return;

        const isParticipant = conversation.participants.some(
          (participantId) => String(participantId) === String(user._id)
        );

        if (!isParticipant) return;

        socket.chatConversationId = conversationId;
        socket.chatUserId = String(user._id);
        socket.chatClerkId = clerkId;
        socket.join(conversationId);

        conversation.lastReadAt.set(String(user._id), new Date());
        await conversation.save();
      } catch (error) {
        console.error("[Chat] join failed:", error);
      }
    });

    socket.on("send-message", async (data) => {
      const conversationId = data?.conversationId ?? socket.chatConversationId;
      const text = typeof data?.text === "string" ? data.text : "";

      if (!conversationId || !socket.chatUserId) return;

      try {
        const savedMessage = await saveChatMessage({
          conversationId,
          senderId: socket.chatUserId,
          text,
        });

        io.to(conversationId).emit("new-message", savedMessage);
      } catch (error) {
        socket.emit("chat-error", {
          message: error instanceof Error ? error.message : "Failed to send message",
        });
      }
    });

    socket.on("leave-chat", async (payload) => {
      const conversationId = typeof payload === "string" ? payload : payload?.conversationId;
      if (!conversationId) return;

      socket.leave(conversationId);
      if (socket.chatConversationId === conversationId) {
        socket.chatConversationId = undefined;
      }
    });

    // ── Join room ───────────────────────────────────────────────────────────

    socket.on("join-room", async (data) => {
      const { roomId, userId, name, imageUrl } = data;
      if (!userId || !roomId) return;

      // Block banned users before doing anything else
      if (roomBans.get(roomId)?.has(userId)) {
        socket.emit("kicked", { reason: "You have been removed from this room by the admin." });
        return;
      }

      socket.roomId = roomId;
      socket.userId = userId;
      socket.join(roomId);

      if (!activeRooms.has(roomId)) {
        activeRooms.set(roomId, { participants: new Map() });
      }

      activeRooms.get(roomId).participants.set(userId, {
        userId,
        socketId: socket.id,
        name,
        imageUrl,
      });

      const participants = Array.from(activeRooms.get(roomId).participants.values());
      const count = activeRooms.get(roomId).participants.size;

      socket.emit("existing-participants", participants);
      updateUserCount(count, roomId);
      io.to(roomId).emit("participants-count", count);
      io.to(roomId).emit("participants-update", participants);
      io.to(roomId).emit("room-message", `User ${socket.id} joined`);

      // Check DB to see if this user created the room.
      // userId is a Clerk string; room.creatorId is a MongoDB ObjectId.
      // So we look up the User by clerkId first, then compare _id values.
      try {
        const [room, dbUser] = await Promise.all([
          Room.findById(roomId),
          User.findOne({ clerkId: userId }),
        ]);
        const isRoomAdmin = room && dbUser && String(room.creatorId) === String(dbUser._id);
        socket.emit("is-admin", !!isRoomAdmin);
        // Broadcast the Clerk userId as the admin identifier so the frontend
        // can match it against participant.userId (which is also a Clerk ID)
        if (room && dbUser) {
          io.to(roomId).emit("admin-user", isRoomAdmin ? userId : await resolveAdminClerkId(room.creatorId));
        }
      } catch (err) {
        console.error("[Admin] DB lookup failed:", err);
      }
    });

    // ── Chat ────────────────────────────────────────────────────────────────

    socket.on("room-message", (data) => {
      const roomId = socket.roomId;
      io.to(roomId).emit("room-message", data);
    });

    // ── Kick ────────────────────────────────────────────────────────────────

    socket.on("kick-user", async ({ targetUserId }) => {
      const roomId = socket.roomId;
      const requesterId = socket.userId;

      if (!roomId || !targetUserId) return;

      // Verify the requester is the room admin.
      // requesterId is a Clerk string; room.creatorId is a MongoDB ObjectId.
      try {
        const [room, dbUser] = await Promise.all([
          Room.findById(roomId),
          User.findOne({ clerkId: requesterId }),
        ]);
        if (!room || !dbUser || String(room.creatorId) !== String(dbUser._id)) {
          socket.emit("error", { message: "Only the admin can kick users." });
          return;
        }
      } catch (err) {
        console.error("[Kick] DB lookup failed:", err);
        return;
      }

      // Add to ban list so they can't rejoin
      if (!roomBans.has(roomId)) roomBans.set(roomId, new Set());
      roomBans.get(roomId).add(targetUserId);

      // Find the target's socket and boot them
      const targetParticipant = activeRooms.get(roomId)?.participants.get(targetUserId);
      if (targetParticipant) {
        const targetSocket = io.sockets.sockets.get(targetParticipant.socketId);
        if (targetSocket) {
          targetSocket.emit("kicked", { reason: "You have been removed from this room by the admin." });
          targetSocket.leave(roomId);
        }

        // Remove from active room
        activeRooms.get(roomId).participants.delete(targetUserId);
        const participants = Array.from(activeRooms.get(roomId).participants.values());
        const count = participants.length;

        await updateUserCount(count, roomId);
        io.to(roomId).emit("participants-count", count);
        io.to(roomId).emit("participants-update", participants);
      }
    });

    // ── Leave ───────────────────────────────────────────────────────────────

    socket.on("leave-room", async () => {
      const roomId = socket.roomId;
      const userId = socket.userId;
      if (roomId && activeRooms.has(roomId)) {
        activeRooms.get(roomId).participants.delete(userId);
        const participants = Array.from(activeRooms.get(roomId).participants.values());
        const count = participants.length;
        await updateUserCount(count, roomId);
        if (activeRooms.get(roomId).participants.size === 0) {
          activeRooms.delete(roomId);
          // Clear bans when the room empties — fresh start if room is reused
          roomBans.delete(roomId);
        }
        io.to(roomId).emit("participants-count", count);
        io.to(roomId).emit("participants-update", participants);
        socket.leave(roomId);
      }
    });

    // ── WebRTC ──────────────────────────────────────────────────────────────

    socket.on("webrtc-offer", (data) => {
      const { targetUserId, sdp } = data;
      const targetSocketId = activeRooms.get(socket.roomId)?.participants.get(targetUserId)?.socketId;
      if (!targetSocketId) return;
      io.to(targetSocketId).emit("webrtc-offer", { senderUserId: socket.userId, sdp });
    });

    socket.on("webrtc-answer", (answer) => {
      const { targetUserId, sdp } = answer;
      const targetSocketId = activeRooms.get(socket.roomId)?.participants.get(targetUserId)?.socketId;
      if (!targetSocketId) return;
      io.to(targetSocketId).emit("webrtc-answer", { senderUserId: socket.userId, sdp });
    });

    socket.on("ice-candidate", (data) => {
      const { targetUserId, candidate } = data;
      const targetSocketId = activeRooms.get(socket.roomId)?.participants.get(targetUserId)?.socketId;
      if (!targetSocketId) return;
      io.to(targetSocketId).emit("ice-candidate", { senderUserId: socket.userId, candidate });
    });
    socket.on( "world-chat-join", user => {
      socket.userId =
      user.userId;
      worldChatUsers.set( user.userId, user);
      io.emit("world-chat-count", worldChatUsers.size);
    }
    );
  socket.on("world-chat-leave", () => {
    const userId = socket.userId;
    if (userId && worldChatUsers.has(userId)) {
      worldChatUsers.delete( userId);
      io.emit("world-chat-count",
        worldChatUsers.size);
    }
  }
  );
  socket.on("world-chat-message", async(data) => {
    // console.log("Data in server side: ", data)
    io.emit("world-chat-message", data)
    await saveWorldChatMsg(data)
  });
    // ── Disconnect ──────────────────────────────────────────────────────────

    socket.on("disconnect", async () => {
      const roomId = socket.roomId;
      const userId = socket.userId;
      if (roomId && activeRooms.has(roomId)) {
        activeRooms.get(roomId).participants.delete(userId);
        const count = activeRooms.get(roomId).participants.size;
        await updateUserCount(count, roomId);
        const participants = Array.from(activeRooms.get(roomId).participants.values());
        io.to(roomId).emit("participants-count", count);
        io.to(roomId).emit("participants-update", participants);
      }

      if (userId && worldChatUsers.has(userId)) {
        worldChatUsers.delete(userId);
        io.emit("world-chat-count", worldChatUsers.size);
      }
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
};