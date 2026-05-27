import express from 'express'
import {clerkWebhookController} from '../controllers/authController.js'
const router = express.Router();

// const { clerkWebhookController } = require("../controllers/authController.js");

router.post("/webhook", express.raw({ type: "application/json" }),
  clerkWebhookController
);
export default router;