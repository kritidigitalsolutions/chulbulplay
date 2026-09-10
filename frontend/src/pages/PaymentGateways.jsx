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
  Building2,
  QrCode,
  Layers
} from "lucide-react";
import "./PaymentGateways.css";

const PaymentGateways = () => {
  // Current working state in UI
  const [pgConfig, setPgConfig] = useState({
    razorpayEnabled: true,
    zaakpayEnabled: false,
    hdfcEnabled: false,
    sabpaisaEnabled: false,
    defaultGateway: "razorpay",
    zaakpayMode: "test",
    hdfcMode: "test",
    razorpayKeyConfigured: false,
    zaakpayKeyConfigured: false,
    hdfcKeyConfigured: false,
    sabpaisaKeyConfigured: false,
    sabpaisaMode: "test",
    hdfcVpa: "roccoplaywork@hdfcbank",
    hdfcStoreName: "ROCCOPLAY MEDIA",
  });

  // Last saved state from database
  const [savedConfig, setSavedConfig] = useState({
    razorpayEnabled: true,
    zaakpayEnabled: false,
    hdfcEnabled: false,
    sabpaisaEnabled: false,
    defaultGateway: "razorpay",
    zaakpayMode: "test",
    hdfcMode: "test",
    razorpayKeyConfigured: false,
    zaakpayKeyConfigured: false,
    hdfcKeyConfigured: false,
    sabpaisaKeyConfigured: false,
    sabpaisaMode: "test",
    hdfcVpa: "roccoplaywork@hdfcbank",
    hdfcStoreName: "ROCCOPLAY MEDIA",
  });

  const [loading, setLoading] = useState(true);
  const [savingAll, setSavingAll] = useState(false);
  const [savingRzp, setSavingRzp] = useState(false);
  const [savingZaak, setSavingZaak] = useState(false);
  const [savingHdfc, setSavingHdfc] = useState(false);
  const [savingSabpaisa, setSavingSabpaisa] = useState(false);

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

  // Independent Toggle Handlers (Multiple gateways can be enabled together)
  const handleToggleRazorpay = (checked) => {
    setPgConfig((prev) => ({
      ...prev,
      razorpayEnabled: checked,
    }));
  };

  const handleToggleZaakpay = (checked) => {
    setPgConfig((prev) => ({
      ...prev,
      zaakpayEnabled: checked,
    }));
  };

  const handleToggleHdfc = (checked) => {
    setPgConfig((prev) => ({
      ...prev,
      hdfcEnabled: checked,
    }));
  };

  const handleToggleSabpaisa = (checked) => {
    setPgConfig((prev) => ({
      ...prev,
      sabpaisaEnabled: checked,
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
        zaakpayEnabled: pgConfig.zaakpayEnabled,
        hdfcEnabled: pgConfig.hdfcEnabled,
        sabpaisaEnabled: pgConfig.sabpaisaEnabled,
        defaultGateway: pgConfig.defaultGateway,
        zaakpayMode: pgConfig.zaakpayMode,
        hdfcMode: pgConfig.hdfcMode,
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

  // Save Zaakpay Gateway specifically
  const handleSaveZaakpay = async () => {
    setMessage("");
    setError("");
    try {
      setSavingZaak(true);
      const res = await API.put("/admin/payment-settings", {
        zaakpayEnabled: pgConfig.zaakpayEnabled,
        zaakpayMode: pgConfig.zaakpayMode,
      });
      if (res.data?.success) {
        const stateLabel = pgConfig.zaakpayEnabled ? "Enabled" : "Disabled";
        setMessage(`Zaakpay successfully saved as ${stateLabel} (Mode: ${pgConfig.zaakpayMode.toUpperCase()})! ✅`);
        setSavedConfig((prev) => ({
          ...prev,
          zaakpayEnabled: pgConfig.zaakpayEnabled,
          zaakpayMode: pgConfig.zaakpayMode,
        }));
        setTimeout(() => setMessage(""), 4000);
        testPublicGatewayApi();
      }
    } catch (err) {
      console.error("Save Zaakpay error:", err);
      setError(err.response?.data?.message || "Failed to save Zaakpay configuration");
      setTimeout(() => setError(""), 5000);
    } finally {
      setSavingZaak(false);
    }
  };

  // Save HDFC Gateway specifically
  const handleSaveHdfc = async () => {
    setMessage("");
    setError("");
    try {
      setSavingHdfc(true);
      const res = await API.put("/admin/payment-settings", {
        hdfcEnabled: pgConfig.hdfcEnabled,
        hdfcMode: pgConfig.hdfcMode,
      });
      if (res.data?.success) {
        const stateLabel = pgConfig.hdfcEnabled ? "Enabled" : "Disabled";
        setMessage(`HDFC Bank Gateway successfully saved as ${stateLabel} (Mode: ${pgConfig.hdfcMode.toUpperCase()})! ✅`);
        setSavedConfig((prev) => ({
          ...prev,
          hdfcEnabled: pgConfig.hdfcEnabled,
          hdfcMode: pgConfig.hdfcMode,
        }));
        setTimeout(() => setMessage(""), 4000);
        testPublicGatewayApi();
      }
    } catch (err) {
      console.error("Save HDFC error:", err);
      setError(err.response?.data?.message || "Failed to save HDFC configuration");
      setTimeout(() => setError(""), 5000);
    } finally {
      setSavingHdfc(false);
    }
  };

  // Save SabPaisa Gateway specifically
  const handleSaveSabpaisa = async () => {
    setMessage("");
    setError("");
    try {
      setSavingSabpaisa(true);
      const res = await API.put("/admin/payment-settings", {
        sabpaisaEnabled: pgConfig.sabpaisaEnabled,
      });
      if (res.data?.success) {
        setMessage(`SabPaisa successfully saved as ${pgConfig.sabpaisaEnabled ? "Enabled" : "Disabled"}! ✅`);
        setSavedConfig((prev) => ({
          ...prev,
          sabpaisaEnabled: pgConfig.sabpaisaEnabled,
        }));
        setTimeout(() => setMessage(""), 4000);
        testPublicGatewayApi();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save SabPaisa configuration");
      setTimeout(() => setError(""), 5000);
    } finally {
      setSavingSabpaisa(false);
    }
  };

  // Determine if individual cards or global config differ from database saved state
  const isRzpChanged = pgConfig.razorpayEnabled !== savedConfig.razorpayEnabled;
  const isZaakChanged =
    pgConfig.zaakpayEnabled !== savedConfig.zaakpayEnabled ||
    pgConfig.zaakpayMode !== savedConfig.zaakpayMode;
  const isHdfcChanged =
    pgConfig.hdfcEnabled !== savedConfig.hdfcEnabled ||
    pgConfig.hdfcMode !== savedConfig.hdfcMode;
  const isSabpaisaChanged = pgConfig.sabpaisaEnabled !== savedConfig.sabpaisaEnabled;
  const isDefaultGatewayChanged = pgConfig.defaultGateway !== savedConfig.defaultGateway;

  const isAnyChanged = isRzpChanged || isZaakChanged || isHdfcChanged || isSabpaisaChanged || isDefaultGatewayChanged;

  // Active gateways list calculation
  const activeGatewaysList = [];
  if (pgConfig.razorpayEnabled) activeGatewaysList.push("Razorpay");
  if (pgConfig.zaakpayEnabled) activeGatewaysList.push("Zaakpay");
  if (pgConfig.hdfcEnabled) activeGatewaysList.push("HDFC Bank");
  if (pgConfig.sabpaisaEnabled) activeGatewaysList.push("SabPaisa");

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
            Configure Razorpay, Zaakpay, HDFC Bank, and SabPaisa. You can enable multiple gateways simultaneously.
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
            <div className="pg-stat-lbl">Flexible Active Mode</div>
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
                <span className="pg-brand-type">Standard Modal & UPI Checkout</span>
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
            <span className="pg-env-pill rzp">Live Mode</span>
          </div>

          <p className="pg-card-text">
            Standard Razorpay JavaScript checkout supporting UPI, Credit & Debit Cards, Net Banking, and digital wallets.
          </p>

          <div className="pg-features-list">
            <div className="pg-feature-item">✓ Seamless Pop-up / Overlay checkout</div>
            <div className="pg-feature-item">✓ Instant webhook & signature verification</div>
            <div className="pg-feature-item">✓ Auto-activation of Subscription upon success</div>
          </div>

          <div className="pg-card-footer">
            <div className="pg-footer-left">
              <span className="pg-key-tag">
                <Key size={14} /> Key ID: Configured in Server (.env)
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

        {/* ── ZAAKPAY CARD ── */}
        <div className={`pg-gateway-card ${pgConfig.zaakpayEnabled ? "is-active" : "is-disabled"}`}>
          <div className="pg-card-top">
            <div className="pg-brand-wrap">
              <div className="pg-brand-icon zaak-icon">Z</div>
              <div>
                <h3 className="pg-brand-name">Zaakpay</h3>
                <span className="pg-brand-type">Hosted Payment Page (Redirect Flow V13)</span>
              </div>
            </div>

            <label className="pg-switch-toggle" title="Toggle Zaakpay">
              <input
                type="checkbox"
                checked={pgConfig.zaakpayEnabled}
                onChange={(e) => handleToggleZaakpay(e.target.checked)}
              />
              <span className="pg-slider"></span>
            </label>
          </div>

          <div className="pg-badge-row">
            <span className={`pg-status-pill ${pgConfig.zaakpayEnabled ? "active" : "disabled"}`}>
              {pgConfig.zaakpayEnabled ? "● Enabled" : "○ Disabled"}
            </span>
            <span className={`pg-env-pill ${pgConfig.zaakpayMode === "live" ? "live" : "test"}`}>
              {pgConfig.zaakpayMode === "live" ? "Live Gateway" : "UAT / Staging"}
            </span>
          </div>

          <p className="pg-card-text">
            Zaakpay Hosted redirect payment gateway with HMAC-SHA256 checksum verification and card/UPI handling.
          </p>

          <div className="pg-setting-field">
            <label className="pg-field-label">Environment Mode</label>
            <select
              value={pgConfig.zaakpayMode || "test"}
              onChange={(e) => {
                setPgConfig({ ...pgConfig, zaakpayMode: e.target.value });
              }}
              className="pg-select-input"
            >
              <option value="test">🧪 Test / Staging (UAT Sandbox)</option>
              <option value="live">🚀 Live / Production Gateway</option>
            </select>
          </div>

          <div className="pg-uat-box">
            <div className="pg-uat-title">UAT Test Card Credentials:</div>
            <div className="pg-uat-grid">
              <div><strong>Card:</strong> 4111 1111 1111 1111</div>
              <div><strong>CVV:</strong> 123</div>
              <div><strong>Expiry:</strong> 07/29</div>
              <div><strong>OTP:</strong> 1234</div>
            </div>
          </div>

          <div className="pg-card-footer">
            <div className="pg-footer-left">
              <span className="pg-key-tag">
                <Key size={14} /> Merchant ID: Configured in Server (.env)
              </span>
            </div>

            <button
              type="button"
              className={`pg-card-save-btn ${!isZaakChanged ? "is-saved" : pgConfig.zaakpayEnabled ? "save-enabled" : "save-disabled"}`}
              onClick={handleSaveZaakpay}
              disabled={savingZaak || !isZaakChanged}
            >
              {savingZaak ? (
                <>
                  <RefreshCw size={15} className="spin" /> Saving...
                </>
              ) : !isZaakChanged ? (
                <>
                  <Check size={16} /> Saved!
                </>
              ) : pgConfig.zaakpayEnabled ? (
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

        {/* ── HDFC BANK CARD ── */}
        <div className={`pg-gateway-card ${pgConfig.hdfcEnabled ? "is-active" : "is-disabled"}`}>
          <div className="pg-card-top">
            <div className="pg-brand-wrap">
              <div className="pg-brand-icon hdfc-icon">H</div>
              <div>
                <h3 className="pg-brand-name">HDFC Bank</h3>
                <span className="pg-brand-type">SmartGateway / SmartHub (Cards, NetBanking & UPI)</span>
              </div>
            </div>

            <label className="pg-switch-toggle" title="Toggle HDFC Bank">
              <input
                type="checkbox"
                checked={pgConfig.hdfcEnabled}
                onChange={(e) => handleToggleHdfc(e.target.checked)}
              />
              <span className="pg-slider"></span>
            </label>
          </div>

          <div className="pg-badge-row">
            <span className={`pg-status-pill ${pgConfig.hdfcEnabled ? "active" : "disabled"}`}>
              {pgConfig.hdfcEnabled ? "● Enabled" : "○ Disabled"}
            </span>
            <span className={`pg-env-pill ${pgConfig.hdfcMode === "live" ? "live" : "test"}`}>
              {pgConfig.hdfcMode === "live" ? "Live Gateway" : "UAT / Staging"}
            </span>
          </div>

          <p className="pg-card-text">
            HDFC SmartGateway enterprise payment processing with Cards, NetBanking, and Direct UPI Collect/Intent.
          </p>

          <div className="pg-setting-field">
            <label className="pg-field-label">Environment Mode</label>
            <select
              value={pgConfig.hdfcMode || "test"}
              onChange={(e) => {
                setPgConfig({ ...pgConfig, hdfcMode: e.target.value });
              }}
              className="pg-select-input"
            >
              <option value="test">🧪 Test / Staging (UAT Sandbox)</option>
              <option value="live">🚀 Live / Production Gateway</option>
            </select>
          </div>

          <div className="pg-uat-box" style={{ background: "rgba(30, 58, 138, 0.18)", borderColor: "rgba(59, 130, 246, 0.35)" }}>
            <div className="pg-uat-title" style={{ color: "#93c5fd" }}>HDFC Merchant Configuration:</div>
            <div className="pg-uat-grid">
              <div><strong>Store:</strong> ROCCOPLAY MEDIA</div>
              <div><strong>VPA:</strong> roccoplaywork@hdfcbank</div>
              <div><strong>MID:</strong> HDFC000136707309</div>
              <div><strong>Key ID:</strong> 8352000</div>
            </div>
          </div>

          <div className="pg-card-footer">
            <div className="pg-footer-left">
              <span className="pg-key-tag">
                <QrCode size={14} /> VPA: roccoplaywork@hdfcbank
              </span>
            </div>

            <button
              type="button"
              className={`pg-card-save-btn ${!isHdfcChanged ? "is-saved" : pgConfig.hdfcEnabled ? "save-enabled" : "save-disabled"}`}
              onClick={handleSaveHdfc}
              disabled={savingHdfc || !isHdfcChanged}
            >
              {savingHdfc ? (
                <>
                  <RefreshCw size={15} className="spin" /> Saving...
                </>
              ) : !isHdfcChanged ? (
                <>
                  <Check size={16} /> Saved!
                </>
              ) : pgConfig.hdfcEnabled ? (
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

        {/* ── SABPAISA CARD ── */}
        <div className={`pg-gateway-card ${pgConfig.sabpaisaEnabled ? "is-active" : "is-disabled"}`}>
          <div className="pg-card-top">
            <div className="pg-brand-wrap">
              <div className="pg-brand-icon sabpaisa-icon">S</div>
              <div>
                <h3 className="pg-brand-name">SabPaisa</h3>
                <span className="pg-brand-type">Hosted checkout for UPI, cards and net banking</span>
              </div>
            </div>
            <label className="pg-switch-toggle" title="Toggle SabPaisa">
              <input type="checkbox" checked={pgConfig.sabpaisaEnabled} onChange={(e) => handleToggleSabpaisa(e.target.checked)} />
              <span className="pg-slider"></span>
            </label>
          </div>
          <div className="pg-badge-row">
            <span className={`pg-status-pill ${pgConfig.sabpaisaEnabled ? "active" : "disabled"}`}>
              {pgConfig.sabpaisaEnabled ? "● Enabled" : "○ Disabled"}
            </span>
            <span className="pg-env-pill test">Test / Staging</span>
          </div>
          <p className="pg-card-text">Backend-created SabPaisa checkout sessions. Subscriptions activate only after signed return and server-side enquiry verification.</p>
          <div className="pg-uat-box">
            <div className="pg-uat-title">Server configuration:</div>
            <div className="pg-uat-grid">
              <div><strong>Credentials:</strong> {pgConfig.sabpaisaKeyConfigured ? "Configured" : "Missing"}</div>
              <div><strong>Mode:</strong> {(pgConfig.sabpaisaMode || "test").toUpperCase()}</div>
            </div>
          </div>
          <div className="pg-card-footer">
            <span className="pg-key-tag"><Key size={14} /> Keys stay in backend .env</span>
            <button type="button" className={`pg-card-save-btn ${!isSabpaisaChanged ? "is-saved" : pgConfig.sabpaisaEnabled ? "save-enabled" : "save-disabled"}`} onClick={handleSaveSabpaisa} disabled={savingSabpaisa || !isSabpaisaChanged}>
              {savingSabpaisa ? <><RefreshCw size={15} className="spin" /> Saving...</> : !isSabpaisaChanged ? <><Check size={16} /> Saved!</> : pgConfig.sabpaisaEnabled ? <><Check size={16} /> Save as Enabled</> : <><XCircle size={16} /> Save as Disabled</>}
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
            <p>Select which gateway should be chosen by default when multiple gateways are enabled for users.</p>
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
              <option value="zaakpay">Zaakpay {pgConfig.zaakpayEnabled ? "(Enabled)" : "(Disabled)"}</option>
              <option value="hdfc">HDFC Bank {pgConfig.hdfcEnabled ? "(Enabled)" : "(Disabled)"}</option>
              <option value="sabpaisa">SabPaisa {pgConfig.sabpaisaEnabled ? "(Enabled)" : "(Disabled)"}</option>
            </select>
            <span className="pg-field-hint">
              Apps will prioritize this gateway if multiple gateways are active.
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
