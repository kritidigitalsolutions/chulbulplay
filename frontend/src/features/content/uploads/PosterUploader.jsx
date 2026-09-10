import { Upload } from "lucide-react";

export default function PosterUploader({
  file,
  value,
  onUrlChange,
  inputRef,
  onFileChange,
}) {
  return (
    <div className="form-row">
      <label className="form-label">Poster (Vertical)</label>

      <div
        className={`file-upload-box ${file ? "has-file" : ""}`}
        onClick={() => inputRef.current?.click()}
      >
        <Upload
          size={24}
          color={file ? "var(--green)" : "var(--text-muted)"}
        />

        <p style={{ fontSize: "0.8rem", margin: 0 }}>
          {file ? file.name : "Upload Poster"}
        </p>

        <input
          type="file"
          ref={inputRef}
          hidden
          accept="image/*"
          onChange={onFileChange}
        />
      </div>

      {!file && (
        <input
          className="form-input-styled"
          style={{ marginTop: 8 }}
          name="poster"
          placeholder="Or paste URL"
          onChange={onUrlChange}
          value={value}
        />
      )}
    </div>
  );
}
