import mongoose from 'mongoose'
import {Schema} from 'mongoose'
const roomSchema = new Schema({
    _id: ObjectId,
    title: {
        type: String,
        require: true
    },
    language: {
        type: String,
        require: true
    },
    creatorId: {
        type: String,
        require: true
    },
    createdAt: Date,
    activeParticipants: Number,
    lastActiveAt: Date
},{ timestamps: true})

export default mongoose.model('Room', roomSchema) 
{
  isActive
}