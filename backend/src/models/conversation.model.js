import mongoose from "mongoose";

/**
 * Build a stable unique key for a 1:1 conversation.
 * Always sort ids so (A,B) and (B,A) map to the same key.
 */
export const buildPairKey = (userIdA, userIdB) =>
  [String(userIdA), String(userIdB)].sort().join(":");

const conversationSchema = new mongoose.Schema(
  {
    // Deterministic "userA:userB" key — preferred lookup path for openChat.
    // Sparse unique index declared below (don't also set index: true here).
    pairKey: {
      type: String,
    },

    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],

    lastMessage: {
      type: String,
      default: "",
    },

    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    // Plain object keyed by userId string → Date.
    // Avoid Mongoose Map — known hang/loop bugs with updates & upserts.
    lastReadAt: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

conversationSchema.index({ pairKey: 1 }, { unique: true, sparse: true });
conversationSchema.index({ participants: 1 });

export default mongoose.model("Conversation", conversationSchema);
