import mongoose from 'mongoose'
import {Schema} from 'mongoose'
const userSchema =  mongoose.Schema({
    clerkId: {
      type: String,
      required: true,
      unique: true,
    },
    google_id: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
    },
    firstName: String,
    lastName: String,
    imageUrl: String,
  
},{timestamps: true})
export default mongoose.model("User", userSchema)
// module.exports = mongoose.model('User', userSchema)