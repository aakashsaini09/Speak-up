import mongoose from "mongoose";

const roomSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    language: {
      type: String,
      required: true,
    },
    maxUser: {
      type: Number,
      required: true
    },
    label: {
      type: String,
      required: true
    },
    creatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    activeParticipants: {
      type: Number,
      default: 0,
    },
    creatorImg: {
      type: String
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model(
  "Room",
  roomSchema
);