import { useState, useEffect, useCallback, useRef } from "react";
import {
  Bell,
  Send,
  X,
  Trash2,
  Eye,
  RefreshCw,
  Upload,
  Link2,
  Search,
  Film,
  Tv,
  Crown,
  Check,
  ArrowRight,
  Image as ImageIcon,
} from "lucide-react";
import API, { BASE_URL } from "../api/axios";
import "./Dashboard.css";
import "./Notifications.css";

// ── Type badge colours ─────────────────────────────────────────────────────
const TYPE_COLORS = {
  CONTENT:     { bg: "rgba(59,130,246,0.16)",  color: "#60a5fa" },
  GENERAL:     { bg: "rgba(100,116,139,0.16)", color: "#94a3b8" },
  SYSTEM:      { bg: "rgba(14,165,233,0.16)",  color: "#38bdf8" },
  PLAN:        { bg: "rgba(139,92,246,0.16)",  color: "#a78bfa" },
  PROMOTIONAL: { bg: "rgba(245,158,11,0.16)",  color: "#f59e0b" },
};

const EMPTY_FORM = {
  title:          "",
  message:        "",
  type:           "CONTENT",
  sendTo:         "All Users",
  userSearch:     "",
  actionUrl:      "",
  imageUrl:       "",
  attachmentType: "NONE", // "NONE" | "CONTENT" | "PLAN"
};

// ── sendTo value → backend targetUserType mapping ─────────────────────────
const SEND_TO_MAP = {
  "All Users":        "ALL",
  "Subscribers Only": "SUBSCRIBERS",
  "Specific User":    "SPECIFIC_USER",
};

// ── Helper: resolve display target from a notification doc ─────────────────
const resolveTarget = (n) => {
  if (n.targetUser)     return n.targetUser?.name || n.targetUser?.email || "Specific User";
  if (n.targetUserType) return n.targetUserType === "ALL" ? "All Users" : n.targetUserType;
  return "All Users";
};

