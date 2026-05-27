import express from 'express'
const router = express.Router();

const { clerkWebhookController } = require("../controllers/authController.js");

router.post("/webhook", express.raw({ type: "application/json" }),
  clerkWebhookController
);

module.exports = router;