import { Palette } from "lucide-react";

export default function BannerUploader({
  file,
  value,
  onUrlChange,
  inputRef,
  onFileChange,
}) {
  return (
    <div className="form-row">
      <label className="form-label">Banner (Horizontal)</label>

      <div
        className={`file-upload-box ${file ? "has-file" : ""}`}
        onClick={() => inputRef.current?.click()}
      >
        <Palette
          size={24}
          color={file ? "var(--green)" : "var(--text-muted)"}
        />

        <p style={{ fontSize: "0.8rem", margin: 0 }}>
          {file ? file.name : "Upload Banner"}
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
          name="banner"
          placeholder="Or paste URL"
          onChange={onUrlChange}
          value={value}
        />
      )}
    </div>
  );
}
