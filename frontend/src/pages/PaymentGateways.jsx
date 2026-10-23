import React, { useState, useEffect } from "react";
import API from "../api/axios";
import {
  CreditCard,
  CheckCircle,
  AlertCircle,
  Zap,
  Globe,
  Settings2,
  RefreshCw,
  Key,
  Server,
  Save,
  Check,
  XCircle,
  Layers
} from "lucide-react";
import "./PaymentGateways.css";

const PaymentGateways = () => {
  // Current working state in UI
  const [pgConfig, setPgConfig] = useState({
    razorpayEnabled: true,
    razorpayKeyConfigured: false,
    razorpayKeyId: "",
    easebuzzEnabled: true,
    easebuzzKeyConfigured: false,
    easebuzzKey: "",
    easebuzzMode: "live",
    defaultGateway: "razorpay",
  });

  // Last saved state from database
  const [savedConfig, setSavedConfig] = useState({
    razorpayEnabled: true,
    razorpayKeyConfigured: false,
    razorpayKeyId: "",
    easebuzzEnabled: true,
    easebuzzKeyConfigured: false,
    easebuzzKey: "",
    easebuzzMode: "live",
    defaultGateway: "razorpay",
  });

  const [loading, setLoading] = useState(true);
  const [savingAll, setSavingAll] = useState(false);
  const [savingRzp, setSavingRzp] = useState(false);
  const [savingEasebuzz, setSavingEasebuzz] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [apiStatus, setApiStatus] = useState(null);
  const [testingApi, setTestingApi] = useState(false);

  // Fetch PG settings
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await API.get("/admin/payment-settings");
      if (res.data?.success && res.data?.data) {
        setPgConfig(res.data.data);
        setSavedConfig(res.data.data);
      }
    } catch (err) {
      console.error("Fetch PG Settings error:", err);
      setError(err.response?.data?.message || "Failed to load payment gateway configuration");
    } finally {
      setLoading(false);
    }
  };

  // Test Public Gateway API
  const testPublicGatewayApi = async () => {
    try {
      setTestingApi(true);
      const res = await API.get("/payment/gateways");
      setApiStatus(res.data);
    } catch (err) {
      console.error("Test API error:", err);
      setApiStatus({ error: "Failed to connect to gateway endpoint" });
    } finally {
      setTestingApi(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Toggle Handlers
  const handleToggleRazorpay = (checked) => {
    setPgConfig((prev) => ({
      ...prev,
      razorpayEnabled: checked,
    }));
  };

  const handleToggleEasebuzz = (checked) => {
    setPgConfig((prev) => ({
      ...prev,
      easebuzzEnabled: checked,
    }));
  };

  // Save All Settings in One Click
  const handleSaveAll = async () => {
    setMessage("");
    setError("");
    try {
      setSavingAll(true);
      const res = await API.put("/admin/payment-settings", {
        razorpayEnabled: pgConfig.razorpayEnabled,
        easebuzzEnabled: pgConfig.easebuzzEnabled,
        easebuzzMode: pgConfig.easebuzzMode,
        defaultGateway: pgConfig.defaultGateway,
      });
      if (res.data?.success) {
        setMessage("All payment gateway settings saved successfully! ✅");
        setSavedConfig({ ...pgConfig, ...res.data.data });
        setTimeout(() => setMessage(""), 4000);
        testPublicGatewayApi();
      }
    } catch (err) {
      console.error("Save All error:", err);
      setError(err.response?.data?.message || "Failed to save configuration");
      setTimeout(() => setError(""), 5000);
    } finally {
      setSavingAll(false);
    }
  };

  // Save Razorpay Gateway specifically
  const handleSaveRazorpay = async () => {
    setMessage("");
    setError("");
    try {
      setSavingRzp(true);
      const res = await API.put("/admin/payment-settings", {
        razorpayEnabled: pgConfig.razorpayEnabled,
      });
      if (res.data?.success) {
        const stateLabel = pgConfig.razorpayEnabled ? "Enabled" : "Disabled";
        setMessage(`Razorpay successfully saved as ${stateLabel}! ✅`);
        setSavedConfig((prev) => ({
          ...prev,
          razorpayEnabled: pgConfig.razorpayEnabled,
        }));
        setTimeout(() => setMessage(""), 4000);
        testPublicGatewayApi();
      }
    } catch (err) {
      console.error("Save Razorpay error:", err);
      setError(err.response?.data?.message || "Failed to save Razorpay configuration");
      setTimeout(() => setError(""), 5000);
    } finally {
      setSavingRzp(false);
    }
  };

  // Save Easebuzz Gateway specifically
  const handleSaveEasebuzz = async () => {
    setMessage("");
    setError("");
    try {
      setSavingEasebuzz(true);
      const res = await API.put("/admin/payment-settings", {
        easebuzzEnabled: pgConfig.easebuzzEnabled,
        easebuzzMode: pgConfig.easebuzzMode,
      });
      if (res.data?.success) {
        const stateLabel = pgConfig.easebuzzEnabled ? "Enabled" : "Disabled";
        setMessage(`Easebuzz successfully saved as ${stateLabel} (Mode: ${pgConfig.easebuzzMode.toUpperCase()})! ✅`);
        setSavedConfig((prev) => ({
          ...prev,
          easebuzzEnabled: pgConfig.easebuzzEnabled,
          easebuzzMode: pgConfig.easebuzzMode,
        }));
        setTimeout(() => setMessage(""), 4000);
        testPublicGatewayApi();
      }
    } catch (err) {
      console.error("Save Easebuzz error:", err);
      setError(err.response?.data?.message || "Failed to save Easebuzz configuration");
      setTimeout(() => setError(""), 5000);
    } finally {
      setSavingEasebuzz(false);
    }
  };

  // Check changed states
  const isRzpChanged = pgConfig.razorpayEnabled !== savedConfig.razorpayEnabled;
  const isEasebuzzChanged =
    pgConfig.easebuzzEnabled !== savedConfig.easebuzzEnabled ||
    pgConfig.easebuzzMode !== savedConfig.easebuzzMode;
  const isDefaultGatewayChanged = pgConfig.defaultGateway !== savedConfig.defaultGateway;

  const isAnyChanged = isRzpChanged || isEasebuzzChanged || isDefaultGatewayChanged;

  // Active gateways list calculation
  const activeGatewaysList = [];
  if (pgConfig.razorpayEnabled) activeGatewaysList.push("Razorpay");
  if (pgConfig.easebuzzEnabled) activeGatewaysList.push("Easebuzz");

  const activeGatewaysCountText =
    activeGatewaysList.length > 0
      ? `${activeGatewaysList.length} Active (${activeGatewaysList.join(", ")})`
      : "None Active";

  return (
    <div className="page-section payment-gateways-page">
      {/* Header */}
      <div className="pg-header-wrap">
        <div>
          <h1 className="pg-title">
            <CreditCard size={28} /> Payment Gateways
          </h1>
          <p className="pg-subtitle">
            Configure live payment gateways (Razorpay & Easebuzz) for user subscriptions and checkout processing.
          </p>
        </div>

        <div className="pg-header-actions">
          <button
            type="button"
            className="pg-secondary-btn"
            onClick={fetchSettings}
            disabled={loading}
            title="Refresh Settings"
          >
            <RefreshCw size={16} className={loading ? "spin" : ""} /> Refresh
          </button>

          <button
            type="button"
            className={`pg-primary-btn ${!isAnyChanged ? "is-saved" : ""}`}
            onClick={handleSaveAll}
            disabled={savingAll || !isAnyChanged}
            title="Save all changes at once"
          >
            {savingAll ? (
              <>
                <RefreshCw size={16} className="spin" /> Saving All...
              </>
            ) : !isAnyChanged ? (
              <>
                <Check size={16} /> All Saved!
              </>
            ) : (
              <>
                <Save size={16} /> Save All Changes
              </>
            )}
          </button>
        </div>
      </div>

      {/* Alerts */}
      {message && (
        <div className="pg-alert pg-alert-success">
          <CheckCircle size={20} />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="pg-alert pg-alert-error">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Top Stats Overview */}
      <div className="pg-overview-grid">
        <div className="pg-stat-card">
          <div className="pg-stat-icon-wrap" style={{ background: "rgba(34, 197, 94, 0.15)", color: "#22c55e" }}>
            <Zap size={22} />
          </div>
          <div>
            <div className="pg-stat-val" style={{ fontSize: "1rem" }}>{activeGatewaysCountText}</div>
            <div className="pg-stat-lbl">Active Payment Gateways</div>
          </div>
        </div>

        <div className="pg-stat-card">
          <div className="pg-stat-icon-wrap" style={{ background: "rgba(59, 130, 246, 0.15)", color: "#3b82f6" }}>
            <Layers size={22} />
          </div>
          <div>
            <div className="pg-stat-val" style={{ textTransform: "capitalize" }}>{pgConfig.defaultGateway || "Razorpay"}</div>
            <div className="pg-stat-lbl">Default / Preferred Gateway</div>
          </div>
        </div>

        <div className="pg-stat-card">
          <div className="pg-stat-icon-wrap" style={{ background: "rgba(245, 158, 11, 0.15)", color: "#f59e0b" }}>
            <Server size={22} />
          </div>
          <div>
            <div className="pg-stat-val">Multi-Gateway Enabled</div>
            <div className="pg-stat-lbl">Real-time Dynamic Switch</div>
          </div>
        </div>
      </div>

      {/* Gateways Grid */}
      <div className="pg-cards-grid">
        {/* ── RAZORPAY CARD ── */}
        <div className={`pg-gateway-card ${pgConfig.razorpayEnabled ? "is-active" : "is-disabled"}`}>
          <div className="pg-card-top">
            <div className="pg-brand-wrap">
              <div className="pg-brand-icon rzp-icon">₹</div>
              <div>
                <h3 className="pg-brand-name">Razorpay</h3>
                <span className="pg-brand-type">Native SDK, UPI, Cards, NetBanking</span>
              </div>
            </div>

            <label className="pg-switch-toggle" title="Toggle Razorpay">
              <input
                type="checkbox"
                checked={pgConfig.razorpayEnabled}
                onChange={(e) => handleToggleRazorpay(e.target.checked)}
              />
              <span className="pg-slider"></span>
            </label>
          </div>

          <div className="pg-badge-row">
            <span className={`pg-status-pill ${pgConfig.razorpayEnabled ? "active" : "disabled"}`}>
              {pgConfig.razorpayEnabled ? "● Enabled" : "○ Disabled"}
            </span>
            <span className="pg-env-pill rzp">Live Production</span>
          </div>

          <p className="pg-card-text">
            Standard Razorpay modal and native mobile SDK checkout supporting instant UPI apps (GPay, PhonePe, Paytm), Debit/Credit Cards, and Net Banking.
          </p>

          <div className="pg-uat-box" style={{ background: "rgba(14, 165, 233, 0.08)", borderColor: "rgba(14, 165, 233, 0.35)" }}>
            <div className="pg-uat-title" style={{ color: "#38bdf8" }}>Server Configuration:</div>
            <div className="pg-uat-grid">
              <div><strong>Status:</strong> {pgConfig.razorpayKeyConfigured ? "Configured" : "Missing Keys"}</div>
              <div><strong>Key ID:</strong> {pgConfig.razorpayKeyId ? `${pgConfig.razorpayKeyId.slice(0, 12)}...` : "Configured in .env"}</div>
            </div>
          </div>

          <div className="pg-card-footer">
            <div className="pg-footer-left">
              <span className="pg-key-tag">
                <Key size={14} /> Keys stored securely in backend .env
              </span>
            </div>

            <button
              type="button"
              className={`pg-card-save-btn ${!isRzpChanged ? "is-saved" : pgConfig.razorpayEnabled ? "save-enabled" : "save-disabled"}`}
              onClick={handleSaveRazorpay}
              disabled={savingRzp || !isRzpChanged}
            >
              {savingRzp ? (
                <>
                  <RefreshCw size={15} className="spin" /> Saving...
                </>
              ) : !isRzpChanged ? (
                <>
                  <Check size={16} /> Saved!
                </>
              ) : pgConfig.razorpayEnabled ? (
                <>
                  <Check size={16} /> Save as Enabled
                </>
              ) : (
                <>
                  <XCircle size={16} /> Save as Disabled
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── EASEBUZZ CARD ── */}
        <div className={`pg-gateway-card ${pgConfig.easebuzzEnabled ? "is-active" : "is-disabled"}`}>
          <div className="pg-card-top">
            <div className="pg-brand-wrap">
              <div className="pg-brand-icon easebuzz-icon">E</div>
              <div>
                <h3 className="pg-brand-name">Easebuzz</h3>
                <span className="pg-brand-type">Hosted Web Checkout & Mobile SDK</span>
              </div>
            </div>

            <label className="pg-switch-toggle" title="Toggle Easebuzz">
              <input
                type="checkbox"
                checked={pgConfig.easebuzzEnabled}
                onChange={(e) => handleToggleEasebuzz(e.target.checked)}
              />
              <span className="pg-slider"></span>
            </label>
          </div>

          <div className="pg-badge-row">
            <span className={`pg-status-pill ${pgConfig.easebuzzEnabled ? "active" : "disabled"}`}>
              {pgConfig.easebuzzEnabled ? "● Enabled" : "○ Disabled"}
            </span>
            <span className={`pg-env-pill ${pgConfig.easebuzzMode === "live" ? "live" : "test"}`}>
              {pgConfig.easebuzzMode === "live" ? "Live Production" : "Test Sandbox"}
            </span>
          </div>

          <p className="pg-card-text">
            Easebuzz checkout with SHA-512 cryptographic verification. Supports In-App WebView and native SDK with UPI Collect/Intent, Cards, and NetBanking.
          </p>

          <div className="pg-setting-field">
            <label className="pg-field-label">Environment Mode</label>
            <select
              value={pgConfig.easebuzzMode || "live"}
              onChange={(e) => setPgConfig({ ...pgConfig, easebuzzMode: e.target.value })}
              className="pg-select-input"
            >
              <option value="live">🚀 Live Production Gateway</option>
              <option value="test">🧪 Test / Sandbox Staging</option>
            </select>
          </div>

          <div className="pg-uat-box" style={{ background: "rgba(16, 185, 129, 0.08)", borderColor: "rgba(16, 185, 129, 0.35)" }}>
            <div className="pg-uat-title" style={{ color: "#34d399" }}>Easebuzz Credentials:</div>
            <div className="pg-uat-grid">
              <div><strong>Merchant Key:</strong> {pgConfig.easebuzzKey ? pgConfig.easebuzzKey : "Configured"}</div>
              <div><strong>Salt:</strong> Configured in .env</div>
            </div>
          </div>

          <div className="pg-card-footer">
            <div className="pg-footer-left">
              <span className="pg-key-tag">
                <Key size={14} /> Keys stored securely in backend .env
              </span>
            </div>

            <button
              type="button"
              className={`pg-card-save-btn ${!isEasebuzzChanged ? "is-saved" : pgConfig.easebuzzEnabled ? "save-enabled" : "save-disabled"}`}
              onClick={handleSaveEasebuzz}
              disabled={savingEasebuzz || !isEasebuzzChanged}
            >
              {savingEasebuzz ? (
                <>
                  <RefreshCw size={15} className="spin" /> Saving...
                </>
              ) : !isEasebuzzChanged ? (
                <>
                  <Check size={16} /> Saved!
                </>
              ) : pgConfig.easebuzzEnabled ? (
                <>
                  <Check size={16} /> Save as Enabled
                </>
              ) : (
                <>
                  <XCircle size={16} /> Save as Disabled
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Global Routing & Default Gateway Settings */}
      <div className="pg-settings-card" style={{ marginBottom: "24px" }}>
        <div className="pg-settings-card-head">
          <Settings2 size={22} className="pg-accent-icon" />
          <div>
            <h3>Default / Primary Payment Gateway</h3>
            <p>Select which gateway should be chosen by default for user subscription checkout.</p>
          </div>
        </div>

        <div className="pg-routing-form">
          <div className="pg-setting-field" style={{ maxWidth: "400px" }}>
            <label className="pg-field-label">Preferred Default Gateway</label>
            <select
              value={pgConfig.defaultGateway || "razorpay"}
              onChange={(e) => setPgConfig({ ...pgConfig, defaultGateway: e.target.value })}
              className="pg-select-input"
            >
              <option value="razorpay">Razorpay {pgConfig.razorpayEnabled ? "(Enabled)" : "(Disabled)"}</option>
              <option value="easebuzz">Easebuzz {pgConfig.easebuzzEnabled ? "(Enabled)" : "(Disabled)"}</option>
            </select>
            <span className="pg-field-hint">
              Clients and apps will automatically prioritize this gateway during user checkout.
            </span>
          </div>

          <div className="pg-actions-bar">
            <button
              type="button"
              className={`pg-primary-btn ${!isAnyChanged ? "is-saved" : ""}`}
              onClick={handleSaveAll}
              disabled={savingAll || !isAnyChanged}
            >
              {savingAll ? (
                <>
                  <RefreshCw size={16} className="spin" /> Saving Settings...
                </>
              ) : !isAnyChanged ? (
                <>
                  <Check size={16} /> Settings Saved
                </>
              ) : (
                <>
                  <Save size={16} /> Save Default Gateway & All Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Public Gateway API Inspector */}
      <div className="pg-settings-card">
        <div className="pg-settings-card-head">
          <Globe size={22} className="pg-accent-icon" />
          <div>
            <h3>Active Gateway Inspector (Live App Status)</h3>
            <p>Test the live JSON response that mobile and web apps receive from the server.</p>
          </div>
        </div>

        <div className="pg-routing-form">
          <div className="pg-actions-bar" style={{ marginTop: 0 }}>
            <button
              type="button"
              className="pg-secondary-btn"
              onClick={testPublicGatewayApi}
              disabled={testingApi}
            >
              <Globe size={16} /> {testingApi ? "Fetching..." : "Test Client Gateway API (/api/payment/gateways)"}
            </button>
          </div>

          {apiStatus && (
            <div className="pg-api-preview">
              <div className="pg-api-preview-title">
                <span>Server API Output:</span>
                <span className="pg-preview-badge">Live Status</span>
              </div>
              <pre className="pg-code-block">{JSON.stringify(apiStatus, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentGateways;
