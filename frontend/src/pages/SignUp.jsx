import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import AuthForm from "../components/AuthForm";
import Background from "../components/Background";
import Logo from "../components/Logo";
import axios from "axios";

export default function SignUp() {
  const navigate = useNavigate();

  const handleSignUp = async (formData) => {
    try {
      const response = await axios.post(
        "http://localhost:8000/api/auth/register",
        formData
      );
      const { token, user } = response.data;

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      navigate("/lobby");
    } catch (error) {
      throw new Error(error.response?.data?.message || "Sign up failed");
    }
  };

  return (
    <div className="min-h-screen">
      <Background />
      <div className="max-w-7xl mx-auto px-4">
        <header className="py-6">
          <Link to="/" className="inline-block">
            <Logo />
          </Link>
        </header>
        <main className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
          <AuthForm mode="signup" onSubmit={handleSignUp} />
        </main>
      </div>
    </div>
  );
}
