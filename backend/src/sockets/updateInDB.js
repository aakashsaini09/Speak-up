import Room from "../models/room.model.js";
export const updateUserCount = async (count, roomId) => {
    // console.log("reached here: ", count)
  try {
    await Room.findByIdAndUpdate( roomId, {
    activeParticipants: count
  });
  } catch (error) {
    console.error("updating participant Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update count",
    });
  }
};