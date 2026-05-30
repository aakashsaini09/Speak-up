import Room from "../models/room.model.js";
import User from "../models/userModel.js";

export const createRoom = async (req, res) => {
  try {
    const { title, language } = req.body;
    const clerkId = req.user?.clerkId;
    // console.log("req: ", req.user)
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
    const user = await User.findOne({ 
      clerkId: String(clerkId),
     });
    console.log("user: ", user)
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
      creatorImg: user.imageUrl,
      creatorName: user.firstName, 
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
    // Create room
    try{
    const rooms = await Room.find();
    return res.status(201).json({
      success: true,
      message: "Room fetched",
      rooms,
    });
  } catch (error) {
    console.error("Error while fetching Rooms:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch rooms",
    });
  }
}