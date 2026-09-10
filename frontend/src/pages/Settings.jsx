import React, { useState, useEffect, useRef } from "react";
import API from "../api/axios";
import { Settings as SettingsIcon, Lock, CheckCircle, AlertCircle, Eye, EyeOff } from "lucide-react";
import "./Settings.css";

const OtpInput = ({ value = "", onChange, length = 6, disabled = false, onEnter }) => {
  const inputsRef = useRef([]);

  // Create an array from the value string, padded with empty strings to match length
  const otpArray = Array(length).fill("").map((_, i) => value[i] || "");

  const handleChange = (e, index) => {
    const val = e.target.value;
    // Allow only digits
    if (val && !/^\d+$/.test(val)) return;

    // Get the last character entered
    const char = val.slice(-1);
    const newOtpArray = [...otpArray];
    newOtpArray[index] = char;

    const newOtpString = newOtpArray.join("");
    onChange(newOtpString);

    // Auto-focus next input
    if (char && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace") {
      if (!otpArray[index] && index > 0) {
        // Focus previous input and clear it
        const newOtpArray = [...otpArray];
        newOtpArray[index - 1] = "";
        onChange(newOtpArray.join(""));
        inputsRef.current[index - 1]?.focus();
      } else {
        // Just clear current input
        const newOtpArray = [...otpArray];
        newOtpArray[index] = "";
        onChange(newOtpArray.join(""));
      }
    } else if (e.key === "Enter" && onEnter) {
      e.preventDefault();
      onEnter();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim();
    if (!/^\d+$/.test(pastedData)) return;

    const sliced = pastedData.slice(0, length);
    onChange(sliced);

    // Focus appropriate input
    const focusIndex = Math.min(sliced.length, length - 1);
    if (focusIndex >= 0) {
      inputsRef.current[focusIndex]?.focus();
    }
  };

  return (
    <div className="otp-blocks-container">
      {Array(length)
        .fill(0)
        .map((_, i) => (
          <input
            key={i}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={otpArray[i]}
            ref={(el) => (inputsRef.current[i] = el)}
            onChange={(e) => handleChange(e, i)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            onPaste={handlePaste}
            disabled={disabled}
            className="otp-block-input"
            autoComplete="one-time-code"
          />
        ))}
    </div>
  );
};

const Settings = () => {
  const [form, setForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
    otp: "",
  });

  const [emailForm, setEmailForm] = useState({
    oldEmail: "",
    newEmail: "",
    otp: "",
  });

  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [pwdOtpSent, setPwdOtpSent] = useState(false);
  const [pwdTimer, setPwdTimer] = useState(0);

  const [otpSent, setOtpSent] = useState(false);
  const [timer, setTimer] = useState(0);

  const [loading, setLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // ================= PASSWORD =================
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleKeyDownPassword = (e) => {
    if (e.key === "Enter" && !pwdOtpSent) {
      e.preventDefault();
      handleSendPwdOtp();
    }
  };

  const handleSendPwdOtp = async () => {
    setMessage("");
    setError("");

    if (!form.oldPassword || !form.newPassword || !form.confirmPassword) {
      return setError("All fields are required to request OTP");
    }

    if (form.newPassword.length < 6) {
      return setError("Password must be at least 6 characters");
    }

    if (form.newPassword !== form.confirmPassword) {
      return setError("Passwords do not match");
    }

    try {
      setLoading(true);
      await API.post("/admin/auth/change-password/send-otp", {
        oldPassword: form.oldPassword,
        newPassword: form.newPassword,
      });

      setPwdOtpSent(true);
      setMessage("Password change OTP sent 📩");
      setPwdTimer(30);

    } catch (err) {
      setError(err.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setMessage("");
    setError("");

    if (!form.otp) {
      return setError("Please enter the OTP");
    }

    try {
      setLoading(true);
      const res = await API.post("/admin/auth/change-password", {
        oldPassword: form.oldPassword,
        otp: form.otp,
        newPassword: form.newPassword,
      });

      setMessage(res.data.message);
      setForm({ oldPassword: "", newPassword: "", confirmPassword: "", otp: "" });
      setPwdOtpSent(false);
      setPwdTimer(0);
      setShowOldPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);

    } catch (err) {
      setError(err.response?.data?.message || "Error updating password");
    } finally {
      setLoading(false);
    }
  };

  // ================= EMAIL =================
  const handleEmailChange = (e) => {
    setEmailForm({ ...emailForm, [e.target.name]: e.target.value });
  };

  const handleKeyDownEmail = (e) => {
    if (e.key === "Enter" && !otpSent) {
      e.preventDefault();
      handleSendOtp();
    }
  };

  const handleSendOtp = async () => {
    setMessage("");
    setError("");

    if (!emailForm.oldEmail || !emailForm.newEmail) {
      return setError("Old and new emails are required");
    }

    try {
      setEmailLoading(true);
      await API.post("/admin/auth/change-email/send-otp", {
        oldEmail: emailForm.oldEmail,
        newEmail: emailForm.newEmail,
      });

      setOtpSent(true);
      setMessage("OTP sent to your old email 📩");
      setTimer(30);

    } catch (err) {
      setError(err.response?.data?.message || "Failed to send OTP");
    } finally {
      setEmailLoading(false);
    }
  };

  const handleUpdateEmail = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setMessage("");
    setError("");

    if (!emailForm.otp) {
      return setError("Please enter the OTP");
    }

    try {
      setEmailLoading(true);
      const res = await API.post("/admin/auth/change-email", {
        oldEmail: emailForm.oldEmail,
        newEmail: emailForm.newEmail,
        otp: emailForm.otp,
      });

      setMessage(res.data.message);
      setEmailForm({ oldEmail: "", newEmail: "", otp: "" });
      setOtpSent(false);
      setTimer(0);

    } catch (err) {
      setError(err.response?.data?.message || "Error updating email");
    } finally {
      setEmailLoading(false);
    }
  };

  // 🔥 TIMER LOGIC
  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [timer]);

  useEffect(() => {
    if (pwdTimer > 0) {
      const interval = setInterval(() => {
        setPwdTimer((prev) => prev - 1);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [pwdTimer]);

  return (
    <div className="page-section settings-page">

      {/* Header */}
      <div className="pg-header">
        <h1 className="pg-title">
          <SettingsIcon size={28} /> Settings
        </h1>
      </div>

      {/* Alerts */}
      {message && (
        <div className="alert alert-success">
          <CheckCircle size={18} /> {message}
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {/* 🔥 BOTH CARDS */}
      <div className="form-card-container">

        {/* PASSWORD CARD */}
        <div className="form-card">
          <h3><Lock size={18}/> Change Password</h3>

          <form onSubmit={handleSubmit} className="settings-form">

            <div className="form-field">
              <div className="password-input-container">
                <input
                  type={showOldPassword ? "text" : "password"}
                  name="oldPassword"
                  placeholder="Old Password"
                  value={form.oldPassword}
                  onChange={handleChange}
                  onKeyDown={handleKeyDownPassword}
                  className="form-input-styled"
                  disabled={pwdOtpSent}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowOldPassword(!showOldPassword)}
                  disabled={pwdOtpSent}
                >
                  {showOldPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-field">
              <div className="password-input-container">
                <input
                  type={showNewPassword ? "text" : "password"}
                  name="newPassword"
                  placeholder="New Password"
                  value={form.newPassword}
                  onChange={handleChange}
                  onKeyDown={handleKeyDownPassword}
                  className="form-input-styled"
                  disabled={pwdOtpSent}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  disabled={pwdOtpSent}
                >
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-field">
              <div className="password-input-container">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="Confirm Password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  onKeyDown={handleKeyDownPassword}
                  className="form-input-styled"
                  disabled={pwdOtpSent}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={pwdOtpSent}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {!pwdOtpSent ? (
              <button type="button" onClick={handleSendPwdOtp} className="btn-lg">
                {loading ? "Sending..." : "Send OTP"}
              </button>
            ) : (
              <>
                <div className="form-field">
                  <label className="form-label" style={{ textAlign: "center", marginBottom: "8px" }}>Enter OTP</label>
                  <OtpInput
                    value={form.otp}
                    onChange={(otpVal) => setForm({ ...form, otp: otpVal })}
                    disabled={loading}
                    onEnter={handleSubmit}
                  />
                </div>

                <div style={{ textAlign: "right", marginTop: "-10px" }}>
                  <button
                    type="button"
                    onClick={handleSendPwdOtp}
                    disabled={pwdTimer > 0}
                    style={{
                      background: "none",
                      border: "none",
                      color: pwdTimer > 0 ? "gray" : "#e50914",
                      cursor: pwdTimer > 0 ? "not-allowed" : "pointer",
                      fontSize: "0.85rem",
                    }}
                  >
                    {pwdTimer > 0 ? `Resend in ${pwdTimer}s` : "Resend OTP"}
                  </button>
                </div>

                <button className="btn-lg settings-submit">
                  {loading ? "Updating..." : "Update Password"}
                </button>
              </>
            )}
          </form>
        </div>

        {/* EMAIL CARD */}
        <div className="form-card">
          <h3>📧 Change Email</h3>

          <form onSubmit={handleUpdateEmail} className="settings-form">

            <div className="form-field">
              <input
                type="email"
                name="oldEmail"
                placeholder="Old Email"
                value={emailForm.oldEmail}
                onChange={handleEmailChange}
                onKeyDown={handleKeyDownEmail}
                className="form-input-styled"
                disabled={otpSent}
              />
            </div>

            <div className="form-field">
              <input
                type="email"
                name="newEmail"
                placeholder="New Email"
                value={emailForm.newEmail}
                onChange={handleEmailChange}
                onKeyDown={handleKeyDownEmail}
                className="form-input-styled"
                disabled={otpSent}
              />
            </div>

            {!otpSent && (
              <button type="button" onClick={handleSendOtp} className="btn-lg">
                {emailLoading ? "Sending..." : "Send OTP"}
              </button>
            )}

            {otpSent && (
              <>
                <div className="form-field">
                  <label className="form-label" style={{ textAlign: "center", marginBottom: "8px" }}>Enter OTP</label>
                  <OtpInput
                    value={emailForm.otp}
                    onChange={(otpVal) => setEmailForm({ ...emailForm, otp: otpVal })}
                    disabled={emailLoading}
                    onEnter={handleUpdateEmail}
                  />
                </div>

                <div style={{ textAlign: "right", marginTop: "-10px" }}>
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={timer > 0}
                    style={{
                      background: "none",
                      border: "none",
                      color: timer > 0 ? "gray" : "#e50914",
                      cursor: timer > 0 ? "not-allowed" : "pointer",
                      fontSize: "0.85rem",
                    }}
                  >
                    {timer > 0 ? `Resend in ${timer}s` : "Resend OTP"}
                  </button>
                </div>

                <button className="btn-lg settings-submit">
                  {emailLoading ? "Updating..." : "Update Email"}
                </button>
              </>
            )}
          </form>
        </div>

      </div>
    </div>
  );
};

export default Settings;