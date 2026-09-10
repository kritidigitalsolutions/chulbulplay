import API from "../../api/axios";
import { uploadToBunny } from "./bunnyUpload";

export const createContent = async ({
  form,

  videoFile,
  posterFile,
  bannerFile,
  trailerFile,

  castFiles,

  episodeVideoFiles,
  episodeThumbnailFiles,

  onVideoProgress,
  onTrailerProgress,
  onEpisodeProgress,
}) => {
  const isMovie = form.type === "movie";
  const typeFolder = isMovie ? "movies" : "series";

  // 1. Upload Cast Images directly to Bunny CDN
  const updatedCast = [...form.cast];
  const castKeys = Object.keys(castFiles);
  for (const key of castKeys) {
    const file = castFiles[key];
    if (file) {
      if (onVideoProgress) onVideoProgress(5); // Show startup activity
      const cdnUrl = await uploadToBunny(file, typeFolder, "cast");
      const idx = Number(key);
      if (updatedCast[idx]) {
        updatedCast[idx].image = cdnUrl;
      }
    }
  }

  // 2. Upload Main Poster directly to Bunny CDN
  let posterUrl = form.poster || "";
  if (posterFile) {
    if (onVideoProgress) onVideoProgress(15);
    posterUrl = await uploadToBunny(posterFile, typeFolder, "posters");
  }

  // 3. Upload Main Banner directly to Bunny CDN
  let bannerUrl = form.banner || "";
  if (bannerFile) {
    if (onVideoProgress) onVideoProgress(25);
    bannerUrl = await uploadToBunny(bannerFile, typeFolder, "banners");
  }

  // 4. Upload Trailer directly to Bunny CDN
  let trailerUrl = form.trailerUrl || "";
  if (trailerFile) {
  trailerUrl = await uploadToBunny(trailerFile, typeFolder, "trailers", (percent) => {
    const scaledPercent = 25 + Math.round(percent * 0.15); // maps to 25%→40% range
    if (onTrailerProgress) onTrailerProgress(scaledPercent);
  });
}

  // 5. Upload Movie Main Video directly to Bunny CDN
  let videoUrl = form.videoUrl || "";
  if (isMovie && videoFile) {
    // Pipe the progress event to onVideoProgress (between 50% and 100%)
    videoUrl = await uploadToBunny(videoFile, "movies", "videos", (percent) => {
      const scaledPercent = 50 + Math.round(percent / 2);
      if (onVideoProgress) onVideoProgress(scaledPercent);
    });
  } else if (onVideoProgress) {
    onVideoProgress(100);
  }

  // 6. Build Text-only Request Data
  const endpoint = isMovie ? "/admin/movies/add" : "/admin/series/add";
  const formData = new FormData();

  formData.append("title", form.title);
  formData.append("description", form.description);
  formData.append("language", form.language);
  formData.append("releaseYear", form.releaseYear ? Number(form.releaseYear) : "");
  formData.append("duration", form.duration);
  formData.append("isPremium", String(form.isPremium));
  formData.append("isPublished", String(form.isPublished));
  formData.append("isComingSoon", String(form.isComingSoon));
  formData.append("releaseDate", form.releaseDate || "");
  formData.append("priority", Number(form.priority) || 0);
  formData.append("rating", form.rating ? Number(form.rating) : 0);

  formData.append(
    "genre",
    JSON.stringify(
      form.genre.split(",").map((s) => s.trim()).filter(Boolean)
    )
  );

  formData.append(
    "category",
    JSON.stringify(Array.isArray(form.category) ? form.category : [])
  );

  // Send the Bunny CDN URLs directly as text inputs!
  formData.append("poster", posterUrl);
  formData.append("banner", bannerUrl);
  formData.append("trailerUrl", trailerUrl);
  if (isMovie) {
    formData.append("videoUrl", videoUrl);
  }

  // Send the Cast details containing their direct Bunny URLs
  formData.append("cast", JSON.stringify(updatedCast));

  console.log("POSTING MOVIE DATA");
console.log({
  posterUrl,
  bannerUrl,
  trailerUrl,
  videoUrl,
  cast: updatedCast,
});

  // Post meta to the backend (Express backend will save to DB instantly!)
  const response = await API.post(endpoint, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  console.log("MOVIE CREATED");
console.log(response.data);

  // 7. If it is Web Series, upload individual episodes directly to Bunny CDN and save
  if (!isMovie && form.seasons.length > 0) {
    const seriesId = response.data.series._id;

    let totalEpisodes = 0;
    form.seasons.forEach((season) => {
      totalEpisodes += (season.episodes || []).length;
    });
    let currentEpisodeNum = 1;

    for (const [si, season] of form.seasons.entries()) {
      for (const [ei, ep] of season.episodes.entries()) {
        const episodeKey = `${si}_${ei}`;
        let epVideoUrl = ep.videoUrl || "";
        let epThumbnailUrl = ep.thumbnailUrl || "";

        // Track episode uploading status
        const epNum = currentEpisodeNum++;

        // Direct upload episode video file
        if (episodeVideoFiles[episodeKey]) {
          epVideoUrl = await uploadToBunny(
            episodeVideoFiles[episodeKey],
            "episodes",
            "videos",
            (percent) => {
              if (onEpisodeProgress) {
                // Video takes up 80% of the upload progress
                const videoPct = Math.round(percent * 0.8);
                onEpisodeProgress(epNum, totalEpisodes, videoPct);
              }
            }
          );
        }

        // Direct upload episode thumbnail
        if (episodeThumbnailFiles[episodeKey]) {
          epThumbnailUrl = await uploadToBunny(
            episodeThumbnailFiles[episodeKey],
            "episodes",
            "posters",
            (percent) => {
              if (onEpisodeProgress) {
                // Thumbnail takes up the remaining 20%
                const thumbPct = 80 + Math.round(percent * 0.2);
                onEpisodeProgress(epNum, totalEpisodes, thumbPct);
              }
            }
          );
        }

        // Build simple text data for episode additions
        const epFormData = new FormData();
        epFormData.append("seriesId", seriesId);
        epFormData.append("seasonNumber", season.seasonNumber);
        epFormData.append("episodeNumber", ei + 1);
        epFormData.append("title", ep.title);
        epFormData.append("description", ep.description || "");
        epFormData.append("duration", ep.duration || "");
        epFormData.append("videoUrl", epVideoUrl);
        epFormData.append("thumbnailUrl", epThumbnailUrl);

        // Submit metadata to backend
        await API.post("/admin/episodes/add", epFormData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        // Set to 100% complete for this episode
        if (onEpisodeProgress) {
          onEpisodeProgress(epNum, totalEpisodes, 100);
        }
      }
    }
  }

  return response.data;
};
