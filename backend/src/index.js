import express from 'express'
import http from 'http'
import { PORT } from './config/env.js';
import { connectToDatabase } from './config/db.js';
import router from './routes/user.route.js'
import cors from 'cors'
import 'dotenv/config';
const MONGO_URL = process.env.MONGO_URL;
const app = express(cors());
app.use(express.json());
export const server = http.createServer(app);
connectToDatabase()
app.use(
    cors({
        origin: "http:localhost",
        methods: ["GET", "POST"],
        credentials: true
    })
)

// app.use('/api/user', user)
// app.use('/api/room', room)
app.use("/api/clerk", router);
app.listen(PORT,()=>{
    console.log(`Server is running on port ${PORT}`)
})