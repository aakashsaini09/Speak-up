import mongoose from "mongoose";
import Conversation from "../models/conversation.model.js";
import PersonalMessage from "../models/personalMsg.model.js";
import User from "../models/userModel.js";

const userSelect = "firstName imageUrl clerkId";

const toObjectId = (value) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return null;
  }

  return new mongoose.Types.ObjectId(value);
};

const getCurrentUser = async (clerkId) => {
  if (!clerkId) return null;

  return User.findOne({ clerkId }).select("_id clerkId firstName imageUrl");
};

const serializeMessage = (messageDoc) => ({
  _id: messageDoc._id,
  conversationId: messageDoc.conversationId,
  sender: messageDoc.sender,
  type: messageDoc.type,
  text: messageDoc.text ?? "",
  imageUrl: messageDoc.imageUrl ?? "",
  createdAt: messageDoc.createdAt,
});

export const openChat = async (req, res) => {
  try {
    const clerkId = req.user?.clerkId;
    const { friendId } = req.body;

    const currentUser = await getCurrentUser(clerkId);
    if (!currentUser) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const friendObjectId = toObjectId(friendId);
    if (!friendObjectId) {
      return res.status(400).json({ success: false, message: "Invalid friendId" });
    }

    if (String(currentUser._id) === String(friendObjectId)) {
      return res.status(400).json({ success: false, message: "You cannot chat with yourself" });
    }

    const friendUser = await User.findById(friendObjectId).select("_id");
    if (!friendUser) {
      return res.status(404).json({ success: false, message: "Friend not found" });
    }

    const participants = [String(currentUser._id), String(friendUser._id)].sort();

    let conversation = await Conversation.findOne({ participants });

    if (!conversation) {
      conversation = await Conversation.create({
        participants,
        lastMessage: "",
        lastMessageAt: new Date(),
      });
    }

    conversation.lastReadAt.set(String(currentUser._id), new Date());
    await conversation.save();

    return res.status(200).json({
      success: true,
      conversationId: conversation._id,
    });
  } catch (error) {
    console.error("Open Chat Error:", error);
    return res.status(500).json({ success: false, message: "Failed to open chat" });
  }
};

export const getConversations = async (req, res) => {
  try {
    const clerkId = req.user?.clerkId;
    const currentUser = await getCurrentUser(clerkId);

    if (!currentUser) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const conversations = await Conversation.find({ participants: currentUser._id })
      .sort({ lastMessageAt: -1 })
      .populate("participants", userSelect);

    const payload = await Promise.all(conversations.map(async (conversation) => {
      const otherUser = conversation.participants.find(
        (participant) => String(participant._id) !== String(currentUser._id)
      ) ?? conversation.participants[0];

      const lastReadAt = conversation.lastReadAt?.get(String(currentUser._id));
      const unreadCount = await PersonalMessage.countDocuments({
        conversationId: conversation._id,
        sender: { $ne: currentUser._id },
        createdAt: lastReadAt ? { $gt: lastReadAt } : { $gt: new Date(0) },
      });

      return {
        conversationId: conversation._id,
        user: otherUser
          ? {
              _id: otherUser._id,
              firstName: otherUser.firstName,
              imageUrl: otherUser.imageUrl,
              clerkId: otherUser.clerkId,
            }
          : null,
        lastMessage: conversation.lastMessage ?? "",
        lastMessageAt: conversation.lastMessageAt,
        unreadCount,
      };
    }));

    return res.status(200).json(payload);
  } catch (error) {
    console.error("Get Conversations Error:", error);
    return res.status(500).json({ success: false, message: "Failed to load conversations" });
  }
};

export const getConversationMessages = async (req, res) => {
  try {
    const clerkId = req.user?.clerkId;
    const currentUser = await getCurrentUser(clerkId);

    if (!currentUser) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { conversationId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ success: false, message: "Invalid conversationId" });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }

    const isParticipant = conversation.participants.some(
      (participantId) => String(participantId) === String(currentUser._id)
    );

    if (!isParticipant) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const messages = await PersonalMessage.find({ conversationId })
      .sort({ createdAt: 1 })
      .populate("sender", userSelect);

    conversation.lastReadAt.set(String(currentUser._id), new Date());
    await conversation.save();

    return res.status(200).json(
      messages.map((message) => serializeMessage(message))
    );
  } catch (error) {
    console.error("Get Conversation Messages Error:", error);
    return res.status(500).json({ success: false, message: "Failed to load messages" });
  }
};

export const deleteConversation = async (req, res) => {
  try {
    const clerkId = req.user?.clerkId;
    const currentUser = await getCurrentUser(clerkId);

    if (!currentUser) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { conversationId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ success: false, message: "Invalid conversationId" });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }

    const isParticipant = conversation.participants.some(
      (participantId) => String(participantId) === String(currentUser._id)
    );

    if (!isParticipant) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    await PersonalMessage.deleteMany({ conversationId });
    await Conversation.findByIdAndDelete(conversationId);

    return res.status(200).json({ success: true, message: "Conversation deleted" });
  } catch (error) {
    console.error("Delete Conversation Error:", error);
    return res.status(500).json({ success: false, message: "Failed to delete conversation" });
  }
};

export const saveChatMessage = async ({ conversationId, senderId, text }) => {
  const trimmedText = typeof text === "string" ? text.trim() : "";

  if (!trimmedText) {
    throw new Error("Message text is required");
  }

  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    throw new Error("Invalid conversationId");
  }

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw new Error("Conversation not found");
  }

  const isParticipant = conversation.participants.some(
    (participantId) => String(participantId) === String(senderId)
  );

  if (!isParticipant) {
    throw new Error("Access denied");
  }

  const message = await PersonalMessage.create({
    conversationId,
    sender: senderId,
    type: "text",
    text: trimmedText,
  });

  conversation.lastMessage = trimmedText;
  conversation.lastMessageAt = message.createdAt ?? new Date();
  await conversation.save();

  const populatedMessage = await PersonalMessage.findById(message._id).populate("sender", userSelect);

  return serializeMessage(populatedMessage);
};