import Room from "../models/room.model.js";
import User from "../models/userModel.js";

export const createRoom = async (req, res) => {
  console.log("reached roomController")
  try {
    const { title, language } = req.body;
    const clerkId = req.user?.clerkId;
    console.log(title, language, clerkId)
    // Validate auth
    if (!clerkId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // Validate input
    if (!title?.trim() || !language?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Title and language are required",
      });
    }

    // Find user from database
    const user = await User.findOne({ clerkId });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check room limit
    const roomCount = await Room.countDocuments({
      creatorId: user._id,
    });

    if (roomCount >= 2) {
      return res.status(400).json({
        success: false,
        message: "Maximum 2 active rooms allowed. Delete previous rooms first.",
      });
    }
    // Create room
    const room = await Room.create({
      title: title.trim(),
      language: language.trim(),
      creatorId: user._id,
      activeParticipants: 0,
      lastActiveAt: new Date(),
    });

    return res.status(201).json({
      success: true,
      message: "Room created successfully",
      room,
    });
  } catch (error) {
    console.error("Create Room Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create room",
    });
  }
};
export const getAllrooms = async (req, res) => {
    const response = await authentication(req)

    res.json(room)
}