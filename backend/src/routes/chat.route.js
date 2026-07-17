import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  deleteConversation,
  getConversation,
  getConversationMessages,
  getConversations,
  getUnreadCount,
  openChat,
} from "../controllers/chatController.js";

const chatRouter = express.Router();

chatRouter.post("/open", protect, openChat);
chatRouter.get("/", protect, getConversations);
chatRouter.get("/unread-count", protect, getUnreadCount);
chatRouter.get("/:conversationId/messages", protect, getConversationMessages);
chatRouter.get("/:conversationId", protect, getConversation);
chatRouter.delete("/:conversationId", protect, deleteConversation);

export default chatRouter;
