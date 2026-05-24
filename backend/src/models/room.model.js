import mongoose from 'mongoose'
import {Schema} from 'mongoose'
const roomSchema = new Schema({
    _id: ObjectId,
    title: String,
    language: String,
    creatorId: String,
    createdAt: Date,
    activeParticipants: Number,
    lastActiveAt: Date
},{timeseries, timestamps})

export default mongoose.model('RoomSchema', roomSchema) 