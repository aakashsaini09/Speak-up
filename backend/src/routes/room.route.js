import express from 'express'

import { createRoom, getAllrooms } from "../controllers/roomController.js";
import { protect } from '../middleware/auth.middleware.js';
const roomRoutes = express.Router()

roomRoutes.get('/', getAllrooms)
roomRoutes.post('/create', protect, createRoom)
export default roomRoutes