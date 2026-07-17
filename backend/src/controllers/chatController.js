import mongoose from "mongoose";
import Conversation, { buildPairKey } from "../models/conversation.model.js";
import PersonalMessage from "../models/personalMsg.model.js";
import User from "../models/userModel.js";

const userSelect = "firstName imageUrl clerkId";

const toObjectId = (value) => {
  if (!value || !mongoose.Types.ObjectId.isValid(String(value))) return null;
  // Reject 12-char strings that aren't real hex ObjectIds
  const str = String(value);
  if (str.length !== 24 || !/^[a-fA-F0-9]{24}$/.test(str)) return null;
  return new mongoose.Types.ObjectId(str);
};

const getCurrentUser = async (clerkId) => {
  if (!clerkId) return null;
  return User.findOne({ clerkId }).select("_id clerkId firstName imageUrl").lean();
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

const resolveFriend = async (friendId) => {
  const asObjectId = toObjectId(friendId);
  if (asObjectId) {
    return User.findById(asObjectId).select("_id clerkId firstName imageUrl").lean();
  }
  // Allow opening by clerkId as a fallback
  if (typeof friendId === "string" && friendId.trim()) {
    return User.findOne({ clerkId: friendId.trim() })
      .select("_id clerkId firstName imageUrl")
      .lean();
  }
  return null;
};

/**
 * Find an existing 1:1 conversation or create one.
 * Uses pairKey for O(1) lookup; falls back to participants for legacy docs.
 */
const findOrCreateConversation = async (currentUserId, friendUserId) => {
  const pairKey = buildPairKey(currentUserId, friendUserId);
  const participants = [currentUserId, friendUserId].sort((a, b) =>
    String(a).localeCompare(String(b))
  );

  // 1) Fast path — pairKey
  let conversation = await Conversation.findOne({ pairKey }).lean();
  if (conversation) return conversation;

  // 2) Legacy docs created before pairKey existed
  conversation = await Conversation.findOne({
    participants: { $all: participants, $size: 2 },
  }).lean();

  if (conversation) {
    // Backfill pairKey without blocking the response on failure
    Conversation.updateOne(
      { _id: conversation._id, pairKey: { $exists: false } },
      { $set: { pairKey } }
    ).catch(() => {});
    return conversation;
  }

  // 3) Create new
  try {
    const created = await Conversation.create({
      pairKey,
      participants,
      lastMessage: "",
      lastMessageAt: new Date(),
      lastReadAt: { [String(currentUserId)]: new Date() },
    });
    return created.toObject();
  } catch (err) {
    // Duplicate pairKey from a concurrent open — return the winner
    if (err?.code === 11000) {
      const existing = await Conversation.findOne({ pairKey }).lean();
      if (existing) return existing;
    }
    throw err;
  }
};

export const openChat = async (req, res) => {
  const started = Date.now();
  try {
    const clerkId = req.user?.clerkId;
    const { friendId } = req.body ?? {};

    if (!friendId) {
      return res.status(400).json({ success: false, message: "friendId is required" });
    }

    const currentUser = await getCurrentUser(clerkId);
    if (!currentUser) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const friendUser = await resolveFriend(friendId);
    if (!friendUser) {
      return res.status(404).json({ success: false, message: "Friend not found" });
    }

    if (String(currentUser._id) === String(friendUser._id)) {
      return res.status(400).json({ success: false, message: "You cannot chat with yourself" });
    }

    const conversation = await findOrCreateConversation(currentUser._id, friendUser._id);

    // Fire-and-forget read receipt — never block the open response
    Conversation.updateOne(
      { _id: conversation._id },
      { $set: { [`lastReadAt.${currentUser._id}`]: new Date() } }
    ).catch((err) => console.error("[Chat] lastReadAt update failed:", err.message));

    console.log(`[Chat] openChat ok in ${Date.now() - started}ms → ${conversation._id}`);

    return res.status(200).json({
      success: true,
      conversationId: conversation._id,
      user: {
        _id: friendUser._id,
        firstName: friendUser.firstName,
        imageUrl: friendUser.imageUrl,
        clerkId: friendUser.clerkId,
      },
    });
  } catch (error) {
    console.error(`[Chat] openChat failed after ${Date.now() - started}ms:`, error);
    return res.status(500).json({
      success: false,
      message: error?.message || "Failed to open chat",
    });
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
      .populate("participants", userSelect)
      .lean();

    const payload = await Promise.all(
      conversations.map(async (conversation) => {
        const otherUser =
          conversation.participants.find(
            (participant) => String(participant._id) !== String(currentUser._id)
          ) ?? conversation.participants[0];

        const lastReadRaw = conversation.lastReadAt;
        const lastReadAt =
          lastReadRaw && typeof lastReadRaw === "object"
            ? lastReadRaw[String(currentUser._id)]
            : undefined;

        const unreadCount = await PersonalMessage.countDocuments({
          conversationId: conversation._id,
          sender: { $ne: currentUser._id },
          ...(lastReadAt ? { createdAt: { $gt: new Date(lastReadAt) } } : {}),
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
      })
    );

    return res.status(200).json(payload);
  } catch (error) {
    console.error("Get Conversations Error:", error);
    return res.status(500).json({ success: false, message: "Failed to load conversations" });
  }
};

/** Total unread personal messages across all conversations. */
export const getUnreadCount = async (req, res) => {
  try {
    const clerkId = req.user?.clerkId;
    const currentUser = await getCurrentUser(clerkId);

    if (!currentUser) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const conversations = await Conversation.find({ participants: currentUser._id })
      .select("_id lastReadAt")
      .lean();

    if (conversations.length === 0) {
      return res.status(200).json({ success: true, unreadCount: 0 });
    }

    const counts = await Promise.all(
      conversations.map(async (conversation) => {
        const lastReadAt =
          conversation.lastReadAt && typeof conversation.lastReadAt === "object"
            ? conversation.lastReadAt[String(currentUser._id)]
            : undefined;

        return PersonalMessage.countDocuments({
          conversationId: conversation._id,
          sender: { $ne: currentUser._id },
          ...(lastReadAt ? { createdAt: { $gt: new Date(lastReadAt) } } : {}),
        });
      })
    );

    const unreadCount = counts.reduce((sum, n) => sum + n, 0);
    return res.status(200).json({ success: true, unreadCount });
  } catch (error) {
    console.error("Get Unread Count Error:", error);
    return res.status(500).json({ success: false, message: "Failed to load unread count" });
  }
};

/** Lightweight single-conversation metadata — avoids loading the full inbox. */
export const getConversation = async (req, res) => {
  try {
    const clerkId = req.user?.clerkId;
    const currentUser = await getCurrentUser(clerkId);

    if (!currentUser) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { conversationId } = req.params;
    if (!toObjectId(conversationId)) {
      return res.status(400).json({ success: false, message: "Invalid conversationId" });
    }

    const conversation = await Conversation.findById(conversationId)
      .populate("participants", userSelect)
      .lean();

    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }

    const isParticipant = conversation.participants.some(
      (p) => String(p._id) === String(currentUser._id)
    );
    if (!isParticipant) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const otherUser =
      conversation.participants.find((p) => String(p._id) !== String(currentUser._id)) ??
      conversation.participants[0];

    return res.status(200).json({
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
    });
  } catch (error) {
    console.error("Get Conversation Error:", error);
    return res.status(500).json({ success: false, message: "Failed to load conversation" });
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
    if (!toObjectId(conversationId)) {
      return res.status(400).json({ success: false, message: "Invalid conversationId" });
    }

    const conversation = await Conversation.findById(conversationId)
      .select("participants")
      .lean();

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
      .populate("sender", userSelect)
      .lean();

    // Don't block the response on read-receipt write
    Conversation.updateOne(
      { _id: conversationId },
      { $set: { [`lastReadAt.${currentUser._id}`]: new Date() } }
    ).catch(() => {});

    return res.status(200).json(messages.map((message) => serializeMessage(message)));
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
    if (!toObjectId(conversationId)) {
      return res.status(400).json({ success: false, message: "Invalid conversationId" });
    }

    const conversation = await Conversation.findById(conversationId).select("participants").lean();
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

  if (!toObjectId(conversationId)) {
    throw new Error("Invalid conversationId");
  }

  const conversation = await Conversation.findById(conversationId).select("participants").lean();
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

  const createdAt = message.createdAt ?? new Date();

  await Conversation.updateOne(
    { _id: conversationId },
    { $set: { lastMessage: trimmedText, lastMessageAt: createdAt } }
  );

  const populatedMessage = await PersonalMessage.findById(message._id)
    .populate("sender", userSelect)
    .lean();

  return serializeMessage(populatedMessage);
};
