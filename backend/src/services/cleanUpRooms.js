import Room from "../models/room.model.js";
import { deleteFilesFromR2 } from "./cleanUpImages.js";

export const startRoomCleanupJob = () => {
  setInterval(async () => {
    try {
      const twoMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const roomsToDelete = await Room.find({
        activeParticipants: 0,
        lastActiveAt: {
          $lt: twoMinutesAgo,
        }
      }).select("_id");

      if (!roomsToDelete.length) {
        return;
      }

      const roomIds = roomsToDelete.map((room) => String(room._id));

      const result = await Room.deleteMany({
        _id: { $in: roomIds },
      });

      if (result.deletedCount > 0) {
        await deleteFilesFromR2(roomIds);
      }
    } catch (error) {
      console.error(
        "Cleanup Job Error:",
        error
      );
    }
  }, 60 * 5000); // every 5 minutes
};