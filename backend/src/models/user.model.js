import mongoose from 'mongoose'
import {Schema} from 'mongoose'
const userSchema = new Schema({
    googleId: String,
    email: String,
    name: String,
    avatar: String
},{timeseries, timestamps})

export default mongoose.model('UserSchema', userSchema) 