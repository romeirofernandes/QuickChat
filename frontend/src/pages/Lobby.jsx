import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Background from "../components/Background";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

export default function Lobby() {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const user = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/");
      return;
    }

    // Check if user is already in a room
    const checkCurrentRoom = async () => {
      try {
        const { data } = await axios.get(`${API_BASE_URL}/api/rooms/current`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (data && data.roomId) {
          navigate(`/chat/${data.roomId}`);
        }
      } catch (err) {
        console.error("Failed to check current room:", err);
      }
    };
    checkCurrentRoom();
  }, [navigate]);

  const createRoom = async () => {
    setError("");
    setIsLoading(true);

    try {
      const { data } = await axios.post(
        `${API_BASE_URL}/api/rooms`,
        {},
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      navigate(`/chat/${data.roomId}`);
    } catch (err) {
      console.error("Failed to create room:", err);
      setError(err.response?.data?.message || "Failed to create room");
    } finally {
      setIsLoading(false);
    }
  };

  const joinRoom = async (e) => {
    e.preventDefault();
    if (!roomId.trim()) return;

    setError("");
    setIsLoading(true);

    try {
      await axios.post(
        `${API_BASE_URL}/api/rooms/join`,
        { roomId: roomId.trim() },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      navigate(`/chat/${roomId.trim()}`);
    } catch (err) {
      console.error("Failed to join room:", err);
      setError(err.response?.data?.message || "Failed to join room");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Background />

      {/* Header */}
      <header className="w-full px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">⚡</span>
            <span className="font-bricolage text-xl font-bold text-white/90">
              QuickChat
            </span>
          </div>
          {user && <div className="text-white/70">Yo, {user.username}</div>}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-xl grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Create Room Card */}
          <div className="p-6 bg-white/[0.02] border border-white/[0.08] rounded-2xl">
            <h2 className="font-bricolage text-xl font-bold text-white/90 mb-4">
              Create Room
            </h2>
            <p className="text-white/70 mb-6">
              Start a new chat room and invite others to join.
            </p>
            <button
              onClick={createRoom}
              disabled={isLoading}
              className="w-full px-6 py-3 bg-indigo-500/80 text-white rounded-xl hover:bg-indigo-500/90 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Creating..." : "Create Room"}
            </button>
          </div>

          {/* Join Room Card */}
          <div className="p-6 bg-white/[0.02] border border-white/[0.08] rounded-2xl">
            <h2 className="font-bricolage text-xl font-bold text-white/90 mb-4">
              Join Room
            </h2>
            <form onSubmit={joinRoom} className="space-y-4">
              <div>
                <input
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  placeholder="Enter room code"
                  className="w-full px-4 py-3 bg-white/[0.02] border border-white/[0.08] rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-transparent transition-colors"
                  disabled={isLoading}
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || !roomId.trim()}
                className="w-full px-6 py-3 bg-indigo-500/80 text-white rounded-xl hover:bg-indigo-500/90 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Joining..." : "Join Room"}
              </button>
            </form>
          </div>
        </div>

        {error && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm">
            {error}
          </div>
        )}
      </main>
    </div>
  );
}
