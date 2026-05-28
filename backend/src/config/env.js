import 'dotenv/config';
const MONGO_URL = process.env.MONGO_URL;
const CLERK_WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
const PORT = process.env.PORT;
export {MONGO_URL, PORT, CLERK_WEBHOOK_SECRET}
