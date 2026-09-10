import { Film, Image as ImageIcon, Edit2, Trash2 } from "lucide-react";

export default function EpisodeRow({
  episode,
  seasonIndex,
  episodeIndex,
  removeEp,
  episodeVideoFiles,
  episodeThumbnailFiles,
  onEditClick,
}) {
  const hasLocalVideo = !!episodeVideoFiles[`${seasonIndex}_${episodeIndex}`];
  const hasVideoUrl = !!episode.videoUrl;
  const hasLocalThumb = !!episodeThumbnailFiles[`${seasonIndex}_${episodeIndex}`];
  const hasThumbUrl = !!episode.thumbnailUrl;

  return (
    <div
      className="ep-row-card"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "rgba(255, 255, 255, 0.02)",
        border: "1px solid rgba(255, 255, 255, 0.05)",
        padding: "16px 20px",
        borderRadius: "12px",
        gap: "20px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "16px", flex: 1, minWidth: 0 }}>
        {/* Episode Index Circle */}
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.04)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: "600",
            fontSize: "0.9rem",
            color: "var(--primary)",
            flexShrink: 0,
          }}
        >
          {episodeIndex + 1}
        </div>

        {/* Title & Duration */}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontWeight: "600",
              color: "#fff",
              fontSize: "0.95rem",
              textOverflow: "ellipsis",
              overflow: "hidden",
              whiteSpace: "nowrap",
            }}
          >
            {episode.title || "Untitled Episode"}
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "4px" }}>
            Duration: {episode.duration || "N/A"}
          </div>
        </div>

        {/* Status Badges */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {/* Video Badge */}
          {hasLocalVideo && (
            <span
              style={{
                fontSize: "0.7rem",
                padding: "4px 8px",
                borderRadius: "6px",
                background: "rgba(46, 204, 113, 0.15)",
                color: "#2ecc71",
                border: "1px solid rgba(46, 204, 113, 0.2)",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <Film size={12} /> Local Video
            </span>
          )}
          {hasVideoUrl && (
            <span
              style={{
                fontSize: "0.7rem",
                padding: "4px 8px",
                borderRadius: "6px",
                background: "rgba(52, 152, 219, 0.15)",
                color: "#3498db",
                border: "1px solid rgba(52, 152, 219, 0.2)",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <Film size={12} /> Video URL
            </span>
          )}
          {!hasLocalVideo && !hasVideoUrl && (
            <span
              style={{
                fontSize: "0.7rem",
                padding: "4px 8px",
                borderRadius: "6px",
                background: "rgba(231, 76, 60, 0.15)",
                color: "#e74c3c",
                border: "1px solid rgba(231, 76, 60, 0.2)",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <Film size={12} /> No Video
            </span>
          )}

          {/* Thumbnail Badge */}
          {hasLocalThumb && (
            <span
              style={{
                fontSize: "0.7rem",
                padding: "4px 8px",
                borderRadius: "6px",
                background: "rgba(46, 204, 113, 0.15)",
                color: "#2ecc71",
                border: "1px solid rgba(46, 204, 113, 0.2)",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <ImageIcon size={12} /> Local Thumb
            </span>
          )}
          {hasThumbUrl && (
            <span
              style={{
                fontSize: "0.7rem",
                padding: "4px 8px",
                borderRadius: "6px",
                background: "rgba(52, 152, 219, 0.15)",
                color: "#3498db",
                border: "1px solid rgba(52, 152, 219, 0.2)",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <ImageIcon size={12} /> Thumb URL
            </span>
          )}
          {!hasLocalThumb && !hasThumbUrl && (
            <span
              style={{
                fontSize: "0.7rem",
                padding: "4px 8px",
                borderRadius: "6px",
                background: "rgba(231, 76, 60, 0.15)",
                color: "#e74c3c",
                border: "1px solid rgba(231, 76, 60, 0.2)",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <ImageIcon size={12} /> No Thumb
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
        <button
          type="button"
          onClick={() => onEditClick(episodeIndex)}
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "#fff",
            borderRadius: "8px",
            width: "36px",
            height: "36px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--primary)";
            e.currentTarget.style.background = "rgba(230, 57, 70, 0.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
            e.currentTarget.style.background = "rgba(255,255,255,0.03)";
          }}
          title="Edit Episode"
        >
          <Edit2 size={14} />
        </button>
        <button
          type="button"
          onClick={() => removeEp(seasonIndex, episodeIndex)}
          style={{
            background: "rgba(231, 76, 60, 0.1)",
            border: "1px solid rgba(231, 76, 60, 0.2)",
            color: "#e74c3c",
            borderRadius: "8px",
            width: "36px",
            height: "36px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#e74c3c";
            e.currentTarget.style.color = "#fff";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(231, 76, 60, 0.1)";
            e.currentTarget.style.color = "#e74c3c";
          }}
          title="Delete Episode"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
