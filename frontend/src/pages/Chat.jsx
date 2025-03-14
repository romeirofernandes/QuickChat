import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { io } from "socket.io-client";
import axios from "axios";
import Background from "../components/Background";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

export default function Chat() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [room, setRoom] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadingStage, setLoadingStage] = useState("Connecting...");
  const [isSending, setIsSending] = useState(false);
  const [connectedUsers, setConnectedUsers] = useState([]);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const messageInputRef = useRef(null);

  const [user, setUser] = useState(() => {
    try {
      const userData = localStorage.getItem("user");
      return userData ? JSON.parse(userData) : null;
    } catch (e) {
      return null;
    }
  });

  const token = localStorage.getItem("token");

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Redirect if missing critical data
  useEffect(() => {
    if (!user || !roomId || !token) {
      navigate("/login");
      return;
    }

    // Normalize room ID to uppercase for consistency
    if (roomId && roomId !== roomId.toUpperCase()) {
      navigate(`/chat/${roomId.toUpperCase()}`);
      return;
    }
  }, [roomId, user, token, navigate]);

  // Fetch room users
  const fetchRoomUsers = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/rooms/${roomId}/users`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setConnectedUsers(response.data);
    } catch (err) {}
  };

  useEffect(() => {
    if (!user || !roomId || !token) return;

    let mounted = true;

    const axiosWithTimeout = (url, options = {}) => {
      return axios({
        ...options,
        url,
        timeout: 10000,
      });
    };

    const validateAndSetupRoom = async () => {
      try {
        setIsLoading(true);
        setLoadingStage("Checking room status...");

        const roomRes = await axiosWithTimeout(
          `${API_BASE_URL}/api/rooms/current`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (!mounted) return;

        if (!roomRes.data) {
          try {
            await axiosWithTimeout(`${API_BASE_URL}/api/rooms/join`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              data: { roomId },
            });
          } catch (joinErr) {
            setError("Failed to join room. Redirecting...");
            setTimeout(() => navigate("/lobby"), 2000);
            return;
          }
        } else if (roomRes.data.roomId.toUpperCase() !== roomId.toUpperCase()) {
          try {
            await axiosWithTimeout(`${API_BASE_URL}/api/rooms/leave`, {
              method: "POST",
              headers: { Authorization: `Bearer ${token}` },
            });

            await axiosWithTimeout(`${API_BASE_URL}/api/rooms/join`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              data: { roomId },
            });
          } catch (roomErr) {
            setError("Failed to switch rooms. Redirecting...");
            setTimeout(() => navigate("/lobby"), 2000);
            return;
          }
        }

        const updatedRoomRes = await axiosWithTimeout(
          `${API_BASE_URL}/api/rooms/current`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (!mounted) return;

        if (
          !updatedRoomRes.data ||
          updatedRoomRes.data.roomId.toUpperCase() !== roomId.toUpperCase()
        ) {
          setError("Failed to join the correct room. Redirecting...");
          setTimeout(() => navigate("/lobby"), 2000);
          return;
        }

        setRoom(updatedRoomRes.data);

        await fetchRoomUsers();

        setLoadingStage("Fetching messages...");

        try {
          const messagesRes = await axiosWithTimeout(
            `${API_BASE_URL}/api/rooms/${roomId}/messages`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          if (!mounted) return;
          setMessages(messagesRes.data);
        } catch (msgErr) {
          // Continue even if message fetching fails
        }

        setLoadingStage("Connecting to chat server...");
        setupSocket();

        setIsLoading(false);
      } catch (err) {
        if (mounted) {
          setError("Failed to connect to room. Redirecting...");
          setTimeout(() => navigate("/lobby"), 3000);
        }
      }
    };

    const setupSocket = () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }

      const socket = io(API_BASE_URL, {
        auth: { token },
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000,
      });

      socket.on("connect", () => {
        socket.emit("join-room", roomId);
        if (mounted && isLoading) {
          setTimeout(() => {
            setIsLoading(false);
          }, 1000);
        }
      });

      socket.on("connect_error", () => {
        if (mounted) {
          if (isLoading) {
            setIsLoading(false);
          }
        }
      });

      socket.on("new-message", (message) => {
        if (mounted) {
          setMessages((prev) => [...prev, message]);
        }
      });

      socket.on("user-joined", (data) => {
        fetchRoomUsers();

        if (data.username !== user?.username) {
          const systemMessage = {
            _id: `system-${Date.now()}`,
            message: `${data.username} joined the room`,
            timestamp: new Date(),
            system: true,
          };
          setMessages((prev) => [...prev, systemMessage]);
        }
      });

      socket.on("user-left", (data) => {
        fetchRoomUsers();

        if (data.username !== user?.username) {
          const systemMessage = {
            _id: `system-${Date.now()}`,
            message: `${data.username} left the room`,
            timestamp: new Date(),
            system: true,
          };
          setMessages((prev) => [...prev, systemMessage]);
        }
      });

      socket.on("error", (error) => {
        if (mounted) {
          setError(error.message || "An error occurred");
          setTimeout(() => setError(""), 5000);
        }
      });

      socketRef.current = socket;
    };

    const safetyTimer = setTimeout(() => {
      if (mounted && isLoading) {
        setIsLoading(false);
      }
    }, 8000);

    validateAndSetupRoom();

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);

      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [roomId, navigate, user, token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const messageText = newMessage.trim();
    if (!messageText || isSending || !socketRef.current) return;

    setIsSending(true);
    try {
      socketRef.current.emit("send-message", {
        message: messageText,
        roomId,
      });
      setNewMessage("");
      messageInputRef.current?.focus();
    } catch (err) {
      setError("Failed to send message");
      setTimeout(() => setError(""), 5000);
    } finally {
      setIsSending(false);
    }
  };

  const leaveRoom = async () => {
    try {
      await axios.post(
        `${API_BASE_URL}/api/rooms/leave`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }

      navigate("/lobby");
    } catch (err) {
      setError("Failed to leave room");
      setTimeout(() => setError(""), 5000);
    }
  };

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      handleSubmit(e);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Background />
        <div className="text-white/70 text-lg">{loadingStage}</div>
        <div className="text-white/50 text-sm">Please wait...</div>
        <button
          onClick={() => setIsLoading(false)}
          className="mt-4 px-4 py-2 bg-indigo-500/30 text-white/80 rounded-lg text-sm hover:bg-indigo-500/40"
        >
          Show Interface Anyway
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Background />

      {/* Header */}
      <header className="w-full px-6 py-4 border-b border-white/[0.08] backdrop-blur-xl bg-black/20 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">⚡</span>
              <span className="font-bricolage text-xl font-bold text-white/90">
                QuickChat
              </span>
            </div>
            <div className="h-4 w-px bg-white/[0.08]" />
            <span className="text-white/70 text-sm font-medium">
              Room {room?.roomId || roomId}
            </span>
            <div className="h-4 w-px bg-white/[0.08]" />
            <span className="text-white/50 text-sm">
              {connectedUsers.length}{" "}
              {connectedUsers.length === 1 ? "user" : "users"} online
            </span>
          </div>
          <button
            onClick={leaveRoom}
            className="px-4 py-2 text-sm text-red-400/90 hover:text-red-400 transition-colors"
          >
            Leave Room
          </button>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 flex flex-col max-w-4xl w-full mx-auto p-6">
        {/* Messages */}
        <div className="flex-1 space-y-4 overflow-y-auto mb-6 scroll-smooth">
          <AnimatePresence initial={false}>
            {messages.length > 0 ? (
              messages.map((msg, i) => (
                <motion.div
                  key={msg._id || i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`flex ${
                    msg.system
                      ? "justify-center"
                      : msg.sender?.username === user?.username
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  {msg.system ? (
                    <div className="px-4 py-1 bg-white/[0.03] rounded-lg text-white/40 text-xs">
                      {msg.message}
                    </div>
                  ) : (
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                        msg.sender?.username === user?.username
                          ? "bg-indigo-500/80 ml-12"
                          : "bg-white/[0.05] mr-12"
                      }`}
                    >
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-sm font-medium text-white/70">
                          {msg.sender?.username === user?.username
                            ? "You"
                            : msg.sender?.username}
                        </span>
                        <span className="text-xs text-white/40">
                          {new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-white break-words leading-relaxed">
                        {msg.message}
                      </p>
                    </div>
                  )}
                </motion.div>
              ))
            ) : (
              <div className="text-center text-white/50 py-10">
                No messages yet. Start the conversation!
              </div>
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="sticky bottom-0 backdrop-blur-xl bg-black/20 rounded-2xl border border-white/[0.08] p-4">
          <form onSubmit={handleSubmit} className="flex gap-4">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              ref={messageInputRef}
              placeholder="Type a message..."
              maxLength={1000}
              className="flex-1 px-4 py-3 bg-white/[0.02] border border-white/[0.08] rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-transparent transition-colors"
            />
            <motion.button
              type="submit"
              disabled={!newMessage.trim() || isSending}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-6 bg-indigo-500/80 text-white rounded-xl hover:bg-indigo-500/90 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? "Sending..." : "Send"}
            </motion.button>
          </form>
        </div>
      </main>

      {error && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
