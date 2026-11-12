import { useEffect, useState, useCallback } from "react";
import API, { API_BASE_URL } from "../api/axios";
import {
  Users,
  RefreshCw,
  User,
  CheckCircle,
  Search,
  Loader,
  Eye,
  Trash2,
  Ban,
  X,
  Plus,
  Pencil,
  LogIn,
  Clock,
  Radio,
  Copy,
  Check,
  Smartphone,
  Globe,
  MoreVertical,
  ShieldCheck,
} from "lucide-react";
import "./Dashboard.css";
import "./UsersPage.css";

const IST_TIMEZONE = "Asia/Kolkata";

const formatPhoneDisplay = (phone) => {
  if (!phone) return "—";
  const str = String(phone).trim();
  const digits = str.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  return str;
};

const formatIstDate = (dateVal) => {
  if (!dateVal) return "—";
  try {
    return new Date(dateVal).toLocaleDateString("en-IN", {
      timeZone: IST_TIMEZONE,
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
};

const formatIstTime = (dateVal, withSeconds = false) => {
  if (!dateVal) return "";
  try {
    return new Date(dateVal)
      .toLocaleTimeString("en-IN", {
        timeZone: IST_TIMEZONE,
        hour: "numeric",
        minute: "2-digit",
        ...(withSeconds ? { second: "2-digit" } : {}),
        hour12: true,
      })
      .toLowerCase();
  } catch {
    return "";
  }
};

const formatIstDateTime = (dateVal) => {
  if (!dateVal) return "—";
  return `${formatIstDate(dateVal)}, ${formatIstTime(dateVal, true)}`;
};

const formatTodayOrDateTime = (dateVal) => {
  if (!dateVal) return "—";
  const d = new Date(dateVal);
  const nowStr = new Date().toLocaleDateString("en-IN", { timeZone: IST_TIMEZONE });
  const targetStr = d.toLocaleDateString("en-IN", { timeZone: IST_TIMEZONE });
  const timeStr = formatIstTime(dateVal, false);
  if (nowStr === targetStr) {
    return `Today, ${timeStr}`;
  }
  return `${formatIstDate(dateVal)}, ${timeStr}`;
};

const formatRelativeAgo = (dateVal) => {
  if (!dateVal) return "";
  const diffSec = Math.max(0, Math.floor((Date.now() - new Date(dateVal).getTime()) / 1000));
  if (diffSec < 60) return "just now";
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

const formatInflowGap = (seconds) => {
  if (seconds === null || seconds === undefined) return "—";
  if (seconds < 60) return "Just now (<1m)";
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const formatGapBadge = (seconds) => {
  if (seconds === null || seconds === undefined) return "—";
  if (seconds < 60) return `+${seconds}s`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `+${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `+${hrs}h`;
  return `+${Math.floor(hrs / 24)}d`;
};

const formatDurationLabel = (seconds) => {
  if (!seconds || seconds < 60) return "";
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m stay`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `${hrs}h ${remMins}m stay` : `${hrs}h stay`;
};

export default function UsersPage() {
  const [activeTab, setActiveTab] = useState("all"); // "all" | "monitor"
  const [users, setUsers] = useState([]);
  const [summary, setSummary] = useState({
    totalRegisteredUsers: 0,
    currentlyOnline: 0,
    loginsToday: 0,
    lastLoginAt: null,
    inflowGapSeconds: null,
  });

  // Login Monitor state
  const [monitorLogs, setMonitorLogs] = useState([]);
  const [monitorSearch, setMonitorSearch] = useState("");
  const [monitorLoading, setMonitorLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);

  // Add/Edit modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    role: "USER",
  });
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    const serverUrl = API_BASE_URL.replace("/api", "").replace(/\/+$/, "");
    const cleanPath = path.replace(/\\/g, "/").replace(/^\/+/, "");
    return `${serverUrl}/${cleanPath}`;
  };

  const fetchUsers = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await API.get("/admin/users");
      setUsers(res.data.users || []);
      if (res.data.summary) {
        setSummary(res.data.summary);
      }
    } catch {
      if (!silent) setUsers([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const fetchMonitorLogs = useCallback(async (silent = false) => {
    if (!silent) setMonitorLoading(true);
    try {
      const res = await API.get("/admin/users/login-monitor");
      setMonitorLogs(res.data.logs || []);
      if (res.data.summary) {
        setSummary(res.data.summary);
      }
    } catch (err) {
      console.error("Failed to load login monitor:", err);
    } finally {
      if (!silent) setMonitorLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchMonitorLogs(true);
  }, [fetchUsers, fetchMonitorLogs]);

  // Auto-refresh every 20s when on Login & OTP Monitor tab
  useEffect(() => {
    if (activeTab !== "monitor" || !autoRefresh) return;
    const timer = setInterval(() => {
      fetchMonitorLogs(true);
    }, 20000);
    return () => clearInterval(timer);
  }, [activeTab, autoRefresh, fetchMonitorLogs]);

  // Close row dropdown menu when clicking anywhere outside
  useEffect(() => {
    const closeMenu = () => setOpenMenuId(null);
    window.addEventListener("click", closeMenu);
    return () => window.removeEventListener("click", closeMenu);
  }, []);

  const handleRefresh = () => {
    fetchUsers();
    fetchMonitorLogs();
  };

  const handleCopyPhone = (e, id, phone) => {
    e.stopPropagation();
    if (!phone) return;
    navigator.clipboard?.writeText(phone);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleDelete = async (id) => {
    setOpenMenuId(null);
    if (!window.confirm("Delete this user permanently?")) return;
    try {
      await API.delete(`/admin/users/${id}`);
      setUsers((p) => p.filter((u) => u._id !== id));
      setMonitorLogs((p) => p.filter((l) => l.user?._id !== id));
    } catch {
      alert("Failed to delete");
    }
  };

  const handleToggleBlock = async (id) => {
    setOpenMenuId(null);
    const user = users.find((u) => u._id === id);
    if (!user) return;
    const actionText = user.isBlocked ? "unblock" : "block";
    if (!window.confirm(`Are you sure you want to ${actionText} this user?`)) return;
    try {
      const res = await API.patch(`/admin/users/${id}/toggle-block`);
      setUsers((p) => p.map((u) => (u._id === id ? { ...u, isBlocked: res.data.isBlocked } : u)));
    } catch (err) {
      alert(err.response?.data?.message || `Failed to ${actionText} user`);
    }
  };

  const resetForm = () => {
    setFormData({ name: "", phone: "", email: "", role: "USER" });
    setProfileImageFile(null);
    setFormError("");
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    const data = new FormData();
    data.append("name", formData.name);

    const formattedPhone = formData.phone.startsWith("+91") ? formData.phone : `+91${formData.phone}`;
    data.append("phone", formattedPhone);
    data.append("email", formData.email);
    if (profileImageFile) {
      data.append("profileImage", profileImageFile);
    }

    try {
      await API.post("/admin/users", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setIsAddOpen(false);
      resetForm();
      handleRefresh();
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to create user");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (user) => {
    setOpenMenuId(null);
    setEditUser(user);
    let cleanPhone = user.phone || "";
    if (cleanPhone.startsWith("+91")) {
      cleanPhone = cleanPhone.slice(3);
    } else if (cleanPhone.startsWith("91") && cleanPhone.length === 12) {
      cleanPhone = cleanPhone.slice(2);
    }
    setFormData({
      name: user.name || "",
      phone: cleanPhone,
      email: user.email || "",
      role: user.role || "USER",
    });
    setProfileImageFile(null);
    setFormError("");
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    const data = new FormData();
    data.append("name", formData.name);

    const formattedPhone = formData.phone.startsWith("+91") ? formData.phone : `+91${formData.phone}`;
    data.append("phone", formattedPhone);
    data.append("email", formData.email);
    if (profileImageFile) {
      data.append("profileImage", profileImageFile);
    }

    try {
      await API.patch(`/admin/users/${editUser._id}`, data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setIsEditOpen(false);
      setEditUser(null);
      resetForm();
      handleRefresh();
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to update user");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (u.name || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q) ||
      (u.phone || "").toLowerCase().includes(q)
    );
  });

  const filteredLogs = monitorLogs.filter((l) => {
    if (!monitorSearch.trim()) return true;
    const q = monitorSearch.toLowerCase();
    const u = l.user || {};
    return (
      (u.name || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q) ||
      (u.phone || "").toLowerCase().includes(q) ||
      (l.method || "").toLowerCase().includes(q) ||
      (l.platform || "").toLowerCase().includes(q)
    );
  });

  const totalUsersCount = summary.totalRegisteredUsers || users.length;
  const onlineCount = summary.currentlyOnline ?? users.filter((u) => u.isOnline).length;
  const loginsTodayCount = summary.loginsToday ?? 0;

  return (
    <div className="um-page">
      {/* ── Header ── */}
      <div className="pg-header">
        <div>
          <h1 className="pg-title">
            <Users size={26} style={{ color: "#a78bfa" }} />
            <span>User Management & Login Monitor</span>
          </h1>
          <p className="pg-sub">
            Monitor real-time user logins, session activity, phone details, and OTP inflow health
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button className="btn btn-primary" onClick={() => setIsAddOpen(true)}>
            <Plus size={16} style={{ display: "inline-block", marginRight: 6 }} />
            Add User
          </button>
          <button className="btn btn-ghost" onClick={handleRefresh}>
            <RefreshCw
              size={15}
              className={loading || monitorLoading ? "um-spin" : ""}
              style={{ display: "inline-block", marginRight: 6 }}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="um-tabs-row">
        <button
          type="button"
          className={`um-tab-btn ${activeTab === "all" ? "active" : ""}`}
          onClick={() => setActiveTab("all")}
        >
          <Users size={15} />
          <span>All Users</span>
          <span className="um-tab-count">{totalUsersCount}</span>
        </button>

        <button
          type="button"
          className={`um-tab-btn ${activeTab === "monitor" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("monitor");
            fetchMonitorLogs(true);
          }}
        >
          <Radio size={15} style={{ color: "#ec4899" }} />
          <span>Login & OTP Monitor</span>
          <span className="um-tab-online-pill">
            <span className="um-live-dot" />
            {onlineCount} online
          </span>
        </button>
      </div>

      {/* ── 4 Summary Stat Cards ── */}
      <div className="um-stats-grid">
        <div className="um-stat-card">
          <div className="um-stat-icon-box">
            <User size={17} />
          </div>
          <div className="um-stat-label">TOTAL REGISTERED USERS</div>
          <div className="um-stat-value">{totalUsersCount}</div>
        </div>

        <div className="um-stat-card">
          <div className="um-stat-icon-box">
            <CheckCircle size={17} />
          </div>
          <div className="um-stat-label">CURRENTLY ONLINE (LAST 5M)</div>
          <div className="um-stat-value">
            <span className="um-live-dot" />
            <span>{onlineCount}</span>
          </div>
        </div>

        <div className="um-stat-card accent-purple">
          <div className="um-stat-icon-box">
            <LogIn size={17} />
          </div>
          <div className="um-stat-label">USER LOGINS TODAY</div>
          <div className="um-stat-value">{loginsTodayCount}</div>
        </div>

        <div className="um-stat-card">
          <div className="um-stat-icon-box">
            <Clock size={17} />
          </div>
          <div className="um-stat-label">LAST USER LOGIN / INFLOW GAP</div>
          <div className="um-stat-value green-text">
            {formatInflowGap(summary.inflowGapSeconds)}
          </div>
        </div>
      </div>

      {/* ═══════════════════════ TAB 1: ALL USERS ═══════════════════════ */}
      {activeTab === "all" && (
        <div className="content-box">
          <div className="search-row" style={{ marginBottom: 18 }}>
            <div className="search-field" style={{ maxWidth: 420, width: "100%" }}>
              <Search size={17} />
              <input
                placeholder="Search by name, phone number (+91...), or email"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="empty-state">
              <p>
                <Loader size={20} className="um-spin" style={{ display: "inline-block", marginRight: 8 }} />
                Loading users...
              </p>
            </div>
          ) : (
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>USER</th>
                    <th>PHONE NUMBER</th>
                    <th>EMAIL</th>
                    <th>JOINED (IST)</th>
                    <th>LAST LOGIN / STATUS</th>
                    <th>STATUS</th>
                    <th style={{ textAlign: "right" }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={8}>
                        <div className="empty-state">
                          <p>No users found</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u, i) => {
                      const lastLoginVal = u.effectiveLastLogin || u.lastLoginAt || u.createdAt;
                      return (
                        <tr key={u._id || i}>
                          <td style={{ color: "var(--text-muted)", fontWeight: 700 }}>{i + 1}</td>

                          <td>
                            <div className="user-cell">
                              <div className="u-avatar">
                                {u.profileImage ? (
                                  <img src={getImageUrl(u.profileImage)} alt={u.name} />
                                ) : (
                                  (u.name || "U")[0].toUpperCase()
                                )}
                              </div>
                              <div className="um-user-meta">
                                <span className="u-name">{u.name || "User"}</span>
                                {u.profileComplete && (
                                  <span className="um-verified-tag">✓ Verified</span>
                                )}
                              </div>
                            </div>
                          </td>

                          <td>
                            <div className="um-phone-wrap">
                              <span>{formatPhoneDisplay(u.phone)}</span>
                              {u.phone && (
                                <button
                                  type="button"
                                  className="um-copy-btn"
                                  onClick={(e) => handleCopyPhone(e, u._id, u.phone)}
                                  title="Copy phone number"
                                >
                                  {copiedId === u._id ? (
                                    <Check size={13} color="#22c55e" />
                                  ) : (
                                    <Copy size={13} />
                                  )}
                                </button>
                              )}
                            </div>
                          </td>

                          <td style={{ color: "var(--text-soft)" }}>{u.email || "—"}</td>

                          <td>
                            <div>{formatIstDate(u.createdAt)}</div>
                            <div className="um-sub-text">{formatIstTime(u.createdAt, false)}</div>
                          </td>

                          <td>
                            {u.isOnline ? (
                              <span className="um-online-pill">
                                <span className="um-live-dot" />
                                Online Now
                              </span>
                            ) : (
                              <div>
                                <div style={{ fontWeight: 600, fontSize: "0.84rem" }}>
                                  {formatTodayOrDateTime(lastLoginVal)}
                                </div>
                                <div className="um-sub-text">{formatRelativeAgo(lastLoginVal)}</div>
                              </div>
                            )}
                          </td>

                          <td>
                            <span
                              className={`badge ${
                                u.isBlocked
                                  ? "badge-blocked"
                                  : u.isSubscriber
                                  ? "badge-subscriber"
                                  : "badge-individual"
                              }`}
                            >
                              {u.isBlocked ? "BLOCKED" : u.isSubscriber ? "SUBSCRIBER" : "INDIVIDUAL"}
                            </span>
                          </td>

                          <td style={{ textAlign: "right" }}>
                            <div
                              className="um-action-wrap"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                className="um-menu-trigger"
                                onClick={() =>
                                  setOpenMenuId(openMenuId === u._id ? null : u._id)
                                }
                                title="User actions"
                              >
                                <MoreVertical size={15} />
                              </button>

                              {openMenuId === u._id && (
                                <div className="um-action-menu">
                                  <button
                                    type="button"
                                    className="um-action-item"
                                    onClick={() => {
                                      setSelected(u);
                                      setOpenMenuId(null);
                                    }}
                                  >
                                    <Eye size={14} /> View Profile
                                  </button>
                                  <button
                                    type="button"
                                    className="um-action-item"
                                    onClick={() => handleEditClick(u)}
                                  >
                                    <Pencil size={14} /> Edit User
                                  </button>
                                  <button
                                    type="button"
                                    className="um-action-item"
                                    onClick={() => handleToggleBlock(u._id)}
                                  >
                                    <Ban size={14} /> {u.isBlocked ? "Unblock User" : "Block User"}
                                  </button>
                                  <button
                                    type="button"
                                    className="um-action-item danger"
                                    onClick={() => handleDelete(u._id)}
                                  >
                                    <Trash2 size={14} /> Delete User
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════ TAB 2: LOGIN & OTP MONITOR ═══════════════════════ */}
      {activeTab === "monitor" && (
        <div className="content-box">
          {/* Live Health Banner */}
          <div className="um-health-banner">
            <div className="um-health-left">
              <div className="um-health-icon">
                <Radio size={18} />
              </div>
              <div>
                <div className="um-health-title">
                  <span className="um-live-dot" />
                  <span>Live User Inflow & OTP System Active</span>
                </div>
                <div className="um-health-sub">
                  Healthy: User logins, OTP verifications, and authenticated API sessions are actively recording.
                </div>
              </div>
            </div>

            <div className="um-health-right">
              <label className="um-autorefresh-label">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                />
                <span>Auto-refresh (20s)</span>
              </label>

              <button
                type="button"
                className="um-update-btn"
                onClick={() => fetchMonitorLogs(false)}
              >
                <RefreshCw size={14} className={monitorLoading ? "um-spin" : ""} />
                <span>Update Now</span>
              </button>
            </div>
          </div>

          {/* Search Logs */}
          <div className="search-row" style={{ marginBottom: 18 }}>
            <div className="search-field" style={{ maxWidth: 420, width: "100%" }}>
              <Search size={17} />
              <input
                placeholder="Filter logs by user name, phone, or email..."
                value={monitorSearch}
                onChange={(e) => setMonitorSearch(e.target.value)}
              />
            </div>
          </div>

          {monitorLoading && monitorLogs.length === 0 ? (
            <div className="empty-state">
              <p>
                <Loader size={20} className="um-spin" style={{ display: "inline-block", marginRight: 8 }} />
                Loading login & session logs...
              </p>
            </div>
          ) : (
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>USER</th>
                    <th>CONTACT (PHONE / EMAIL)</th>
                    <th>METHOD</th>
                    <th>PLATFORM</th>
                    <th>EXACT LOGIN TIME (IST)</th>
                    <th>GAP FROM PREVIOUS LOGIN</th>
                    <th>ACTIVITY / VISIT DURATION</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={8}>
                        <div className="empty-state">
                          <p>No login logs found</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log, idx) => {
                      const u = log.user || {};
                      const methodKey = (log.method || "OTP").toLowerCase();
                      const stayStr = formatDurationLabel(log.visitDurationSeconds);

                      return (
                        <tr key={log._id || idx}>
                          <td style={{ color: "var(--text-muted)", fontWeight: 700 }}>{idx + 1}</td>

                          <td>
                            <div className="user-cell">
                              <div className="u-avatar">
                                {u.profileImage ? (
                                  <img src={getImageUrl(u.profileImage)} alt={u.name} />
                                ) : (
                                  (u.name || "U")[0].toUpperCase()
                                )}
                              </div>
                              <span className="u-name">{u.name || "User"}</span>
                            </div>
                          </td>

                          <td>
                            <div className="um-phone-wrap">
                              <span>{formatPhoneDisplay(u.phone)}</span>
                              {u.phone && (
                                <button
                                  type="button"
                                  className="um-copy-btn"
                                  onClick={(e) => handleCopyPhone(e, `${log._id}-p`, u.phone)}
                                  title="Copy phone number"
                                >
                                  {copiedId === `${log._id}-p` ? (
                                    <Check size={13} color="#22c55e" />
                                  ) : (
                                    <Copy size={13} />
                                  )}
                                </button>
                              )}
                            </div>
                            {u.email && <div className="um-sub-text">{u.email}</div>}
                          </td>

                          <td>
                            <span className={`um-method-badge ${methodKey}`}>
                              <ShieldCheck size={12} />
                              {log.method || "OTP"}
                            </span>
                          </td>

                          <td>
                            <span className="um-platform-pill">
                              {log.platform === "WEB" ? (
                                <>
                                  <Globe size={14} style={{ color: "#38bdf8" }} />
                                  <span>WEB</span>
                                </>
                              ) : (
                                <>
                                  <Smartphone size={14} style={{ color: "#a78bfa" }} />
                                  <span>APP</span>
                                </>
                              )}
                            </span>
                          </td>

                          <td>
                            <div style={{ fontWeight: 700, fontSize: "0.84rem" }}>
                              {formatIstDateTime(log.loginAt)}
                            </div>
                            <div className="um-sub-text">{formatRelativeAgo(log.loginAt)}</div>
                          </td>

                          <td>
                            <span className="um-gap-pill">
                              {formatGapBadge(log.gapFromPrevSeconds)}
                            </span>
                          </td>

                          <td>
                            {log.isOnline ? (
                              <div>
                                <span className="um-online-pill">
                                  <span className="um-live-dot" />
                                  Online Now
                                </span>
                                {stayStr && <div className="um-sub-text">{stayStr}</div>}
                              </div>
                            ) : (
                              <div>
                                <div className="um-session-text">
                                  {stayStr ? `Session: ${stayStr}` : "Active session"}
                                </div>
                                <div className="um-sub-text">
                                  Last seen: {formatTodayOrDateTime(log.lastActiveAt)}
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════ VIEW USER MODAL ═══════════════════════ */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-box modal-box-view" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>
                <User size={20} style={{ display: "inline-block", marginRight: 8 }} /> User Profile
              </h3>
              <button className="modal-close" onClick={() => setSelected(null)}>
                <X size={24} />
              </button>
            </div>

            <div className="modal-body p-0">
              <div className="profile-hero">
                <div className="profile-hero-bg" />
                <div className="profile-hero-content">
                  <div className="u-avatar large">
                    {selected.profileImage ? (
                      <img src={getImageUrl(selected.profileImage)} alt={selected.name} />
                    ) : (
                      selected.name?.[0]?.toUpperCase() || "U"
                    )}
                  </div>
                  <div className="profile-hero-text">
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                      <h2 style={{ margin: 0 }}>{selected.name || "Unknown User"}</h2>
                      {selected.profileComplete && (
                        <span className="badge badge-active" style={{ fontSize: "0.65rem", padding: "2px 8px" }}>
                          ✓ VERIFIED
                        </span>
                      )}
                    </div>
                    <p>{selected.email || selected.phone}</p>
                    <span
                      className={`badge ${
                        selected.isBlocked
                          ? "badge-blocked"
                          : selected.isSubscriber
                          ? "badge-subscriber"
                          : "badge-individual"
                      }`}
                    >
                      {selected.isBlocked
                        ? "BLOCKED"
                        : selected.isSubscriber
                        ? "SUBSCRIBER"
                        : "INDIVIDUAL"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="profile-details-grid">
                <div className="p-detail-card">
                  <span className="p-detail-label">Full Name</span>
                  <span className="p-detail-value">{selected.name || "—"}</span>
                </div>
                <div className="p-detail-card">
                  <span className="p-detail-label">Phone Number</span>
                  <span className="p-detail-value mono">{formatPhoneDisplay(selected.phone)}</span>
                </div>
                <div className="p-detail-card">
                  <span className="p-detail-label">Email Address</span>
                  <span className="p-detail-value">{selected.email || "—"}</span>
                </div>
                <div className="p-detail-card">
                  <span className="p-detail-label">Last Activity</span>
                  <span className="p-detail-value">
                    {selected.isOnline
                      ? "Online Now"
                      : formatIstDateTime(selected.effectiveLastActive || selected.lastActiveAt || selected.createdAt)}
                  </span>
                </div>
                <div className="p-detail-card">
                  <span className="p-detail-label">Subscription Status</span>
                  <span className={`p-detail-value ${selected.isSubscriber ? "text-success" : "text-muted"}`}>
                    {selected.isSubscriber ? "Active Subscriber" : "Individual (Free)"}
                  </span>
                </div>
                <div className="p-detail-card">
                  <span className="p-detail-label">Account ID</span>
                  <span className="p-detail-value mono">{selected._id}</span>
                </div>
                <div className="p-detail-card">
                  <span className="p-detail-label">Member Since</span>
                  <span className="p-detail-value">
                    {selected.createdAt
                      ? formatIstDate(selected.createdAt)
                      : "—"}
                  </span>
                </div>
              </div>
            </div>

            <div className="modal-foot">
              <button className="btn btn-ghost" style={{ width: "100%" }} onClick={() => setSelected(null)}>
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════ ADD USER MODAL ═══════════════════════ */}
      {isAddOpen && (
        <div
          className="modal-overlay"
          onClick={() => {
            setIsAddOpen(false);
            resetForm();
          }}
        >
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>
                <User size={20} style={{ display: "inline-block", marginRight: 8 }} /> Add New User
              </h3>
              <button
                className="modal-close"
                onClick={() => {
                  setIsAddOpen(false);
                  resetForm();
                }}
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleAddSubmit}>
              <div className="modal-body">
                {formError && (
                  <div
                    style={{
                      color: "var(--red)",
                      background: "rgba(239, 68, 68, 0.1)",
                      padding: "10px 14px",
                      borderRadius: 6,
                      fontSize: "0.9rem",
                    }}
                  >
                    {formError}
                  </div>
                )}

                <div className="form-row">
                  <label className="form-label">Full Name</label>
                  <input
                    className="form-input"
                    placeholder="Enter full name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="form-row">
                  <label className="form-label">Phone Number *</label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        background: "var(--bg3)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-sm)",
                        padding: "0 12px",
                        color: "var(--text-soft)",
                        fontSize: "0.9rem",
                        fontWeight: "600",
                      }}
                    >
                      +91
                    </span>
                    <input
                      className="form-input"
                      style={{ flex: 1 }}
                      type="tel"
                      maxLength="10"
                      placeholder="99999 99999"
                      required
                      value={formData.phone}
                      onChange={(e) => {
                        const cleanVal = e.target.value.replace(/\D/g, "").slice(0, 10);
                        setFormData({ ...formData, phone: cleanVal });
                      }}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <label className="form-label">Email Address</label>
                  <input
                    className="form-input"
                    type="email"
                    placeholder="e.g. user@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div className="form-row">
                  <label className="form-label">Profile Image</label>
                  <input
                    className="form-input"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setProfileImageFile(e.target.files[0])}
                  />
                </div>
              </div>

              <div className="modal-foot">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setIsAddOpen(false);
                    resetForm();
                  }}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? "Creating..." : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════ EDIT USER MODAL ═══════════════════════ */}
      {isEditOpen && editUser && (
        <div
          className="modal-overlay"
          onClick={() => {
            setIsEditOpen(false);
            setEditUser(null);
            resetForm();
          }}
        >
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>
                <User size={20} style={{ display: "inline-block", marginRight: 8 }} /> Edit User
              </h3>
              <button
                className="modal-close"
                onClick={() => {
                  setIsEditOpen(false);
                  setEditUser(null);
                  resetForm();
                }}
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="modal-body">
                {formError && (
                  <div
                    style={{
                      color: "var(--red)",
                      background: "rgba(239, 68, 68, 0.1)",
                      padding: "10px 14px",
                      borderRadius: 6,
                      fontSize: "0.9rem",
                    }}
                  >
                    {formError}
                  </div>
                )}

                <div className="form-row">
                  <label className="form-label">Full Name</label>
                  <input
                    className="form-input"
                    placeholder="Enter full name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="form-row">
                  <label className="form-label">Phone Number *</label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        background: "var(--bg3)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-sm)",
                        padding: "0 12px",
                        color: "var(--text-soft)",
                        fontSize: "0.9rem",
                        fontWeight: "600",
                      }}
                    >
                      +91
                    </span>
                    <input
                      className="form-input"
                      style={{ flex: 1 }}
                      type="tel"
                      maxLength="10"
                      placeholder="99999 99999"
                      required
                      value={formData.phone}
                      onChange={(e) => {
                        const cleanVal = e.target.value.replace(/\D/g, "").slice(0, 10);
                        setFormData({ ...formData, phone: cleanVal });
                      }}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <label className="form-label">Email Address</label>
                  <input
                    className="form-input"
                    type="email"
                    placeholder="e.g. user@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div className="form-row">
                  <label className="form-label">Profile Image</label>
                  {editUser.profileImage && (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5 }}>
                      <img
                        src={getImageUrl(editUser.profileImage)}
                        alt="Current Profile"
                        style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }}
                      />
                      <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        Current Image
                      </span>
                    </div>
                  )}
                  <input
                    className="form-input"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setProfileImageFile(e.target.files[0])}
                  />
                </div>
              </div>

              <div className="modal-foot">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setIsEditOpen(false);
                    setEditUser(null);
                    resetForm();
                  }}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
