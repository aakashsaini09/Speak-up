import Room from "../models/room.model.js";
import messageModel from '../models/message.model.js'
export const updateUserCount = async (count, roomId) => {
    // console.log("reached here: ", count)
  try {
    await Room.findByIdAndUpdate( roomId, {
    activeParticipants: count,
    lastActiveAt: new Date()
  });
  } catch (error) {
    console.error("updating participant Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update count",
    });
  }
};
export const saveWorldChatMsg = async (data) => {
  try{
    const msg = await messageModel.create({
      message: data.message,
      userId: data.id,
      imageUrl: data.imageUrl,
      firstName: data.firstName,
      time: new Date()
    })
    // console.log("message saved: ", msg)
  }catch(err){
    console.log("Error while saving the world chat message: ", err)
  }
}