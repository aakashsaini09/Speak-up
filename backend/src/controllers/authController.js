import { Webhook } from "svix";
import User from '../models/userModel.js'
import { CLERK_WEBHOOK_SECRET } from "../config/env.js";

const clerkWebhookController = async (req, res) => {
  console.log("reached inside clerkwebhookcontroller")
  try {
    const payload = req.body.toString();

    const headers = {
      "svix-id": req.headers["svix-id"],
      "svix-timestamp": req.headers["svix-timestamp"],
      "svix-signature": req.headers["svix-signature"],
    };

    const wh = new Webhook(
      CLERK_WEBHOOK_SECRET
    );

    const evt = wh.verify(payload, headers);

    const data = evt.data;

    // ======================
    // USER CREATED
    // ======================

    if (evt.type === "user.created") {
      const existingUser = await User.findOne({
        clerkId: data.id,
      });

      if (!existingUser) {
        await User.create({
          clerkId: data.id,

          email:
            data.email_addresses?.[0]
              ?.email_address || "",

          firstName: data.first_name,

          lastName: data.last_name,

          imageUrl: data.image_url,
        });

        console.log("User created");
      }
    }

    // ======================
    // USER UPDATED
    // ======================

    if (evt.type === "user.updated") {
      await User.findOneAndUpdate(
        { clerkId: data.id },
        {
          email:
            data.email_addresses?.[0]
              ?.email_address || "",

          firstName: data.first_name,

          lastName: data.last_name,

          imageUrl: data.image_url,
        }
      );

      console.log("User updated");
    }

    // ======================
    // USER DELETED
    // ======================

    if (evt.type === "user.deleted") {
      await User.findOneAndDelete({
        clerkId: data.id,
      });

      console.log("User deleted");
    }

    return res.status(200).json({
      success: true,
    });
  } catch (error) {
    console.log(error);

    return res.status(400).json({
      success: false,
      message: "Webhook error",
    });
  }
};

export {clerkWebhookController}
// module.exports = {
//   clerkWebhookController,
// };