// ── Helper: resolve media URL ──────────────────────────────────────────────
const getMediaFullUrl = (url) => {
  if (!url) return "";
  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:") ||
    url.startsWith("blob:")
  ) {
    return url;
  }
  return `${BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
};

export default function NotificationsPage() {
  const [form, setForm]                   = useState(EMPTY_FORM);
  const [loading, setLoading]             = useState(false);
  const [fetching, setFetching]           = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats]                 = useState({ totalSent: 0, delivered: 0, failed: 0 });

  // Users for Specific User dropdown
  const [users, setUsers]               = useState([]);
  const [userDropOpen, setUserDropOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Image upload / URL state
  const [imageMode, setImageMode]       = useState("system"); // "system" | "url"
  const [imageFile, setImageFile]       = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const fileInputRef                    = useRef(null);

  // Content & Plan attachments state
  const [allContent, setAllContent]           = useState([]);
  const [allPlans, setAllPlans]               = useState([]);
  const [contentSearch, setContentSearch]     = useState("");
  const [planSearch, setPlanSearch]           = useState("");
  const [attachedContent, setAttachedContent] = useState(null);
  const [attachedPlan, setAttachedPlan]       = useState(null);

  // UI feedback
  const [toast, setToast]         = useState(null);
  const [viewNotif, setViewNotif] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3400);
  };

  // ── Fetch notifications ───────────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    setFetching(true);
    try {
      const res = await API.get("/admin/notifications/");
      const list = res.data.data || [];
      setNotifications(list);
      if (res.data.stats) {
        setStats(res.data.stats);
      } else {
        const delivered = list.reduce((sum, n) => sum + (n.pushStats?.delivered || 0), 0);
        const failed = list.reduce((sum, n) => sum + (n.pushStats?.failed || 0), 0);
        setStats({ totalSent: list.length, delivered, failed });
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to load notifications.", "error");
    } finally {
      setFetching(false);
    }
  }, []);

  // ── Fetch users, content & plans ──────────────────────────────────────
  const fetchSupportData = useCallback(async () => {
    try {
      const [usersRes, contentRes, plansRes] = await Promise.allSettled([
        API.get("/admin/users"),
        API.get("/admin/content/all"),
        API.get("/admin/plan"),
      ]);

      if (usersRes.status === "fulfilled") {
        setUsers(usersRes.value.data.users || usersRes.value.data.data || []);
      }
      if (contentRes.status === "fulfilled") {
        setAllContent(contentRes.value.data.content || []);
      }
      if (plansRes.status === "fulfilled") {
        setAllPlans(plansRes.value.data.plans || []);
      }
    } catch {
      // Non-critical fallback
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    fetchSupportData();
  }, [fetchNotifications, fetchSupportData]);

  // Clean up object URL on unmount/change
  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const ch = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // ── Handle image file pick ────────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("Please select a valid image file.", "error");
      return;
    }
    if (imagePreview && imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    if (imagePreview && imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }
    setImageFile(null);
    setImagePreview("");
    setForm((prev) => ({ ...prev, imageUrl: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Handle Attachment Type switch ─────────────────────────────────────
  const handleAttachmentTypeChange = (nextType) => {
    setForm((prev) => ({
      ...prev,
      attachmentType: nextType,
      type:
        nextType === "CONTENT"
          ? "CONTENT"
          : nextType === "PLAN"
          ? "PLAN"
          : prev.type,
    }));
    if (nextType !== "CONTENT") setAttachedContent(null);
    if (nextType !== "PLAN") setAttachedPlan(null);
  };

  // ── Filtered lists ────────────────────────────────────────────────────
  const filteredUsers = users.filter(
    (u) =>
      (u.name  || "").toLowerCase().includes(form.userSearch.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(form.userSearch.toLowerCase()) ||
      (u.phone || "").includes(form.userSearch)
  );

  const filteredContent = allContent.filter((c) => {
    if (!contentSearch.trim()) return true;
    const q = contentSearch.toLowerCase();
    return (
      (c.title || "").toLowerCase().includes(q) ||
      (c.contentType || "").toLowerCase().includes(q) ||
      (Array.isArray(c.genre) && c.genre.some((g) => g.toLowerCase().includes(q)))
    );
  });

  const filteredPlans = allPlans.filter((p) => {
    if (!planSearch.trim()) return true;
    const q = planSearch.toLowerCase();
    return (
      (p.name || "").toLowerCase().includes(q) ||
      (p.platform || "").toLowerCase().includes(q) ||
      (p.planType || "").toLowerCase().includes(q)
    );
  });

  // ── Send notification ─────────────────────────────────────────────────
  const handleSend = async (e) => {
    e.preventDefault();

    if (!form.title.trim() || !form.message.trim()) {
      showToast("Please fill in notification title and message.", "error");
      return;
    }
    if (form.sendTo === "Specific User" && !selectedUser) {
      showToast("Please select a specific user.", "error");
      return;
    }
    if (form.attachmentType === "CONTENT" && !attachedContent) {
      showToast("Please select a content item to attach (or switch Attachment Type to None).", "error");
      return;
    }
    if (form.attachmentType === "PLAN" && !attachedPlan) {
      showToast("Please select a subscription plan to attach (or switch Attachment Type to None).", "error");
      return;
    }

    setLoading(true);
    try {
      const resolvedSendTo = SEND_TO_MAP[form.sendTo] || "ALL";

      if (imageMode === "system" && imageFile) {
        const formData = new FormData();
        formData.append("title", form.title.trim());
        formData.append("message", form.message.trim());
        formData.append("type", form.type);
        formData.append("sendTo", resolvedSendTo);
        formData.append("attachmentType", form.attachmentType);
        if (form.actionUrl.trim()) {
          formData.append("actionUrl", form.actionUrl.trim());
        }
        if (form.sendTo === "Specific User" && selectedUser) {
          formData.append("targetUser", selectedUser._id || selectedUser.id);
        }
        if (form.attachmentType === "CONTENT" && attachedContent) {
          formData.append("contentId", attachedContent._id);
          formData.append("contentType", attachedContent.contentType);
        }
        if (form.attachmentType === "PLAN" && attachedPlan) {
          formData.append("planId", attachedPlan._id);
        }
        formData.append("image", imageFile);

        await API.post("/admin/notifications/send", formData);
      } else {
        const finalImageUrl = imageMode === "url" ? form.imageUrl.trim() : "";
        const payload = {
          title:          form.title.trim(),
          message:        form.message.trim(),
          type:           form.type,
          sendTo:         resolvedSendTo,
          image:          finalImageUrl || undefined,
          attachmentType: form.attachmentType,
          actionUrl:      form.actionUrl.trim() || undefined,
          ...(form.sendTo === "Specific User" && selectedUser
            ? { targetUser: selectedUser._id || selectedUser.id }
            : {}),
          ...(form.attachmentType === "CONTENT" && attachedContent
            ? {
                contentId: attachedContent._id,
                contentType: attachedContent.contentType,
              }
            : {}),
          ...(form.attachmentType === "PLAN" && attachedPlan
            ? { planId: attachedPlan._id }
            : {}),
        };

        await API.post("/admin/notifications/send", payload);
      }

      showToast("Notification sent successfully!");
      handleClear();
      fetchNotifications();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to send notification.", "error");
    } finally {
      setLoading(false);
    }
  };

  // ── Clear form ────────────────────────────────────────────────────────
  const handleClear = () => {
    setForm(EMPTY_FORM);
    setSelectedUser(null);
    setAttachedContent(null);
    setAttachedPlan(null);
    setContentSearch("");
    setPlanSearch("");
    clearImage();
    setImageMode("system");
  };

  // ── Delete notification ───────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this notification?")) return;
    try {
      await API.delete(`/admin/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      showToast("Notification deleted.");
    } catch (err) {
      showToast(err.response?.data?.message || "Delete failed.", "error");
    }
  };

  // ── View notification & Mark as Read ──────────────────────────────────
  const handleView = async (notif) => {
    setViewNotif(notif);
    if (!notif.isRead) {
      try {
        await API.patch(`/admin/notifications/${notif._id}/read`);
        setNotifications((prev) =>
          prev.map((n) => (n._id === notif._id ? { ...n, isRead: true } : n))
        );
      } catch (err) {
        console.error("Failed to mark as read", err);
      }
    }
  };

  return (
    <div className="add-content-page notif-page">

      {/* ── Toast ── */}
      {toast && <div className={`notif-toast ${toast.type}`}>{toast.msg}</div>}

      {/* ── Header ── */}
      <div className="pg-header">
        <div>
          <h1 className="pg-title">
            <span className="pg-title-icon"><Bell size={24} /></span>
            Notifications
          </h1>
          <p className="pg-sub">Send and manage user notifications</p>
        </div>

        <div className="notif-stats-row">
          <div className="notif-stat-chip">
            <span className="notif-stat-val">{stats.totalSent}</span>
            <span className="notif-stat-lbl">Total Sent</span>
          </div>
          <div className="notif-stat-chip s-green">
            <span className="notif-stat-val">{stats.delivered}</span>
            <span className="notif-stat-lbl">Delivered</span>
          </div>
          <div className="notif-stat-chip s-red">
            <span className="notif-stat-val">{stats.failed}</span>
            <span className="notif-stat-lbl">Failed</span>
          </div>
          <button
            type="button"
            className="notif-header-refresh"
            onClick={fetchNotifications}
            title="Refresh notifications"
          >
            <RefreshCw size={16} className={fetching ? "notif-spin-icon" : ""} />
          </button>
        </div>
      </div>

      {/* ═══════════════════════ SEND FORM ═══════════════════════ */}
      <form onSubmit={handleSend}>
        <div className="form-card notif-card">
          <h3 className="notif-section-title">
            <span className="notif-card-icon"><Send size={15} /></span>
            SEND NOTIFICATION
          </h3>

          {/* Notification Title */}
          <div className="notif-field-group">
            <label className="notif-label">
              Notification Title <span className="notif-req">*</span>
            </label>
            <input
              className="form-input-styled notif-input"
              name="title"
              placeholder="Now Streaming: Content"
              value={form.title}
              onChange={ch}
            />
          </div>

          {/* Message */}
          <div className="notif-field-group">
            <label className="notif-label">
              Message <span className="notif-req">*</span>
            </label>
            <textarea
              className="form-input-styled notif-input notif-textarea"
              name="message"
              placeholder="Watch Content now in 4K Ultra HD on ChulbulPlay!"
              value={form.message}
              onChange={ch}
              rows={4}
            />
          </div>

          {/* Notification Image */}
          <div className="notif-field-group">
            <label className="notif-label">
              Notification Image
              <span className="notif-optional">[Optional - Upload system image or enter URL]</span>
            </label>

            <div className="notif-img-mode-row">
              <button
                type="button"
                className={`notif-mode-btn ${imageMode === "system" ? "active" : ""}`}
                onClick={() => setImageMode("system")}
              >
                <Upload size={14} />
                Upload from System
              </button>
              <button
                type="button"
                className={`notif-mode-btn ${imageMode === "url" ? "active" : ""}`}
                onClick={() => setImageMode("url")}
              >
                <Link2 size={14} />
                Enter Image URL
              </button>
            </div>

            {imageMode === "system" ? (
              <>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  hidden
                  onChange={handleFileChange}
                />

                {!imageFile ? (
                  <div
                    className="notif-dropzone"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="notif-dropzone-left">
                      <ImageIcon size={18} />
                      <span>Click to select banner/poster image from your system...</span>
                    </div>
                    <span className="notif-browse-btn">Browse File</span>
                  </div>
                ) : (
                  <div className="notif-img-preview-box">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="notif-img-preview-thumb"
                    />
                    <div className="notif-img-preview-meta">
                      <div className="notif-img-preview-name">{imageFile.name}</div>
                      <div className="notif-img-preview-sub">
                        {(imageFile.size / 1024).toFixed(1)} KB · Ready to upload
                      </div>
                    </div>
                    <button
                      type="button"
                      className="notif-browse-btn"
                      onClick={() => fileInputRef.current?.click()}
                      style={{ cursor: "pointer" }}
                    >
                      Change
                    </button>
                    <button
                      type="button"
                      className="notif-img-remove-btn"
                      onClick={clearImage}
                    >
                      <X size={13} />
                      Remove
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div>
                <input
                  className="form-input-styled notif-input"
                  name="imageUrl"
                  placeholder="https://example.com/banner-image.jpg"
                  value={form.imageUrl}
                  onChange={ch}
                />
                {form.imageUrl.trim() && (
                  <div className="notif-img-preview-box">
                    <img
                      src={getMediaFullUrl(form.imageUrl)}
                      alt="URL Preview"
                      className="notif-img-preview-thumb"
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                    <div className="notif-img-preview-meta">
                      <div className="notif-img-preview-name">{form.imageUrl}</div>
                      <div className="notif-img-preview-sub">External Image URL</div>
                    </div>
                    <button
                      type="button"
                      className="notif-img-remove-btn"
                      onClick={() => setForm((prev) => ({ ...prev, imageUrl: "" }))}
                    >
                      <X size={13} />
                      Clear
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Type + Send To */}
          <div className="notif-2col">
            <div className="notif-field-group">
              <label className="notif-label">Type</label>
              <select
                className="form-input-styled notif-input notif-select"
                name="type"
                value={form.type}
                onChange={ch}
              >
                <option value="CONTENT">CONTENT ALERT (Movies & Shows)</option>
                <option value="PLAN">SUBSCRIPTION PLAN (Offers & Plans)</option>
                <option value="GENERAL">GENERAL</option>
                <option value="SYSTEM">SYSTEM</option>
                <option value="PROMOTIONAL">PROMOTIONAL</option>
              </select>
            </div>

            <div className="notif-field-group">
              <label className="notif-label">Send To</label>
              <select
                className="form-input-styled notif-input notif-select"
                name="sendTo"
                value={form.sendTo}
                onChange={(e) => {
                  ch(e);
                  setSelectedUser(null);
                  setUserDropOpen(false);
                }}
              >
                <option value="All Users">All Users</option>
                <option value="Subscribers Only">Subscribers Only</option>
                <option value="Specific User">Specific User</option>
              </select>
            </div>
          </div>

          {/* Specific User search (conditional) */}
          {form.sendTo === "Specific User" && (
            <div className="notif-field-group notif-fade-in">
              <label className="notif-label">Search User</label>
              <div className="notif-user-search-wrap">
                <input
                  className="form-input-styled notif-input"
                  name="userSearch"
                  placeholder="Search by name / email / phone"
                  value={selectedUser ? (selectedUser.name || selectedUser.email) : form.userSearch}
                  onChange={(e) => {
                    if (selectedUser) setSelectedUser(null);
                    setForm({ ...form, userSearch: e.target.value });
                    setUserDropOpen(true);
                  }}
                  onFocus={() => setUserDropOpen(true)}
                  autoComplete="off"
                />
                {selectedUser && (
                  <button
                    type="button"
                    className="notif-user-clear"
                    onClick={() => {
                      setSelectedUser(null);
                      setForm({ ...form, userSearch: "" });
                    }}
                  >
                    <X size={14} />
                  </button>
                )}

                {userDropOpen && !selectedUser && (
                  <div className="notif-user-dropdown">
                    {filteredUsers.length === 0 ? (
                      <div className="notif-user-empty">No users found</div>
                    ) : (
                      filteredUsers.map((u) => (
                        <div
                          key={u._id || u.id}
                          className="notif-user-option"
                          onMouseDown={() => {
                            setSelectedUser(u);
                            setUserDropOpen(false);
                            setForm({ ...form, userSearch: u.name || u.email });
                          }}
                        >
                          <div className="notif-user-avatar">
                            {(u.name || u.email || "?").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="notif-user-name">{u.name || "—"}</div>
                            <div className="notif-user-meta">
                              {u.email}
                              {u.phone ? ` · ${u.phone}` : ""}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Attachment Type */}
          <div className="notif-field-group">
            <label className="notif-label">Attachment Type</label>
            <div className="notif-radio-row">
              {[
                { key: "NONE", label: "None" },
                { key: "CONTENT", label: "Content" },
                { key: "PLAN", label: "Subscription Plan" },
              ].map((opt) => {
                const isSelected = form.attachmentType === opt.key;
                return (
                  <div
                    key={opt.key}
                    className={`notif-radio-option ${isSelected ? "active" : ""}`}
                    onClick={() => handleAttachmentTypeChange(opt.key)}
                  >
                    <span className="notif-radio-circle">
                      <span className="notif-radio-dot" />
                    </span>
                    <span>{opt.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Conditional Content Attachment Panel ── */}
          {form.attachmentType === "CONTENT" && (
            <div className="notif-attach-panel">
              <div className="notif-attach-head">
                <div className="notif-attach-title">
                  <Film size={15} />
                  <span>SELECT CONTENT ATTACHMENT</span>
                </div>
              </div>

              {attachedContent && (
                <div className="notif-attached-summary">
                  <div className="notif-attach-item-left">
                    {attachedContent.poster || attachedContent.banner ? (
                      <img
                        src={getMediaFullUrl(attachedContent.poster || attachedContent.banner)}
                        alt={attachedContent.title}
                        className="notif-attach-thumb"
                      />
                    ) : (
                      <div className="notif-attach-thumb-placeholder">
                        {attachedContent.contentType === "series" ? <Tv size={16} /> : <Film size={16} />}
                      </div>
                    )}
                    <div>
                      <div className="notif-attach-name">{attachedContent.title}</div>
                      <div className={`notif-attach-sub ${attachedContent.contentType}`}>
                        <span>✓ Attached · {attachedContent.contentType === "series" ? "Web Series" : "Movie"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="notif-attached-actions">
                    {(attachedContent.banner || attachedContent.poster) && (
                      <button
                        type="button"
                        className="notif-use-poster-btn"
                        onClick={() => {
                          const posterUrl = getMediaFullUrl(attachedContent.banner || attachedContent.poster);
                          setImageMode("url");
                          setImageFile(null);
                          setImagePreview("");
                          setForm((prev) => ({ ...prev, imageUrl: posterUrl }));
                          showToast("Content poster applied as notification image!");
                        }}
                      >
                        Use Poster as Image
                      </button>
                    )}
                    <button
                      type="button"
                      className="notif-img-remove-btn"
                      onClick={() => setAttachedContent(null)}
                    >
                      <X size={13} />
                      Detach
                    </button>
                  </div>
                </div>
              )}

              <div className="notif-attach-search">
                <Search size={15} />
                <input
                  type="text"
                  placeholder="Search movies, series, tv shows, short films..."
                  value={contentSearch}
                  onChange={(e) => setContentSearch(e.target.value)}
                />
              </div>

              <div className="notif-attach-list">
                {filteredContent.length === 0 ? (
                  <div className="notif-user-empty">No matching movies or series found.</div>
                ) : (
                  filteredContent.map((item) => {
                    const isSelected = attachedContent?._id === item._id;
                    const isSeries = item.contentType === "series";
                    const thumb = getMediaFullUrl(item.poster || item.banner);

                    return (
                      <div
                        key={item._id}
                        className={`notif-attach-item ${isSelected ? "selected" : ""}`}
                        onClick={() => setAttachedContent(item)}
                      >
                        <div className="notif-attach-item-left">
                          {thumb ? (
                            <img src={thumb} alt={item.title} className="notif-attach-thumb" />
                          ) : (
                            <div className="notif-attach-thumb-placeholder">
                              {isSeries ? <Tv size={16} /> : <Film size={16} />}
                            </div>
                          )}
                          <div>
                            <div className="notif-attach-name">{item.title}</div>
                            <div className={`notif-attach-sub ${isSeries ? "series" : "movie"}`}>
                              <span>{isSeries ? "Web Series" : "Movie"}</span>
                              {item.releaseYear && (
                                <span style={{ color: "var(--text-muted)" }}>· {item.releaseYear}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          className={`notif-attach-btn ${isSelected ? "attached" : ""}`}
                        >
                          {isSelected ? (
                            <>
                              <Check size={14} />
                              Attached
                            </>
                          ) : (
                            <>
                              <span>Attach</span>
                              <ArrowRight size={14} />
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ── Conditional Plan Attachment Panel ── */}
          {form.attachmentType === "PLAN" && (
            <div className="notif-attach-panel">
              <div className="notif-attach-head">
                <div className="notif-attach-title">
                  <Crown size={15} />
                  <span>SELECT SUBSCRIPTION PLAN ATTACHMENT</span>
                </div>
              </div>

              {attachedPlan && (
                <div className="notif-attached-summary">
                  <div className="notif-attach-item-left">
                    <div className="notif-plan-icon-box">
                      <Crown size={18} />
                    </div>
                    <div>
                      <div className="notif-attach-name">{attachedPlan.name}</div>
                      <div className="notif-attach-sub">
                        <span>
                          ✓ Attached · ₹{attachedPlan.price} / {attachedPlan.duration} days (
                          {attachedPlan.platform === "website" ? "Website Plan" : "App Plan"})
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="notif-img-remove-btn"
                    onClick={() => setAttachedPlan(null)}
                  >
                    <X size={13} />
                    Detach
                  </button>
                </div>
              )}

              <div className="notif-attach-search">
                <Search size={15} />
                <input
                  type="text"
                  placeholder="Search subscription plans (name, platform, type)..."
                  value={planSearch}
                  onChange={(e) => setPlanSearch(e.target.value)}
                />
              </div>

              <div className="notif-attach-list">
                {filteredPlans.length === 0 ? (
                  <div className="notif-user-empty">No subscription plans found.</div>
                ) : (
                  filteredPlans.map((plan) => {
                    const isSelected = attachedPlan?._id === plan._id;
                    return (
                      <div
                        key={plan._id}
                        className={`notif-attach-item ${isSelected ? "selected" : ""}`}
                        onClick={() => setAttachedPlan(plan)}
                      >
                        <div className="notif-attach-item-left">
                          <div className="notif-plan-icon-box">
                            <Crown size={18} />
                          </div>
                          <div>
                            <div className="notif-attach-name">{plan.name}</div>
                            <div className="notif-attach-sub">
                              <span>
                                ₹{plan.price} · {plan.duration} Days ·{" "}
                                {plan.platform === "website" ? "Website Plan" : "App Plan"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          className={`notif-attach-btn ${isSelected ? "attached" : ""}`}
                        >
                          {isSelected ? (
                            <>
                              <Check size={14} />
                              Attached
                            </>
                          ) : (
                            <>
                              <span>Attach</span>
                              <ArrowRight size={14} />
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Action URL */}
          <div className="notif-field-group">
            <label className="notif-label">
              Action URL{" "}
              <span className="notif-optional">
                (optional — auto-filled if Content or Plan is attached)
              </span>
            </label>
            <input
              className="form-input-styled notif-input"
              name="actionUrl"
              placeholder="/plans or /series/lalla"
              value={form.actionUrl}
              onChange={ch}
            />
          </div>

          {/* Buttons */}
          <div className="notif-btn-row">
            <button
              type="submit"
              className="btn-lg notif-send-btn"
              disabled={loading}
            >
              {loading ? <span className="notif-spinner" /> : <Send size={16} />}
              {loading ? "Sending..." : "Send Notification"}
            </button>

            <button
              type="button"
              className="btn notif-clear-btn"
              onClick={handleClear}
            >
              <X size={15} />
              Clear
            </button>
          </div>
        </div>
      </form>

      {/* ═══════════════════════ RECENT TABLE ═══════════════════════ */}
      <div className="content-box">
        <h3>
          <span className="notif-card-icon" style={{ color: "var(--orange)" }}>
            <Bell size={16} />
          </span>
          Recent Notifications
          <span className="notif-count-badge">{notifications.length}</span>

          <button
            className="icon-btn view"
            title="Refresh"
            onClick={fetchNotifications}
            style={{ marginLeft: "auto" }}
            type="button"
          >
            <RefreshCw size={14} className={fetching ? "notif-spin-icon" : ""} />
          </button>
        </h3>

        <div className="tbl-wrap">
          {fetching ? (
            <div className="empty-state">
              <span className="notif-spinner" style={{ margin: "0 auto" }} />
              <p style={{ marginTop: 14 }}>Loading notifications…</p>
            </div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Notification</th>
                  <th>Type</th>
                  <th>Target</th>
                  <th>Delivery</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {notifications.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="empty-state">
                        <div style={{ fontSize: "2rem" }}>🔔</div>
                        <p>No notifications sent yet</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  notifications.map((n) => {
                    const attType = n.attachmentType || n.metadata?.attachmentType || "NONE";
                    const thumbUrl = n.image || n.metadata?.contentPoster || "";

                    return (
                      <tr
                        key={n._id}
                        style={{
                          opacity: n.isRead ? 0.8 : 1,
                          background: !n.isRead ? "rgba(255,255,255,0.02)" : "transparent",
                        }}
                      >
                        <td>
                          <div className="notif-table-title-wrap">
                            {thumbUrl && (
                              <img
                                src={getMediaFullUrl(thumbUrl)}
                                alt=""
                                className="notif-table-thumb"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                }}
                              />
                            )}
                            <div>
                              <span
                                className="notif-row-title"
                                style={{ fontWeight: !n.isRead ? "700" : "500" }}
                              >
                                {n.title}
                              </span>
                              {attType === "CONTENT" && n.metadata?.contentTitle && (
                                <span className="notif-att-chip content">
                                  🎬 {n.metadata.contentType === "series" ? "Series" : "Movie"}:{" "}
                                  {n.metadata.contentTitle}
                                </span>
                              )}
                              {attType === "PLAN" && n.metadata?.planName && (
                                <span className="notif-att-chip plan">
                                  👑 Plan: {n.metadata.planName}
                                  {n.metadata.planPrice !== null ? ` (₹${n.metadata.planPrice})` : ""}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td>
                          <span
                            className="badge"
                            style={{
                              background: TYPE_COLORS[n.type]?.bg || TYPE_COLORS.GENERAL.bg,
                              color: TYPE_COLORS[n.type]?.color || TYPE_COLORS.GENERAL.color,
                            }}
                          >
                            {n.type || "GENERAL"}
                          </span>
                        </td>

                        <td>
                          <span className="notif-target">{resolveTarget(n)}</span>
                        </td>

                        <td>
                          <div className="notif-push-mini">
                            <span className="ok">✓ {n.pushStats?.delivered || 0}</span>
                            <span className="err">✕ {n.pushStats?.failed || 0}</span>
                          </div>
                        </td>

                        <td>
                          <span className="notif-date">
                            {new Date(n.createdAt || n.sentAt).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`badge ${n.isRead ? "" : "badge-active"}`}
                            style={{
                              background: n.isRead
                                ? "rgba(100,116,139,0.15)"
                                : "rgba(16, 185, 129, 0.15)",
                              color: n.isRead ? "#94a3b8" : "#10b981",
                            }}
                          >
                            {n.isRead ? "Read" : "Unread"}
                          </span>
                        </td>

                        <td>
                          <div className="tbl-actions" style={{ justifyContent: "center" }}>
                            <button
                              className="icon-btn view"
                              title="View Details"
                              type="button"
                              onClick={() => handleView(n)}
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              className="icon-btn del"
                              title="Delete"
                              type="button"
                              onClick={() => handleDelete(n._id)}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── View Detail Modal ── */}
      {viewNotif && (
        <div className="profile-overlay" onClick={() => setViewNotif(null)}>
          <div
            className="profile-card notif-view-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ width: "460px", maxWidth: "95vw", padding: 0 }}
          >
            <div
              className="profile-header"
              style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}
            >
              <h2 style={{ fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "8px" }}>
                🔔 Notification Details
              </h2>
              <button className="close-btn" onClick={() => setViewNotif(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="profile-body" style={{ padding: "20px", textAlign: "left", marginTop: 0 }}>
              {viewNotif.image && (
                <img
                  src={getMediaFullUrl(viewNotif.image)}
                  alt=""
                  className="notif-modal-banner"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              )}

              <div style={{ marginBottom: "14px" }}>
                <span
                  className="badge"
                  style={{
                    background: TYPE_COLORS[viewNotif.type]?.bg || TYPE_COLORS.GENERAL.bg,
                    color: TYPE_COLORS[viewNotif.type]?.color || TYPE_COLORS.GENERAL.color,
                    marginBottom: "8px",
                    display: "inline-block",
                  }}
                >
                  {viewNotif.type || "GENERAL"}
                </span>
                <h3 style={{ fontSize: "1.15rem", margin: "4px 0", lineHeight: 1.3 }}>
                  {viewNotif.title}
                </h3>
                <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", marginTop: "4px" }}>
                  Sent on{" "}
                  {new Date(viewNotif.createdAt || viewNotif.sentAt).toLocaleString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>

              <div
                style={{
                  background: "var(--bg)",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                  fontSize: "0.92rem",
                  lineHeight: 1.5,
                  whiteSpace: "pre-wrap",
                  marginBottom: "16px",
                }}
              >
                {viewNotif.message}
              </div>

              {/* Attached Content Summary */}
              {(viewNotif.attachmentType === "CONTENT" ||
                viewNotif.metadata?.attachmentType === "CONTENT") &&
                viewNotif.metadata?.contentTitle && (
                  <div className="notif-modal-att-card">
                    {viewNotif.metadata.contentPoster && (
                      <img
                        src={getMediaFullUrl(viewNotif.metadata.contentPoster)}
                        alt={viewNotif.metadata.contentTitle}
                        className="notif-attach-thumb"
                      />
                    )}
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "#60a5fa", fontWeight: 700 }}>
                        ATTACHED {viewNotif.metadata.contentType?.toUpperCase() || "CONTENT"}
                      </div>
                      <div className="notif-attach-name">{viewNotif.metadata.contentTitle}</div>
                      <div style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>
                        ID: {viewNotif.metadata.contentId}
                      </div>
                    </div>
                  </div>
                )}

              {/* Attached Plan Summary */}
              {(viewNotif.attachmentType === "PLAN" ||
                viewNotif.metadata?.attachmentType === "PLAN") &&
                viewNotif.metadata?.planName && (
                  <div className="notif-modal-att-card">
                    <div className="notif-plan-icon-box">
                      <Crown size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "#a78bfa", fontWeight: 700 }}>
                        ATTACHED SUBSCRIPTION PLAN
                      </div>
                      <div className="notif-attach-name">{viewNotif.metadata.planName}</div>
                      <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                        ₹{viewNotif.metadata.planPrice} · {viewNotif.metadata.planDuration} Days (
                        {viewNotif.metadata.planPlatform})
                      </div>
                    </div>
                  </div>
                )}

              <div
                className="notif-detail-grid"
                style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}
              >
                <div>
                  <span
                    style={{
                      fontSize: "0.72rem",
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                    }}
                  >
                    Target User(s)
                  </span>
                  <div style={{ fontSize: "0.88rem", marginTop: "2px" }}>
                    {resolveTarget(viewNotif)}
                  </div>
                </div>
                <div>
                  <span
                    style={{
                      fontSize: "0.72rem",
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                    }}
                  >
                    Push Stats
                  </span>
                  <div style={{ fontSize: "0.88rem", marginTop: "2px" }}>
                    <span style={{ color: "#10b981", fontWeight: 700 }}>
                      {viewNotif.pushStats?.delivered || 0} Delivered
                    </span>{" "}
                    ·{" "}
                    <span style={{ color: "#ef4444", fontWeight: 700 }}>
                      {viewNotif.pushStats?.failed || 0} Failed
                    </span>
                  </div>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <span
                    style={{
                      fontSize: "0.72rem",
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                    }}
                  >
                    Action URL
                  </span>
                  <div
                    style={{
                      fontSize: "0.88rem",
                      marginTop: "2px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {viewNotif.metadata?.actionUrl ? (
                      <span style={{ color: "var(--purple)" }}>
                        {viewNotif.metadata.actionUrl}
                      </span>
                    ) : (
                      "—"
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                padding: "14px 20px",
                borderTop: "1px solid var(--border)",
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <button className="btn" onClick={() => setViewNotif(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
