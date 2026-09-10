import { useEffect, useState } from "react";
import API, { API_BASE_URL } from "../api/axios";
import { Eye, Trash2, X, User, Search, RotateCw } from "lucide-react";
import "./Dashboard.css";

export default function RatingsPage() {
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRating, setSelectedRating] = useState(null);

  // Search & Pagination States
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [overallRating, setOverallRating] = useState(0);
  const limit = 10;

  const [refreshing, setRefreshing] = useState(false);
  const [isFirstLoadDone, setIsFirstLoadDone] = useState(false);

  const fetchRatings = async (isFirstLoad = false) => {
    if (isFirstLoad) setLoading(true);
    try {
      const res = await API.get(`rating/all?page=${page}&limit=${limit}&search=${search}`);
      setRatings(res.data.ratings || []);
      setOverallRating(res.data.overallRating || 0);
      setTotalPages(res.data.pagination?.pages || 1);
    } catch (err) {
      console.error("Error fetching ratings:", err);
      setRatings([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isFirstLoadDone) {
      fetchRatings(true);
      setIsFirstLoadDone(true);
    } else {
      fetchRatings(false);
    }
  }, [page, search]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchRatings(false);
    setTimeout(() => {
      setRefreshing(false);
    }, 800);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user review permanently?")) return;
    try {
      await API.delete(`rating/${id}`);
      if (ratings.length === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        fetchRatings();
      }
      alert("Review deleted successfully");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete review");
    }
  };

  const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    const serverUrl = API_BASE_URL.replace("/api", "").replace(/\/+$/, "");
    const cleanPath = path.replace(/\\/g, "/").replace(/^\/+/, "");
    return `${serverUrl}/${cleanPath}`;
  };

  return (
    <div className="page-section">
      {/* Header */}
      <div className="pg-header" style={{ marginBottom: "20px" }}>
        <h1 className="pg-title">⭐ User Ratings</h1>
        <p className="pg-sub">All user feedback and reviews</p>
      </div>

      {/* Overall Rating Banner */}
      <div style={{
        background: "rgba(255, 255, 255, 0.03)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "20px",
        marginBottom: "24px",
        display: "flex",
        alignItems: "center",
        gap: "16px"
      }}>
        <div style={{
          fontSize: "2.2rem",
          fontWeight: "800",
          color: "#facc15",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          ★ {overallRating} <span style={{ fontSize: "1.1rem", fontWeight: "500", color: "var(--text-soft)" }}>/ 5</span>
        </div>
        <div>
          <h4 style={{ margin: 0, fontSize: "1.05rem", color: "var(--text)", fontWeight: "600" }}>Average User Rating</h4>
          <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem", color: "var(--text-muted)" }}>
            Based on all user reviews and submissions
          </p>
        </div>
      </div>

      {/* Search Bar Control */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
        <div style={{ position: "relative", flex: 1 }}>
          <input
            type="text"
            className="form-input"
            placeholder="Search by user name or email..."
            style={{
              width: "100%",
              padding: "10px 12px 10px 42px",
              background: "var(--bg2)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              color: "var(--text)"
            }}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", display: "flex", alignItems: "center" }}>
            <Search size={16} />
          </span>
        </div>
        <button
          className="btn btn-ghost"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "10px 16px",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            cursor: refreshing ? "not-allowed" : "pointer",
            background: "var(--bg2)",
            color: "var(--text)"
          }}
          onClick={handleRefresh}
          title="Refresh Data"
          disabled={refreshing}
        >
          <RotateCw size={16} className={refreshing ? "spinning-icon" : ""} />
        </button>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .spinning-icon {
          animation: spin 0.8s linear infinite;
        }
      `}</style>

      <div className="content-box">
        {loading ? (
          <p>Loading...</p>
        ) : ratings.length === 0 ? (
          <div className="empty-state">
            <p>No ratings match your search parameters</p>
          </div>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Rating</th>
                  <th>Review</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {ratings.map((r) => (
                  <tr key={r._id}>
                    <td className="u-name">{r.user?.name || "Deleted User"}</td>
                    <td>{r.user?.email || "N/A"}</td>
                    <td>
                      <span className="badge badge-active" style={{ background: "rgba(250, 204, 21, 0.15)", color: "#facc15" }}>
                        ★ {r.rating}/5
                      </span>
                    </td>
                    <td>{r.review || "-"}</td>
                    <td>
                      {new Date(r.createdAt).toLocaleDateString("en-IN")}
                    </td>
                    <td>
                      <div className="tbl-actions" style={{ display: "flex", gap: "8px" }}>
                        <button
                          className="icon-btn view"
                          onClick={() => setSelectedRating(r)}
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          className="icon-btn del"
                          onClick={() => handleDelete(r._id)}
                          title="Delete Review"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "20px", padding: "10px 0" }}>
          <span style={{ fontSize: "0.85rem", color: "var(--text-soft)" }}>
            Showing page {page} of {totalPages}
          </span>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              className="btn btn-ghost"
              style={{ padding: "6px 16px", fontSize: "0.85rem", opacity: page === 1 ? 0.5 : 1, cursor: page === 1 ? "not-allowed" : "pointer" }}
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>
            <button
              className="btn btn-ghost"
              style={{ padding: "6px 16px", fontSize: "0.85rem", opacity: page === totalPages ? 0.5 : 1, cursor: page === totalPages ? "not-allowed" : "pointer" }}
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* View Rating Modal */}
      {selectedRating && (
        <div className="modal-overlay" onClick={() => setSelectedRating(null)} style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          backdropFilter: "blur(6px)"
        }}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{
            background: "var(--bg2)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: "24px",
            width: "100%",
            maxWidth: "500px",
            boxShadow: "var(--shadow)"
          }}>
            <div className="modal-head" style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
              borderBottom: "1px solid var(--border)",
              paddingBottom: "12px"
            }}>
              <h3 style={{ margin: 0, fontSize: "1.25rem", color: "var(--text)" }}>User Feedback Details</h3>
              <button
                onClick={() => setSelectedRating(null)}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
              >
                <X size={24} />
              </button>
            </div>

            <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* User Section */}
              <div style={{ display: "flex", alignItems: "center", gap: "16px", background: "rgba(255,255,255,0.02)", padding: "12px", borderRadius: "var(--radius-sm)" }}>
                <div style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  overflow: "hidden",
                  background: "var(--bg3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid var(--border)"
                }}>
                  {selectedRating.user?.profileImage ? (
                    <img src={getImageUrl(selectedRating.user.profileImage)} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <User size={24} style={{ color: "var(--text-soft)" }} />
                  )}
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: "1rem", color: "var(--text)" }}>{selectedRating.user?.name || "Deleted User"}</h4>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-soft)" }}>{selectedRating.user?.email || "N/A"}</p>
                  <p style={{ margin: "2px 0 0 0", fontSize: "0.8rem", color: "var(--text-muted)", fontFamily: "monospace" }}>{selectedRating.user?.phone || "No Phone"}</p>
                </div>
              </div>

              {/* Rating Section */}
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed var(--border)", paddingBottom: "6px" }}>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-soft)" }}>Rating Score</span>
                  <span style={{ fontSize: "0.85rem", fontWeight: "700", color: "#facc15" }}>★ {selectedRating.rating} / 5</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed var(--border)", paddingBottom: "6px" }}>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-soft)" }}>Submission Date</span>
                  <span style={{ fontSize: "0.85rem", color: "var(--text)" }}>
                    {new Date(selectedRating.createdAt).toLocaleDateString("en-IN", { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "4px" }}>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-soft)", fontWeight: "600" }}>Review / Comment</span>
                  <div style={{
                    background: "rgba(255,255,255,0.01)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    padding: "12px",
                    color: "var(--text-soft)",
                    fontSize: "0.9rem",
                    minHeight: "80px",
                    whiteSpace: "pre-wrap"
                  }}>
                    {selectedRating.review || "No written review comment provided."}
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-foot" style={{ marginTop: "24px" }}>
              <button
                className="btn btn-ghost"
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--text-soft)",
                  cursor: "pointer",
                  fontWeight: "600"
                }}
                onClick={() => setSelectedRating(null)}
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}