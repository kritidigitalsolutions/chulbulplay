import { Video } from "lucide-react";

export default function TrailerUploader({
  file,
  value,
  onUrlChange,
  inputRef,
  onFileChange,
}) {
  return (
    <div className="form-row">
      <label className="form-label">Trailer Video</label>

      <div
        className={`file-upload-box ${file ? "has-file" : ""}`}
        onClick={() => inputRef.current?.click()}
      >
        <Video
          size={24}
          color={file ? "var(--green)" : "var(--text-muted)"}
        />

        <p style={{ fontSize: "0.8rem", margin: 0 }}>
          {file ? file.name : "Upload Trailer"}
        </p>

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
          style={{ marginTop: 8 }}
          name="trailerUrl"
          placeholder="Or paste URL"
          onChange={onUrlChange}
          value={value}
        />
      )}
    </div>
  );
}
