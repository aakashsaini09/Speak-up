import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  deleteConversation,
  getConversationMessages,
  getConversations,
  openChat,
} from "../controllers/chatController.js";

const chatRouter = express.Router();

chatRouter.post("/open", protect, openChat);
chatRouter.get("/", protect, getConversations);
chatRouter.get("/:conversationId/messages", protect, getConversationMessages);
chatRouter.delete("/:conversationId", protect, deleteConversation);

export default chatRouter;