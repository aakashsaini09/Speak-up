import express from 'express'
import http from 'http'
import { PORT } from './config/env.js';
import { connectToDatabase } from './config/db.js';
import router from './routes/user.route.js'
import cors from 'cors'
import 'dotenv/config';
import roomRoutes from './routes/room.route.js';
const MONGO_URL = process.env.MONGO_URL;
const app = express(cors());
app.use("/api/clerk", router);
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

app.use('/api/room', roomRoutes)
// app.use('/api/user', user)
app.listen(PORT,()=>{
    console.log(`Server is running on port ${PORT}`)
})