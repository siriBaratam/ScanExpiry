import { useState } from "react";
import { NavLink } from "react-router-dom";
import { authApi } from "../api/client";

function ResetPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email) {
      setError("Email is required");
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Invalid email format");
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword({ email });
      setSuccess("Password reset link sent to your email");
      setEmail("");
    } catch (err) {
      setError(err.message || "Request failed");
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
      {success && (
        <div className="p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 rounded-lg text-sm">
          {success}
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

      <button
        type="submit"
        className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={loading}
      >
        {loading ? "Sending..." : "Send Reset Link"}
      </button>

      <div className="text-sm text-center text-slate-600 dark:text-slate-400">
        <NavLink to="/login" className="font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">
          Back to sign in
        </NavLink>
      </div>
    </form>
  );
}

export default ResetPasswordForm;
