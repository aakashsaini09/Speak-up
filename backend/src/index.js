import express from 'express'
// import {Server} from 'socket.io'
import http from 'http'
import { PORT } from './config/env.js';
import { connectToDatabase } from './config/db.js';
const app = express();
export const server = http.createServer(app);
connectToDatabase()
app.use(
    cors({
        origin: "http:localhost",
        methods: ["GET", "POST"],
        credentials: true
    })
)

app.use('/api/user', user)
app.use('/api/room', room)
let port = process.env.PORT || 8000;
app.listen(port,()=>{
    console.log(`Server is running on port ${PORT}`)
})