import Room from "../models/room.model.js";

export const startRoomCleanupJob = () => {
  setInterval(async () => {
    try {

      const twoMinutesAgo =
        new Date(
          Date.now() - 2 * 60 * 1000
        );

      const result =
        await Room.deleteMany({
          activeParticipants: 0,
          lastActiveAt: {
            $lt: twoMinutesAgo
          }
        });

      console.log(
        `Deleted ${result.deletedCount} inactive rooms`
      );

    } catch (error) {
      console.error(
        "Cleanup Job Error:",
        error
      );
    }
  }, 60 * 1000); // every 1 minute
};