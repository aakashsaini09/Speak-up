import express from 'express'
import { protect } from '../middleware/auth.middleware.js';
import upload from '../middleware/upload.middleware.cjs';
import { uploadRoomImage } from '../controllers/upload.controller.js';
const uploadRoute = express.Router()
uploadRoute.post(
    "/room-image",
    protect,
    upload.single("image"),
    uploadRoomImage
);
export default uploadRoute