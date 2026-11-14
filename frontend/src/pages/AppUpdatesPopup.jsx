import { useState, useEffect, useCallback, useRef } from "react";
import {
  Sparkles,
  Upload,
  Link2,
  Trash2,
  Edit2,
  Eye,
  RefreshCw,
  X,
  Smartphone,
  Film,
  Tv,
  CheckCircle,
  AlertCircle,
  Layers,
} from "lucide-react";
import API, { BASE_URL } from "../api/axios";
import "./AppUpdatesPopup.css";

const DEFAULT_ACTION_TEXT = "Watch Now";
const DEFAULT_FALLBACK_DESC =
  "Experience the latest entertainment streaming exclusively on RoccoPlay!";

export default function AppUpdatesPopup() {
  // ── Popups & Stats State ────────────────────────────────────────────────
  const [popups, setPopups] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    totalImpressions: 0,
    totalClicks: 0,
  });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // ── Available Content for Dropdown ──────────────────────────────────────
  const [allContent, setAllContent] = useState([]);

  // ── Form State ─────────────────────────────────────────────────────────
  const [editingId, setEditingId] = useState(null);
  const [selectedContentKey, setSelectedContentKey] = useState("none"); // "none" | "movie:<id>" | "series:<id>"
  const [imageMode, setImageMode] = useState("system"); // "system" | "url"
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [description, setDescription] = useState("");
  const [actionButtonText, setActionButtonText] = useState(DEFAULT_ACTION_TEXT);
  const [actionUrl, setActionUrl] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [title, setTitle] = useState("");

  const fileInputRef = useRef(null);
  const formRef = useRef(null);

  // ── Feedback Toast ─────────────────────────────────────────────────────
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Helper: Format full media URL ──────────────────────────────────────
  const getFullMediaUrl = (url) => {
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

  // ── Fetch Popups List ──────────────────────────────────────────────────
  const fetchPopups = useCallback(async () => {
    setFetching(true);
    try {
      const res = await API.get("/admin/app-popup");
      if (res.data?.success) {
        setPopups(res.data.data || []);
        if (res.data.stats) {
          setStats(res.data.stats);
        } else {
          const list = res.data.data || [];
          const active = list.filter((p) => p.isActive).length;
          setStats({
            total: list.length,
            active,
            inactive: list.length - active,
            totalImpressions: list.reduce((acc, p) => acc + (p.impressions || 0), 0),
            totalClicks: list.reduce((acc, p) => acc + (p.clicks || 0), 0),
          });
        }
      }
    } catch (err) {
      console.error("Failed to fetch app popups:", err);
      showToast(err.response?.data?.message || "Failed to load popups", "error");
    } finally {
      setFetching(false);
    }
  }, []);

  // ── Fetch Content (Movies & Series) for Dropdown ───────────────────────
  const fetchContent = useCallback(async () => {
    try {
      const res = await API.get("/admin/content/all");
      if (res.data?.success) {
        setAllContent(res.data.content || []);
      }
    } catch (err) {
      console.error("Failed to load content options:", err);
    }
  }, []);

  useEffect(() => {
    fetchPopups();
    fetchContent();
  }, [fetchPopups, fetchContent]);

  // ── Handle Dropdown Change ─────────────────────────────────────────────
  const handleContentSelectChange = (e) => {
    const val = e.target.value;
    setSelectedContentKey(val);

    if (val === "none") {
      return;
    }

    const [type, id] = val.split(":");
    const found = allContent.find(
      (item) => String(item._id) === String(id) && item.contentType === type
    );

    if (found) {
      // Auto-fill Action URL
      const routePrefix = type === "movie" ? "/movie" : "/series";
      const deepLink = `${routePrefix}/${found.slug || found._id}`;
      setActionUrl(deepLink);

      // Auto-suggest Description if empty
      if (!description.trim() || description === DEFAULT_FALLBACK_DESC) {
        setDescription(`Watch ${found.title} now streaming in 4K Ultra HD on RoccoPlay!`);
      }

      // If user hasn't selected a custom image yet, use the content's banner/poster
      if (!imageFile && !imageUrl) {
        const candidateImg = found.banner || found.poster || "";
        if (candidateImg) {
          setImageUrl(getFullMediaUrl(candidateImg));
          setImagePreview(getFullMediaUrl(candidateImg));
        }
      }
    }
  };

  // ── Handle System File Select ──────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Please choose an image file (PNG, JPG, WEBP)", "error");
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview("");
    setImageUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Clear / Reset Form ─────────────────────────────────────────────────
  const handleResetForm = () => {
    setEditingId(null);
    setSelectedContentKey("none");
    setImageMode("system");
    clearImage();
    setDescription("");
    setActionButtonText(DEFAULT_ACTION_TEXT);
    setActionUrl("");
    setIsActive(true);
    setTitle("");
  };

  // ── Load Popup for Editing ─────────────────────────────────────────────
  const handleEditPopup = (popup) => {
    setEditingId(popup._id || popup.id);
    setTitle(popup.title || "");
    setDescription(popup.description || "");
    setActionButtonText(popup.actionButtonText || DEFAULT_ACTION_TEXT);
    setActionUrl(popup.actionUrl || "");
    setIsActive(Boolean(popup.isActive));

    if (popup.contentType && popup.contentId && popup.contentType !== "none") {
      setSelectedContentKey(`${popup.contentType}:${popup.contentId}`);
    } else {
      setSelectedContentKey("none");
    }

    const resolvedImg = getFullMediaUrl(popup.imageUrl);
    setImagePreview(resolvedImg);
    setImageUrl(resolvedImg);
    setImageMode("url");

    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  // ── Submit / Publish Popup ─────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!description.trim()) {
      showToast("Short Paragraph / Description is required", "error");
      return;
    }

    const finalImage = imageMode === "system" ? imageFile : imageUrl.trim();
    if (!finalImage && !imagePreview) {
      showToast("Please select a popup image or enter an image URL", "error");
      return;
    }

    setLoading(true);

    try {
      let contentType = "none";
      let contentId = null;

      if (selectedContentKey !== "none") {
        const [type, id] = selectedContentKey.split(":");
        contentType = type;
        contentId = id;
      }

      const formData = new FormData();
      formData.append("description", description.trim());
      formData.append("actionButtonText", actionButtonText.trim() || DEFAULT_ACTION_TEXT);
      formData.append("actionUrl", actionUrl.trim());
      formData.append("isActive", String(isActive));
      formData.append("contentType", contentType);
      if (contentId) formData.append("contentId", contentId);
      if (title.trim()) formData.append("title", title.trim());
      formData.append("platform", "app");

      if (imageMode === "system" && imageFile) {
        formData.append("image", imageFile);
      } else {
        const imgToSend = imageUrl.trim() || imagePreview;
        formData.append("imageUrl", imgToSend);
      }

      let res;
      if (editingId) {
        res = await API.put(`/admin/app-popup/${editingId}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        showToast("In-App Popup updated successfully!");
      } else {
        res = await API.post("/admin/app-popup", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        showToast("In-App Popup published successfully!");
      }

      handleResetForm();
      fetchPopups();
    } catch (err) {
      console.error("Popup save failed:", err);
      showToast(err.response?.data?.message || "Failed to save popup", "error");
    } finally {
      setLoading(false);
    }
  };

  // ── Toggle Active State ────────────────────────────────────────────────
  const handleToggleStatus = async (popup) => {
    const id = popup._id || popup.id;
    try {
      // Optimistic update
      setPopups((prev) =>
        prev.map((p) => (p._id === id || p.id === id ? { ...p, isActive: !p.isActive } : p))
      );
      setStats((prev) => {
        const currentlyActive = popup.isActive;
        return {
          ...prev,
          active: currentlyActive ? prev.active - 1 : prev.active + 1,
          inactive: currentlyActive ? prev.inactive + 1 : prev.inactive - 1,
        };
      });

      const res = await API.patch(`/admin/app-popup/${id}/toggle`);
      showToast(res.data?.message || "Status updated!");
    } catch (err) {
      console.error("Toggle status failed:", err);
      showToast("Failed to toggle status", "error");
      fetchPopups();
    }
  };

  // ── Delete Popup ───────────────────────────────────────────────────────
  const handleDeletePopup = async (popup) => {
    const id = popup._id || popup.id;
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this in-app popup? This cannot be undone."
    );
    if (!confirmDelete) return;

    try {
      await API.delete(`/admin/app-popup/${id}`);
      showToast("Popup deleted successfully");
      fetchPopups();
    } catch (err) {
      console.error("Delete failed:", err);
      showToast(err.response?.data?.message || "Failed to delete popup", "error");
    }
  };

  // Split movies & series for structured dropdown grouping
  const moviesList = allContent.filter((c) => c.contentType === "movie");
  const seriesList = allContent.filter((c) => c.contentType === "series");

  // Effective preview image inside phone
  const livePreviewImage = imagePreview || (imageUrl.trim() ? getFullMediaUrl(imageUrl) : "");

  return (
    <div className="popup-page" ref={formRef}>
      {/* ── Global Feedback Toast ── */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: "28px",
            right: "28px",
            zIndex: 9999,
            padding: "12px 20px",
            borderRadius: "10px",
            background: toast.type === "error" ? "#ef4444" : "#10b981",
            color: "#ffffff",
            fontWeight: 600,
            fontSize: "0.88rem",
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            animation: "fadeIn 0.25s ease-out",
          }}
        >
          {toast.type === "error" ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* ── Page Header & Stats ── */}
      <header className="popup-header">
        <div className="popup-header-left">
          <div className="popup-header-icon-box">
            <Sparkles size={24} />
          </div>
          <div className="popup-header-titles">
            <h1>App Updates Popup</h1>
            <p>Show promotional or new release full-card popups to users when they open the mobile app</p>
          </div>
        </div>

        {/* ── 3 Stat Badges Matching Reference Screenshot ── */}
        <div className="popup-stats-chips">
          <div className="popup-stat-card total">
            <span className="stat-num">{stats.total}</span>
            <span className="stat-lbl">TOTAL POPUPS</span>
          </div>

          <div className="popup-stat-card active">
            <span className="stat-num">{stats.active}</span>
            <span className="stat-lbl">ACTIVE IN-APP</span>
          </div>

          <div className="popup-stat-card inactive">
            <span className="stat-num">{stats.inactive}</span>
            <span className="stat-lbl">INACTIVE</span>
          </div>
        </div>
      </header>

      {/* ── Main Two-Column Container ── */}
      <div className="popup-main-grid">
        {/* ── LEFT: Create / Edit Popup Form ── */}
        <div className="popup-form-panel">
          <div className="popup-panel-header">
            <h2>
              <Sparkles size={16} />
              {editingId ? "EDIT IN-APP POPUP" : "+ CREATE IN-APP POPUP"}
            </h2>
            {editingId && (
              <button
                type="button"
                className="popup-remove-thumb-btn"
                onClick={handleResetForm}
                style={{ padding: "4px 10px" }}
              >
                Cancel Edit
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="popup-form-body">
            {/* Field 1: Link New Content */}
            <div className="popup-field-group">
              <label className="popup-field-label">
                LINK NEW CONTENT <span className="sub-note">(Select newly added movie or show)</span>
              </label>
              <select
                className="popup-select"
                value={selectedContentKey}
                onChange={handleContentSelectChange}
              >
                <option value="none">-- None (General / Custom Announcement) --</option>
                {moviesList.length > 0 && (
                  <optgroup label="🎬 Movies">
                    {moviesList.map((m) => (
                      <option key={`movie:${m._id}`} value={`movie:${m._id}`}>
                        {m.title} {m.releaseYear ? `(${m.releaseYear})` : ""}
                      </option>
                    ))}
                  </optgroup>
                )}
                {seriesList.length > 0 && (
                  <optgroup label="📺 Web Series">
                    {seriesList.map((s) => (
                      <option key={`series:${s._id}`} value={`series:${s._id}`}>
                        {s.title}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            {/* Field 2: Popup Full-Card Image */}
            <div className="popup-field-group">
              <label className="popup-field-label">
                POPUP FULL-CARD IMAGE <span className="required">*</span>
              </label>

              <div className="popup-image-mode-tabs">
                <button
                  type="button"
                  className={`popup-mode-tab ${imageMode === "system" ? "active" : ""}`}
                  onClick={() => setImageMode("system")}
                >
                  <Upload size={14} /> Upload from System
                </button>
                <button
                  type="button"
                  className={`popup-mode-tab ${imageMode === "url" ? "active" : ""}`}
                  onClick={() => setImageMode("url")}
                >
                  <Link2 size={14} /> Enter Image URL
                </button>
              </div>

              {imageMode === "system" ? (
                <>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleFileChange}
                    style={{ display: "none" }}
                  />
                  <div
                    className="popup-dropzone"
                    onClick={() => fileInputRef.current && fileInputRef.current.click()}
                  >
                    <div className="popup-dropzone-left">
                      <Upload size={20} />
                      <span className={imageFile ? "file-name" : ""}>
                        {imageFile
                          ? imageFile.name
                          : "Click to select full-card banner image from your system..."}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="popup-browse-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current && fileInputRef.current.click();
                      }}
                    >
                      Browse File
                    </button>
                  </div>
                </>
              ) : (
                <input
                  type="url"
                  className="popup-input"
                  placeholder="https://storage.bunnycdn.com/... or paste image URL"
                  value={imageUrl}
                  onChange={(e) => {
                    setImageUrl(e.target.value);
                    setImagePreview(e.target.value);
                  }}
                />
              )}

              {/* Thumbnail preview if an image is selected */}
              {imagePreview && (
                <div className="popup-image-preview-bar">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="popup-thumb-img"
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                  <div className="popup-thumb-meta">
                    <div className="title">
                      {imageFile ? imageFile.name : "Image Ready for In-App Popup"}
                    </div>
                    <div className="desc">
                      {imageFile ? `${(imageFile.size / 1024).toFixed(1)} KB` : "Remote Image"}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="popup-remove-thumb-btn"
                    onClick={clearImage}
                    title="Remove selected image"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>

            {/* Field 3: Short Paragraph / Description */}
            <div className="popup-field-group">
              <label className="popup-field-label">
                SHORT PARAGRAPH / DESCRIPTION <span className="required">*</span>
              </label>
              <textarea
                className="popup-textarea"
                rows={3}
                placeholder="Write an attractive 2-3 sentence update message for the user..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            {/* Field 4: Action Button Text */}
            <div className="popup-field-group">
              <label className="popup-field-label">ACTION BUTTON TEXT</label>
              <input
                type="text"
                className="popup-input"
                placeholder="Watch Now"
                value={actionButtonText}
                onChange={(e) => setActionButtonText(e.target.value)}
              />
            </div>

            {/* Field 5: Action URL / Deep Link */}
            <div className="popup-field-group">
              <label className="popup-field-label">
                ACTION URL / DEEP LINK <span className="sub-note">(In-App route)</span>
              </label>
              <input
                type="text"
                className="popup-input"
                placeholder="/movie/bablusha or /plans"
                value={actionUrl}
                onChange={(e) => setActionUrl(e.target.value)}
              />
            </div>

            {/* Field 6: Popup Status Toggle */}
            <div className="popup-field-group">
              <label className="popup-field-label">POPUP STATUS</label>
              <div className="popup-toggle-row">
                <label className="popup-switch">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                  />
                  <span className="popup-slider" />
                </label>
                <span className="popup-toggle-label">
                  {isActive ? "Active (Will show in app)" : "Inactive (Hidden)"}
                </span>
              </div>
            </div>

            {/* Actions Row: Submit & Clear */}
            <div className="popup-actions-row">
              <button type="submit" className="popup-submit-btn" disabled={loading}>
                {loading ? (
                  <>
                    <RefreshCw size={16} className="notif-spin-icon" />
                    <span>Publishing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>{editingId ? "Update In-App Popup" : "Publish In-App Popup"}</span>
                  </>
                )}
              </button>

              <button type="button" className="popup-clear-btn" onClick={handleResetForm}>
                <X size={15} />
                <span>Clear</span>
              </button>
            </div>
          </form>
        </div>

        {/* ── RIGHT: Live Smartphone Interactive Preview (Full Card) ── */}
        <div className="popup-preview-panel">
          <div className="popup-preview-header">
            <h2>
              <Smartphone size={16} />
              LIVE APP PREVIEW (FULL CARD)
            </h2>
          </div>

          <div className="popup-phone-wrapper">
            <div className="smartphone-frame">
              {/* Speaker / Notch */}
              <div className="phone-notch">
                <div className="phone-speaker" />
              </div>

              {/* Screen Interior */}
              <div className="phone-screen">
                <div className="phone-screen-bg-mock" />

                {/* Centered Modal Card */}
                <div className="inapp-modal-card">
                  {/* Top Right Close Button */}
                  <button type="button" className="inapp-modal-close-btn" aria-label="Close">
                    ✕
                  </button>

                  {/* Full Card Image or Placeholder */}
                  <div className="inapp-modal-image-wrap">
                    {livePreviewImage ? (
                      <img
                        src={livePreviewImage}
                        alt="Popup live preview"
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="inapp-modal-empty-img">
                        <Sparkles size={24} />
                        <span>Upload Full-Card Image</span>
                      </div>
                    )}
                  </div>

                  {/* Description Paragraph */}
                  <div className="inapp-modal-desc">
                    {description.trim() || DEFAULT_FALLBACK_DESC}
                  </div>

                  {/* Action Button */}
                  <button type="button" className="inapp-modal-action-btn">
                    {actionButtonText.trim() || DEFAULT_ACTION_TEXT}
                  </button>

                  {/* Dismiss Link */}
                  <div className="inapp-modal-dismiss-link">Maybe later</div>
                </div>
              </div>
            </div>
          </div>

          {/* Callout Note from Reference Screenshot */}
          <div className="popup-preview-note">
            <strong>💡 App Logic:</strong>
            If user &quot;Maybe later&quot;/if he does so, the popup will appear every single time
            until he &quot;Watch Now&quot;. Might accidentally tap the button.
          </div>
        </div>
      </div>

      {/* ── BOTTOM: Recent / All In-App Popups Table ── */}
      <div className="popup-table-panel">
        <div className="popup-table-header">
          <h2>
            <Layers size={18} />
            All In-App Popups
            <span className="popup-table-count-badge">{popups.length}</span>
          </h2>
          <button
            type="button"
            className="popup-refresh-btn"
            onClick={fetchPopups}
            disabled={fetching}
          >
            <RefreshCw size={14} className={fetching ? "notif-spin-icon" : ""} />
            <span>Refresh</span>
          </button>
        </div>

        <div className="popup-table-responsive">
          {popups.length === 0 ? (
            <div className="popup-empty-state">
              <Sparkles size={38} />
              <h3>No in-app popups created yet</h3>
              <p>Create your first promotional or new release popup using the form above.</p>
            </div>
          ) : (
            <table className="popup-table">
              <thead>
                <tr>
                  <th style={{ width: "40px" }}>#</th>
                  <th>POPUP / IMAGE</th>
                  <th>LINKED CONTENT</th>
                  <th>ACTION BUTTON &amp; URL</th>
                  <th>STATUS</th>
                  <th>IMPRESSIONS / CLICKS</th>
                  <th>CREATED</th>
                  <th style={{ textAlign: "right" }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {popups.map((p, idx) => {
                  const id = p._id || p.id;
                  const thumb = getFullMediaUrl(p.imageUrl);
                  const ctr =
                    p.impressions > 0
                      ? ((p.clicks / p.impressions) * 100).toFixed(1)
                      : "0.0";

                  return (
                    <tr key={id}>
                      <td style={{ color: "#64748b", fontWeight: 700 }}>{idx + 1}</td>

                      {/* Image & Description */}
                      <td>
                        <div className="popup-tbl-img-cell">
                          <img
                            src={thumb}
                            alt="Popup thumb"
                            className="popup-tbl-thumb"
                            onError={(e) => {
                              e.target.style.display = "none";
                            }}
                          />
                          <div className="popup-tbl-info">
                            <span className="popup-tbl-desc" title={p.description}>
                              {p.description}
                            </span>
                            {p.title && (
                              <span className="popup-tbl-title-note">{p.title}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Linked Content */}
                      <td>
                        {p.contentType === "movie" ? (
                          <span className="content-badge">
                            <Film size={12} /> Movie: {p.content?.title || "Linked"}
                          </span>
                        ) : p.contentType === "series" ? (
                          <span className="content-badge series">
                            <Tv size={12} /> Series: {p.content?.title || "Linked"}
                          </span>
                        ) : (
                          <span className="content-badge none">General Announcement</span>
                        )}
                      </td>

                      {/* Action Button & URL */}
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          <span className="popup-tbl-action-text">
                            {p.actionButtonText || DEFAULT_ACTION_TEXT}
                          </span>
                          {p.actionUrl ? (
                            <span className="url-badge" title={p.actionUrl}>
                              {p.actionUrl}
                            </span>
                          ) : (
                            <span style={{ color: "#64748b", fontSize: "0.72rem" }}>No link</span>
                          )}
                        </div>
                      </td>

                      {/* Status Toggle Switch */}
                      <td>
                        <label className="popup-switch">
                          <input
                            type="checkbox"
                            checked={Boolean(p.isActive)}
                            onChange={() => handleToggleStatus(p)}
                          />
                          <span className="popup-slider" />
                        </label>
                      </td>

                      {/* Impressions & Clicks */}
                      <td>
                        <div className="stats-pill">
                          <span className="views">👁 {p.impressions || 0} views</span>
                          <span className="clicks">
                            👆 {p.clicks || 0} clicks ({ctr}%)
                          </span>
                        </div>
                      </td>

                      {/* Created Date */}
                      <td style={{ color: "#94a3b8", fontSize: "0.76rem" }}>
                        {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "—"}
                      </td>

                      {/* Actions */}
                      <td>
                        <div
                          className="popup-tbl-actions"
                          style={{ justifyContent: "flex-end" }}
                        >
                          <button
                            type="button"
                            className="tbl-act-btn edit"
                            title="Edit this popup"
                            onClick={() => handleEditPopup(p)}
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            className="tbl-act-btn delete"
                            title="Delete this popup"
                            onClick={() => handleDeletePopup(p)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

