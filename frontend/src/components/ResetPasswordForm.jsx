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
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && (
        <div className="p-2 bg-red-100 text-red-700 rounded text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="p-2 bg-green-100 text-green-700 rounded text-sm">
          {success}
        </div>
      )}

      <div>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          disabled={loading}
        />
      </div>

      <button
        className="w-full bg-indigo-600 text-white rounded py-2 hover:bg-indigo-700 disabled:opacity-50"
        disabled={loading}
      >
        {loading ? "Sending..." : "Send reset link"}
      </button>

      <div className="text-sm text-center">
        <NavLink to="/login" className="text-indigo-600 hover:underline">
          Back to login
        </NavLink>
      </div>
    </form>
  );
}

export default ResetPasswordForm;
