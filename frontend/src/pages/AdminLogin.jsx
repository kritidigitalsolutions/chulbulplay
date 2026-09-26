import React, { useState } from "react";
import API from "../api/axios";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import "../pages/Dashboard.css"; // Uses shared .login-page classes

const AdminLogin = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await API.post("/admin/auth/login", {
        email: form.email.trim(),
        password: form.password,
      });
      if (res.data.token) {
        localStorage.setItem("token", res.data.token);
        if (res.data.admin?.name) localStorage.setItem("adminName", res.data.admin.name);
        navigate("/dashboard");
      } else {
        setError("No token received. Please try again.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Check credentials.");
    }
    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-bg" />

      <form className="login-card" onSubmit={handleSubmit}>
        {/* Brand */}
        <div className="login-brand">
          <div className="login-logo">
            <img src="/chulbulplay-logo.png" alt="ChulbulPlay logo" />
          </div>
          <h1>ChulbulPlay</h1>
          <p>Sign in to your Admin Panel</p>
        </div>

        {error && (
          <div style={{
            background: "rgba(229,9,20,0.12)", border: "1px solid rgba(229,9,20,0.4)",
            borderRadius: 8, padding: "10px 14px", fontSize: "0.88rem", color: "#ff6b6b"
          }}>
            ⚠️ {error}
          </div>
        )}

        <input
          className="login-input"
          type="email"
          name="email"
          placeholder="Admin Email"
          value={form.email}
          onChange={handleChange}
          required
        />

        <div className="password-input-container">
          <input
            className="login-input"
            type={showPassword ? "text" : "password"}
            name="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            required
          />
          <button
            type="button"
            className="password-toggle-btn"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        <button type="submit" className="login-btn" disabled={loading}>
          {loading ? "Signing in..." : "Sign In →"}
        </button>
        <p
          className="text-sm text-right text-blue-400 cursor-pointer"
          onClick={() => navigate("/forgot-password")}
          style={{ cursor: "pointer", marginTop: "12px", color: "#3182ce", fontSize: "0.88rem", textAlign: "right" }}
        >
          Forgot Password?
        </p>
      </form>
    </div>
  );
};
export default AdminLogin;

