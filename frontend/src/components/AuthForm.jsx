import { useState } from "react";
import { Link } from "react-router-dom";

export default function AuthForm({ mode, onSubmit }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const isRegister = mode === "signup";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await onSubmit({ username: username.trim(), password });
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm">
      <div className="backdrop-blur-xl bg-white/[0.02] p-8 rounded-2xl shadow-[0_8px_32px_rgb(0,0,0,0.12)] border border-white/[0.08]">
        <h2 className="font-bricolage text-3xl font-bold mb-8 text-white/90">
          {isRegister ? "Create Account" : "Welcome Back"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-white/70 mb-2"
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-white/[0.02] border border-white/[0.08] rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-transparent transition-colors"
              placeholder="3-30 characters"
              required
              minLength={3}
              maxLength={30}
              disabled={isLoading}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-white/70 mb-2"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-white/[0.02] border border-white/[0.08] rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-transparent transition-colors"
              placeholder="6-100 characters"
              required
              minLength={6}
              maxLength={100}
              disabled={isLoading}
            />
          </div>

          {error && <div className="text-red-400/90 text-sm">{error}</div>}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full px-6 py-3 bg-indigo-500/80 text-white rounded-xl hover:bg-indigo-500/90 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Please wait..." : isRegister ? "Register" : "Sign In"}
          </button>

          <div className="text-center text-white/50 text-sm">
            {isRegister ? (
              <>
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Sign In
                </Link>
              </>
            ) : (
              <>
                Don't have an account?{" "}
                <Link
                  to="/register"
                  className="text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Create one
                </Link>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
