import { server } from "../index.js";
import { Server } from "socket.io";
const io = new Server(server, {
    cors: {
        origin: "http://localhost",
        methods: ["GET", "POST"]
    }
})

io.on("connection", (socket) => {
    console.log("A user connected: ", socket)

    socket.on("message", (data) => {
        console.log("Message received from client: ", data.message)
    })
    socket.on("disconnect", () => {
        console.log("User disconnected: ", socket)
    })
})