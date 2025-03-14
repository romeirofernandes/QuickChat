import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useState, useEffect } from "react";
import Landing from "./pages/Landing";
import Chat from "./pages/Chat";
import Lobby from "./pages/Lobby";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";

function PrivateRoute({ children }) {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/login" />;
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if the user is authenticated
    const checkAuth = async () => {
      await new Promise((resolve) => setTimeout(resolve, 100)); // Small delay to prevent flicker
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  if (isLoading) return null;

  return (
    <Router>
      <div className="min-h-screen bg-dark-950 text-white font-inter">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<SignIn />} />
          <Route path="/register" element={<SignUp />} />
          <Route
            path="/lobby"
            element={
              <PrivateRoute>
                <Lobby />
              </PrivateRoute>
            }
          />
          <Route
            path="/chat/:roomId"
            element={
              <PrivateRoute>
                <Chat />
              </PrivateRoute>
            }
          />
        </Routes>
      </div>
    </Router>
  );
}
