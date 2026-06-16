import messageModel from "../models/message.model.js";

export const getAllMessages = async (req, res) => {
    // getAllMessages
    try{
    const messages = await messageModel.find();
    return res.status(201).json({
      success: true,
      message: "Messages fetched",
      messages,
    });
  } catch (error) {
    console.error("Error while fetching messages:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch messages",
    });
  }
}
export const deleteMessage = async (req, res) => {
  const { id } = req.body;

  try {
    const message = await messageModel.findById(id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    if (message.userId !== req.user.clerkId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    await messageModel.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Message deleted successfully",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete message",
    });
  }
};