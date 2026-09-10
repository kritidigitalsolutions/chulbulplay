import { useState } from "react";
import { createPortal } from "react-dom";
import { Plus, Trash2, X } from "lucide-react";
import EpisodeRow from "./EpisodeRow";

export default function SeasonSection({
  season,
  seasonIndex,
  addEp,
  removeSeason,

  chEp,
  removeEp,

  episodeVideoFiles,
  episodeThumbnailFiles,

  handleEpisodeVideoChange,
  handleEpisodeThumbnailChange,

  setEpisodeVideoFiles,
  setEpisodeThumbnailFiles,
  form,
  setForm,
}) {
  // Prevent Enter key from submitting form when typing inside input fields
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && e.target.tagName === "INPUT") {
      e.preventDefault();
    }
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEpisodeIndex, setEditingEpisodeIndex] = useState(null);

  // Form states
  const [epTitle, setEpTitle] = useState("");
  const [epDuration, setEpDuration] = useState("");
  const [epVideoFile, setEpVideoFile] = useState(null);
  const [epVideoUrl, setEpVideoUrl] = useState("");
  const [epThumbFile, setEpThumbFile] = useState(null);
  const [epThumbUrl, setEpThumbUrl] = useState("");

  const openAddModal = () => {
    setEditingEpisodeIndex(null);
    setEpTitle("");
    setEpDuration("");
    setEpVideoFile(null);
    setEpVideoUrl("");
    setEpThumbFile(null);
    setEpThumbUrl("");
    setIsModalOpen(true);
  };

  const openEditModal = (episodeIndex) => {
    const ep = season.episodes[episodeIndex];
    setEditingEpisodeIndex(episodeIndex);
    setEpTitle(ep.title || "");
    setEpDuration(ep.duration || "");

    const key = `${seasonIndex}_${episodeIndex}`;
    const localVideo = episodeVideoFiles[key];
    const localThumb = episodeThumbnailFiles[key];

    setEpVideoFile(localVideo || null);
    setEpVideoUrl(localVideo ? "" : (ep.videoUrl || ""));

    setEpThumbFile(localThumb || null);
    setEpThumbUrl(localThumb ? "" : (ep.thumbnailUrl || ""));

    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleSaveEpisode = () => {
    if (!epTitle) {
      alert("Episode title is required");
      return;
    }

    if (editingEpisodeIndex !== null) {
      // Edit existing
      setForm((f) => ({
        ...f,
        seasons: f.seasons.map((s, i) =>
          i === seasonIndex
            ? {
                ...s,
                episodes: s.episodes.map((ep, j) =>
                  j === editingEpisodeIndex
                    ? {
                        ...ep,
                        title: epTitle,
                        duration: epDuration,
                        videoUrl: epVideoUrl || "",
                        thumbnailUrl: epThumbUrl || "",
                      }
                    : ep
                ),
              }
            : s
        ),
      }));

      // Update file pointers
      const key = `${seasonIndex}_${editingEpisodeIndex}`;
      setEpisodeVideoFiles((prev) => {
        const next = { ...prev };
        if (epVideoFile) {
          next[key] = epVideoFile;
        } else {
          delete next[key];
        }
        return next;
      });

      setEpisodeThumbnailFiles((prev) => {
        const next = { ...prev };
        if (epThumbFile) {
          next[key] = epThumbFile;
        } else {
          delete next[key];
        }
        return next;
      });

    } else {
      // Add new
      const newIndex = season.episodes.length;
      
      setForm((f) => ({
        ...f,
        seasons: f.seasons.map((s, i) =>
          i === seasonIndex
            ? {
                ...s,
                episodes: [
                  ...s.episodes,
                  {
                    title: epTitle,
                    duration: epDuration,
                    videoUrl: epVideoUrl || "",
                    thumbnailUrl: epThumbUrl || "",
                  },
                ],
              }
            : s
        ),
      }));

      // Update file pointers
      const key = `${seasonIndex}_${newIndex}`;
      if (epVideoFile) {
        setEpisodeVideoFiles((prev) => ({ ...prev, [key]: epVideoFile }));
      }
      if (epThumbFile) {
        setEpisodeThumbnailFiles((prev) => ({ ...prev, [key]: epThumbFile }));
      }
    }

    closeModal();
  };

  return (
    <div
      className="season-block"
      style={{ marginBottom: 18 }}
    >
      <div
        className="season-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <strong>
            Season {season.seasonNumber}
          </strong>

          <span className="season-count">
            {season.episodes.length} episodes
          </span>
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
          }}
        >
          <button
            type="button"
            className="btn btn-primary"
            onClick={openAddModal}
          >
            <Plus size={16} />
            Add Episode
          </button>

          <button
            type="button"
            className="btn btn-ghost del-season-btn"
            onClick={() =>
              removeSeason(seasonIndex)
            }
            aria-label={`Remove season ${season.seasonNumber}`}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div
        className="season-content"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {season.episodes.map(
          (episode, episodeIndex) => (
            <EpisodeRow
              key={episodeIndex}
              episode={episode}
              seasonIndex={seasonIndex}
              episodeIndex={episodeIndex}
              removeEp={removeEp}
              episodeVideoFiles={episodeVideoFiles}
              episodeThumbnailFiles={episodeThumbnailFiles}
              onEditClick={openEditModal}
            />
          )
        )}
      </div>

      {/* Blocking Form Modal */}
      {isModalOpen && createPortal(
        <div
          className="modal-overlay"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(8px)",
            zIndex: 9999, // extremely high z-index to block everything including headers and sidebars
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={closeModal}
        >
          <div
            className="modal-box-form"
            style={{
              background: "var(--bg3)",
              border: "1px solid var(--border)",
              borderRadius: "16px",
              padding: "28px",
              width: "100%",
              maxWidth: "600px",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
            }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={handleKeyDown}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "14px" }}>
              <h3 style={{ margin: 0, fontSize: "1.2rem", color: "var(--text)", fontWeight: "600" }}>
                {editingEpisodeIndex !== null ? "Edit Episode" : "Add Episode to Season " + season.seasonNumber}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center" }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "20px", maxHeight: "60vh", overflowY: "auto", paddingRight: "4px" }} className="modal-body-scrollable">
              {/* Title */}
              <div className="form-row">
                <label className="form-label" style={{ display: "block", marginBottom: 6 }}>Episode Title *</label>
                <input
                  className="form-input"
                  style={{ width: "100%" }}
                  value={epTitle}
                  onChange={(e) => setEpTitle(e.target.value)}
                  placeholder="e.g. The Beginning"
                />
              </div>

              {/* Duration */}
              <div className="form-row">
                <label className="form-label" style={{ display: "block", marginBottom: 6 }}>Duration</label>
                <input
                  className="form-input"
                  style={{ width: "100%" }}
                  value={epDuration}
                  onChange={(e) => setEpDuration(e.target.value)}
                  placeholder="e.g. 45m"
                />
              </div>

              <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "4px 0" }} />

              {/* Video Source */}
              <div className="form-row" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label className="form-label" style={{ display: "block" }}>Episode Video Source</label>
                
                <div className="file-input-wrapper">
                  <input
                    type="file"
                    accept="video/*"
                    id="modal-ep-video"
                    className="file-input"
                    onChange={(e) => {
                      setEpVideoFile(e.target.files[0]);
                      setEpVideoUrl("");
                    }}
                  />
                  <label htmlFor="modal-ep-video" className="file-label" style={{ height: "42px", display: "flex", alignItems: "center" }}>
                    {epVideoFile ? `✓ ${epVideoFile.name}` : "Choose Video File"}
                  </label>
                </div>

                <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.8rem", fontWeight: "700", margin: "2px 0" }}>OR</div>

                <input
                  className="form-input"
                  style={{ width: "100%" }}
                  value={epVideoUrl}
                  onChange={(e) => {
                    setEpVideoUrl(e.target.value);
                    if (e.target.value) setEpVideoFile(null);
                  }}
                  placeholder="Paste video stream URL"
                />
              </div>

              <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "4px 0" }} />

              {/* Thumbnail Source */}
              <div className="form-row" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label className="form-label" style={{ display: "block" }}>Episode Thumbnail Source</label>
                
                <div className="file-input-wrapper">
                  <input
                    type="file"
                    accept="image/*"
                    id="modal-ep-thumb"
                    className="file-input"
                    onChange={(e) => {
                      setEpThumbFile(e.target.files[0]);
                      setEpThumbUrl("");
                    }}
                  />
                  <label htmlFor="modal-ep-thumb" className="file-label" style={{ height: "42px", display: "flex", alignItems: "center" }}>
                    {epThumbFile ? `✓ ${epThumbFile.name}` : "Choose Thumbnail File"}
                  </label>
                </div>

                <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.8rem", fontWeight: "700", margin: "2px 0" }}>OR</div>

                <input
                  className="form-input"
                  style={{ width: "100%" }}
                  value={epThumbUrl}
                  onChange={(e) => {
                    setEpThumbUrl(e.target.value);
                    if (e.target.value) setEpThumbFile(null);
                  }}
                  placeholder="Paste thumbnail image URL"
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", borderTop: "1px solid var(--border)", paddingTop: "14px", marginTop: "10px" }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={closeModal}
                style={{ padding: "10px 20px" }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveEpisode}
                style={{ padding: "10px 20px" }}
              >
                {editingEpisodeIndex !== null ? "Save Changes" : "Add Episode"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
