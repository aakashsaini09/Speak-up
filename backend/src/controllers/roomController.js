export const createRoom = async (
  req,
  res
) => {
  try {
    const { title, language } =
      req.body;

    const clerkId =
      req.user.clerkId;

    if (!title || !language) {
      return res.status(400).json({
        success: false,
        message:
          "Title and language required",
      });
    }
    const roomCount =
    await Room.countDocuments({
        creatorId: user._id,
    });
    if (roomCount >= 2) {
    return res.status(400).json({
        success: false,
        message:
        "Maximum 2 rooms allowed",
    });
    }
    const room = await Room.create({
      title,
      language,
      creatorId: ObjectId,
      activeParticipants: 0,
      createdAt: new Date(),
      lastActivityAt: new Date(),
    });
    return res.status(201).json({
      success: true,
      room,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message:
        "Failed to create room",
    });
  }
};
export const getAllrooms = async (req, res) => {
    const response = await authentication(req)

    res.json(room)
}