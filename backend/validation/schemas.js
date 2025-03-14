const { z } = require("zod");

const userSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username can only contain letters, numbers, and underscores"
    ),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password must be at most 100 characters"),
});

// Updated to accept empty object for room creation
const roomSchema = z.object({}).strict();

const joinRoomSchema = z.object({
  roomId: z
    .string()
    .length(6, "Room ID must be exactly 6 characters")
    .regex(
      /^[A-Z0-9]{6}$/,
      "Room ID can only contain uppercase letters and numbers"
    ),
});

const messageSchema = z.object({
  message: z
    .string()
    .min(1, "Message cannot be empty")
    .max(1000, "Message must be at most 1000 characters")
    .trim(),
  roomId: z
    .string()
    .length(6, "Room ID must be exactly 6 characters")
    .regex(
      /^[A-Z0-9]{6}$/,
      "Room ID can only contain uppercase letters and numbers"
    ),
});

module.exports = {
  userSchema,
  roomSchema,
  joinRoomSchema,
  messageSchema,
};
