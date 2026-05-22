import express from 'express'

const app = express();
const server = createServer(app)
let port = process.env.PORT || 8000;
app.listen(port,()=>{
    console.log(`Server is running on port ${PORT}`)
})