import { useState } from "react";
import { useNavigate, NavLink } from "react-router-dom";
import { authApi } from "../api/client";
import { useAuth } from "../context/AuthContext";

function LoginForm() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Email and password are required");
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Invalid email format");
      return;
    }

    setLoading(true);
    try {
      const { token, user } = await authApi.login({ email, password });
      login(user, token);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="form-group">
        <label htmlFor="email" className="input-label">Email Address</label>
        <input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input-field"
          disabled={loading}
        />
      </div>

      <div className="form-group">
        <label htmlFor="password" className="input-label">Password</label>
        <input
          id="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input-field"
          disabled={loading}
        />
      </div>

      <button
        type="submit"
        className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={loading}
      >
        {loading ? "Signing in..." : "Sign In"}
      </button>

      <div className="space-y-2 text-sm text-center text-slate-600 dark:text-slate-400">
        <div>
          <NavLink to="/register" className="font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">
            Create an account
          </NavLink>
        </div>
        <div>
          <NavLink to="/reset" className="font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">
            Forgot password?
          </NavLink>
        </div>
      </div>
    </form>
  );
}

export default LoginForm;
