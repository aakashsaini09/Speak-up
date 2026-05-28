import express from 'express'

import { createRoom, getAllrooms } from "../controllers/roomController.js";
const roomRoutes = express.Router()

roomRoutes.get('/', getAllrooms)
roomRoutes.post('/create', createRoom)
export default roomRoutes