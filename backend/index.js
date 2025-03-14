const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");
const http = require("http");

const User = require("./models/User");
const Room = require("./models/Room");
const Message = require("./models/Message");
const {
  userSchema,
  roomSchema,
  joinRoomSchema,
} = require("./validation/schemas");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

require("dotenv").config();

mongoose.connect(process.env.MONGO_URI);

app.use(cors());
app.use(express.json());

const validate = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body);
    next();
  } catch (err) {
    return res.status(400).json({ message: err.errors[0].message });
  }
};

const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) throw new Error();

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key"
    );
    const user = await User.findById(decoded.userId);
    if (!user) throw new Error();

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ message: "Please authenticate" });
  }
};

// Auth Routes
app.post("/api/auth/register", validate(userSchema), async (req, res) => {
  try {
    const { username, password } = req.body;
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: "Username already exists" });
    }
    const user = new User({ username, password });
    await user.save();

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "7d" }
    );

    res
      .status(201)
      .json({ token, user: { _id: user._id, username: user.username } });
  } catch (err) {
    res.status(500).json({ message: "Error creating user" });
  }
});

app.post("/api/auth/login", validate(userSchema), async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: "Invalid username or password" });
    }
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "7d" }
    );

    res.json({ token, user: { _id: user._id, username: user.username } });
  } catch (err) {
    res.status(500).json({ message: "Error logging in" });
  }
});

// Room Routes
app.post("/api/rooms", auth, validate(roomSchema), async (req, res) => {
  try {
    if (req.user.currentRoom) {
      const currentRoom = await Room.findById(req.user.currentRoom);
      if (currentRoom) {
        return res.status(400).json({
          message:
            "You are already in a room. Please leave your current room first.",
        });
      }
      req.user.currentRoom = null;
      await req.user.save();
    }

    let roomId;
    let existingRoom;
    let attempts = 0;
    const maxAttempts = 5;

    do {
      roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
      existingRoom = await Room.findOne({ roomId });
      attempts++;
    } while (existingRoom && attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      console.error(
        "Failed to generate unique room ID after multiple attempts"
      );
      return res
        .status(500)
        .json({ message: "Failed to create room. Please try again." });
    }

    // Create new room
    const room = new Room({
      roomId,
      users: [req.user._id],
    });

    console.log("Creating room:", { roomId, userId: req.user._id });

    await room.save();
    console.log("Room saved successfully:", room._id);

    req.user.currentRoom = room._id;
    await req.user.save();
    console.log("User updated successfully:", req.user._id);

    res.status(201).json({ roomId: room.roomId });
  } catch (err) {
    console.error("Error creating room:", err);
    res.status(500).json({
      message: "Error creating room",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

app.post(
  "/api/rooms/join",
  auth,
  validate(joinRoomSchema),
  async (req, res) => {
    try {
      const { roomId } = req.body;

      const room = await Room.findOne({ roomId: roomId.toUpperCase() });
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }

      // Check if user is already in a room and leave it
      if (req.user.currentRoom) {
        const currentRoom = await Room.findById(req.user.currentRoom);
        if (currentRoom && !currentRoom._id.equals(room._id)) {
          currentRoom.users = currentRoom.users.filter(
            (userId) => !userId.equals(req.user._id)
          );
          await currentRoom.save();

          // Clean up empty rooms
          if (currentRoom.users.length === 0) {
            await Room.findByIdAndDelete(currentRoom._id);
            await Message.deleteMany({ room: currentRoom._id });
          }
        }
      }

      if (!room.users.includes(req.user._id)) {
        room.users.push(req.user._id);
        await room.save();
      }

      req.user.currentRoom = room._id;
      await req.user.save();

      res.json({ roomId: room.roomId });
    } catch (err) {
      res.status(500).json({ message: "Error joining room" });
    }
  }
);

app.post("/api/rooms/leave", auth, async (req, res) => {
  try {
    if (!req.user.currentRoom) {
      return res.status(400).json({ message: "Not in a room" });
    }

    const room = await Room.findById(req.user.currentRoom);
    if (!room) {
      req.user.currentRoom = null;
      await req.user.save();
      return res.json({ message: "Left room successfully" });
    }

    room.users = room.users.filter((userId) => !userId.equals(req.user._id));
    await room.save();

    req.user.currentRoom = null;
    await req.user.save();

    if (room.users.length === 0) {
      await Room.findByIdAndDelete(room._id);
      await Message.deleteMany({ room: room._id });
    }

    res.json({ message: "Left room successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error leaving room" });
  }
});

app.get("/api/rooms/current", auth, async (req, res) => {
  try {
    if (!req.user.currentRoom) {
      return res.json(null);
    }

    const room = await Room.findById(req.user.currentRoom);
    if (!room) {
      req.user.currentRoom = null;
      await req.user.save();
      return res.json(null);
    }

    res.json({ roomId: room.roomId });
  } catch (err) {
    res.status(500).json({ message: "Error fetching current room" });
  }
});

app.get("/api/rooms/:roomId/messages", auth, async (req, res) => {
  try {
    const room = await Room.findOne({
      roomId: req.params.roomId.toUpperCase(),
    });
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    const messages = await Message.find({ room: room._id })
      .sort({ timestamp: 1 })
      .populate("sender", "username")
      .limit(100);

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: "Error fetching messages" });
  }
});

// Get room users
app.get("/api/rooms/:roomId/users", auth, async (req, res) => {
  try {
    const room = await Room.findOne({
      roomId: req.params.roomId.toUpperCase(),
    });
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    const users = await User.find({ _id: { $in: room.users } }, "username");
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Error fetching room users" });
  }
});

// Socket.io
const socketAuth = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) throw new Error("No token provided");

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key"
    );
    const user = await User.findById(decoded.userId);
    if (!user) throw new Error("User not found");

    socket.user = user;
    socket.userId = user._id;
    socket.activeRoom = null;
    next();
  } catch (err) {
    next(new Error("Authentication failed: " + err.message));
  }
};

