import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },

    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    type: {
      type: String,
      enum: ["text", "image"],
      default: "text",
    },

    text: {
      type: String,
    },

    imageUrl: {
      type: String,
    },
  },
  { timestamps: true }
);

export default mongoose.model(
  "PersonalMessage",
  messageSchema
);