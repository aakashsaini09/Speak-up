import mongoose from 'mongoose'
import {Schema} from 'mongoose'
const messageModel =  mongoose.Schema({
    message: {
      type: String,
      required: true,
    },
    firstName: String,
    imageUrl: String,
    time: Date,
    userId: String
  
},{timestamps: true})
export default mongoose.model("Message", messageModel)