io.use(socketAuth);

// Track active connections
const activeConnections = new Map();

io.on("connection", (socket) => {
  const userId = socket.userId.toString();

  // Clean up any existing connection for this user
  if (activeConnections.has(userId)) {
    const existingSocket = activeConnections.get(userId);
    if (existingSocket && existingSocket.id !== socket.id) {
      console.log("Cleaning up old connection for user:", socket.user.username);
      existingSocket.disconnect();
    }
  }

  activeConnections.set(userId, socket);
  console.log("User connected:", socket.user.username);

  socket.on("join-room", async (roomId) => {
    try {
      if (!roomId) {
        socket.emit("error", { message: "Room ID is required" });
        return;
      }

      const room = await Room.findOne({ roomId: roomId.toUpperCase() });
      if (!room) {
        socket.emit("error", { message: "Room not found" });
        return;
      }

      if (socket.activeRoom) {
        socket.leave(socket.activeRoom);
      }

      // Make sure room ID is uppercase for consistency
      const normalizedRoomId = roomId.toUpperCase();
      socket.join(normalizedRoomId);
      socket.activeRoom = normalizedRoomId;

      // Notify room that user has joined
      io.to(normalizedRoomId).emit("user-joined", {
        username: socket.user.username,
        userId: socket.userId.toString(),
      });

      console.log(`${socket.user.username} joined room ${normalizedRoomId}`);
    } catch (err) {
      console.error("Error joining room:", err);
      socket.emit("error", { message: "Error joining room" });
    }
  });

  socket.on("send-message", async (data) => {
    try {
      const { message, roomId } = data;
      if (!message?.trim() || !roomId) {
        socket.emit("error", { message: "Invalid message data" });
        return;
      }

      const normalizedRoomId = roomId.toUpperCase();
      const room = await Room.findOne({ roomId: normalizedRoomId });
      if (!room) {
        socket.emit("error", { message: "Room not found" });
        return;
      }

      const newMessage = new Message({
        message: message.trim(),
        sender: socket.user._id,
        room: room._id,
        timestamp: new Date(),
      });
      await newMessage.save();

      const populatedMessage = await Message.findById(newMessage._id).populate(
        "sender",
        "username"
      );

      io.to(normalizedRoomId).emit("new-message", populatedMessage);
    } catch (err) {
      console.error("Error sending message:", err);
      socket.emit("error", { message: "Error sending message" });
    }
  });

  socket.on("disconnect", async () => {
    if (activeConnections.get(userId)?.id === socket.id) {
      activeConnections.delete(userId);
      console.log("User disconnected:", socket.user.username);

      // Notify room if user was in one
      if (socket.activeRoom) {
        io.to(socket.activeRoom).emit("user-left", {
          username: socket.user.username,
          userId: socket.userId.toString(),
        });
      }
    }
  });
});

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
