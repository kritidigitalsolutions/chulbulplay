import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Bell, Moon, Sun, X, Menu, User, LogOut, Mail, Shield, Clock } from "lucide-react";
import "./Topbar.css";
import API from "../api/axios";

// Type → colour mapping (matches Notifications page)
const TYPE_COLORS = {
  GENERAL: { bg: "rgba(100,116,139,0.2)", color: "#94a3b8" },
  SYSTEM: { bg: "rgba(59,130,246,0.2)", color: "#3b82f6" },
  PLAN: { bg: "rgba(139,92,246,0.2)", color: "#8b5cf6" },
  PROMOTIONAL: { bg: "rgba(245,158,11,0.2)", color: "#f59e0b" },
};

export default function Topbar({ theme, toggleTheme, toggleSidebar }) {
  const navigate = useNavigate();
  const [adminName, setAdminName] = useState("Admin");
  const [adminData, setAdminData] = useState(null);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);

  // ── Notification state ──────────────────────────────────────────────
  const [notifCount, setNotifCount] = useState(0);
  const [notifList, setNotifList] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const notifRef = useRef(null);

  // Dropdown + Modal states
  const [showMenu, setShowMenu] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  // ================= FETCH ADMIN =================
  useEffect(() => {
    fetchAdmin();
    fetchNotifications();

    // Poll every 60 s so count stays fresh
    const interval = setInterval(fetchNotifications, 60_000);
    return () => clearInterval(interval);
  }, []);

  const fetchAdmin = async () => {
    try {
      const res = await API.get("/admin/auth/profile");
      setAdminName(res.data.admin.name);
      setAdminData(res.data.admin);
    } catch (err) {
      console.error("Failed to fetch admin:", err);
    }
  };

  // ================= FETCH NOTIFICATIONS =================
  const fetchNotifications = async () => {
    try {
      setNotifLoading(true);
      const res = await API.get("/admin/notifications/");
      const data = res.data.data || [];
      setNotifList(data);
      setNotifCount(data.filter((n) => !n.isRead).length);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setNotifLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await API.patch(`/admin/notifications/${id}/read`);
      // Optimistically update local state to reflect it's read
      setNotifList((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setNotifCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark as read", err);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSearch = async (value) => {
    setSearch(value);

    if (!value) {
      setResults([]);
      return;
    }

    try {
      const res = await API.get(`/admin/search?q=${value}`);
      setResults(res.data.data);
    } catch (err) {
      console.error("Search error:", err);
    }
  };
  const handleSelect = (item) => {
    if (item.type === "User") {
      navigate("/dashboard/users");
    }
    else if (item.type === "Movie") {
      navigate("/dashboard/content");
    }
    else if (item.type === "Help") {
      navigate("/dashboard/help");
    }

    setSearch("");
    setResults([]);
  };

  // ================= LOGOUT =================
  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  // ================= CLOSE DROPDOWN =================
  useEffect(() => {
    const handleClickOutside = () => setShowMenu(false);
    window.addEventListener("click", handleClickOutside);

    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  return (
    <>
      <header className="topbar">
        {/* LEFT — Greeting */}
        <div className="topbar-left">
          <button className="mobile-menu-btn" onClick={toggleSidebar}>
            <Menu size={24} />
          </button>
          <div className="topbar-info">
            <h2 className="topbar-greeting">
              Welcome back,{" "}
              <span className="topbar-name">{adminName}</span> 👋
            </h2>
            <p className="topbar-date">
              {new Date().toLocaleDateString("en-IN", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </div>

        {/* RIGHT — Actions */}
        <div className="topbar-actions">
          {/* Search */}
          {/* <div className="topbar-search">
            <Search size={18} className="search-ico" />
            <input
              type="text"
              placeholder="Search anything..."
              value={search}
              // onChange={(e) => setSearch(e.target.value)}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div> */}
          <div className="topbar-search" style={{ position: "relative" }}>
            <Search size={18} className="search-ico" />

            <input
              type="text"
              placeholder="Search anything..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
            />

            {/* 🔥 SEARCH RESULTS */}
            {results.length > 0 && (
              <div className="search-dropdown">
                {results.map((item, i) => (
                  <div key={i} className="search-item" onClick={() => handleSelect(item)}>
                    <strong>{item.title || item.name}</strong>
                    <p style={{ fontSize: "12px", opacity: 0.7 }}>
                      {item.type}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Notification Bell ── */}
          <div className="notif-bell-wrap" ref={notifRef}>
            <button
              className={`action-btn notif-btn ${notifOpen ? "notif-btn-active" : ""}`}
              title="Notifications"
              onClick={() => setNotifOpen((o) => !o)}
            >
              <Bell size={20} />
              {notifCount > 0 && (
                <span className="notif-badge">
                  {notifCount > 99 ? "99+" : notifCount}
                </span>
              )}
            </button>

            {/* ── Dropdown panel ── */}
            {notifOpen && (
              <div className="notif-panel">
                {/* Header */}
                <div className="notif-panel-head">
                  <span className="notif-panel-title">
                    🔔 Notifications
                    {notifCount > 0 && (
                      <span className="notif-panel-count">{notifCount}</span>
                    )}
                  </span>
                  <button
                    className="notif-panel-close"
                    onClick={() => setNotifOpen(false)}
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* Body */}
                <div className="notif-panel-body">
                  {notifLoading ? (
                    <div className="notif-panel-empty">Loading…</div>
                  ) : notifList.filter(n => !n.isRead).length === 0 ? (
                    <div className="notif-panel-empty">
                      <span style={{ fontSize: "1.6rem" }}>🔔</span>
                      <p>No new notifications</p>
                    </div>
                  ) : (
                    notifList
                      .filter((n) => !n.isRead)
                      .slice(0, 5)
                      .map((n) => (
                        <div
                          key={n._id}
                          className="notif-panel-item"
                          onClick={() => markAsRead(n._id)}
                          style={{ cursor: "pointer" }}
                        >
                          <span
                            className="notif-panel-badge"
                            style={{
                              background: TYPE_COLORS[n.type]?.bg || TYPE_COLORS.GENERAL.bg,
                              color: TYPE_COLORS[n.type]?.color || TYPE_COLORS.GENERAL.color,
                            }}
                          >
                            {n.type || "GENERAL"}
                          </span>
                          <div className="notif-panel-text">
                            <p className="notif-panel-item-title" style={{ fontWeight: 600 }}>
                              {n.title}
                            </p>
                            <p className="notif-panel-item-date">
                              {new Date(n.createdAt || n.sentAt).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </p>
                          </div>
                        </div>
                      ))
                  )}
                </div>

                {/* Footer */}
                <div className="notif-panel-foot">
                  <button
                    className="notif-panel-view-all"
                    onClick={() => {
                      navigate("/dashboard/notifications");
                      setNotifOpen(false);
                    }}
                  >
                    View All Notifications →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Theme Toggle */}
          <button
            className={`theme-toggle ${theme}`}
            onClick={toggleTheme}
            title={`Switch to ${theme === "dark" ? "Light" : "Dark"} mode`}
          >
            <span className="toggle-track">
              <span className="toggle-thumb">
                {theme === "dark" ? <Moon size={16} /> : <Sun size={16} />}
              </span>
            </span>
            <span className="toggle-label">
              {theme === "dark" ? "Dark" : "Light"}
            </span>
          </button>

          {/* Avatar + Dropdown */}
          <div className="admin-menu">
            <div
              className="admin-avatar"
              title={adminName}
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
            >
              {adminName.charAt(0).toUpperCase()}
            </div>

            {showMenu && (
              <div className="dropdown-menu">
                <div
                  className="dropdown-item"
                  onClick={() => {
                    setShowProfile(true);
                    setShowMenu(false);
                  }}
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <User size={16} /> View Profile
                </div>

                <div
                  className="dropdown-item logout"
                  onClick={handleLogout}
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <LogOut size={16} /> Logout
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ================= PROFILE MODAL ================= */}
      {showProfile && (
        <div
          className="profile-overlay"
          onClick={() => setShowProfile(false)}
        >
          <div
            className="profile-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="profile-header">
              <h2>Admin Panel Profile</h2>
              <button
                className="profile-close-btn"
                onClick={() => setShowProfile(false)}
                aria-label="Close Profile"
              >
                <X size={16} />
              </button>
            </div>

            <div className="profile-body">
              {/* Avatar Frame with pulsing ring & status badge */}
              <div className="profile-avatar-wrapper">
                <div className="profile-avatar-glow" />
                <div className="profile-avatar">
                  {adminName.charAt(0).toUpperCase()}
                </div>
                <div className="profile-status-badge">
                  <span className="pulse-dot" />
                  ONLINE
                </div>
              </div>

              <h3 className="profile-name">{adminData?.name || "System Admin"}</h3>
              <div className="profile-role-pill">
                {adminData?.role || "SUPER ADMIN"}
              </div>

              {/* Grid of info cards */}
              <div className="profile-info-grid">
                <div className="profile-info-card">
                  <div className="info-card-icon-wrapper">
                    <Mail size={18} />
                  </div>
                  <div className="info-card-content">
                    <span className="info-card-label">Email Address</span>
                    <span className="info-card-value">{adminData?.email || "chulbulplay@gmail.com"}</span>
                  </div>
                </div>

                <div className="profile-info-card">
                  <div className="info-card-icon-wrapper">
                    <Shield size={18} />
                  </div>
                  <div className="info-card-content">
                    <span className="info-card-label">Access Level</span>
                    <span className="info-card-value">Full Permissions</span>
                  </div>
                </div>

                <div className="profile-info-card">
                  <div className="info-card-icon-wrapper">
                    <Clock size={18} />
                  </div>
                  <div className="info-card-content">
                    <span className="info-card-label">Last Login</span>
                    <span className="info-card-value">Current Session</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
