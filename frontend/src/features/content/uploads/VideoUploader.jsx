import { Play } from "lucide-react";

export default function VideoUploader({
  file,
  value,
  onUrlChange,
  inputRef,
  onFileChange,
}) {
  return (
    <div className="form-row" style={{ marginTop: 24 }}>
      <label className="form-label">Full Movie Content</label>

      <div className="form-2col" style={{ gap: 20 }}>
        <div
          className={`file-upload-box ${file ? "has-file" : ""}`}
          onClick={() => inputRef.current?.click()}
          style={{
            flexDirection: "row",
            padding: "12px 24px",
            height: "fit-content",
          }}
        >
          <Play
            size={20}
            color={file ? "var(--green)" : "var(--text-muted)"}
          />

          <span style={{ fontSize: "0.9rem" }}>
            {file ? file.name : "Choose Movie File"}
          </span>

          <input
            type="file"
            ref={inputRef}
            hidden
            accept="video/*"
            onChange={onFileChange}
          />
        </div>

        {!file && (
          <input
            className="form-input-styled"
            name="videoUrl"
            placeholder="Or paste Direct Video URL"
            onChange={onUrlChange}
            value={value}
          />
        )}
      </div>
    </div>
  );
}
