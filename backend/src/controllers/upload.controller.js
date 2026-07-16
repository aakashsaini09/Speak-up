import { uploadToR2 } from "../services/r2.service.js";

export async function uploadRoomImage(req, res) {
  try {

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image uploaded",
      });
    }

    const { roomId } = req.body;

    const imageUrl =
      await uploadToR2(req.file, roomId);

    return res.status(200).json({
      success: true,
      imageUrl,
    });

  } catch (err) {

    console.error(err);

    return res.status(500).json({
      success: false,
      message: "Upload failed",
    });

  }
}

export async function deleteRoomImages(req, res) {
    console.log("req.body:", req.body);
}

export async function deleteObject(req, res) {
    console.log("req.body:", req.body);
}