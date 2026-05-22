import mongoose from 'mongoose'
import {Schema} from 'mongoose'
const roomSchema = new Schema({
    title: String,
    language: String,
    creatorId: Date,
    isOccupied: String,
    lastActiveAt: Date
},{timeseries, timestamps})

export default mongoose.model('RoomSchema', roomSchema) 
