import express from 'express'
import { protect } from '../middleware/auth.middleware.js';
import { acceptReq, deleteFriend, deleteReq, incomingReq, Myfriends, sendedReq, sendReq } from '../controllers/user.controller.js';
const friendRoutes = express.Router()
friendRoutes.get('/friends', protect, Myfriends)
friendRoutes.get('/request', protect, incomingReq)
friendRoutes.get('/request/send', protect, sendedReq)
friendRoutes.post('/requests', protect, sendReq)
friendRoutes.patch('/requests/:friendshipId', protect, acceptReq)
friendRoutes.delete('/requests/:friendshipId', protect, deleteReq)
friendRoutes.delete('/deletefriend/:friendshipId', protect, deleteFriend)
export default friendRoutes