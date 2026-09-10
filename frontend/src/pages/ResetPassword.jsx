import { useState } from "react";
import API from "../api/axios";
import { useNavigate } from "react-router-dom";
import { CheckCircle } from "lucide-react";
import "./Dashboard.css";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const email = localStorage.getItem("resetIdentifier");
  const otp = localStorage.getItem("resetOtp");

  const handleReset = async () => {
    setError("");

    if (!email || !otp) {
      setError("Session expired. Please restart the forgot password flow.");
      setTimeout(() => navigate("/forgot-password"), 2500);
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      await API.post("/admin/auth/reset-password", {
        email,
        otp,
        newPassword: password,
        confirmPassword: password,
      });

      localStorage.removeItem("resetIdentifier");
      localStorage.removeItem("resetOtp");
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleReset();
  };

  return (
    <div className="login-page">
      <div className="login-bg"></div>

      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-brand">
          <div className="login-logo">
            <img src="/favicon.png" alt="Logo" />
          </div>
          <h1>Set New Password</h1>
          <p>Create a strong password</p>
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
          type="password"
          placeholder="New Password (min. 6 characters)"
          className="login-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={loading}
        />

        <button type="submit" className="login-btn" disabled={loading}>
          {loading ? (
            <span className="loading-spinner-container">
              <span className="loading-spinner"></span> Updating...
            </span>
          ) : (
            "Update Password →"
          )}
        </button>
      </form>

      {/* SUCCESS OVERLAY MODAL */}
      {success && (
        <div className="success-modal-overlay">
          <div className="success-modal-card">
            <div className="success-icon-wrapper">
              <CheckCircle size={36} />
            </div>
            <h2>Success!</h2>
            <p>Your password has been reset successfully. You can now log in using your new credentials.</p>
            <button className="success-modal-btn" onClick={() => navigate("/")}>
              Proceed to Sign In →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResetPassword;