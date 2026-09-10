import { useState, useRef, useEffect } from "react";

import "./Dashboard.css";

import MediaAssetsStep from "../features/content/steps/MediaAssetsStep";
import CastSection from "../features/content/cast/CastSection";
import SeasonsSection from "../features/content/seasons/SeasonsSection";
import BasicInfoSection from "../features/content/basic/BasicInfoSection";

import { createContent } from "../features/services/content.service";
import useContentForm from "../features/hooks/useContentForm";
import API from "../api/axios";

import {
  Plus,
  Film,
  Tv,
  Rocket,
  ChevronRight,
} from "lucide-react";

export default function AddContent() {
  const {
    form,
    setForm,

    ch,
    setType,

    addCast,
    removeCast,


    chCast,

    addSeason,
    removeSeason,

    addEp,
    removeEp,
    chEp,

    resetForm,
  } = useContentForm();

  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadPhase, setUploadPhase] = useState(""); // "main", "episodes", "complete"
  const [currentEpisodeInfo, setCurrentEpisodeInfo] = useState({ current: 0, total: 0 });

  // ── Category State ──────────────────────────
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    API.get("/admin/categories")
      .then(res => setCategories(res.data.categories || []))
      .catch(console.error);
  }, []);

  const handleAddCategory = (slug) => {
    if (!form.category.includes(slug)) {
      setForm(f => ({ ...f, category: [...f.category, slug] }));
    }
  };

  const handleRemoveCategory = (slug) => {
    setForm(f => ({ ...f, category: f.category.filter(c => c !== slug) }));
  };

  const handleCreateCategory = async (name, color = "#6366f1", priority = 1) => {
    try {
      const res = await API.post("/admin/categories", { name, color, priority });
      const newCat = res.data.category;
      setCategories(prev => [...prev, newCat].sort((a,b) => (a.priority || 1) - (b.priority || 1)));
      setForm(f => ({ ...f, category: [...f.category, newCat.slug] }));
      return newCat;
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create category");
      return null;
    }
  };

  const handleUpdateCategory = async (id, name, color, priority) => {
    try {
      const res = await API.patch(`/admin/categories/${id}`, { name, color, priority });
      const updatedCat = res.data.category;
      setCategories(prev => prev.map(c => c._id === id ? updatedCat : c).sort((a,b) => (a.priority || 1) - (b.priority || 1)));
      
      // If the slug changed, update it in form.category too
      const oldCat = categories.find(c => c._id === id);
      if (oldCat && oldCat.slug !== updatedCat.slug) {
        setForm(f => ({
          ...f,
          category: f.category.map(slug => slug === oldCat.slug ? updatedCat.slug : slug)
        }));
      }
      return updatedCat;
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update category");
      return null;
    }
  };

  const handleDeleteCategory = async (id) => {
    try {
      await API.delete(`/admin/categories/${id}`);
      const deletedCat = categories.find(c => c._id === id);
      setCategories(prev => prev.filter(c => c._id !== id));
      if (deletedCat) {
        setForm(f => ({ ...f, category: f.category.filter(slug => slug !== deletedCat.slug) }));
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete category");
    }
  };



  const [videoFile, setVideoFile] =
    useState(null);

  const [posterFile, setPosterFile] =
    useState(null);

  const [bannerFile, setBannerFile] =
    useState(null);

  const [trailerFile, setTrailerFile] =
    useState(null);

  const [
    episodeVideoFiles,
    setEpisodeVideoFiles,
  ] = useState({});

  const [
    episodeThumbnailFiles,
    setEpisodeThumbnailFiles,
  ] = useState({});

  const [castFiles, setCastFiles] =
    useState({});

  // File Input Refs
  const videoInputRef = useRef(null);

  const posterInputRef =
    useRef(null);

  const bannerInputRef =
    useRef(null);

  const trailerInputRef =
    useRef(null);

  const getFullUrl = (url) => {
    if (!url) return "";

    if (
      /^(https?:\/\/|data:|blob:|\/\/)/i.test(
        url
      )
    ) {
      return url;
    }

    return url;
  };

  // Upload Handlers
  const handleVideoFileChange = (e) => {
    const file = e.target.files?.[0];

    if (file) {
      setVideoFile(file);
    }
  };

  const handlePosterFileChange = (
    e
  ) => {
    const file = e.target.files?.[0];

    if (file) {
      setPosterFile(file);
    }
  };

  const handleBannerFileChange = (
    e
  ) => {
    const file = e.target.files?.[0];

    if (file) {
      setBannerFile(file);
    }
  };

  const handleTrailerFileChange = (
    e
  ) => {
    const file = e.target.files?.[0];

    if (file) {
      setTrailerFile(file);
    }
  };

  const handleEpisodeVideoChange = (
    seasonIndex,
    episodeIndex,
    e
  ) => {
    const file = e.target.files?.[0];

    if (file) {
      const key =
        `${seasonIndex}_${episodeIndex}`;

      setEpisodeVideoFiles(
        (prev) => ({
          ...prev,
          [key]: file,
        })
      );
    }
  };

  const handleEpisodeThumbnailChange =
    (
      seasonIndex,
      episodeIndex,
      e
    ) => {
      const file =
        e.target.files?.[0];

      if (file) {
        const key =
          `${seasonIndex}_${episodeIndex}`;

        setEpisodeThumbnailFiles(
          (prev) => ({
            ...prev,
            [key]: file,
          })
        );
      }
    };

  const handleCastFileChange = (
    index,
    e
  ) => {
    const file = e.target.files?.[0];

    if (file) {
      setCastFiles((prev) => ({
        ...prev,
        [index]: file,
      }));
    }
  };

  // Prevent Enter key from submitting form when typing inside input fields
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && e.target.tagName === "INPUT") {
      e.preventDefault();
    }
  };

  // Submit
 // Submit
