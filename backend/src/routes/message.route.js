import express from 'express'
import { getAllMessages, deleteMessage } from "../controllers/messageController.js";
import { protect } from '../middleware/auth.middleware.js';
const messageRouter = express.Router()
messageRouter.get('/', getAllMessages)
messageRouter.post('/delete', protect, deleteMessage)
export default messageRouter