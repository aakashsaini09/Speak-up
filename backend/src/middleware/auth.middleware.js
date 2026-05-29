import { verifyToken } from "@clerk/backend";
export const protect = async (req, res, next
) => {
  try {
    const authHeader =
      req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }
    const token = authHeader.split(" ")[1];
    const payload = await verifyToken(
      token,
      {
        secretKey:
          process.env.CLERK_SECRET_KEY,
      }
    );
    req.user = {
      clerkId: payload.sub,
    };
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }
};