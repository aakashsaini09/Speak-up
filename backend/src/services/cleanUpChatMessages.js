import Message from "../models/personalMsg.model.js";

export const startChatMessageCleanupJob = () => {
  setInterval(async () => {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      await Message.deleteMany({
        createdAt: {
          $lt: sevenDaysAgo,
        },
      });
    } catch (error) {
      console.error("Chat Message Cleanup Error:", error);
    }
  }, 24 * 60 * 60 * 1000);
};