const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  setUploadProgress(0);
  setUploadPhase("main");

  try {
    await createContent({
      form,
      videoFile, posterFile, bannerFile, trailerFile,
      castFiles,
      episodeVideoFiles, episodeThumbnailFiles,

      onTrailerProgress: (percent) => {
        setUploadProgress(percent);
      },

      onVideoProgress: (percent) => {
        setUploadProgress(percent);
        if (percent === 100) {
          setUploadPhase(form.type === "movie" ? "complete" : "episodes");
        }
      },

      onEpisodeProgress: (current, total, percent) => {
        setUploadPhase("episodes");
        setCurrentEpisodeInfo({ current, total });
        setUploadProgress(percent);
        if (current === total && percent === 100) {
          setUploadPhase("complete");
        }
      },                              // ← callback ends here, no reset inside
    });

    alert("Content published successfully! 🚀");

    // ✅ Reset HERE — after await resolves, everything is done
    resetForm();
    setVideoFile(null);
    setPosterFile(null);
    setBannerFile(null);
    setTrailerFile(null);
    setEpisodeVideoFiles({});
    setEpisodeThumbnailFiles({});
    setCastFiles({});
    setUploadProgress(0);
    setUploadPhase("");
    setCurrentEpisodeInfo({ current: 0, total: 0 });

  } catch (err) {
    console.error(err);
    alert(err.response?.data?.message || "Error publishing content");
    setUploadProgress(0);
    setUploadPhase("");
  }

  setLoading(false);
};
  

  return (
    <div className="add-content-page">

      {/* Header */}
      <div
        className="pg-header"
        style={{
          alignItems: "center",
        }}
      >
        <div>
          <h1 className="pg-title">
            <Plus
              size={24}
              style={{
                color:
                  "var(--primary)",
              }}
            />

            Publish New Content
          </h1>

          <p className="pg-sub">
            Fill in the details below
            to add a {form.type} to
            the platform
          </p>
        </div>

        <div className="content-type-toggle">
          <button
            type="button"
            className={`toggle-btn ${form.type === "movie"
              ? "active"
              : ""
              }`}
            onClick={() =>
              setType("movie")
            }
          >
            <Film size={18} />
            Movies
          </button>

          <button
            type="button"
            className={`toggle-btn ${form.type === "series"
              ? "active"
              : ""
              }`}
            onClick={() =>
              setType("series")
            }
          >
            <Tv size={18} />
            Web Series
          </button>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        onKeyDown={handleKeyDown}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 30,
        }}
      >

        <BasicInfoSection
          form={form}
          ch={ch}
          categories={categories}
          onAddCategory={handleAddCategory}
          onRemoveCategory={handleRemoveCategory}
          onCreateCategory={handleCreateCategory}
          onUpdateCategory={handleUpdateCategory}
          onDeleteCategory={handleDeleteCategory}
        />

        <MediaAssetsStep
          form={form}
          ch={ch}

          posterFile={posterFile}
          posterInputRef={
            posterInputRef
          }
          handlePosterFileChange={
            handlePosterFileChange
          }

          bannerFile={bannerFile}
          bannerInputRef={
            bannerInputRef
          }
          handleBannerFileChange={
            handleBannerFileChange
          }

          trailerFile={trailerFile}
          trailerInputRef={
            trailerInputRef
          }
          handleTrailerFileChange={
            handleTrailerFileChange
          }

          videoFile={videoFile}
          videoInputRef={
            videoInputRef
          }
          handleVideoFileChange={
            handleVideoFileChange
          }

          type={form.type}
          isComingSoon={
            form.isComingSoon
          }
        />

        <CastSection
          cast={form.cast}
          castFiles={castFiles}
          addCast={addCast}
          removeCast={removeCast}
          chCast={chCast}
          handleCastFileChange={
            handleCastFileChange
          }
          getFullUrl={getFullUrl}
        />

        <SeasonsSection
          form={form}
          setForm={setForm}

          addSeason={addSeason}
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



        {loading && (
          <div
            className="upload-progress-card"
            style={{
              padding: "24px",
              borderRadius: "16px",
              background: "rgba(30, 30, 40, 0.6)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              marginTop: "20px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  className="spinner"
                  style={{
                    width: 20,
                    height: 20,
                    border: "3px solid rgba(230, 57, 70, 0.2)",
                    borderTopColor: "var(--primary)",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                  }}
                />
                <span style={{ fontSize: "16px", fontWeight: "600", color: "#fff" }}>
                  {uploadPhase === "main" && (form.type === "movie" ? "Uploading Movie Assets..." : "Uploading TV Series Details...")}
                  {uploadPhase === "episodes" && `Uploading Episode ${currentEpisodeInfo.current} of ${currentEpisodeInfo.total}...`}
                  {uploadPhase === "complete" && "Finalizing and Publishing Content..."}
                </span>
              </div>
              <span style={{ fontSize: "16px", fontWeight: "700", color: "var(--primary)" }}>
                {uploadProgress}%
              </span>
            </div>

            <div
              style={{
                width: "100%",
                height: "10px",
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                borderRadius: "999px",
                overflow: "hidden",
                border: "1px solid rgba(255, 255, 255, 0.05)",
              }}
            >
              <div
                style={{
                  width: `${uploadProgress}%`,
                  height: "100%",
                  background: "linear-gradient(90deg, #e30914 0%, #ff4d5a 100%)",
                  borderRadius: "999px",
                  transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                  boxShadow: "0 0 12px rgba(227, 9, 20, 0.5)",
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#8a8b98" }}>
              <span>Please keep this window open until publishing is complete.</span>
              {uploadPhase === "main" && (
                <span>
                  {videoFile || trailerFile ? "Sending media chunks to CDN..." : "Uploading metadata..."}
                </span>
              )}
              {uploadPhase === "episodes" && (
                <span>
                  Season {form.seasons.find((_, i) => {
                    let totalBefore = 0;
                    for (let sIdx = 0; sIdx < i; sIdx++) {
                      totalBefore += form.seasons[sIdx].episodes.length;
                    }
                    return currentEpisodeInfo.current <= totalBefore + form.seasons[i].episodes.length;
                  })?.seasonNumber || 1}
                </span>
              )}
              {uploadPhase === "complete" && <span>Syncing CDN distribution nodes...</span>}
            </div>
          </div>
        )}

        {/* Submit */}
        <div
          className="submit-row"
          style={{
            marginTop: 20,
          }}
        >
          <button
            type="submit"
            className="btn-lg"
            disabled={loading}
            style={{
              minWidth: "240px",
              height: "60px",

              display: "flex",
              alignItems: "center",
              justifyContent:
                "center",

              gap: 12,
            }}
          >
            {loading ? (
              <>
                <div
                  className="spinner"
                  style={{
                    width: 20,
                    height: 20,

                    border:
                      "3px solid rgba(255,255,255,0.3)",

                    borderTopColor:
                      "white",

                    borderRadius: "50%",

                    animation:
                      "spin 1s linear infinite",
                  }}
                />

                <span>
                  Publishing...
                </span>
              </>
            ) : (
              <>
                <Rocket size={20} />

                <span>
                  Publish to Platform
                </span>

                <ChevronRight
                  size={18}
                />
              </>
            )}
          </button>
        </div>
      </form>

      <style>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
