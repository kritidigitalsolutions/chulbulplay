import {
  Star,
  Globe,
  Calendar,
  Clock,
  Tag,
  Layers,
  Rocket,
  Lock,
  ArrowUpCircle,
  CheckCircle,
  XCircle,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

export default function BasicInfoSection({
  form,
  ch,
  categories = [],
  onAddCategory,
  onRemoveCategory,
}) {
  const selectedSlugs   = Array.isArray(form.category) ? form.category : [];

  return (
    <div className="premium-card">
      <h3 className="section-title">
        <span>
          <Star size={18} />
        </span>

        Basic Information
      </h3>

      <div
        className="form-2col"
        style={{ marginBottom: 20 }}
      >
        <div className="form-row form-full">
          <label className="form-label">
            Content Title *
          </label>

          <input
            className="form-input-styled"
            name="title"
            placeholder="e.g. Inception"
            onChange={ch}
            value={form.title}
            required
          />
        </div>

        <div className="form-row form-full">
          <label className="form-label">
            Synopsis / Description *
          </label>

          <textarea
            className="form-input-styled"
            name="description"
            placeholder="A brief summary of the plot..."
            rows={3}
            onChange={ch}
            value={form.description}
            required
          />
        </div>
      </div>

      <div className="form-grid-3">
        <div className="form-row">
          <label className="form-label">
            <Globe
              size={14}
              style={{ marginRight: 4 }}
            />

            Language
          </label>

          <input
            className="form-input-styled"
            name="language"
            placeholder="English, Hindi, etc."
            onChange={ch}
            value={form.language}
          />
        </div>

        <div className="form-row">
          <label className="form-label">
            <Calendar
              size={14}
              style={{ marginRight: 4 }}
            />

            Release Year
          </label>

          <input
            className="form-input-styled"
            name="releaseYear"
            type="number"
            placeholder="2024"
            onChange={ch}
            value={form.releaseYear}
          />
        </div>

        <div className="form-row">
          <label className="form-label">
            <Clock
              size={14}
              style={{ marginRight: 4 }}
            />

            {form.type === "movie"
              ? "Duration"
              : "Avg. Ep Duration"}
          </label>

          <input
            className="form-input-styled"
            name="duration"
            placeholder="e.g. 2h 15m"
            onChange={ch}
            value={form.duration}
          />
        </div>

        <div className="form-row">
          <label className="form-label">
            <Tag
              size={14}
              style={{ marginRight: 4 }}
            />

            Genres
          </label>

          <input
            className="form-input-styled"
            name="genre"
            placeholder="Action, Sci-Fi, Drama"
            onChange={ch}
            value={form.genre}
          />
        </div>

        {/* ── Category Chip Picker ────────────────── */}
        <div className="form-row" style={{ gridColumn: "1 / -1" }}>
          <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <Layers size={14} />
            Selected Categories (Select Multiple)
          </label>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 10,
              padding: "4px 0 12px 0",
            }}
          >
            {categories.map((cat) => {
              const isSelected = selectedSlugs.includes(cat.slug);
              // Use category color or default to orange
              const colorVal = cat.color || "var(--orange)";
              const chipBorder = isSelected ? `1px solid ${colorVal}` : "1px solid rgba(255, 255, 255, 0.08)";
              const textColor = isSelected ? colorVal : "var(--text-soft)";
              const bg = isSelected ? `${colorVal}15` : "rgba(255, 255, 255, 0.03)";
              
              return (
                <button
                  key={cat.slug}
                  type="button"
                  onClick={() => {
                    if (isSelected) {
                      onRemoveCategory?.(cat.slug);
                    } else {
                      onAddCategory?.(cat.slug);
                    }
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "8px 20px",
                    borderRadius: 9999,
                    background: bg,
                    border: chipBorder,
                    color: textColor,
                    fontWeight: 700,
                    fontSize: "0.8rem",
                    letterSpacing: "0.5px",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    boxShadow: isSelected ? `0 0 12px ${colorVal}20` : "none",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)";
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
                      e.currentTarget.style.color = "var(--text)";
                    } else {
                      e.currentTarget.style.transform = "scale(1.03)";
                      e.currentTarget.style.boxShadow = `0 0 18px ${colorVal}35`;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
                      e.currentTarget.style.color = "var(--text-soft)";
                    } else {
                      e.currentTarget.style.transform = "scale(1)";
                      e.currentTarget.style.boxShadow = `0 0 12px ${colorVal}20`;
                    }
                  }}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="form-row">
          <label className="form-label">
            <Star
              size={14}
              style={{ marginRight: 4 }}
            />

            IMDb Rating (0 - 10)
          </label>

          <input
            className="form-input-styled"
            name="rating"
            type="number"
            step="0.1"
            min="0"
            max="10"
            placeholder="8.5"
            onChange={ch}
            value={form.rating}
          />
        </div>

        <div className="form-row">
          <label className="form-label">
            <ArrowUpCircle
              size={14}
              style={{ marginRight: 4 }}
            />

            Priority (0 = Auto-assign)
          </label>

          <input
            className="form-input-styled"
            name="priority"
            type="number"
            min="0"
            placeholder="0 = Automatic (bottom), manually enter 1, 2, 3... to rank"
            onChange={ch}
            value={form.priority}
          />
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 16,
          marginTop: 24,
        }}
      >
        <label
          className="checkbox-row"
          style={{
            flex: 1,
            minWidth: "200px",
            cursor: "pointer",
            background: form.isComingSoon ? "rgba(255, 152, 0, 0.1)" : "var(--bg3)",
            borderColor: form.isComingSoon ? "rgba(255, 152, 0, 0.2)" : "var(--border)",
            display: "flex",
            alignItems: "center",
          }}
        >
          <input
            type="checkbox"
            name="isComingSoon"
            onChange={ch}
            checked={form.isComingSoon}
            style={{ display: "none" }}
          />
          <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", color: form.isComingSoon ? "#ff9800" : "var(--text)" }}>
            <span style={{ display: "flex", alignItems: "center" }}>
              <Rocket size={16} style={{ marginRight: 8 }} />
              Coming Soon
            </span>
            {form.isComingSoon ? <ToggleRight size={24} /> : <ToggleLeft size={24} color="var(--text-muted)" />}
          </span>
        </label>

        <label
          className="checkbox-row"
          style={{
            flex: 1,
            minWidth: "200px",
            cursor: "pointer",
            background: form.isPremium ? "rgba(229, 9, 20, 0.1)" : "var(--bg3)",
            borderColor: form.isPremium ? "rgba(229, 9, 20, 0.2)" : "var(--border)",
            display: "flex",
            alignItems: "center",
          }}
        >
          <input
            type="checkbox"
            name="isPremium"
            onChange={ch}
            checked={form.isPremium}
            style={{ display: "none" }}
          />
          <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", color: form.isPremium ? "var(--primary)" : "var(--text)" }}>
            <span style={{ display: "flex", alignItems: "center" }}>
              <Lock size={16} style={{ marginRight: 8 }} />
              Premium Content
            </span>
            {form.isPremium ? <ToggleRight size={24} /> : <ToggleLeft size={24} color="var(--text-muted)" />}
          </span>
        </label>

        <label
          className="checkbox-row"
          style={{
            flex: 1,
            minWidth: "200px",
            cursor: "pointer",
            background: form.isPublished ? "rgba(16, 185, 129, 0.1)" : "rgba(220, 38, 38, 0.1)",
            borderColor: form.isPublished ? "rgba(16, 185, 129, 0.2)" : "rgba(220, 38, 38, 0.2)",
            display: "flex",
            alignItems: "center",
          }}
        >
          <input
            type="checkbox"
            name="isPublished"
            onChange={ch}
            checked={form.isPublished}
            style={{ display: "none" }}
          />
          <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", color: form.isPublished ? "#10b981" : "var(--red)" }}>
            <span style={{ display: "flex", alignItems: "center" }}>
              {form.isPublished ? (
                <CheckCircle size={16} style={{ marginRight: 8 }} />
              ) : (
                <XCircle size={16} style={{ marginRight: 8 }} />
              )}
              {form.isPublished ? "Published" : "Draft (Unpublished)"}
            </span>
            {form.isPublished ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
          </span>
        </label>
      </div>

      {form.isComingSoon && (
        <div
          className="form-row"
          style={{
            marginTop: 20,
            animation: "pageIn 0.3s ease",
          }}
        >
          <label className="form-label">
            Scheduled Release Date & Time
          </label>

          <input
            className="form-input-styled"
            type="datetime-local"
            name="releaseDate"
            onChange={ch}
            value={form.releaseDate}
            required
          />
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}