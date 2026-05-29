import express from 'express'

import { createRoom, getAllrooms } from "../controllers/roomController.js";
import { protect } from '../middleware/auth.middleware.js';
const roomRoutes = express.Router()

roomRoutes.get('/',protect, getAllrooms)
roomRoutes.post('/create', createRoom)
export default roomRoutes