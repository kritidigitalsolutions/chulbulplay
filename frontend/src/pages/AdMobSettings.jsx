import React, { useState, useEffect, useMemo } from "react";
import API from "../api/axios";
import { useToast } from "../App";
import {
  Megaphone,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
  ShieldCheck,
  Smartphone,
  Apple,
  ExternalLink,
  Layers,
  Save,
  Unplug,
  Calendar,
  DollarSign,
  MousePointerClick,
  Eye,
  Activity,
  BarChart2,
  HelpCircle,
  ArrowUpRight,
  TrendingUp,
  Radio
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from "recharts";
import "./AdMobSettings.css";

const DATE_PRESETS = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "last7days", label: "Last 7 Days" },
  { id: "last28days", label: "Last 28 Days" },
  { id: "thisMonth", label: "This Month" },
  { id: "lastMonth", label: "Last Month" },
  { id: "custom", label: "Custom" }
];

export default function AdMobSettings() {
  const { showToast } = useToast() || { showToast: (msg) => alert(msg) };

  // Loading and action states
  const [loading, setLoading] = useState(true);
  const [savingGeneral, setSavingGeneral] = useState(false);
  const [savingAndroid, setSavingAndroid] = useState(false);
  const [savingIos, setSavingIos] = useState(false);
  const [savingOAuth, setSavingOAuth] = useState(false);
  const [testingConn, setTestingConn] = useState(false);
  const [syncingNow, setSyncingNow] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState({});

  // Active date filter
  const [dateRange, setDateRange] = useState("last7days");
  const [customDates, setCustomDates] = useState({
    startDate: new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0]
  });

  // Settings State
  const [settings, setSettings] = useState({
    enabled: false,
    publisherAccountId: "",
    packageName: "",
    googleAccountEmail: "",
    connectionStatus: "disconnected", // connected, disconnected, syncing, error
    lastSyncedAt: null,
    lastSyncError: null,
    oauth: {
      clientId: "",
      clientSecretConfigured: false,
      refreshTokenConfigured: false
    },
    android: {
      appId: "",
      appOpenId: "",
      bannerId: "",
      interstitialId: "",
      rewardedId: "",
      nativeId: ""
    },
    ios: {
      appId: "",
      appOpenId: "",
      bannerId: "",
      interstitialId: "",
      rewardedId: "",
      nativeId: ""
    }
  });

  // Client secret & refresh token edit buffers (optional override)
  const [oauthSecretInput, setOauthSecretInput] = useState("");
  const [oauthRefreshTokenInput, setOauthRefreshTokenInput] = useState("");

  // Remote AdMob Apps & AdUnits
  const [admobApps, setAdmobApps] = useState([]);
  const [admobAdUnits, setAdmobAdUnits] = useState([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState("");

  // Reporting State
  const [reportingData, setReportingData] = useState({
    metrics: {
      impressions: 0,
      adRequests: 0,
      matchedRequests: 0,
      matchRate: 0,
      clicks: 0,
      estimatedEarnings: 0
    },
    chartData: []
  });
  const [loadingReport, setLoadingReport] = useState(false);

  // Fetch Settings
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await API.get("/admin/admob/settings");
      if (res.data?.success && res.data?.data) {
        setSettings((prev) => ({
          ...prev,
          ...res.data.data
        }));
      }
    } catch (err) {
      console.warn("Could not load AdMob settings from backend:", err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Report Data
  const fetchReport = async (range, custom) => {
    try {
      setLoadingReport(true);
      const params = { period: range };
      if (range === "custom" && custom) {
        params.startDate = custom.startDate;
        params.endDate = custom.endDate;
      }
      const res = await API.get("/admin/admob/report", { params });
      if (res.data?.success && res.data?.data) {
        setReportingData(res.data.data);
      }
    } catch (err) {
      console.warn("Could not load AdMob report:", err.message);
    } finally {
      setLoadingReport(false);
    }
  };

  // Fetch AdMob Apps & Units
  const fetchAppsAndUnits = async () => {
    if (settings.connectionStatus !== "connected") return;
    try {
      setLoadingApps(true);
      const [appsRes, unitsRes] = await Promise.allSettled([
        API.get("/admin/admob/apps"),
        API.get("/admin/admob/ad-units")
      ]);

      if (appsRes.status === "fulfilled" && appsRes.value.data?.success) {
        setAdmobApps(appsRes.value.data.data || []);
      }
      if (unitsRes.status === "fulfilled" && unitsRes.value.data?.success) {
        setAdmobAdUnits(unitsRes.value.data.data || []);
      }
    } catch (err) {
      console.error("Error fetching AdMob apps/units:", err);
    } finally {
      setLoadingApps(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    fetchReport(dateRange, customDates);
  }, [dateRange]);

  useEffect(() => {
    if (settings.connectionStatus === "connected") {
      fetchAppsAndUnits();
    }
  }, [settings.connectionStatus]);

  // Check URL for OAuth return status
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthStatus = params.get("oauth");
    if (oauthStatus === "success") {
      showToast("Google AdMob account connected successfully!", "success");
      fetchSettings();
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (oauthStatus === "error") {
      const msg = params.get("error_description") || "OAuth connection failed";
      showToast(msg, "error");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Copy to clipboard helper
  const handleCopy = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopyFeedback((prev) => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setCopyFeedback((prev) => ({ ...prev, [key]: false }));
    }, 2000);
    showToast("Copied to clipboard", "success");
  };

  // 1. Action: Connect Google
  const handleConnectGoogle = async () => {
    try {
      const res = await API.get("/admin/admob/oauth/start");
      if (res.data?.success && res.data?.authUrl) {
        window.location.href = res.data.authUrl;
      } else {
        showToast("Could not generate Google authorization link", "error");
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to start Google OAuth flow";
      showToast(msg, "error");
    }
  };

  // Action: Test Connection
  const handleTestConnection = async () => {
    try {
      setTestingConn(true);
      const res = await API.post("/admin/admob/test-connection");
      if (res.data?.success) {
        showToast("AdMob API connection active and healthy!", "success");
        fetchSettings();
      } else {
        showToast(res.data?.message || "Test connection failed", "error");
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Connection test failed";
      showToast(msg, "error");
    } finally {
      setTestingConn(false);
    }
  };

  // Action: Sync Now
  const handleSyncNow = async () => {
    try {
      setSyncingNow(true);
      const res = await API.post("/admin/admob/sync");
      if (res.data?.success) {
        showToast("AdMob data synchronized successfully!", "success");
        fetchSettings();
        fetchReport(dateRange, customDates);
        fetchAppsAndUnits();
      } else {
        showToast(res.data?.message || "Synchronization failed", "error");
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Sync request failed";
      showToast(msg, "error");
    } finally {
      setSyncingNow(false);
    }
  };

  // Action: Disconnect
  const handleDisconnect = async () => {
    if (!window.confirm("Are you sure you want to disconnect your Google AdMob account?")) return;
    try {
      const res = await API.post("/admin/admob/disconnect");
      if (res.data?.success) {
        showToast("AdMob account disconnected", "success");
        fetchSettings();
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to disconnect", "error");
    }
  };

  // 2. Save General Settings
  const handleSaveGeneral = async (e) => {
    e.preventDefault();
    try {
      setSavingGeneral(true);
      const payload = {
        enabled: settings.enabled,
        publisherAccountId: settings.publisherAccountId,
        packageName: settings.packageName
      };
      const res = await API.put("/admin/admob/settings", payload);
      if (res.data?.success) {
        showToast("General settings saved successfully", "success");
        setSettings((prev) => ({ ...prev, ...res.data.data }));
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to save general settings", "error");
    } finally {
      setSavingGeneral(false);
    }
  };

  // Save OAuth Settings
  const handleSaveOAuth = async (e) => {
    e.preventDefault();
    try {
      setSavingOAuth(true);
      const payload = {
        oauth: {
          clientId: settings.oauth.clientId,
          clientSecret: oauthSecretInput || undefined,
          refreshToken: oauthRefreshTokenInput || undefined
        }
      };
      const res = await API.put("/admin/admob/settings", payload);
      if (res.data?.success) {
        showToast("OAuth configuration saved", "success");
        setOauthSecretInput("");
        setOauthRefreshTokenInput("");
        setSettings((prev) => ({ ...prev, ...res.data.data }));
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to save OAuth config", "error");
    } finally {
      setSavingOAuth(false);
    }
  };

  // 3. Save Android Ad Units
  const handleSaveAndroid = async (e) => {
    e.preventDefault();
    try {
      setSavingAndroid(true);
      const payload = { android: settings.android };
      const res = await API.put("/admin/admob/settings", payload);
      if (res.data?.success) {
        showToast("Android ad units saved successfully", "success");
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to save Android units", "error");
    } finally {
      setSavingAndroid(false);
    }
  };

  // 4. Save iOS Ad Units
  const handleSaveIos = async (e) => {
    e.preventDefault();
    try {
      setSavingIos(true);
      const payload = { ios: settings.ios };
      const res = await API.put("/admin/admob/settings", payload);
      if (res.data?.success) {
        showToast("iOS ad units saved successfully", "success");
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to save iOS units", "error");
    } finally {
      setSavingIos(false);
    }
  };

  // Ad Unit ID validator hint
  const validateUnitId = (id) => {
    if (!id) return null;
    if (!id.includes("ca-app-pub-") && !id.includes("~") && !id.includes("/")) {
      return "Expected format: ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY";
    }
    return null;
  };

  // Format currency
  const formatCurrency = (val) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2
    }).format(val || 0);
  };

  return (
    <div className="admob-page">
      {/* ── 0. Top Header ── */}
      <header className="admob-header">
        <div className="admob-header-left">
          <div className="admob-header-icon">
            <Megaphone size={28} />
          </div>
          <div>
            <h1 className="admob-title">Google AdMob Setup</h1>
            <p className="admob-subtitle">
              Manage Google AdMob configuration, ad units, account connection and reporting synchronization.
            </p>
          </div>
        </div>

        <div className="admob-header-actions">
          {settings.connectionStatus === "connected" ? (
            <>
              <button
                className="admob-btn admob-btn-secondary"
                onClick={handleTestConnection}
                disabled={testingConn}
              >
                <Activity size={16} className={testingConn ? "animate-spin" : ""} />
                {testingConn ? "Testing..." : "Test Connection"}
              </button>
              <button
                className="admob-btn admob-btn-primary"
                onClick={handleSyncNow}
                disabled={syncingNow}
              >
                <RefreshCw size={16} className={syncingNow ? "animate-spin" : ""} />
                {syncingNow ? "Syncing..." : "Sync Now"}
              </button>
              <button
                className="admob-btn admob-btn-danger"
                onClick={handleDisconnect}
              >
                <Unplug size={16} /> Disconnect
              </button>
            </>
          ) : (
            <button
              className="admob-btn admob-btn-google"
              onClick={handleConnectGoogle}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.25 21.37 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.17 0 9.97 0 12s.46 3.83 1.26 5.42l4.02-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.25 2.63 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>Connect Google</span>
            </button>
          )}
        </div>
      </header>

      {/* ── 1. Connection Status Card ── */}
      <section className="admob-status-card">
        <div className="status-card-top">
          <div className="status-indicator-wrap">
            <span className={`status-badge ${settings.connectionStatus}`}>
              <span className="status-pulse-dot" />
              {settings.connectionStatus === "connected"
                ? "Connected"
                : settings.connectionStatus === "syncing"
                  ? "Syncing"
                  : settings.connectionStatus === "error"
                    ? "Error"
                    : "Disconnected"}
            </span>
            <span style={{ fontSize: "0.88rem", color: "var(--text-soft)" }}>
              AdMob Account Status
            </span>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            {settings.connectionStatus === "connected" ? (
              <button
                className="admob-btn admob-btn-secondary"
                onClick={handleConnectGoogle}
                title="Refresh OAuth credentials"
              >
                <RefreshCw size={14} /> Reconnect
              </button>
            ) : null}
          </div>
        </div>

        <div className="status-meta-grid">
          <div className="meta-item">
            <span className="meta-label">Google Account</span>
            <span className="meta-val">{settings.googleAccountEmail || "Not Connected"}</span>
          </div>

          <div className="meta-item">
            <span className="meta-label">Publisher Account ID</span>
            <span className="meta-val mono">
              {settings.publisherAccountId || "pub-xxxxxxxxxxxxxxxx"}
            </span>
          </div>

          <div className="meta-item">
            <span className="meta-label">Connection Status</span>
            <span className="meta-val" style={{ textTransform: "capitalize" }}>
              {settings.connectionStatus}
            </span>
          </div>

          <div className="meta-item">
            <span className="meta-label">Last Sync</span>
            <span className="meta-val">
              {settings.lastSyncedAt
                ? new Date(settings.lastSyncedAt).toLocaleString()
                : "Never synced"}
            </span>
          </div>
        </div>

        {settings.lastSyncError && (
          <div className="admob-callout error">
            <AlertCircle size={18} />
            <div>
              <strong>Sync Error:</strong> {settings.lastSyncError}
            </div>
          </div>
        )}
      </section>

      {/* ── 2. General Settings ── */}
      <section className="admob-section">
        <div className="section-header">
          <div className="section-title-wrap">
            <div className="section-title-icon" style={{ background: "rgba(234, 67, 53, 0.15)", color: "#ea4335" }}>
              <Radio size={20} />
            </div>
            <div>
              <h2 className="section-title">General Settings</h2>
              <p className="section-desc">Global ad serving switch and app identification</p>
            </div>
          </div>
          <button
            className="admob-btn admob-btn-primary"
            onClick={handleSaveGeneral}
            disabled={savingGeneral}
          >
            <Save size={16} /> {savingGeneral ? "Saving..." : "Save Settings"}
          </button>
        </div>

        <div className="admob-form-grid">
          <div className="form-group" style={{ justifyContent: "center" }}>
            <span className="form-label">Enable AdMob Ads</span>
            <div className="toggle-wrap">
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                />
                <span className="toggle-slider" />
              </label>
              <span className="toggle-label">
                {settings.enabled ? (
                  <span style={{ color: "#10b981" }}>ON (Active)</span>
                ) : (
                  <span style={{ color: "var(--text-muted)" }}>OFF (Disabled)</span>
                )}
              </span>
            </div>
            <span className="form-helper">
              Controls whether mobile apps request and render AdMob advertising units.
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">Publisher Account ID</label>
            <input
              type="text"
              className="form-input mono"
              placeholder="pub-1234567890123456"
              value={settings.publisherAccountId || ""}
              onChange={(e) => setSettings({ ...settings, publisherAccountId: e.target.value })}
            />
            <span className="form-helper">Your 16-digit Google AdMob publisher account identifier.</span>
          </div>

          <div className="form-group">
            <label className="form-label">App Package Name</label>
            <input
              type="text"
              className="form-input mono"
              placeholder="com.chulbulplay.app"
              value={settings.packageName || ""}
              onChange={(e) => setSettings({ ...settings, packageName: e.target.value })}
            />
            <span className="form-helper">Primary Android package and iOS bundle identifier.</span>
          </div>
        </div>
      </section>

      {/* ── 3. Google AdMob Authentication (OAuth) ── */}
      <section className="admob-section">
        <div className="section-header">
          <div className="section-title-wrap">
            <div className="section-title-icon" style={{ background: "rgba(66, 133, 244, 0.15)", color: "#4285f4" }}>
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 className="section-title">Google AdMob Authentication</h2>
              <p className="section-desc">
                Secure server-side OAuth 2.0 connection. Client secrets and tokens are encrypted at rest.
              </p>
            </div>
          </div>
          <button
            className="admob-btn admob-btn-secondary"
            onClick={handleSaveOAuth}
            disabled={savingOAuth}
          >
            <Save size={16} /> {savingOAuth ? "Saving..." : "Save OAuth Config"}
          </button>
        </div>

        <div className="admob-form-grid">
          <div className="form-group">
            <label className="form-label">OAuth Client ID</label>
            <input
              type="text"
              className="form-input mono"
              placeholder="123456789-xxxx.apps.googleusercontent.com"
              value={settings.oauth?.clientId || ""}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  oauth: { ...settings.oauth, clientId: e.target.value }
                })
              }
            />
            <span className="form-helper">Configured in Google Cloud Console Credentials.</span>
          </div>

          <div className="form-group">
            <div className="form-label">
              <span>OAuth Client Secret</span>
              {settings.oauth?.clientSecretConfigured ? (
                <span className="masked-badge">
                  <Check size={12} /> Configured ✓
                </span>
              ) : (
                <span className="masked-badge missing">Not Configured</span>
              )}
            </div>
            <input
              type="password"
              className="form-input mono"
              placeholder={
                settings.oauth?.clientSecretConfigured
                  ? "••••••••••••••••••••••••••••••••"
                  : "Enter client secret (optional override)"
              }
              value={oauthSecretInput}
              onChange={(e) => setOauthSecretInput(e.target.value)}
            />
            <span className="form-helper">
              Protected credential. Never exposed to browser or unauthorized clients.
            </span>
          </div>

          <div className="form-group">
            <div className="form-label">
              <span>OAuth Refresh Token</span>
              {settings.oauth?.refreshTokenConfigured ? (
                <span className="masked-badge">
                  <Check size={12} /> Configured ✓
                </span>
              ) : (
                <span className="masked-badge missing">Not Configured</span>
              )}
            </div>
            <input
              type="text"
              className="form-input mono"
              placeholder={
                settings.oauth?.refreshTokenConfigured
                  ? "•••••••••••••••••••••••••••••••• (Enter new token to update)"
                  : "Enter OAuth refresh token (starts with 1//0...)"
              }
              value={oauthRefreshTokenInput}
              onChange={(e) => setOauthRefreshTokenInput(e.target.value)}
            />
            <span className="form-helper">
              Enter your Google OAuth refresh token (starts with 1//0...) and click "Save OAuth Config" above to update.
            </span>
          </div>
        </div>
      </section>

      {/* ── 4. Android AdMob Ad Units ── */}
      <section className="admob-section">
        <div className="section-header">
          <div className="section-title-wrap">
            <div className="section-title-icon" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981" }}>
              <Smartphone size={20} />
            </div>
            <div>
              <h2 className="section-title">Android Ad Units</h2>
              <p className="section-desc">Ad unit IDs configured for the Android mobile client</p>
            </div>
          </div>
          <button
            className="admob-btn admob-btn-primary"
            onClick={handleSaveAndroid}
            disabled={savingAndroid}
          >
            <Save size={16} /> {savingAndroid ? "Saving..." : "Save Android Units"}
          </button>
        </div>

        <div className="admob-form-grid">
          {[
            { key: "appId", label: "Android App ID", ph: "ca-app-pub-xxxxxxxxxxxxxxxx~yyyyyyyyyy" },
            { key: "appOpenId", label: "Android App Open ID", ph: "ca-app-pub-xxxxxxxxxxxxxxxx/yyyyyyyyyy" },
            { key: "bannerId", label: "Android Banner ID", ph: "ca-app-pub-xxxxxxxxxxxxxxxx/yyyyyyyyyy" },
            { key: "interstitialId", label: "Android Interstitial ID", ph: "ca-app-pub-xxxxxxxxxxxxxxxx/yyyyyyyyyy" },
            { key: "rewardedId", label: "Android Rewarded ID", ph: "ca-app-pub-xxxxxxxxxxxxxxxx/yyyyyyyyyy" },
            { key: "nativeId", label: "Android Native ID", ph: "ca-app-pub-xxxxxxxxxxxxxxxx/yyyyyyyyyy" }
          ].map((field) => {
            const val = settings.android?.[field.key] || "";
            const err = validateUnitId(val);
            return (
              <div className="form-group" key={field.key}>
                <div className="form-label">
                  <span>{field.label}</span>
                </div>
                <div className="form-input-wrap">
                  <input
                    type="text"
                    className="form-input mono has-action"
                    placeholder={field.ph}
                    value={val}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        android: { ...settings.android, [field.key]: e.target.value }
                      })
                    }
                  />
                  <button
                    type="button"
                    className="form-input-action"
                    onClick={() => handleCopy(val, `and_${field.key}`)}
                    title="Copy Unit ID"
                  >
                    {copyFeedback[`and_${field.key}`] ? (
                      <Check size={16} style={{ color: "#10b981" }} />
                    ) : (
                      <Copy size={16} />
                    )}
                  </button>
                </div>
                {err && <span className="form-helper text-warning">{err}</span>}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 5. iOS AdMob Ad Units ── */}
      <section className="admob-section">
        <div className="section-header">
          <div className="section-title-wrap">
            <div className="section-title-icon" style={{ background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8" }}>
              <Apple size={20} />
            </div>
            <div>
              <h2 className="section-title">iOS Ad Units</h2>
              <p className="section-desc">Ad unit IDs configured for Apple iOS client</p>
            </div>
          </div>
          <button
            className="admob-btn admob-btn-primary"
            onClick={handleSaveIos}
            disabled={savingIos}
          >
            <Save size={16} /> {savingIos ? "Saving..." : "Save iOS Units"}
          </button>
        </div>

        <div className="admob-form-grid">
          {[
            { key: "appId", label: "iOS App ID", ph: "ca-app-pub-xxxxxxxxxxxxxxxx~yyyyyyyyyy" },
            { key: "appOpenId", label: "iOS App Open ID", ph: "ca-app-pub-xxxxxxxxxxxxxxxx/yyyyyyyyyy" },
            { key: "bannerId", label: "iOS Banner ID", ph: "ca-app-pub-xxxxxxxxxxxxxxxx/yyyyyyyyyy" },
            { key: "interstitialId", label: "iOS Interstitial ID", ph: "ca-app-pub-xxxxxxxxxxxxxxxx/yyyyyyyyyy" },
            { key: "rewardedId", label: "iOS Rewarded ID", ph: "ca-app-pub-xxxxxxxxxxxxxxxx/yyyyyyyyyy" },
            { key: "nativeId", label: "iOS Native ID", ph: "ca-app-pub-xxxxxxxxxxxxxxxx/yyyyyyyyyy" }
          ].map((field) => {
            const val = settings.ios?.[field.key] || "";
            const err = validateUnitId(val);
            return (
              <div className="form-group" key={field.key}>
                <div className="form-label">
                  <span>{field.label}</span>
                </div>
                <div className="form-input-wrap">
                  <input
                    type="text"
                    className="form-input mono has-action"
                    placeholder={field.ph}
                    value={val}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        ios: { ...settings.ios, [field.key]: e.target.value }
                      })
                    }
                  />
                  <button
                    type="button"
                    className="form-input-action"
                    onClick={() => handleCopy(val, `ios_${field.key}`)}
                    title="Copy Unit ID"
                  >
                    {copyFeedback[`ios_${field.key}`] ? (
                      <Check size={16} style={{ color: "#10b981" }} />
                    ) : (
                      <Copy size={16} />
                    )}
                  </button>
                </div>
                {err && <span className="form-helper text-warning">{err}</span>}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 6 & 7. AdMob Apps & Ad Units Mapping ── */}
      <section className="admob-section">
        <div className="section-header">
          <div className="section-title-wrap">
            <div className="section-title-icon" style={{ background: "rgba(139, 92, 246, 0.15)", color: "#8b5cf6" }}>
              <Layers size={20} />
            </div>
            <div>
              <h2 className="section-title">AdMob Apps & Unit Mapping</h2>
              <p className="section-desc">
                Discovered apps and available ad units retrieved directly from your Google AdMob account.
              </p>
            </div>
          </div>
          <button
            className="admob-btn admob-btn-secondary"
            onClick={fetchAppsAndUnits}
            disabled={loadingApps || settings.connectionStatus !== "connected"}
          >
            <RefreshCw size={14} className={loadingApps ? "animate-spin" : ""} /> Refresh Apps
          </button>
        </div>

        {settings.connectionStatus !== "connected" ? (
          <div className="admob-callout info">
            <HelpCircle size={18} />
            <div>
              Connect your Google AdMob account using the <strong>Connect Google</strong> button above to
              automatically list registered AdMob apps and synchronize ad units.
            </div>
          </div>
        ) : admobApps.length === 0 ? (
          <div className="admob-callout info">
            <HelpCircle size={18} />
            <div>No apps found on this AdMob publisher account or sync in progress. Click "Sync Now" to fetch.</div>
          </div>
        ) : (
          <div className="admob-table-wrap">
            <table className="admob-table">
              <thead>
                <tr>
                  <th>App Name</th>
                  <th>Platform</th>
                  <th>App ID</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {admobApps.map((app, idx) => (
                  <tr key={app.appId || idx}>
                    <td style={{ fontWeight: 600 }}>{app.name || "Untitled App"}</td>
                    <td>
                      <span
                        className="status-badge"
                        style={{
                          background: app.platform === "IOS" ? "rgba(56, 189, 248, 0.15)" : "rgba(16, 185, 129, 0.15)",
                          color: app.platform === "IOS" ? "#38bdf8" : "#10b981",
                          padding: "2px 8px",
                          fontSize: "0.75rem"
                        }}
                      >
                        {app.platform || "ANDROID"}
                      </span>
                    </td>
                    <td className="mono">{app.appId}</td>
                    <td>
                      <button
                        className="admob-btn admob-btn-secondary"
                        style={{ padding: "4px 10px", fontSize: "0.78rem" }}
                        onClick={() => {
                          if (
                            window.confirm(
                              `Apply App ID (${app.appId}) to ${app.platform === "IOS" ? "iOS" : "Android"
                              } settings?`
                            )
                          ) {
                            if (app.platform === "IOS") {
                              setSettings((prev) => ({
                                ...prev,
                                ios: { ...prev.ios, appId: app.appId }
                              }));
                            } else {
                              setSettings((prev) => ({
                                ...prev,
                                android: { ...prev.android, appId: app.appId }
                              }));
                            }
                            showToast("App ID selected! Click Save to confirm.", "success");
                          }
                        }}
                      >
                        Select App
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── 8, 9, 10. Reporting Dashboard & Analytics ── */}
      <section className="admob-section">
        <div className="section-header">
          <div className="section-title-wrap">
            <div className="section-title-icon" style={{ background: "rgba(245, 158, 11, 0.15)", color: "#f59e0b" }}>
              <TrendingUp size={20} />
            </div>
            <div>
              <h2 className="section-title">Reporting Dashboard</h2>
              <p className="section-desc">Performance metrics and revenue analytics from AdMob Network API</p>
            </div>
          </div>

          {/* 9. Date Filter */}
          <div className="date-filter-bar">
            {DATE_PRESETS.map((p) => (
              <button
                key={p.id}
                className={`date-pill ${dateRange === p.id ? "active" : ""}`}
                onClick={() => setDateRange(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* 8. KPI Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-top">
              <span className="stat-title">AdMob Impressions</span>
              <Eye size={18} />
            </div>
            <div className="stat-value">
              {(reportingData.metrics?.impressions || 0).toLocaleString()}
            </div>
            <div className="stat-sub text-success">
              <TrendingUp size={12} /> Total rendered ads
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-top">
              <span className="stat-title">Ad Requests</span>
              <Activity size={18} />
            </div>
            <div className="stat-value">
              {(reportingData.metrics?.adRequests || 0).toLocaleString()}
            </div>
            <div className="stat-sub">From active client sessions</div>
          </div>

          <div className="stat-card">
            <div className="stat-top">
              <span className="stat-title">Matched Requests</span>
              <CheckCircle2 size={18} />
            </div>
            <div className="stat-value">
              {(reportingData.metrics?.matchedRequests || 0).toLocaleString()}
            </div>
            <div className="stat-sub">Inventory filled by Google</div>
          </div>

          <div className="stat-card">
            <div className="stat-top">
              <span className="stat-title">Match Rate</span>
              <BarChart2 size={18} />
            </div>
            <div className="stat-value">
              {(reportingData.metrics?.matchRate || 0).toFixed(1)}%
            </div>
            <div className="stat-sub text-info">Fill efficiency</div>
          </div>

          <div className="stat-card">
            <div className="stat-top">
              <span className="stat-title">Clicks</span>
              <MousePointerClick size={18} />
            </div>
            <div className="stat-value">
              {(reportingData.metrics?.clicks || 0).toLocaleString()}
            </div>
            <div className="stat-sub">Ad user engagements</div>
          </div>

          <div className="stat-card">
            <div className="stat-top">
              <span className="stat-title">Estimated Earnings</span>
              <DollarSign size={18} />
            </div>
            <div className="stat-value text-success">
              {formatCurrency(reportingData.metrics?.estimatedEarnings)}
            </div>
            <div className="stat-sub text-gold">Ad revenue accrued</div>
          </div>
        </div>

        {/* 10. Charts */}
        <div style={{ marginTop: "16px" }}>
          <h3 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "8px", color: "var(--text)" }}>
            Performance & Revenue Trend
          </h3>
          <div className="chart-container">
            {reportingData.chartData && reportingData.chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={reportingData.chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorImpressions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ea4335" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#ea4335" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="chart-tooltip-box">
                          <div className="chart-tooltip-label">{label}</div>
                          {payload.map((entry, index) => (
                            <div key={`item-${index}`} className="chart-tooltip-row">
                              <span style={{ width: 8, height: 8, borderRadius: "50%", background: entry.color }} />
                              <span>{entry.name}:</span>
                              <span>
                                {entry.dataKey === "estimatedEarnings"
                                  ? formatCurrency(entry.value)
                                  : Number(entry.value).toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="impressions"
                    name="Impressions"
                    stroke="#ea4335"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorImpressions)"
                  />
                  <Area
                    type="monotone"
                    dataKey="adRequests"
                    name="Ad Requests"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fillOpacity={0.1}
                    fill="#3b82f6"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div
                style={{
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--text-muted)",
                  background: "var(--bg3)",
                  borderRadius: "8px",
                  fontSize: "0.88rem"
                }}
              >
                {loadingReport ? "Loading AdMob reporting data..." : "No report data available for selected period."}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
