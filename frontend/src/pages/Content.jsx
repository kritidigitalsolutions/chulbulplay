import { useState, useEffect, useRef } from "react";
import API, { BASE_URL } from "../api/axios";
import { uploadToBunny } from "../features/services/bunnyUpload";

import "./Content.css";
import {
  Eye, Edit2, Trash2, X, Play, Film, Tv,
  Search, Plus, ChevronRight, ChevronLeft, ChevronDown, User, Calendar, Video,
  Activity, Upload, ToggleLeft, ToggleRight
} from "lucide-react";

/* ===================== PAGINATION COMPONENT ===================== */
const Pagination = ({ currentPage, totalPages, totalItems, onPageChange }) => {
  if (totalPages <= 1) return null;
  return (
    <div className="pagination" style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 15, marginTop: 25, padding: "10px 0" }}>
      <button
        className="btn btn-ghost"
        disabled={currentPage === 1}
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
      >
        Previous
      </button>
      <span style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>
        Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({totalItems} total)
      </span>
      <button
        className="btn btn-ghost"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
      >
        Next
      </button>
    </div>
  );
};

/* ===================== SEARCHBAR COMPONENT ===================== */
const SearchBar = ({ placeholder, onSearchChange, onClear, initialValue }) => {
  const [value, setValue] = useState(initialValue || "");
  const timeoutRef = useRef(null);

  useEffect(() => {
    setValue(initialValue || "");
  }, [initialValue]);

  const handleChange = (e) => {
    const val = e.target.value;
    setValue(val);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      onSearchChange(val);
    }, 400);
  };

  const handleClear = () => {
    setValue("");
    onClear();
  };

  return (
    <div className="search-bar" style={{ minWidth: "300px" }}>
      <Search size={18} className="search-icon" />
      <input
        className="search-input"
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
      />
      {value && (
        <button className="search-clear" onClick={handleClear}><X size={16} /></button>
      )}
    </div>
  );
};

