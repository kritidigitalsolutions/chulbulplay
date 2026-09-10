import { Plus, Tv } from "lucide-react";
import SeasonSection from "./SeasonSection";

export default function SeasonsSection({
  form,
  setForm,

  addSeason,
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
}) {
  if (
    form.type !== "series" ||
    form.isComingSoon
  ) {
    return null;
  }

  return (
    <div
      className="premium-card"
      style={{
        animation: "pageIn 0.4s ease",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <h3
          className="section-title"
          style={{ marginBottom: 0 }}
        >
          <span>
            <Tv size={18} />
          </span>

          Seasons & Episodes
        </h3>

        <button
          type="button"
          className="btn btn-primary"
          onClick={addSeason}
        >
          <Plus size={16} />
          Add Season
        </button>
      </div>

      {form.seasons.map(
        (season, seasonIndex) => (
          <SeasonSection
            key={seasonIndex}
            season={season}
            seasonIndex={seasonIndex}

            form={form}
            setForm={setForm}

            addEp={addEp}
            removeSeason={removeSeason}

            chEp={chEp}
            removeEp={removeEp}

            episodeVideoFiles={
              episodeVideoFiles
            }

            episodeThumbnailFiles={
              episodeThumbnailFiles
            }

            handleEpisodeVideoChange={
              handleEpisodeVideoChange
            }

            handleEpisodeThumbnailChange={
              handleEpisodeThumbnailChange
            }

            setEpisodeVideoFiles={
              setEpisodeVideoFiles
            }

            setEpisodeThumbnailFiles={
              setEpisodeThumbnailFiles
            }
          />
        )
      )}

      {form.seasons.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "40px",
            background:
              "rgba(255,255,255,0.02)",
            borderRadius: "16px",
            border:
              "2px dashed rgba(255,255,255,0.05)",
          }}
        >
          <Tv
            size={48}
            style={{
              color:
                "rgba(255,255,255,0.1)",
              marginBottom: 16,
            }}
          />

          <p
            style={{
              color: "var(--text-muted)",
            }}
          >
            Click "Add Season" to start
            building your TV Series
          </p>
        </div>
      )}
    </div>
  );
}
