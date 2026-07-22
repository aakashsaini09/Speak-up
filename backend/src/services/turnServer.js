import crypto from "crypto";

export const getTurnCredentials = (req, res) => {
  const ttl = 3600; // 1 hour

  const username = `${Math.floor(Date.now() / 1000) + ttl}`;

  const password = crypto
    .createHmac("sha1", process.env.TURN_SECRET)
    .update(username)
    .digest("base64");

  res.json({
    username,
    credential: password,
    urls: "turn:turn.speak-up.online:3478",
  });
};