export default function Content() {
  // Prevent Enter key from submitting form when typing inside input fields
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && e.target.tagName === "INPUT") {
      e.preventDefault();
    }
  };

  const [contentType, setContentType] = useState("movies");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null); // null = not searching
  const [isSearching, setIsSearching] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);


  const [selectedSeries, setSelectedSeries] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [episodeSearchQuery, setEpisodeSearchQuery] = useState("");
  const [collapsedSeasons, setCollapsedSeasons] = useState({});

  const [selectedItem, setSelectedItem] = useState(null);
  const [modalMode, setModalMode] = useState(null);
  const [editData, setEditData] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadPhase, setUploadPhase] = useState(""); // "saving", "complete", ""
  const [selectedEpisode, setSelectedEpisode] = useState(null);
  const [uploadData, setUploadData] = useState({
    poster: null, banner: null, trailer: null, video: null
  });
  const [castFiles, setCastFiles] = useState({}); // { index: File }

  // Category lookup map: slug → { name, color }
  const [catMap, setCatMap] = useState({});
  useEffect(() => {
    API.get("/admin/categories")
      .then(res => {
        const map = {};
        (res.data.categories || []).forEach(c => { map[c.slug] = c; });
        setCatMap(map);
      })
      .catch(console.error);
  }, []);


  // Add season/episode forms
  const [showAddEpisodeForm, setShowAddEpisodeForm] = useState(null); // seasonNumber
  const [newEpisode, setNewEpisode] = useState({ title: "", episodeNumber: "", duration: "", description: "", seasonNumber: "" });
  const [newEpisodeVideo, setNewEpisodeVideo] = useState(null);
  const [newEpisodeThumbnail, setNewEpisodeThumbnail] = useState(null);
  const [newEpisodeVideoUrl, setNewEpisodeVideoUrl] = useState("");
  const [newEpisodeThumbnailUrl, setNewEpisodeThumbnailUrl] = useState("");
  const [showAddSeasonForm, setShowAddSeasonForm] = useState(false);
  const [newSeasonNumber, setNewSeasonNumber] = useState("");
  const [addingEpisode, setAddingEpisode] = useState(false);

  const PRESET_COLORS = ["#6366f1","#10b981","#f59e0b","#ef4444","#3b82f6","#8b5cf6","#ec4899","#06b6d4","#f97316"];


  const videoRef = useRef(null);
  const searchTimeout = useRef(null);

  const getFullUrl = (url) => {
    if (!url) return "";
    // Check if it's already a full URL (http, https, data:, blob:, or //)
    const isFullUrl = /^(https?:\/\/|data:|blob:|\/\/)/i.test(url);
    if (isFullUrl) return url;

    if (url.startsWith("/uploads") || url.includes("uploads/")) {
      console.warn(`[LEGACY] Media url using local filesystem path detected: ${url}. Migrate this database entry to BunnyCDN.`);
    }

    // Otherwise, append BASE_URL and ensure proper slash handling
    const cleanBase = BASE_URL.endsWith("/") ? BASE_URL.slice(0, -1) : BASE_URL;
    const cleanPath = url.startsWith("/") ? url : `/${url}`;
    return `${cleanBase}${cleanPath}`;
  };

  const getYouTubeId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };



  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    setSearchQuery("");
    setSearchResults(null);
    return () => {
      controller.abort();
    };
  }, [contentType, currentPage]);

  /* ===================== LOCK LOGIC ===================== */
  const isLocked = (item) => {
    // if (!item.isComingSoon) return false;
    if (!item.releaseDate) return false;
    return new Date(item.releaseDate) > new Date();
  };

  // Coming-soon: view & edit allowed, but video upload locked (trailer OK)
  const isVideoUploadLocked = (item) => isLocked(item);

  /* ===================== DATA FETCH ===================== */
  const fetchData = async (signal) => {
    setLoading(true);
    try {
      const endpoint = contentType === "movies" ? "/admin/movies" : "/admin/series";
      const res = await API.get(`${endpoint}?page=${currentPage}&limit=10`, { signal });

      const key = contentType === "movies" ? "movies" : "series";
      setData(res.data[key] || []);
      setTotalPages(res.data.pages || 1);
      setTotalItems(res.data.total || 0);

      setSelectedSeries(null);
      setEpisodes([]);
    } catch (err) {
      if (err.name !== "CanceledError") {
        console.error(err);
        setData([]);
      }
    }
    setLoading(false);
  };


  const fetchEpisodes = async (seriesId) => {
    try {
      const res = await API.get(`/admin/episodes?seriesId=${seriesId}`);
      const eps = res.data.episodes || [];
      setEpisodes(eps);

      // Auto-sync series totalSeasons locally to reflect in UI instantly
      const maxS = eps.length > 0 ? Math.max(...eps.map(e => e.seasonNumber)) : 0;
      setSelectedSeries(prev => prev ? { ...prev, totalSeasons: Math.max(prev.totalSeasons || 0, maxS) } : prev);
      setData(prevData => prevData.map(s => s._id === seriesId ? { ...s, totalSeasons: Math.max(s.totalSeasons || 0, maxS) } : s));
      setSearchResults(prev => prev ? prev.map(s => s._id === seriesId ? { ...s, totalSeasons: Math.max(s.totalSeasons || 0, maxS) } : s) : prev);
    } catch (err) {
      console.error(err);
      setEpisodes([]);
    }
  };


  /* ===================== SEARCH ===================== */
  const handleSearchChange = (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!q.trim()) { setSearchResults(null); return; }
    searchTimeout.current = setTimeout(() => doSearch(q.trim()), 400);
  };

  const doSearch = async (q) => {
    setIsSearching(true);
    try {
      const endpoint = contentType === "movies" ? `/admin/movies/search?q=${encodeURIComponent(q)}` : `/admin/series/search?q=${encodeURIComponent(q)}`;
      const res = await API.get(endpoint);
      setSearchResults(res.data.results || []);
    } catch (err) {
      // Fallback to local search if admin search endpoint doesn't exist
      const localResults = data.filter(item =>
        item.title.toLowerCase().includes(q.toLowerCase())
      );
      setSearchResults(localResults);
    }
    setIsSearching(false);
  };


  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults(null);
  };

  const displayData = searchResults !== null ? searchResults : data;

  /* ===================== SERIES / EPISODES ===================== */
  const handleSeriesClick = (series) => {
    setSelectedSeries(series);
    fetchEpisodes(series._id);
    setCollapsedSeasons({});
    setEpisodeSearchQuery("");
  };

  const groupEpisodesBySeason = () => {
    const grouped = {};
    const filteredEpisodes = episodeSearchQuery.trim()
      ? episodes.filter(ep =>
        ep.title.toLowerCase().includes(episodeSearchQuery.toLowerCase()) ||
        ep.seasonNumber.toString() === episodeSearchQuery.trim() ||
        ep.episodeNumber.toString() === episodeSearchQuery.trim()
      )
      : episodes;

    filteredEpisodes.forEach(ep => {
      if (!grouped[ep.seasonNumber]) grouped[ep.seasonNumber] = [];
      grouped[ep.seasonNumber].push(ep);
    });
    return grouped;
  };

  const toggleSeason = (seasonNum) => {
    setCollapsedSeasons(prev => ({ ...prev, [seasonNum]: !prev[seasonNum] }));
  };

  /* ===================== ADD EPISODE ===================== */
  const handleAddEpisode = async (seasonNumber) => {
    const epData = showAddEpisodeForm === "new-season"
      ? { ...newEpisode, seasonNumber: Number(newSeasonNumber) }
      : { ...newEpisode, seasonNumber: Number(seasonNumber) };

    if (!epData.title || !epData.episodeNumber || !epData.seasonNumber) {
      alert("Title, Episode Number, and Season Number are required");
      return;
    }
    setAddingEpisode(true);
    try {
      let videoUrl = newEpisodeVideoUrl || "";
      if (newEpisodeVideo) {
        videoUrl = await uploadToBunny(newEpisodeVideo, "episodes", "videos");
      }
      let thumbnailUrl = newEpisodeThumbnailUrl || "";
      if (newEpisodeThumbnail) {
        thumbnailUrl = await uploadToBunny(newEpisodeThumbnail, "episodes", "posters");
      }

      const formData = new FormData();
      formData.append("seriesId", selectedSeries._id);
      formData.append("title", epData.title);
      formData.append("episodeNumber", epData.episodeNumber);
      formData.append("seasonNumber", epData.seasonNumber);
      formData.append("duration", epData.duration || "");
      formData.append("description", epData.description || "");
      formData.append("videoUrl", videoUrl);
      formData.append("thumbnailUrl", thumbnailUrl);

      await API.post("/admin/episodes/add", formData, { headers: { "Content-Type": "multipart/form-data" } });

      alert("Episode added successfully!");
      setShowAddEpisodeForm(null);
      setShowAddSeasonForm(false);
      setNewEpisode({ title: "", episodeNumber: "", duration: "", description: "", seasonNumber: "" });
      setNewSeasonNumber("");
      setNewEpisodeVideo(null);
      setNewEpisodeThumbnail(null);
      setNewEpisodeVideoUrl("");
      setNewEpisodeThumbnailUrl("");
      fetchEpisodes(selectedSeries._id);

    } catch (err) {
      alert("Failed: " + (err.response?.data?.message || err.message));
    }
    setAddingEpisode(false);
  };

  /* ===================== DELETE SEASON ===================== */
  const handleDeleteSeason = async (seasonNumber) => {
    const confirmed = window.confirm(`Delete ALL episodes in Season ${seasonNumber}? This cannot be undone.`);
    if (!confirmed) return;
    try {
      await API.delete(`/admin/episodes/season/${selectedSeries._id}/${seasonNumber}`);

      alert(`Season ${seasonNumber} deleted`);
      fetchEpisodes(selectedSeries._id);
    } catch (err) {
      alert("Failed to delete season: " + (err.response?.data?.message || err.message));
    }
  };

  /* ===================== MODALS ===================== */
  const openView = (item) => { setSelectedItem(item); setModalMode("view"); setEditData(null); };
  const openEdit = (item) => {
    setEditData({ ...item, cast: item.cast ? [...item.cast.map(c => ({ ...c }))] : [] });
    setSelectedItem(item);
    setModalMode("edit");
    setCastFiles({});
    setUploadData({
      poster: null,
      banner: null,
      trailer: null,
      video: null,
      posterUrl: item.poster || "",
      bannerUrl: item.banner || "",
      trailerUrl: item.trailerUrl || "",
      videoUrl: item.videoUrl || ""
    });
  };
  const closeModal = () => {
    if (editData?.cast) {
      editData.cast.forEach(c => {
        if (c._previewUrl) URL.revokeObjectURL(c._previewUrl);
      });
    }
    setSelectedItem(null); setModalMode(null); setEditData(null);
    setSelectedEpisode(null);
    setUploadData({ poster: null, banner: null, trailer: null, video: null });
    setCastFiles({});
  };

  const openEpisodePlayer = (episode) => {
    setSelectedEpisode(episode); setSelectedItem(episode); setModalMode("episode-view");
  };

  const openEpisodeEdit = (episode) => {
    setEditData({ ...episode });
    setSelectedItem(episode);
    setSelectedEpisode(episode);
    setModalMode("episode-edit");
    setUploadData({
      video: null,
      thumbnail: null,
      videoUrl: episode.videoUrl || "",
      thumbnailUrl: episode.thumbnail || ""
    });
  };

  /* ===================== UPLOAD ===================== */
  const handleUploadChange = (field, file) => {
    setUploadData(prev => ({ ...prev, [field]: file }));
  };



  /* ===================== EDIT SAVE ===================== */
  const handleSave = async () => {
    if (!editData) return;
    setLoading(true);
    setUploadProgress(0);
    setUploadPhase("saving");

    try {
      const typeFolder = contentType === "movies" ? "movies" : "series";

      // 1. Direct upload cast image files and update payload URLs
      const invalidCast = (editData.cast || []).find((c, idx) => {
        const hasImage = Boolean(c.image || castFiles[idx]);
        return hasImage && !String(c.name || "").trim();
      });

      if (invalidCast) {
        throw new Error("Cast member name is required when a cast image is set");
      }

      const castPayload = (editData.cast || [])
        .map(c => ({
          name: String(c.name || "").trim(),
          image: c.image || "",
        }))
        .filter(c => c.name || c.image);
      const castEntries = Object.entries(castFiles);
      for (const [idxStr, file] of castEntries) {
        const idx = parseInt(idxStr, 10);
        if (file) {
          const cdnUrl = await uploadToBunny(file, typeFolder, "cast");
          if (castPayload[idx]) {
            castPayload[idx].image = cdnUrl;
          }
        }
      }

      // 2. Direct upload poster
      let posterUrl = uploadData.posterUrl || "";
      if (uploadData.poster) {
        posterUrl = await uploadToBunny(uploadData.poster, typeFolder, "posters");
      }

      // 3. Direct upload banner
      let bannerUrl = uploadData.bannerUrl || "";
      if (uploadData.banner) {
        bannerUrl = await uploadToBunny(uploadData.banner, typeFolder, "banners");
      }

      // 4. Direct upload trailer
      let trailerUrl = uploadData.trailerUrl || "";
      if (uploadData.trailer) {
  trailerUrl = await uploadToBunny(
    uploadData.trailer,
    typeFolder,
    "trailers",
    (percent) => setUploadProgress(percent)   // ✅ add this
  );
}

      // 5. Direct upload video (movies only)
      let videoUrl = uploadData.videoUrl || "";
      if (contentType === "movies" && uploadData.video) {
        videoUrl = await uploadToBunny(uploadData.video, "movies", "videos", (percent) => {
          setUploadProgress(percent);
        });
      }

      const formData = new FormData();
      // Basic text fields
      const textFields = ["title", "description", "language", "duration", "rating", "releaseYear", "isPremium", "isComingSoon", "releaseDate", "priority"];

      textFields.forEach(k => {
        const value = editData[k];

        if (value === undefined || value === null) {
          return;
        }

        if (
          k === "releaseDate" &&
          (value === "" || value === "null" || Number.isNaN(Date.parse(value)))
        ) {
          return;
        }

        formData.append(k, value);
      });
      if (editData.genre) formData.append("genre", JSON.stringify(editData.genre));
      if (editData.category) formData.append("category", JSON.stringify(editData.category));

      formData.append("cast", JSON.stringify(castPayload));
      formData.append("poster", posterUrl);
      formData.append("banner", bannerUrl);
      formData.append("trailerUrl", trailerUrl);
      if (contentType === "movies") {
        formData.append("videoUrl", videoUrl);
      }

      const route = contentType === "movies" ? "movies" : "series";
      await API.patch(`/admin/${route}/${selectedItem._id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      alert("Saved successfully");
      closeModal();
      fetchData();
    } catch (err) {
      console.error("CONTENT SAVE ERROR:", err.response?.data || err);
      alert("Save failed: " + (err.response?.data?.error || err.response?.data?.message || err.message));
    } finally {
      setUploadProgress(0);
      setUploadPhase("");
      setLoading(false);
    }
  };

  const handleEpisodeSave = async () => {
    if (!editData) return;
    setLoading(true);
    setUploadProgress(0);
    setUploadPhase("saving");

    try {
      // 1. Direct upload episode video file
      let videoUrl = uploadData.videoUrl || "";
      if (uploadData.video) {
        videoUrl = await uploadToBunny(uploadData.video, "episodes", "videos", (percent) => {
          setUploadProgress(percent);
        });
      }

      // 2. Direct upload thumbnail file
      let thumbnailUrl = uploadData.thumbnailUrl || "";
      if (uploadData.thumbnail) {
        thumbnailUrl = await uploadToBunny(uploadData.thumbnail, "episodes", "posters");
      }

      const formData = new FormData();
      const textFields = ["title", "description", "seasonNumber", "episodeNumber", "duration"];
      textFields.forEach((k) => {

        // Prevent sending invalid null date
        if (
          k === "releaseDate" &&
          (
            editData[k] === null ||
            editData[k] === "" ||
            editData[k] === undefined
          )
        ) {
          return;
        }

        if (editData[k] !== undefined) {
          formData.append(k, editData[k]);
        }
      });

      formData.append("videoUrl", videoUrl);
      formData.append("thumbnailUrl", thumbnailUrl);

      await API.patch(`/admin/episodes/${selectedEpisode._id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      alert("Episode saved");
      closeModal();
      fetchEpisodes(selectedSeries._id);
    } catch (err) {
      alert("Save failed: " + (err.response?.data?.message || err.message));
    } finally {
      setUploadProgress(0);
      setUploadPhase("");
      setLoading(false);
    }
  };

  /* ===================== DELETE ===================== */
  const handleDelete = async (item) => {
    if (!window.confirm(`Delete '${item.title || item.name}' permanently?`)) return;
    try {
      if (contentType === "movies") await API.delete(`/admin/movies/${item._id}`);
      else await API.delete(`/admin/series/${item._id}`);

      alert("Deleted");
      fetchData();
      if (selectedSeries?._id === item._id) { setSelectedSeries(null); setEpisodes([]); }
      closeModal();
    } catch (err) {
      alert("Delete failed");
    }
  };

  /* ===================== TOGGLE PUBLISH ===================== */
  const handleTogglePublish = async (item) => {
    try {
      const route = contentType === "movies" ? "movies" : "series";
      const res = await API.patch(`/admin/${route}/${item._id}/toggle-publish`);
      const updatedItem = res.data.movie || res.data.series;

      // Update local state data
      setData(prev => prev.map(x => x._id === item._id ? { ...x, isPublished: updatedItem.isPublished } : x));

      // Update searchResults if active
      if (searchResults) {
        setSearchResults(prev => prev.map(x => x._id === item._id ? { ...x, isPublished: updatedItem.isPublished } : x));
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to toggle content publish status");
    }
  };

  const handleEpisodeDelete = async (ep) => {
    if (!window.confirm(`Delete Ep ${ep.episodeNumber}: ${ep.title}?`)) return;
    try {
      await API.delete(`/admin/episodes/${ep._id}`);

      alert("Episode deleted");
      fetchEpisodes(selectedSeries._id);
    } catch (err) {
      alert("Delete failed");
    }
  };

  /* ===================== PiP ===================== */
  const handlePiP = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await videoRef.current.requestPictureInPicture();
    } catch (e) { console.error("PiP:", e); }
  };

  /* ===================== CAST HELPERS ===================== */
  const addCastMember = () => {
    setEditData(prev => ({ ...prev, cast: [...(prev.cast || []), { name: "", image: "", file: null }] }));
  };
  const removeCastMember = (idx) => {
    setEditData(prev => {
      const target = prev.cast[idx];
      if (target?._previewUrl) URL.revokeObjectURL(target._previewUrl);
      return { ...prev, cast: prev.cast.filter((_, i) => i !== idx) };
    });
    // Shift cast files keys to align with shifted indices
    setCastFiles(prev => {
      const next = {};
      Object.entries(prev).forEach(([k, file]) => {
        const keyIndex = parseInt(k, 10);
        if (keyIndex < idx) {
          next[keyIndex] = file;
        } else if (keyIndex > idx) {
          next[keyIndex - 1] = file;
        }
      });
      return next;
    });
  };
  const updateCastMember = (idx, field, value) => {
    setEditData(prev => ({
      ...prev,
      cast: prev.cast.map((c, i) => i === idx ? { ...c, [field]: value } : c)
    }));
  };
  const setCastImageFile = (idx, file) => {
    setCastFiles(prev => ({ ...prev, [idx]: file }));
    // Show local preview
    if (file) {
      const url = URL.createObjectURL(file);
      updateCastMember(idx, "_previewUrl", url);
    }
  };

  /* ===================== GROUPED SEASONS ===================== */
  const groupedEpisodes = groupEpisodesBySeason();
  const seasonNumbers = Object.keys(groupedEpisodes).map(Number).sort((a, b) => a - b);



  /* ===================== RENDER ===================== */
  return (
    <div className="page-section">
      {/* Header */}
      <div className="pg-header">
        <div>
          <h1 className="pg-title"><Film style={{ display: "inline-block", marginRight: 8 }} size={32} /> Content Management</h1>
          <p className="pg-sub">View and manage movies and series</p>
        </div>
      </div>

      <div className="content-box">
        {/* Type Selector + Search */}
        <div className="filter-row" style={{ display: "flex", gap: 12, marginBottom: 32, flexWrap: "wrap", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "20px" }}>
          <div className="tab-group" style={{ display: "flex", background: "var(--bg3)", padding: "4px", borderRadius: "12px", gap: "4px" }}>
            <button
              className={`btn ${contentType === "movies" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => { setContentType("movies"); setCurrentPage(1); }}
              style={{ borderRadius: "8px", boxShadow: contentType === "movies" ? "var(--shadow-sm)" : "none" }}
            >
              <Film size={18} /> Movies
            </button>
            <button
              className={`btn ${contentType === "series" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => { setContentType("series"); setCurrentPage(1); }}
              style={{ borderRadius: "8px", boxShadow: contentType === "series" ? "var(--shadow-sm)" : "none" }}
            >
              <Tv size={18} /> Series
            </button>
          </div>

          <div style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "center" }}>
            <SearchBar
              placeholder={`Quick search ${contentType}...`}
              onSearchChange={(q) => {
                setSearchQuery(q);
                if (!q.trim()) { setSearchResults(null); return; }
                doSearch(q.trim());
              }}
              onClear={clearSearch}
              initialValue={searchQuery}
            />
          </div>
        </div>

        {/* Search status */}
        {isSearching && <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Searching…</p>}
        {searchResults !== null && !isSearching && (
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: 12 }}>
            {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} for "{searchQuery}"
            <button className="link-btn" onClick={clearSearch} style={{ marginLeft: 8 }}>Clear</button>
          </p>
        )}

        {/* ========== MOVIES TABLE ========== */}
        {contentType === "movies" && (
          <div className="table-section">
            <div className="section-head" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <h3 style={{ margin: 0 }}><Film size={20} /> Movies Library</h3>
              <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 600 }}>{totalItems} Total Movies</span>
            </div>
            {loading ? <p>Loading…</p> : (
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Title</th><th>Category</th><th>Year</th><th>Rating</th><th>Priority</th><th>Premium</th><th>Status</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayData.length === 0 ? (
                      <tr><td colSpan={8}>No movies found</td></tr>
                    ) : displayData.map(movie => (
                      <tr key={movie._id}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <img src={getFullUrl(movie.poster)} alt="" style={{ width: 40, height: 60, objectFit: "cover", borderRadius: 4 }} />
                            <div>
                              <div style={{ fontWeight: 600 }}>{movie.title}</div>
                              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{movie.duration}</div>
                              {isLocked(movie) && (
                                <div style={{ fontSize: "0.75rem", color: "var(--orange)" }}>
                                  <Calendar size={11} style={{ marginRight: 3, verticalAlign: "middle" }} />
                                  {new Date(movie.releaseDate).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                            {Array.isArray(movie.category) && movie.category.length > 0
                              ? movie.category.map(slug => {
                                  const cat = catMap[slug];
                                  const color = cat?.color || "#6366f1";
                                  return (
                                    <span key={slug} style={{
                                      display: "inline-block",
                                      padding: "2px 10px",
                                      borderRadius: 12,
                                      background: `${color}22`,
                                      border: `1px solid ${color}88`,
                                      color: color,
                                      fontSize: "0.78rem",
                                      fontWeight: 600,
                                      whiteSpace: "nowrap",
                                    }}>{cat?.name || slug}</span>
                                  );
                                })
                              : <span style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>—</span>}
                          </div>
                        </td>
                        <td>{movie.releaseYear}</td>
                        <td>{movie.rating}</td>
                        <td><strong>{movie.priority || 0}</strong></td>
                        <td><span className={`badge ${movie.isPremium ? "badge-active" : "badge-draft"}`}>{movie.isPremium ? "Premium" : "Free"}</span></td>
                        <td>
                          <span className={`badge ${
                            movie.isPublished === false ? "badge-draft" : isLocked(movie) ? "badge-coming" : "badge-pub"
                          }`} style={movie.isPublished === false ? { background: "rgba(220, 38, 38, 0.15)", color: "var(--red)" } : {}}>
                            {movie.isPublished === false ? "Unpublished" : isLocked(movie) ? "Coming Soon" : "Published"}
                          </span>
                        </td>
                        <td>
                          <div className="tbl-actions" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                            {/* View always allowed — coming-soon shows details + release date */}
                            <button className="icon-btn view" onClick={() => openView(movie)} title="View">
                              <Eye size={18} />
                            </button>
                            <button
                              className="icon-btn"
                              onClick={() => handleTogglePublish(movie)}
                              title={movie.isPublished !== false ? "Unpublish Movie" : "Publish Movie"}
                              style={{
                                border: "1px solid var(--border)",
                                borderRadius: "4px",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: "32px",
                                height: "32px",
                                color: movie.isPublished !== false ? "#10b981" : "var(--text-muted)",
                                borderColor: movie.isPublished !== false ? "rgba(16, 185, 129, 0.4)" : "var(--border)",
                                background: "transparent",
                                cursor: "pointer"
                              }}
                            >
                              {movie.isPublished !== false ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                            </button>
                            <button className="icon-btn edit" onClick={() => openEdit(movie)} title="Edit">
                              <Edit2 size={18} />
                            </button>
                            <button className="icon-btn del" onClick={() => handleDelete(movie)} title="Delete">
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              onPageChange={setCurrentPage}
            />
          </div>
        )}


        {/* ========== SERIES TABLE ========== */}
        {contentType === "series" && !selectedSeries && (
          <div className="table-section">
            <div className="section-head" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <h3 style={{ margin: 0 }}><Tv size={20} /> Series Library</h3>
              <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 600 }}>{totalItems} Total Series</span>
            </div>
            {loading ? <p>Loading…</p> : (
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Title</th><th>Category</th><th>Year</th><th>Rating</th><th>Priority</th><th>Seasons</th><th>Status</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayData.length === 0 ? (
                      <tr><td colSpan={8}>No series found</td></tr>
                    ) : displayData.map(series => (
                      <tr key={series._id}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <img src={getFullUrl(series.poster)} alt="" style={{ width: 40, height: 60, objectFit: "cover", borderRadius: 4 }} />
                            <div>
                              <div style={{ fontWeight: 600 }}>{series.title}</div>
                              {isLocked(series) && (
                                <div style={{ fontSize: "0.75rem", color: "var(--orange)" }}>
                                  <Calendar size={11} style={{ marginRight: 3, verticalAlign: "middle" }} />
                                  {new Date(series.releaseDate).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                            {Array.isArray(series.category) && series.category.length > 0
                              ? series.category.map(slug => {
                                  const cat = catMap[slug];
                                  const color = cat?.color || "#6366f1";
                                  return (
                                    <span key={slug} style={{
                                      display: "inline-block",
                                      padding: "2px 10px",
                                      borderRadius: 12,
                                      background: `${color}22`,
                                      border: `1px solid ${color}88`,
                                      color: color,
                                      fontSize: "0.78rem",
                                      fontWeight: 600,
                                      whiteSpace: "nowrap",
                                    }}>{cat?.name || slug}</span>
                                  );
                                })
                              : <span style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>—</span>}
                          </div>
                        </td>
                        <td>{series.releaseYear}</td>
                        <td>{series.rating}</td>
                        <td><strong>{series.priority || 0}</strong></td>
                        <td>{series.totalSeasons}</td>
                        <td>
                          <span className={`badge ${
                            series.isPublished === false ? "badge-draft" : isLocked(series) ? "badge-coming" : "badge-pub"
                          }`} style={series.isPublished === false ? { background: "rgba(220, 38, 38, 0.15)", color: "var(--red)" } : {}}>
                            {series.isPublished === false ? "Unpublished" : isLocked(series) ? "Coming Soon" : "Published"}
                          </span>
                        </td>
                        <td>
                          <div className="tbl-actions" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                            <button className="icon-btn view" onClick={() => openView(series)} title="View">
                              <Eye size={18} />
                            </button>
                            <button
                              className="icon-btn"
                              onClick={() => handleTogglePublish(series)}
                              title={series.isPublished !== false ? "Unpublish Series" : "Publish Series"}
                              style={{
                                border: "1px solid var(--border)",
                                borderRadius: "4px",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: "32px",
                                height: "32px",
                                color: series.isPublished !== false ? "#10b981" : "var(--text-muted)",
                                borderColor: series.isPublished !== false ? "rgba(16, 185, 129, 0.4)" : "var(--border)",
                                background: "transparent",
                                cursor: "pointer"
                              }}
                            >
                              {series.isPublished !== false ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                            </button>
                            <button className="icon-btn edit" onClick={() => openEdit(series)} title="Edit">
                              <Edit2 size={18} />
                            </button>
                            <button className="icon-btn del" onClick={() => handleDelete(series)} title="Delete">
                              <Trash2 size={18} />
                            </button>
                            <button className="btn btn-ghost eps-btn" onClick={() => handleSeriesClick(series)}>
                              <Tv size={14} /> Seasons
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              onPageChange={setCurrentPage}
            />
          </div>
        )}


        {/* ========== EPISODES VIEW ========== */}
        {selectedSeries && (
          <div>
            {/* Series episodes header */}
            <div className="seasons-view-header">
              <button className="back-btn" onClick={() => { setSelectedSeries(null); setEpisodes([]); }}>
                <ChevronLeft size={20} />
                <span>Back to Library</span>
              </button>

              <div className="series-mini-card">
                <img src={getFullUrl(selectedSeries.poster || selectedSeries.banner)} alt="" className="mini-poster" />
                <div className="mini-info">
                  <div className="mini-title-row">
                    <Tv size={24} className="type-icon" />
                    <h2>{selectedSeries.title}</h2>
                  </div>
                  <div className="mini-stats">
                    <div className="stat-item">
                      <strong>{episodes.length}</strong>
                      <span>Episodes</span>
                    </div>
                    <div className="stat-divider"></div>
                    <div className="stat-item">
                      <strong>{seasonNumbers.length}</strong>
                      <span>Seasons</span>
                    </div>
                  </div>
                </div>
                <button
                  className="btn btn-primary add-season-btn"
                  onClick={() => { setShowAddSeasonForm(true); setShowAddEpisodeForm("new-season"); }}
                >
                  <Plus size={18} /> <span>Add New Season</span>
                </button>
              </div>

              <div className="seasons-search-wrapper">
                <div className="search-bar">
                  <Search size={18} className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search episodes by title, season, or number..."
                    className="search-input"
                    value={episodeSearchQuery}
                    onChange={e => setEpisodeSearchQuery(e.target.value)}
                  />
                  {episodeSearchQuery && (
                    <button className="search-clear" onClick={() => setEpisodeSearchQuery("")}><X size={16} /></button>
                  )}
                </div>
              </div>
            </div>

            {/* Add new season form */}
            {showAddSeasonForm && showAddEpisodeForm === "new-season" && (
              <div className="add-form-card" style={{ marginBottom: 24 }}>
                <h4 style={{ marginBottom: 12, color: "var(--primary)" }}>
                  <Plus size={16} style={{ marginRight: 6, verticalAlign: "middle" }} /> Add New Season &amp; First Episode
                </h4>
                <div className="form-grid-2">
                  <div className="form-row">
                    <label className="form-label">Season Number *</label>
                    <input className="form-input" type="number" min="1" value={newSeasonNumber} onChange={e => setNewSeasonNumber(e.target.value)} placeholder="e.g. 2" />
                  </div>
                  <div className="form-row">
                    <label className="form-label">Episode Number *</label>
                    <input className="form-input" type="number" min="1" value={newEpisode.episodeNumber} onChange={e => setNewEpisode(p => ({ ...p, episodeNumber: e.target.value }))} placeholder="e.g. 1" />
                  </div>
                </div>
                <div className="form-row">
                  <label className="form-label">Episode Title *</label>
                  <input className="form-input" value={newEpisode.title} onChange={e => setNewEpisode(p => ({ ...p, title: e.target.value }))} placeholder="Episode title" />
                </div>
                <div className="form-grid-2">
                  <div className="form-row">
                    <label className="form-label">Duration</label>
                    <input className="form-input" value={newEpisode.duration} onChange={e => setNewEpisode(p => ({ ...p, duration: e.target.value }))} placeholder="e.g. 45m" />
                  </div>
                  <div className="form-row">
                    <label className="form-label">Episode Video *</label>
                    <div className="file-input-wrapper">
                      <input type="file" accept="video/*" id="new-ep-video-new" className="file-input" onChange={e => setNewEpisodeVideo(e.target.files[0])} />
                      <label htmlFor="new-ep-video-new" className="file-label">
                        {newEpisodeVideo ? `✓ ${newEpisodeVideo.name}` : "Choose Video"}
                      </label>
                    </div>
                    <input className="form-input" style={{ marginTop: 8 }} placeholder="Or Paste URL" value={newEpisodeVideoUrl} onChange={e => setNewEpisodeVideoUrl(e.target.value)} />
                  </div>
                  <div className="form-row">
                    <label className="form-label">Episode Thumbnail </label>
                    <div className="file-input-wrapper">
                      <input type="file" accept="image/*" id="new-ep-thumb-new" className="file-input" onChange={e => setNewEpisodeThumbnail(e.target.files[0])} />
                      <label htmlFor="new-ep-thumb-new" className="file-label">
                        {newEpisodeThumbnail ? `✓ ${newEpisodeThumbnail.name}` : "Choose Thumbnail"}
                      </label>
                    </div>
                    <input className="form-input" style={{ marginTop: 8 }} placeholder="Or Paste URL" value={newEpisodeThumbnailUrl} onChange={e => setNewEpisodeThumbnailUrl(e.target.value)} />
                  </div>

                </div>
                <div className="form-row">
                  <label className="form-label">Description</label>
                  <textarea className="form-input" rows="2" value={newEpisode.description} onChange={e => setNewEpisode(p => ({ ...p, description: e.target.value }))} placeholder="Brief description…" />
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                  <button className="btn btn-primary" onClick={() => handleAddEpisode("new-season")} disabled={addingEpisode}>
                    {addingEpisode ? "Adding…" : <><Plus size={14} /> Add Season &amp; Episode</>}
                  </button>
                  <button className="btn btn-ghost" onClick={() => { setShowAddSeasonForm(false); setShowAddEpisodeForm(null); setNewEpisode({ title: "", episodeNumber: "", duration: "", description: "", seasonNumber: "" }); setNewSeasonNumber(""); setNewEpisodeVideo(null); setNewEpisodeThumbnail(null); setNewEpisodeVideoUrl(""); setNewEpisodeThumbnailUrl(""); }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Seasons */}
            {seasonNumbers.length === 0 && !showAddSeasonForm && (
              <div className="empty-state-container">
                <div className="empty-state-card">
                  <div className="empty-state-icon">
                    <Tv size={64} />
                    <div className="icon-pulse"></div>
                  </div>
                  <h3>No Seasons Created Yet</h3>
                  <p>Start building your series library by adding the first season and episode.</p>
                  <button
                    className="btn btn-primary"
                    onClick={() => { setShowAddSeasonForm(true); setShowAddEpisodeForm("new-season"); }}
                  >
                    <Plus size={18} /> Add Your First Season
                  </button>
                </div>
              </div>
            )}

            {seasonNumbers.map(seasonNum => (
              <div key={seasonNum} className="season-block">
                {/* Season header */}
                <div className="season-header">
                  <button className="season-toggle" onClick={() => toggleSeason(seasonNum)}>
                    {collapsedSeasons[seasonNum] ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                    <span>Season {seasonNum}</span>
                    <span className="season-count">{groupedEpisodes[seasonNum].length} episodes</span>
                  </button>
                  <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
                    <button
                      className="btn btn-ghost"
                      style={{ padding: "5px 10px", fontSize: "0.8rem" }}
                      onClick={() => { setShowAddEpisodeForm(seasonNum); setShowAddSeasonForm(false); setNewEpisode(p => ({ ...p, seasonNumber: seasonNum })); }}
                    >
                      <Plus size={14} /> Add Episode
                    </button>
                    <button
                      className="btn btn-ghost del-season-btn"
                      style={{ padding: "5px 10px", fontSize: "0.8rem" }}
                      onClick={() => handleDeleteSeason(seasonNum)}
                    >
                      <Trash2 size={14} /> Delete Season
                    </button>
                  </div>
                </div>

                {/* Add episode inline form for this season */}
                {showAddEpisodeForm === seasonNum && (
                  <div className="add-form-card add-form-nested">
                    <h4 style={{ marginBottom: 12 }}>Add Episode to Season {seasonNum}</h4>
                    <div className="form-grid-2">
                      <div className="form-row">
                        <label className="form-label">Episode Number *</label>
                        <input className="form-input" type="number" min="1" value={newEpisode.episodeNumber} onChange={e => setNewEpisode(p => ({ ...p, episodeNumber: e.target.value }))} placeholder="e.g. 3" />
                      </div>
                      <div className="form-row">
                        <label className="form-label">Title *</label>
                        <input className="form-input" value={newEpisode.title} onChange={e => setNewEpisode(p => ({ ...p, title: e.target.value }))} placeholder="Episode title" />
                      </div>
                      <div className="form-row">
                        <label className="form-label">Duration</label>
                        <input className="form-input" value={newEpisode.duration} onChange={e => setNewEpisode(p => ({ ...p, duration: e.target.value }))} placeholder="45m" />
                      </div>
                      <div className="form-row">
                        <label className="form-label">Video *</label>
                        <div className="file-input-wrapper">
                          <input type="file" accept="video/*" id={`ep-video-s${seasonNum}`} className="file-input" onChange={e => setNewEpisodeVideo(e.target.files[0])} />
                          <label htmlFor={`ep-video-s${seasonNum}`} className="file-label">{newEpisodeVideo ? `✓ ${newEpisodeVideo.name}` : "Choose Video"}</label>
                        </div>
                        <input className="form-input" style={{ marginTop: 8 }} placeholder="Or Paste URL" value={newEpisodeVideoUrl} onChange={e => setNewEpisodeVideoUrl(e.target.value)} />
                      </div>
                      <div className="form-row">
                        <label className="form-label">Thumbnail *</label>
                        <div className="file-input-wrapper">
                          <input type="file" accept="image/*" id={`ep-thumb-s${seasonNum}`} className="file-input" onChange={e => setNewEpisodeThumbnail(e.target.files[0])} />
                          <label htmlFor={`ep-thumb-s${seasonNum}`} className="file-label">{newEpisodeThumbnail ? `✓ ${newEpisodeThumbnail.name}` : "Choose Thumbnail"}</label>
                        </div>
                        <input className="form-input" style={{ marginTop: 8 }} placeholder="Or Paste URL" value={newEpisodeThumbnailUrl} onChange={e => setNewEpisodeThumbnailUrl(e.target.value)} />
                      </div>
                    </div>
                    <div className="form-row">
                      <label className="form-label">Description</label>
                      <textarea className="form-input" rows="2" value={newEpisode.description} onChange={e => setNewEpisode(p => ({ ...p, description: e.target.value }))} />
                    </div>
                    <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                      <button className="btn btn-primary" onClick={() => handleAddEpisode(seasonNum)} disabled={addingEpisode}>
                        {addingEpisode ? "Adding…" : <><Plus size={14} /> Add Episode</>}
                      </button>
                      <button className="btn btn-ghost" onClick={() => { setShowAddEpisodeForm(null); setNewEpisode({ title: "", episodeNumber: "", duration: "", description: "", seasonNumber: "" }); setNewEpisodeVideo(null); setNewEpisodeThumbnail(null); setNewEpisodeVideoUrl(""); setNewEpisodeThumbnailUrl(""); }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {!collapsedSeasons[seasonNum] && (
                  <div className="season-content">
                    <div className="ep-list">
                      {groupedEpisodes[seasonNum]
                        .sort((a, b) => a.episodeNumber - b.episodeNumber)
                        .map(ep => (
                          <div key={ep._id} className="ep-card">
                            <div className="ep-num">E{ep.episodeNumber}</div>
                            <div className="ep-thumb-container">
                              {ep.thumbnail ? (
                                <img src={getFullUrl(ep.thumbnail)} alt="" className="ep-thumb" />
                              ) : (
                                <div className="ep-thumb-placeholder"><Film size={18} /></div>
                              )}
                              {ep.videoUrl && (
                                <button className="ep-play-overlay" onClick={() => openEpisodePlayer(ep)}>
                                  <Play size={20} fill="currentColor" />
                                </button>
                              )}
                            </div>
                            <div className="ep-info">
                              <div className="ep-title-row">
                                <span className="ep-title">{ep.title}</span>
                              </div>
                              {ep.description && (
                                <p className="ep-desc">{ep.description}</p>
                              )}
                              <div className="ep-meta">
                                <span className={`badge ${ep.videoUrl ? "badge-pub" : "badge-draft"}`}>
                                  {ep.videoUrl ? "Ready to Stream" : "No Video Uploaded"}
                                </span>
                              </div>
                            </div>
                            <div className="ep-timing">
                              <span className="ep-duration">{ep.duration || "--"}</span>
                            </div>
                            <div className="ep-actions">
                              <button className="icon-btn view" onClick={() => openEpisodePlayer(ep)} title="View Details">
                                <Eye size={18} />
                              </button>
                              <button className="icon-btn edit" onClick={() => openEpisodeEdit(ep)} title="Edit Episode">
                                <Edit2 size={18} />
                              </button>
                              <button className="icon-btn del" onClick={() => handleEpisodeDelete(ep)} title="Delete">
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========== MODALS ========== */}
      {(modalMode === "view" || modalMode === "edit" || modalMode === "upload" || modalMode === "episode-view" || modalMode === "episode-edit") && selectedItem && (
        <div className="modal-overlay" onClick={closeModal}>
          <div
            className={`modal-box ${(modalMode === "view" || modalMode === "episode-view") ? "modal-box-view" : "modal-box-form"}`}
            onClick={e => e.stopPropagation()}
            onKeyDown={handleKeyDown}
          >
            <div className="modal-head">
              <h3>
                {modalMode === "view" ? "Content Details" :
                  modalMode === "edit" ? "Edit Content & Media" :
                    modalMode === "episode-edit" ? "Edit Episode & Video" :
                      "Episode Details"}
              </h3>
              <button className="modal-close" onClick={closeModal}><X size={24} /></button>
            </div>

            <div className="modal-body">

              {/* ---- EPISODE VIEW / PLAY ---- */}
              {modalMode === "episode-view" && (
                <div className="view-content">
                  <div className="view-banner">
                    <img src={getFullUrl(selectedEpisode?.thumbnail || selectedSeries?.poster || selectedSeries?.banner)} alt="Banner" className="banner-image" />
                    <div className="banner-overlay">
                      <h2>S{selectedEpisode?.seasonNumber} E{selectedEpisode?.episodeNumber}: {selectedEpisode?.title}</h2>
                    </div>
                  </div>

                  {selectedEpisode?.videoUrl ? (
                    <div className="view-video-section">
                      {getYouTubeId(selectedEpisode.videoUrl) ? (
                        <iframe
                          src={`https://www.youtube.com/embed/${getYouTubeId(selectedEpisode.videoUrl)}`}
                          title="Episode Video"
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="view-video-player"
                          style={{ aspectRatio: "16/9", height: "auto" }}
                        ></iframe>
                      ) : (
                        <>
                          <video ref={videoRef} controls className="view-video-player" src={getFullUrl(selectedEpisode.videoUrl)}>
                            Your browser does not support the video tag.
                          </video>
                          <button className="btn btn-primary pip-btn" onClick={() => videoRef.current?.requestPictureInPicture?.()}>
                            <Tv size={18} style={{ marginRight: 6 }} /> PiP
                          </button>
                        </>
                      )}
                    </div>
                  ) : (
                    <div style={{ padding: "20px", background: "var(--bg3)", borderRadius: "var(--radius-sm)", textAlign: "center", color: "var(--text-muted)" }}>
                      <Video size={36} style={{ opacity: 0.4, marginBottom: 8 }} />
                      <p>No video uploaded yet</p>
                      <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={() => { setSelectedItem(selectedEpisode); setModalMode("episode-edit"); }}>
                        <Upload size={14} style={{ marginRight: 6 }} /> Upload Video
                      </button>
                    </div>
                  )}

                  <div className="view-details">
                    <div className="detail-item"><strong>Series</strong><span>{selectedSeries?.title}</span></div>
                    <div className="detail-item"><strong>Season</strong><span>{selectedEpisode?.seasonNumber}</span></div>
                    <div className="detail-item"><strong>Episode</strong><span>{selectedEpisode?.episodeNumber}</span></div>
                    <div className="detail-item"><strong>Duration</strong><span>{selectedEpisode?.duration || "—"}</span></div>
                    {selectedEpisode?.description && (
                      <div className="detail-full"><strong>Description</strong><p>{selectedEpisode.description}</p></div>
                    )}
                  </div>
                </div>
              )}

              {/* ---- VIEW (Premium) ---- */}
              {modalMode === "view" && (
                <div className="vp-container">
                  {/* Hero Banner */}
                  <div className="vp-hero">
                    <img src={getFullUrl(selectedItem.banner || selectedItem.poster)} alt="" className="vp-hero-img" />
                    <div className="vp-hero-overlay">
                      <span className="vp-type-badge">{contentType === "movies" ? "MOVIE" : "SERIES"}</span>
                      <h2 className="vp-title">{selectedItem.title}</h2>
                      <div className="vp-quick-meta">
                        <span><Calendar size={13} /> {selectedItem.releaseYear}</span>
                        <span className="vp-dot">•</span>
                        <span>⭐ {selectedItem.rating}/10</span>
                        <span className="vp-dot">•</span>
                        <span>{selectedItem.duration || "N/A"}</span>
                        <span className="vp-dot">•</span>
                        <span>{selectedItem.language || "N/A"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Coming Soon Alert */}
                  {isLocked(selectedItem) && (
                    <div className="vp-alert">
                      <Calendar size={18} />
                      <div>
                        <strong>Scheduled Release</strong>
                        <p>Available from {new Date(selectedItem.releaseDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>
                      </div>
                    </div>
                  )}

                  {/* Genre / Category Pills */}
                  <div className="vp-pills">
                    {(Array.isArray(selectedItem.genre) ? selectedItem.genre : [selectedItem.genre]).filter(Boolean).map((g, i) => (
                      <span key={i} className="vp-pill">{g}</span>
                    ))}
                    {selectedItem.isPremium && <span className="vp-pill vp-pill-gold">★ Premium</span>}
                    {(Array.isArray(selectedItem.category) ? selectedItem.category : [selectedItem.category]).filter(Boolean).map((c, i) => (
                      <span key={`c-${i}`} className="vp-pill vp-pill-blue">{c}</span>
                    ))}
                  </div>

                  {/* Description */}
                  {selectedItem.description && (
                    <div className="vp-section">
                      <div className="vp-section-label"><Activity size={14} /> Storyline</div>
                      <p className="vp-desc">{selectedItem.description}</p>
                    </div>
                  )}

                  {/* Trailer */}
                  <div className="vp-section">
                    <div className="vp-section-label"><Play size={14} /> Trailer</div>
                    {selectedItem.trailerUrl ? (
                      <div className="vp-video-wrap">
                        {getYouTubeId(selectedItem.trailerUrl) ? (
                          <iframe src={`https://www.youtube.com/embed/${getYouTubeId(selectedItem.trailerUrl)}`} title="Trailer" frameBorder="0" allowFullScreen></iframe>
                        ) : (
                          <video controls src={getFullUrl(selectedItem.trailerUrl)}></video>
                        )}
                      </div>
                    ) : (
                      <div className="vp-unavailable">
                        <Video size={28} />
                        <span>Trailer not uploaded</span>
                      </div>
                    )}
                  </div>

                  {/* Full Movie */}
                  {contentType === "movies" && (
                    <div className="vp-section">
                      <div className="vp-section-label"><Film size={14} /> Full Movie</div>
                      {!isLocked(selectedItem) && (selectedItem.videoUrl || selectedItem.video) ? (
                        <div className="vp-video-wrap">
                          {getYouTubeId(selectedItem.videoUrl || selectedItem.video) ? (
                            <iframe src={`https://www.youtube.com/embed/${getYouTubeId(selectedItem.videoUrl || selectedItem.video)}`} title="Full Movie" frameBorder="0" allowFullScreen></iframe>
                          ) : (
                            <video ref={videoRef} controls src={getFullUrl(selectedItem.videoUrl || selectedItem.video)}></video>
                          )}
                        </div>
                      ) : (
                        <div className="vp-unavailable">
                          <Film size={28} />
                          <span>{isLocked(selectedItem) ? "Locked until release" : "Video not uploaded"}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Details Grid */}
                  <div className="vp-section">
                    <div className="vp-section-label"><Eye size={14} /> Details</div>
                    <div className="vp-details-grid">
                      <div className="vp-detail-card">
                        <span className="vp-detail-label">Release Year</span>
                        <span className="vp-detail-value">{selectedItem.releaseYear}</span>
                      </div>
                      <div className="vp-detail-card">
                        <span className="vp-detail-label">Duration</span>
                        <span className="vp-detail-value">{selectedItem.duration || "N/A"}</span>
                      </div>
                      <div className="vp-detail-card">
                        <span className="vp-detail-label">Rating</span>
                        <span className="vp-detail-value">{selectedItem.rating} ⭐</span>
                      </div>
                      <div className="vp-detail-card">
                        <span className="vp-detail-label">Priority</span>
                        <span className="vp-detail-value">{selectedItem.priority || 0}</span>
                      </div>
                      <div className="vp-detail-card">
                        <span className="vp-detail-label">Premium</span>
                        <span className={`vp-detail-value ${selectedItem.isPremium ? "text-gold" : ""}`}>{selectedItem.isPremium ? "✓ Yes" : "✗ No"}</span>
                      </div>
                      <div className="vp-detail-card">
                        <span className="vp-detail-label">Language</span>
                        <span className="vp-detail-value">{selectedItem.language || "N/A"}</span>
                      </div>
                      {selectedItem.releaseDate && (
                        <div className="vp-detail-card">
                          <span className="vp-detail-label">Release Date</span>
                          <span className="vp-detail-value">{new Date(selectedItem.releaseDate).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Cast */}
                  {selectedItem.cast?.length > 0 && (
                    <div className="vp-section">
                      <div className="vp-section-label"><User size={14} /> Cast & Crew</div>
                      <div className="cast-grid">
                        {selectedItem.cast.map((c, i) => (
                          <div key={i} className="cast-card-view">
                            {c.image && <img src={getFullUrl(c.image)} alt={c.name} className="cast-img-view" />}
                            <span>{c.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}


              {/* ---- EPISODE EDIT ---- */}
              {modalMode === "episode-edit" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div className="form-grid-2">
                    <div className="form-row">
                      <label className="form-label">Episode #</label>
                      <input className="form-input" type="number" value={editData.episodeNumber || ""} onChange={e => setEditData(s => ({ ...s, episodeNumber: Number(e.target.value) }))} />
                    </div>
                    <div className="form-row">
                      <label className="form-label">Season #</label>
                      <input className="form-input" type="number" value={editData.seasonNumber || ""} onChange={e => setEditData(s => ({ ...s, seasonNumber: Number(e.target.value) }))} />
                    </div>
                  </div>
                  <div className="form-row">
                    <label className="form-label">Title</label>
                    <input className="form-input" value={editData.title || ""} onChange={e => setEditData(s => ({ ...s, title: e.target.value }))} />
                  </div>
                  <div className="form-row">
                    <label className="form-label">Duration</label>
                    <input className="form-input" value={editData.duration || ""} onChange={e => setEditData(s => ({ ...s, duration: e.target.value }))} />
                  </div>
                  <div className="form-row">
                    <label className="form-label">Description</label>
                    <textarea className="form-input" rows="3" value={editData.description || ""} onChange={e => setEditData(s => ({ ...s, description: e.target.value }))} />
                  </div>

                  <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "10px 0" }} />
                  <h4 style={{ marginBottom: 12, fontSize: "0.9rem" }}>Media Assets</h4>
                  <div className="form-grid-2">
                    <div className="form-row">
                      <label className="form-label">Thumbnail</label>
                      <div className="file-input-wrapper">
                        <input type="file" accept="image/*" id="ep-edit-thumb" className="file-input" onChange={e => handleUploadChange("thumbnail", e.target.files[0])} />
                        <label htmlFor="ep-edit-thumb" className="file-label">{uploadData.thumbnail ? `✓ ${uploadData.thumbnail.name}` : "Change Thumbnail"}</label>
                      </div>
                      <input className="form-input" style={{ marginTop: 8 }} placeholder="Or Paste URL" value={uploadData.thumbnailUrl} onChange={e => handleUploadChange("thumbnailUrl", e.target.value)} />
                    </div>
                    <div className="form-row">
                      <label className="form-label">Video</label>
                      <div className="file-input-wrapper">
                        <input type="file" accept="video/*" id="ep-edit-video" className="file-input" onChange={e => handleUploadChange("video", e.target.files[0])} />
                        <label htmlFor="ep-edit-video" className="file-label">{uploadData.video ? `✓ ${uploadData.video.name}` : "Change Video"}</label>
                      </div>
                      <input className="form-input" style={{ marginTop: 8 }} placeholder="Or Paste URL" value={uploadData.videoUrl} onChange={e => handleUploadChange("videoUrl", e.target.value)} />
                    </div>
                  </div>
                </div>
              )}

              {/* ---- EDIT (Movie / Series) ---- */}
              {modalMode === "edit" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div className="form-grid-2">
                    <div className="form-row">
                      <label className="form-label">Title</label>
                      <input className="form-input" value={editData.title || ""} onChange={e => setEditData(s => ({ ...s, title: e.target.value }))} />
                    </div>
                    <div className="form-row">
                      <label className="form-label">Release Year</label>
                      <input className="form-input" type="number" value={editData.releaseYear || ""} onChange={e => setEditData(s => ({ ...s, releaseYear: Number(e.target.value) }))} />
                    </div>
                    <div className="form-row">
                      <label className="form-label">Rating (0–10)</label>
                      <input
                        className="form-input"
                        type="number"
                        step="0.1"
                        min="0"
                        max="10"
                        value={editData.rating || ""}
                        onChange={e => {
                          let val = e.target.value;
                          if (val !== "") {
                            const num = Number(val);
                            if (num > 10) val = "10";
                            else if (num < 0) val = "0";
                          }
                          setEditData(s => ({ ...s, rating: val === "" ? "" : Number(val) }));
                        }}
                      />
                    </div>
                    <div className="form-row">
                      <label className="form-label">Genre (comma separated)</label>
                      <input className="form-input" value={Array.isArray(editData.genre) ? editData.genre.join(", ") : (editData.genre || "")} onChange={e => setEditData(s => ({ ...s, genre: e.target.value.split(",").map(x => x.trim()).filter(Boolean) }))} />
                    </div>
                    <div className="form-row">
                      <label className="form-label">Duration</label>
                      <input className="form-input" value={editData.duration || ""} onChange={e => setEditData(s => ({ ...s, duration: e.target.value }))} />
                    </div>
                    <div className="form-row">
                      <label className="form-label">Language</label>
                      <input className="form-input" value={editData.language || ""} onChange={e => setEditData(s => ({ ...s, language: e.target.value }))} />
                    </div>
                    <div className="form-row">
                      <label className="form-label">Premium</label>
                      <select className="form-input" value={editData.isPremium ? "yes" : "no"} onChange={e => setEditData(s => ({ ...s, isPremium: e.target.value === "yes" }))}>
                        <option value="no">No</option>
                        <option value="yes">Yes</option>
                      </select>
                    </div>
                    <div className="form-row">
                      <label className="form-label">Status</label>
                      <select className="form-input" value={editData.isPublished !== false ? "published" : "unpublished"} onChange={e => setEditData(s => ({ ...s, isPublished: e.target.value === "published" }))}>
                        <option value="published">Published</option>
                        <option value="unpublished">Unpublished</option>
                      </select>
                    </div>
                    <div className="form-row">
                      <label className="form-label">Coming Soon</label>
                      <select className="form-input" value={editData.isComingSoon ? "yes" : "no"} onChange={e => setEditData(s => ({ ...s, isComingSoon: e.target.value === "yes" }))}>
                        <option value="no">No</option>
                        <option value="yes">Yes</option>
                      </select>
                    </div>
        {/* ── Category Chip Picker (Edit Modal) ── */}
        <div className="form-row" style={{ gridColumn: "1 / -1" }}>
          <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            Selected Categories (Select Multiple)
          </label>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 10,
              padding: "4px 0 12px 0",
            }}
          >
            {Object.values(catMap)
              .sort((a, b) => (a.priority || 1) - (b.priority || 1))
              .map((cat) => {
                const selectedSlugs = Array.isArray(editData.category) ? editData.category : [];
                const isSelected = selectedSlugs.includes(cat.slug);
                // Use category color or default to orange
                const colorVal = cat.color || "var(--orange)";
                const chipBorder = isSelected ? `1px solid ${colorVal}` : "1px solid rgba(255, 255, 255, 0.08)";
                const textColor = isSelected ? colorVal : "var(--text-soft)";
                const bg = isSelected ? `${colorVal}15` : "rgba(255, 255, 255, 0.03)";
                
                return (
                  <button
                    key={cat.slug}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setEditData(s => ({
                          ...s,
                          category: (Array.isArray(s.category) ? s.category : []).filter(c => c !== cat.slug)
                        }));
                      } else {
                        setEditData(s => ({
                          ...s,
                          category: [...(Array.isArray(s.category) ? s.category : []), cat.slug]
                        }));
                      }
                    }}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "8px 20px",
                      borderRadius: 9999,
                      background: bg,
                      border: chipBorder,
                      color: textColor,
                      fontWeight: 700,
                      fontSize: "0.8rem",
                      letterSpacing: "0.5px",
                      textTransform: "uppercase",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      boxShadow: isSelected ? `0 0 12px ${colorVal}20` : "none",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)";
                        e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
                        e.currentTarget.style.color = "var(--text)";
                      } else {
                        e.currentTarget.style.transform = "scale(1.03)";
                        e.currentTarget.style.boxShadow = `0 0 18px ${colorVal}35`;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
                        e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
                        e.currentTarget.style.color = "var(--text-soft)";
                      } else {
                        e.currentTarget.style.transform = "scale(1)";
                        e.currentTarget.style.boxShadow = `0 0 12px ${colorVal}20`;
                      }
                    }}
                  >
                    {cat.name}
                  </button>
                );
              })}
          </div>
        </div>
                    <div className="form-row">
                      <label className="form-label">Priority (0 = Auto-assign, 1 = top priority)</label>
                      <input
                        className="form-input"
                        type="number"
                        placeholder="0 = Automatic"
                        value={editData.priority !== undefined ? editData.priority : ""}
                        onChange={e => setEditData(s => ({ ...s, priority: e.target.value === "" ? "" : Number(e.target.value) }))}
                      />
                    </div>
                    {editData.isComingSoon && (
                      <div className="form-row">
                        <label className="form-label">Release Date & Time</label>
                        <input
                          className="form-input"
                          type="datetime-local"
                          value={
                            editData.releaseDate && !isNaN(Date.parse(editData.releaseDate))
                              ? new Date(editData.releaseDate).toISOString().slice(0, 16)
                              : ""
                          }
                          onChange={e => setEditData(s => ({ ...s, releaseDate: e.target.value }))}
                        />
                      </div>
                    )}

                  </div>

                  <div className="form-row">
                    <label className="form-label">Description</label>
                    <textarea className="form-input" rows="3" value={editData.description || ""} onChange={e => setEditData(s => ({ ...s, description: e.target.value }))} />
                  </div>

                  {/* Cast Section */}
                  <div className="cast-section">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <label className="form-label" style={{ marginBottom: 0 }}>
                        <User size={15} style={{ marginRight: 6, verticalAlign: "middle" }} /> Cast Members
                      </label>
                      <button className="btn btn-ghost" style={{ padding: "5px 10px", fontSize: "0.8rem" }} onClick={addCastMember}>
                        <Plus size={14} /> Add Member
                      </button>
                    </div>

                    {(editData.cast || []).length === 0 && (
                      <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center", padding: "12px 0" }}>No cast members. Click "Add Member" to add.</p>
                    )}

                    <div className="cast-list">
                      {(editData.cast || []).map((c, idx) => (
                        <div key={idx} className="cast-edit-row">
                          {/* Cast image */}
                          <div className="cast-img-upload">
                            {(c._previewUrl || c.image) ? (
                              <img src={c._previewUrl || getFullUrl(c.image)} alt={c.name} className="cast-img-preview" />
                            ) : (
                              <div className="cast-img-placeholder">
                                <User size={36} />
                              </div>
                            )}
                            <div className="file-input-wrapper">
                              <input
                                type="file"
                                accept="image/*"
                                id={`cast-img-${idx}`}
                                className="file-input"
                                onChange={e => setCastImageFile(idx, e.target.files[0])}
                              />
                              <label htmlFor={`cast-img-${idx}`} className="file-label cast-file-label">
                                {castFiles[idx] ? "✓ Changed" : c.image ? "Change Photo" : "Upload Photo"}
                              </label>
                            </div>
                          </div>
                          {/* Cast details container */}
                          <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                            {/* Cast name */}
                            <input
                              className="form-input"
                              placeholder="Cast member name"
                              value={c.name || ""}
                              onChange={e => updateCastMember(idx, "name", e.target.value)}
                              style={{ width: "100%" }}
                            />
                            {/* Cast photo URL option */}
                            {!castFiles[idx] && (
                              <input
                                className="form-input"
                                placeholder="Or Photo URL"
                                value={c.image || ""}
                                onChange={e => updateCastMember(idx, "image", e.target.value)}
                                style={{ width: "100%", fontSize: "0.8rem", height: "30px", padding: "4px 10px" }}
                              />
                            )}
                          </div>
                          <button className="icon-btn del" title="Remove" onClick={() => removeCastMember(idx)}>
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "10px 0" }} />
                  <h4 style={{ marginBottom: 12, fontSize: "0.9rem" }}>Media Assets</h4>
                  {isLocked(selectedItem) && (
                    <p style={{ color: "var(--orange)", fontSize: "0.75rem", marginBottom: 12 }}>
                      ⚠️ Video upload is locked until release. Trailer and images are allowed.
                    </p>
                  )}
                  <div className="form-grid-2">
                    <div className="form-row">
                      <label className="form-label">Poster</label>
                      <div className="file-input-wrapper">
                        <input type="file" accept="image/*" id="edit-poster" className="file-input" onChange={e => handleUploadChange("poster", e.target.files[0])} />
                        <label htmlFor="edit-poster" className="file-label">{uploadData.poster ? `✓ ${uploadData.poster.name}` : "Change Poster"}</label>
                      </div>
                      <input className="form-input" style={{ marginTop: 8 }} placeholder="Or Paste URL" value={uploadData.posterUrl} onChange={e => handleUploadChange("posterUrl", e.target.value)} />
                    </div>
                    <div className="form-row">
                      <label className="form-label">Banner</label>
                      <div className="file-input-wrapper">
                        <input type="file" accept="image/*" id="edit-banner" className="file-input" onChange={e => handleUploadChange("banner", e.target.files[0])} />
                        <label htmlFor="edit-banner" className="file-label">{uploadData.banner ? `✓ ${uploadData.banner.name}` : "Change Banner"}</label>
                      </div>
                      <input className="form-input" style={{ marginTop: 8 }} placeholder="Or Paste URL" value={uploadData.bannerUrl} onChange={e => handleUploadChange("bannerUrl", e.target.value)} />
                    </div>
                    <div className="form-row">
                      <label className="form-label">Trailer</label>
                      <div className="file-input-wrapper">
                        <input type="file" accept="video/*" id="edit-trailer" className="file-input" onChange={e => handleUploadChange("trailer", e.target.files[0])} />
                        <label htmlFor="edit-trailer" className="file-label">{uploadData.trailer ? `✓ ${uploadData.trailer.name}` : "Change Trailer"}</label>
                      </div>
                      <input className="form-input" style={{ marginTop: 8 }} placeholder="Or Paste URL" value={uploadData.trailerUrl} onChange={e => handleUploadChange("trailerUrl", e.target.value)} />
                    </div>
                    {contentType === "movies" && (
                      <div className="form-row">
                        <label className="form-label" style={{ opacity: isLocked(selectedItem) ? 0.5 : 1 }}>Full Movie Video</label>
                        <div className="file-input-wrapper">
                          <input type="file" accept="video/*" id="edit-video" className="file-input" disabled={isLocked(selectedItem)} onChange={e => handleUploadChange("video", e.target.files[0])} />
                          <label htmlFor="edit-video" className={`file-label ${isLocked(selectedItem) ? "file-label-locked" : ""}`}>
                            {isLocked(selectedItem) ? "🔒 Locked" : uploadData.video ? `✓ ${uploadData.video.name}` : "Change Video"}
                          </label>
                        </div>
                        <input className="form-input" style={{ marginTop: 8 }} placeholder="Or Paste URL" disabled={isLocked(selectedItem)} value={uploadData.videoUrl} onChange={e => handleUploadChange("videoUrl", e.target.value)} />
                      </div>
                    )}
                  </div>
                </div>
              )}



              {uploadPhase && (
                <div
                  className="upload-progress-card"
                  style={{
                    padding: "20px",
                    borderRadius: "12px",
                    background: "rgba(30, 30, 40, 0.7)",
                    backdropFilter: "blur(8px)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                    marginTop: "20px",
                    marginBottom: "10px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div
                        className="spinner"
                        style={{
                          width: 16,
                          height: 16,
                          border: "2px solid rgba(230, 57, 70, 0.2)",
                          borderTopColor: "var(--primary)",
                          borderRadius: "50%",
                          animation: "spin 1s linear infinite",
                        }}
                      />
                      <span style={{ fontSize: "14px", fontWeight: "600", color: "#fff" }}>
                        {uploadPhase === "saving" ? "Uploading & Saving Changes..." : "Finalizing Updates..."}
                      </span>
                    </div>
                    <span style={{ fontSize: "14px", fontWeight: "700", color: "var(--primary)" }}>
                      {uploadProgress}%
                    </span>
                  </div>

                  <div
                    style={{
                      width: "100%",
                      height: "8px",
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
                        transition: "width 0.3s ease-out",
                        boxShadow: "0 0 10px rgba(227, 9, 20, 0.5)",
                      }}
                    />
                  </div>
                  <span style={{ fontSize: "12px", color: "#8a8b98" }}>
                    Please keep this window open while changes are being stored.
                  </span>
                </div>
              )}

            </div>

            {/* Modal Footer Buttons */}
            <div className="modal-footer">
              {modalMode === "edit" && (
                <button className="btn btn-primary" onClick={handleSave} disabled={!!uploadPhase}>
                  {uploadPhase ? "Saving..." : "Save Changes"}
                </button>
              )}
              {modalMode === "episode-edit" && (
                <button className="btn btn-primary" onClick={handleEpisodeSave} disabled={!!uploadPhase}>
                  {uploadPhase ? "Saving..." : "Save Episode"}
                </button>
              )}
              <button className="btn btn-ghost" onClick={closeModal} disabled={!!uploadPhase}>
                {(modalMode === "view" || modalMode === "episode-view") ? "Close" : "Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
