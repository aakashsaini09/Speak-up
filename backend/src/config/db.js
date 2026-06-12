import mongoose from 'mongoose';
import {MONGO_URL} from './env.js'
if(!MONGO_URL) throw new Error("MONGODB_URL is not defined in environment variables");

let cached = globalThis.mongooseCache || (globalThis.mongooseCache = { conn: null, promise: null });
export const connectToDatabase = async () => {
    if(cached.conn) return cached.conn;

    if(!cached.promise){
        cached.promise = await mongoose.connect(MONGO_URL, { bufferCommands: false});
    }
    try{
        cached.conn = await cached.promise;
    }catch(e){
        cached.promise = null;
        console.error("MongoDB connection error. Please make sure mongodb isrunning." + e);
        throw e;
    }
    console.info("Connected to MongoDB");
    return cached.conn;
}
