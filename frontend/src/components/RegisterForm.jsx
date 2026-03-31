import { useState } from "react";
import { useNavigate, NavLink } from "react-router-dom";
import { authApi } from "../api/client";
import { useAuth } from "../context/AuthContext";

function RegisterForm() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "customer",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const { name, email, password, confirmPassword, role } = formData;

    if (!name || !email || !password || !confirmPassword) {
      setError("All fields are required");
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Invalid email format");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const { token, user } = await authApi.register({
        name,
        email,
        password,
        role,
      });
      login(user, token);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Registration failed");
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
        <label htmlFor="name" className="input-label">Full Name</label>
        <input
          id="name"
          type="text"
          name="name"
          placeholder="John Doe"
          value={formData.name}
          onChange={handleChange}
          className="input-field"
          disabled={loading}
        />
      </div>

      <div className="form-group">
        <label htmlFor="email" className="input-label">Email Address</label>
        <input
          id="email"
          type="email"
          name="email"
          placeholder="you@example.com"
          value={formData.email}
          onChange={handleChange}
          className="input-field"
          disabled={loading}
        />
      </div>

      <div className="form-group">
        <label htmlFor="password" className="input-label">Password</label>
        <input
          id="password"
          type="password"
          name="password"
          placeholder="•••••••••"
          value={formData.password}
          onChange={handleChange}
          className="input-field"
          disabled={loading}
        />
      </div>

      <div className="form-group">
        <label htmlFor="confirmPassword" className="input-label">Confirm Password</label>
        <input
          id="confirmPassword"
          type="password"
          name="confirmPassword"
          placeholder="•••••••••"
          value={formData.confirmPassword}
          onChange={handleChange}
          className="input-field"
          disabled={loading}
        />
      </div>

      <div className="form-group">
        <label htmlFor="role" className="input-label">Account Type</label>
        <select
          id="role"
          name="role"
          value={formData.role}
          onChange={handleChange}
          className="input-field"
          disabled={loading}
        >
          <option value="customer">Customer</option>
          <option value="shopkeeper">Shopkeeper</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      <button
        type="submit"
        className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={loading}
      >
        {loading ? "Creating account..." : "Create Account"}
      </button>

      <div className="text-sm text-center text-slate-600 dark:text-slate-400">
        Already have an account?{" "}
        <NavLink to="/login" className="font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">
          Sign in
        </NavLink>
      </div>
    </form>
  );
}

export default RegisterForm;
