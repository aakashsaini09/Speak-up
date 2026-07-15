import User from "../models/userModel.js";
import Friendship from "../models/friends.model.js";

export const sendReq = async (req, res) => {
  try {
    const { receiverId } = req.body;

    const clerkId = req.user?.clerkId;
    if (!clerkId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }
    const sender = await User.findOne({
      clerkId,
    });

    if (!sender) {
      return res.status(404).json({
        success: false,
        message: "Sender not found",
      });
    }
    const receiver = await User.findOne({
      clerkId: receiverId
    });
    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: "Receiver not found",
      });
    }
    if (sender._id.toString() ===receiver._id.toString()) {
      return res.status(400).json({
        success: false,
        message:
          "You can't send a friend request to yourself.",
      });
    }
    // Check if relationship already exists
    const existing =
      await Friendship.findOne({
        $or: [
          {
            sender: sender._id,
            receiver: receiver._id,
          },
          {
            sender: receiver._id,
            receiver: sender._id,
          },
        ],
      });

    if (existing) {
      return res.status(400).json({
        success: false,
        message:
          "Friend request already exists.",
      });
    }

    // Create request
    const friendship =
      await Friendship.create({
        sender: sender._id,
        receiver: receiver._id,
      });

    return res.status(201).json({
      success: true,
      message:
        "Friend request sent successfully.",
      friendship,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message:
        "Failed to send friend request.",
    });
  }
};
export const acceptReq = async (req, res) => {
  try {
    const { friendshipId } = req.params;
    const clerkId = req.user?.clerkId;

    if (!clerkId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const user = await User.findOne({
      clerkId,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const friendship = await Friendship.findById(friendshipId);

    if (!friendship) {
      return res.status(404).json({
        success: false,
        message: "Friend request not found",
      });
    }

    // Only the receiver can accept the request
    if (
      friendship.receiver.toString() !==
      user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to accept this request.",
      });
    }

    // Already accepted
    if (friendship.status === "accepted") {
      return res.status(400).json({
        success: false,
        message: "Friend request already accepted.",
      });
    }

    friendship.status = "accepted";
    await friendship.save();

    return res.status(200).json({
      success: true,
      message: "Friend request accepted.",
      friendship,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to accept friend request.",
    });
  }
};
export const deleteReq = async (req, res) => {
  try {
    const { friendshipId } = req.params;
    const clerkId = req.user?.clerkId;

    if (!clerkId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const user = await User.findOne({
      clerkId,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const friendship = await Friendship.findById(friendshipId);

    if (!friendship) {
      return res.status(404).json({
        success: false,
        message: "Friend request not found",
      });
    }

    const isParticipant =
      friendship.sender.toString() === user._id.toString() ||
      friendship.receiver.toString() === user._id.toString();

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to cancel this request.",
      });
    }

    await Friendship.findByIdAndDelete(friendshipId);

    return res.status(200).json({
      success: true,
      message: "Friend request deleted.",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete friend request.",
    });
  }
};
export const sendedReq = async (req, res) => {
  try {
    const clerkId = req.user?.clerkId;
    if (!clerkId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const user = await User.findOne({
      clerkId,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    const requests = await Friendship.find({
      sender: user._id,
      status: "pending",
    })
    .populate("receiver", "clerkId firstName lastName imageUrl");

    const following = requests.map(req => ({
      friendshipId: req._id,
      user: req.receiver,
    }));
    

    return res.status(200).json({
      success: true,
      following,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to accept friend request.",
    });
  }
};
export const incomingReq = async (req, res) => {
  try {
    const clerkId = req.user?.clerkId;
    if (!clerkId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const user = await User.findOne({
      clerkId,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    const requests = await Friendship.find({
      receiver: user._id,
      status: "pending",
    })
    .populate("sender", "clerkId firstName lastName imageUrl");

    const following = requests.map(req => ({
      friendshipId: req._id,
      ...req.sender.toObject(),
    }));
    
    return res.status(200).json({
      success: true,
      following,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to accept friend request.",
    });
  }
};
export const Myfriends = async (req, res) => {
  try {
    const clerkId = req.user?.clerkId;

    if (!clerkId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const user = await User.findOne({
      clerkId,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const friends = await Friendship.find({
      status: "accepted",
      $or: [
        { sender: user._id },
        { receiver: user._id },
      ],
    })
    .populate("sender", "clerkId firstName lastName imageUrl")
    .populate("receiver", "clerkId firstName lastName imageUrl");

    const friendList = friends.map(friend => {
      const otherUser =
        friend.sender._id.toString() === user._id.toString()
          ? friend.receiver
          : friend.sender;

      return {
        friendshipId: friend._id,
        user: otherUser,
      };
    });

    return res.status(200).json({
      success: true,
      friends: friendList,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to find friend.",
    });
  }
};
export const deleteFriend = async (req, res) => {
  try {
    const { friendshipId } = req.params;
    console.log("Deleting friendship with ID:", friendshipId);
    const clerkId = req.user?.clerkId;

    if (!clerkId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const user = await User.findOne({ clerkId });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const friendship = await Friendship.findById(friendshipId);

    if (!friendship) {
      return res.status(404).json({
        success: false,
        message: "Friendship not found",
      });
    }

    // Only people involved in the friendship can delete it
    const isParticipant =
      friendship.sender.toString() === user._id.toString() ||
      friendship.receiver.toString() === user._id.toString();

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to delete this friendship.",
      });
    }

    await Friendship.findByIdAndDelete(friendshipId);

    return res.status(200).json({
      success: true,
      message: "Friend removed successfully.",
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to remove friend.",
    });
  }
};



export const receiveReq = async (req, res) => {
  try {
    const { userId, receivedFrom } = req.body;
    const clerkId = req.user?.clerkId;
    if (!clerkId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }
    const user = await User.findOne({ 
      clerkId: String(clerkId),
     });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    const mongoUser = await User.findById(userId)
    if(!mongoUser){
        return res.status(404).json({
        success: false,
        message: "User not found in Database",
      });
    }
    // send request
    const sendReq = await User.findByIdAndUpdate(userId, 
        { $push:{friendRequestsSent: sendingToId}},
        { new: true}
    )
    // console.log("Room image:", room.creatorImg);
    return res.status(201).json({
      success: true,
      message: "Request sended",
      sendReq,
    });
  } catch (error) {
    console.error("sending request Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to send request",
    });
  }
};