import { Users, Upload, X } from "lucide-react";

export default function CastMemberCard({
  cast,
  index,
  castFile,
  getFullUrl,
  removeCast,
  chCast,
  handleCastFileChange,
}) {
  return (
    <div className="cast-member-card">
      <button
        type="button"
        className="remove-cast-btn"
        onClick={() => removeCast(index)}
      >
        <X size={14} />
      </button>

      <div
        className="cast-preview-circle"
        style={{
          width: 60,
          height: 60,
          borderRadius: "50%",
          margin: "0 auto 12px",
          background: "var(--bg3)",
          border: "2px solid var(--border)",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {(castFile || cast.image) ? (
          <img
            src={
              castFile
                ? URL.createObjectURL(castFile)
                : getFullUrl(cast.image)
            }
            alt=""
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          <Users size={24} style={{ opacity: 0.3 }} />
        )}
      </div>

      <div className="form-row">
        <input
          className="form-input-styled"
          placeholder="Actor Name"
          value={cast.name}
          onChange={(e) =>
            chCast(index, "name", e.target.value)
          }
        />
      </div>

      <div className="form-row">
        <div
          className={`file-upload-box ${
            castFile ? "has-file" : ""
          }`}
          style={{ padding: "10px" }}
          onClick={() =>
            document
              .getElementById(`cast-file-${index}`)
              .click()
          }
        >
          <Upload size={16} />

          <span style={{ fontSize: "0.75rem" }}>
            {castFile
              ? castFile.name
              : "Upload Photo"}
          </span>

          <input
            id={`cast-file-${index}`}
            type="file"
            hidden
            accept="image/*"
            onChange={(e) =>
              handleCastFileChange(index, e)
            }
          />
        </div>

        {!castFile && (
          <input
            className="form-input-styled"
            style={{
              fontSize: "0.8rem",
              marginTop: 4,
            }}
            placeholder="Or Photo URL"
            value={cast.image}
            onChange={(e) =>
              chCast(
                index,
                "image",
                e.target.value
              )
            }
          />
        )}
      </div>
    </div>
  );
}
