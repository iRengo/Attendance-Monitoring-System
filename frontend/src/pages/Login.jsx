import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import InputField from "../components/InputField";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await axios.post("http://localhost:5000/api/login", {
        username,
        password,
      });

      // Save user info in localStorage
      localStorage.setItem("user", JSON.stringify(res.data.user));

      // Redirect based on role
      if (res.data.user.role === "student") {
        navigate("/student/dashboard");
      } else if (res.data.user.role === "teacher") {
        navigate("/teacher/dashboard");
      }

    } catch (err) {
      console.error(err);
      if (err.response && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen min-w-screen flex items-center justify-center bg-blue-100">
      <div className="bg-white shadow-lg rounded-md p-8 w-full max-w-sm">
        <h2 className="text-xl font-bold text-center mb-2 text-black">
          ATTENDANCE RECORDS
        </h2>
        <p className="text-center text-sm text-gray-600 mb-6">
          Asian Institute of Computer Studies - Bacoor
        </p>

        <form onSubmit={handleLogin} className="space-y-4">
          <InputField
            label="Username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username"
          />

          <InputField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <p className="text-sm text-blue-600 text-right cursor-pointer">
            Forgot password?
          </p>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 rounded shadow text-white ${loading ? "bg-gray-400" : "bg-black hover:bg-gray-900"
              }`}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
