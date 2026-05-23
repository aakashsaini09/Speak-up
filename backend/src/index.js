import express from 'express'
import { PORT } from './config/env.js';
const app = express();

app.use('/api/user', user)
app.use('/api/room', room)
let port = process.env.PORT || 8000;
app.listen(port,()=>{
    console.log(`Server is running on port ${PORT}`)
})