import PosterUploader from "../uploads/PosterUploader";
import BannerUploader from "../uploads/BannerUploader";
import TrailerUploader from "../uploads/TrailerUploader";
import VideoUploader from "../uploads/VideoUploader";
import { Images } from "lucide-react";

export default function MediaAssetsStep({
  form,
  ch,

  posterFile,
  posterInputRef,
  handlePosterFileChange,
  bannerFile,
  bannerInputRef,
  handleBannerFileChange,
  trailerFile,
  trailerInputRef,
  handleTrailerFileChange,
  videoFile,
  videoInputRef,
  handleVideoFileChange,
  type,
  isComingSoon,
}) {
  return (
    <div className="premium-card media-assets-card">
      <div className="media-card-header">
        <h3 className="section-title media-section-title">
          <span>
            <Images size={18} />
          </span>

          <div>
            Visual Assets & Media
            <small>
              Add artwork, trailers, and source media for this title.
            </small>
          </div>
        </h3>
      </div>

      <div className="form-grid-3 media-assets-grid">

        <PosterUploader
          file={posterFile}
          value={form.poster}
          onUrlChange={ch}
          inputRef={posterInputRef}
          onFileChange={handlePosterFileChange}
        />

        <BannerUploader
          file={bannerFile}
          value={form.banner}
          onUrlChange={ch}
          inputRef={bannerInputRef}
          onFileChange={handleBannerFileChange}
        />

        <TrailerUploader
          file={trailerFile}
          value={form.trailerUrl}
          onUrlChange={ch}
          inputRef={trailerInputRef}
          onFileChange={handleTrailerFileChange}
        />

        {type === "movie" && !isComingSoon && (
          <VideoUploader
            file={videoFile}
            value={form.videoUrl}
            onUrlChange={ch}
            inputRef={videoInputRef}
            onFileChange={handleVideoFileChange}
          />
        )}

      </div>
    </div>
  );
}
