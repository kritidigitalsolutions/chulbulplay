import { useState, useEffect } from "react";
import API from "../api/axios";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpValues, setOtpValues] = useState(["", "", "", "", "", ""]);
  const [step, setStep] = useState(1);
  const [timer, setTimer] = useState(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // ================= OTP DIGIT BLOCKS HANDLERS =================
  const handleOtpChange = (val, idx) => {
    if (isNaN(val)) return;

    const newOtpValues = [...otpValues];
    newOtpValues[idx] = val.substring(val.length - 1);
    setOtpValues(newOtpValues);
    setOtp(newOtpValues.join(""));

    // Auto-focus next box
    if (val && idx < 5) {
      const nextInput = document.getElementById(`otp-input-${idx + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleOtpKeyDown = (e, idx) => {
    if (e.key === "Backspace") {
      const newOtpValues = [...otpValues];
      if (!newOtpValues[idx] && idx > 0) {
        newOtpValues[idx - 1] = "";
        setOtpValues(newOtpValues);
        setOtp(newOtpValues.join(""));
        const prevInput = document.getElementById(`otp-input-${idx - 1}`);
        if (prevInput) prevInput.focus();
      } else {
        newOtpValues[idx] = "";
        setOtpValues(newOtpValues);
        setOtp(newOtpValues.join(""));
      }
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text").trim();
    if (pastedText.length === 6 && !isNaN(pastedText)) {
      const newOtpValues = pastedText.split("");
      setOtpValues(newOtpValues);
      setOtp(pastedText);
      const lastInput = document.getElementById("otp-input-5");
      if (lastInput) lastInput.focus();
    }
  };

  // ================= SEND OTP =================
  const handleSendOtp = async () => {
    setError("");
    setMessage("");

    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }
    setLoading(true);
    try {
      await API.post("/admin/auth/send-otp", {
        email,
      });

      setStep(2);
      setTimer(30); // 🔥 START TIMER
      setMessage("OTP sent to your email 📩");

    } catch (err) {
      setError(err.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  // ================= VERIFY OTP =================
  const handleVerifyOtp = async () => {
    setError("");
    setMessage("");

    if (!otp.trim()) {
      setError("Please enter the OTP");
      return;
    }
    setLoading(true);
    try {
      await API.post("/admin/auth/verify-otp", {
        email,
        otp,
      });

      localStorage.setItem("resetIdentifier", email);
      localStorage.setItem("resetOtp", otp);
      navigate("/reset-password");

    } catch (err) {
      setError(err.response?.data?.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  // 🔥 TIMER LOGIC
  // 🔥 TIMER LOGIC
  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [timer]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (step === 1) {
      handleSendOtp();
    } else {
      handleVerifyOtp();
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg"></div>

      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-brand">
          <div className="login-logo">
            <img src="/favicon.png" alt="Logo" />
          </div>
          <h1>Forgot Password</h1>
          <p>Reset your admin password</p>
        </div>

        {error && (
          <div style={{
            background: "rgba(229,9,20,0.12)", border: "1px solid rgba(229,9,20,0.4)",
            borderRadius: 8, padding: "10px 14px", fontSize: "0.88rem", color: "#ff6b6b"
          }}>
            ⚠️ {error}
          </div>
        )}

        {message && (
          <div style={{
            background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.4)",
            borderRadius: 8, padding: "10px 14px", fontSize: "0.88rem", color: "#10b981"
          }}>
            ✅ {message}
          </div>
        )}

        {/* EMAIL */}
        <input
          type="email"
          placeholder="Enter your email"
          className="login-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={step === 2 || loading}
        />

        {step === 1 && (
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? (
              <span className="loading-spinner-container">
                <span className="loading-spinner"></span> Sending OTP...
              </span>
            ) : (
              "Send OTP →"
            )}
          </button>
        )}

        {/* OTP */}
        {step === 2 && (
          <>
            <div className="otp-container" onPaste={handlePaste}>
              {otpValues.map((value, idx) => (
                <input
                  key={idx}
                  id={`otp-input-${idx}`}
                  type="text"
                  maxLength={1}
                  value={value}
                  onChange={(e) => handleOtpChange(e.target.value, idx)}
                  onKeyDown={(e) => handleOtpKeyDown(e, idx)}
                  className="otp-block"
                  required
                  disabled={loading}
                />
              ))}
            </div>

            {/* 🔥 RESEND OTP */}
            <div style={{ textAlign: "right", marginTop: "-10px" }}>
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={timer > 0 || loading}
                style={{
                  background: "none",
                  border: "none",
                  color: (timer > 0 || loading) ? "gray" : "#e50914",
                  cursor: (timer > 0 || loading) ? "not-allowed" : "pointer",
                  fontSize: "0.85rem",
                }}
              >
                {timer > 0 ? `Resend in ${timer}s` : "Resend OTP"}
              </button>
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? (
                <span className="loading-spinner-container">
                  <span className="loading-spinner"></span> Verifying...
                </span>
              ) : (
                "Verify OTP →"
              )}
            </button>
          </>
        )}
      </form>
    </div>
  );
};

export default ForgotPassword;