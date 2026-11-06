import { useState, useEffect, useCallback, useRef, Fragment } from "react";
import {
  Layers,
  RotateCw,
  Plus,
  Search,
  LayoutGrid,
  Pencil,
  Trash2,
  Check,
  X,
  Save,
  ChevronLeft,
  ChevronRight,
  Film,
  Tv,
} from "lucide-react";
import API, { BASE_URL } from "../api/axios";
import "./Category.css";

export default function CategoryPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Table filtering & search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All"); // All | Active | Inactive

  // Expanded row for Curated Order
  const [expandedCatId, setExpandedCatId] = useState(null);
  const [curatedData, setCuratedData] = useState({}); // { [catId]: { curated: [], available: [], totalCount: 0, loading: false, saving: false, filterContent: "" } }

  // Drag and drop state
  const draggedIndexRef = useRef(null);

  // Add / Edit Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // "create" | "edit"
  const [modalForm, setModalForm] = useState({
    id: null,
    name: "",
    slug: "",
    color: "#f59e0b",
    priority: 1,
    isActive: true,
  });
  const [modalSubmitting, setModalSubmitting] = useState(false);

  // Helper for image URLs
  const getPosterUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
      return url;
    }
    return `${BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
  };

  // Helper to format date
  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "-";
    }
  };

  // ─── Fetch Categories ──────────────────────────────────
  const fetchCategories = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const res = await API.get("/admin/categories");
      setCategories(res.data.categories || []);
    } catch (err) {
      console.error("Failed to load categories:", err);
      alert("Failed to load categories");
    } finally {
      if (!isSilent) setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchCategories(true);
  };

  // ─── Fetch Curated Content for Expanded Category ───────
  const fetchCuratedContent = async (catId) => {
    setCuratedData((prev) => ({
      ...prev,
      [catId]: {
        ...(prev[catId] || { curated: [], available: [], totalCount: 0, filterContent: "" }),
        loading: true,
      },
    }));

    try {
      const res = await API.get(`/admin/categories/${catId}/curated-content`);
      const { curated = [], available = [], totalCount = 0 } = res.data;

      // Always sort by position and assign strictly unique sequential 1-based positions: 1, 2, 3...
      const sortedCurated = curated
        .sort((a, b) => (Number(a.position) || 0) - (Number(b.position) || 0))
        .map((item, idx) => ({
          ...item,
          position: idx + 1,
        }));

      setCuratedData((prev) => ({
        ...prev,
        [catId]: {
          curated: sortedCurated,
          available: available,
          totalCount: totalCount,
          loading: false,
          saving: false,
          filterContent: prev[catId]?.filterContent || "",
        },
      }));
    } catch (err) {
      console.error("Failed to load curated content:", err);
      alert("Failed to load curated content for this category");
      setCuratedData((prev) => ({
        ...prev,
        [catId]: { ...(prev[catId] || {}), loading: false },
      }));
    }
  };

  const toggleExpandCategory = (catId) => {
    if (expandedCatId === catId) {
      setExpandedCatId(null);
    } else {
      setExpandedCatId(catId);
      if (!curatedData[catId] || curatedData[catId].curated.length === 0) {
        fetchCuratedContent(catId);
      }
    }
  };

  // ─── Curated Items Positioning & Manipulation ─────────
  const moveCuratedItem = (catId, fromIndex, toIndex) => {
    const data = curatedData[catId];
    if (!data) return;
    const list = [...data.curated];
    if (toIndex < 0 || toIndex >= list.length) return;

    const [moved] = list.splice(fromIndex, 1);
    list.splice(toIndex, 0, moved);

    // Re-assign positions sequentially
    const updated = list.map((item, idx) => ({
      ...item,
      position: idx + 1,
    }));

    setCuratedData((prev) => ({
      ...prev,
      [catId]: { ...prev[catId], curated: updated },
    }));
  };

  const handlePositionInputChange = (catId, currentIndex, newPosValue) => {
    const data = curatedData[catId];
    if (!data) return;

    const targetPos = parseInt(newPosValue, 10);
    // If not a valid positive number, keep current state (forces re-render with clean numbers)
    if (isNaN(targetPos) || targetPos < 1) {
      setCuratedData((prev) => ({
        ...prev,
        [catId]: { ...prev[catId], curated: [...data.curated] },
      }));
      return;
    }

    const list = [...data.curated];
    if (currentIndex < 0 || currentIndex >= list.length) return;

    // Convert target 1-based position to 0-based index and clamp
    const targetIndex = Math.max(0, Math.min(list.length - 1, targetPos - 1));

    if (targetIndex === currentIndex) {
      // Re-index to ensure contiguous numbers
      const updated = list.map((item, idx) => ({
        ...item,
        position: idx + 1,
      }));
      setCuratedData((prev) => ({
        ...prev,
        [catId]: { ...prev[catId], curated: updated },
      }));
      return;
    }

    // Remove the item from its current index
    const [movedItem] = list.splice(currentIndex, 1);

    // Insert at target index: replaces that position, pushing previous item and rest down
    list.splice(targetIndex, 0, movedItem);

    // Strictly re-assign unique 1-based sequential positions: 1, 2, 3, 4, 5...
    const updated = list.map((item, idx) => ({
      ...item,
      position: idx + 1,
    }));

    setCuratedData((prev) => ({
      ...prev,
      [catId]: { ...prev[catId], curated: updated },
    }));
  };

  const handleRemoveFromCurated = (catId, itemToRemove) => {
    const data = curatedData[catId];
    if (!data) return;

    const nextCurated = data.curated
      .filter((i) => i._id !== itemToRemove._id)
      .map((item, idx) => ({ ...item, position: idx + 1 }));

    const nextAvailable = [itemToRemove, ...data.available];

    setCuratedData((prev) => ({
      ...prev,
      [catId]: {
        ...prev[catId],
        curated: nextCurated,
        available: nextAvailable,
      },
    }));
  };

  const handleAddToCurated = (catId, itemToAdd) => {
    const data = curatedData[catId];
    if (!data) return;

    const nextAvailable = data.available.filter((i) => i._id !== itemToAdd._id);
    const nextCurated = [
      ...data.curated,
      itemToAdd,
    ].map((item, idx) => ({
      ...item,
      position: idx + 1,
    }));

    setCuratedData((prev) => ({
      ...prev,
      [catId]: {
        ...prev[catId],
        curated: nextCurated,
        available: nextAvailable,
      },
    }));
  };

  const handleAddAll = (catId) => {
    const data = curatedData[catId];
    if (!data || data.available.length === 0) return;

    const allCombined = [...data.curated, ...data.available].map((item, idx) => ({
      ...item,
      position: idx + 1,
    }));

    setCuratedData((prev) => ({
      ...prev,
      [catId]: {
        ...prev[catId],
        curated: allCombined,
        available: [],
      },
    }));
  };

  const handleClearRow = (catId) => {
    const data = curatedData[catId];
    if (!data || data.curated.length === 0) return;

    if (!window.confirm("Remove all items from this category's curated order?")) return;

    const allMovedToAvailable = [...data.curated, ...data.available];

    setCuratedData((prev) => ({
      ...prev,
      [catId]: {
        ...prev[catId],
        curated: [],
        available: allMovedToAvailable,
      },
    }));
  };

  // Drag and Drop handlers
  const handleDragStart = (index) => {
    draggedIndexRef.current = index;
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (catId, targetIndex) => {
    const sourceIndex = draggedIndexRef.current;
    if (sourceIndex !== null && sourceIndex !== targetIndex) {
      moveCuratedItem(catId, sourceIndex, targetIndex);
    }
    draggedIndexRef.current = null;
  };

  // Save Curated Order to Backend
  const handleSaveCuratedOrder = async (catId) => {
    const data = curatedData[catId];
    if (!data) return;

    setCuratedData((prev) => ({
      ...prev,
      [catId]: { ...prev[catId], saving: true },
    }));

    try {
      const payload = {
        curatedItems: data.curated.map((item, idx) => ({
          contentId: item._id,
          contentType: item.contentType || (item.type === "movie" ? "movie" : "series"),
          position: idx + 1,
        })),
      };

      const res = await API.patch(`/admin/categories/${catId}/curated-order`, payload);
      alert(res.data.message || "Curated display order saved successfully!");

      // Update the itemCount in the categories list
      setCategories((prev) =>
        prev.map((c) => (c._id === catId ? { ...c, itemCount: data.curated.length } : c))
      );
    } catch (err) {
      console.error("Failed to save curated order:", err);
      alert(err.response?.data?.message || "Failed to save curated display order");
    } finally {
      setCuratedData((prev) => ({
        ...prev,
        [catId]: { ...prev[catId], saving: false },
      }));
    }
  };

  // ─── Status Toggle ─────────────────────────────────────
  const handleToggleStatus = async (catId) => {
    try {
      const res = await API.patch(`/admin/categories/${catId}/toggle`);
      const updated = res.data.category;
      setCategories((prev) =>
        prev.map((c) => (c._id === catId ? { ...c, isActive: updated.isActive } : c))
      );
    } catch (err) {
      console.error("Failed to toggle status:", err);
      alert("Failed to toggle category status");
    }
  };

  // ─── Modal Open / Close / Submit ──────────────────────
  const openCreateModal = () => {
    const nextPriority = categories.length > 0 ? Math.max(...categories.map((c) => c.priority || 0)) + 1 : 1;
    setModalForm({
      id: null,
      name: "",
      slug: "",
      color: "#f59e0b",
      priority: nextPriority,
      isActive: true,
    });
    setModalMode("create");
    setModalOpen(true);
  };

  const openEditModal = (cat) => {
    setModalForm({
      id: cat._id,
      name: cat.name || "",
      slug: cat.slug || "",
      color: cat.color || "#6366f1",
      priority: cat.priority !== undefined ? cat.priority : 1,
      isActive: cat.isActive !== false,
    });
    setModalMode("edit");
    setModalOpen(true);
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!modalForm.name.trim()) {
      alert("Category name is required");
      return;
    }

    setModalSubmitting(true);
    try {
      const payload = {
        name: modalForm.name.trim(),
        slug: modalForm.slug.trim(),
        color: modalForm.color,
        priority: Number(modalForm.priority) || 1,
        isActive: modalForm.isActive,
      };

      if (modalMode === "edit" && modalForm.id) {
        await API.patch(`/admin/categories/${modalForm.id}`, payload);
      } else {
        await API.post("/admin/categories", payload);
      }

      setModalOpen(false);
      fetchCategories();
    } catch (err) {
      console.error("Modal error:", err);
      alert(err.response?.data?.message || "Failed to save category");
    } finally {
      setModalSubmitting(false);
    }
  };

  // ─── Delete Category ───────────────────────────────────
  const handleDeleteCategory = async (catId, catName) => {
    if (!window.confirm(`Are you sure you want to delete "${catName}"? This will also remove it from all content.`)) {
      return;
    }

    try {
      await API.delete(`/admin/categories/${catId}`);
      if (expandedCatId === catId) setExpandedCatId(null);
      fetchCategories();
    } catch (err) {
      console.error("Failed to delete category:", err);
      alert("Failed to delete category");
    }
  };

  // ─── Stats Counts ──────────────────────────────────────
  const totalCount = categories.length;
  const activeCount = categories.filter((c) => c.isActive !== false).length;
  const inactiveCount = categories.filter((c) => c.isActive === false).length;

  // ─── Filtering Categories Table ────────────────────────
  const filteredCategories = categories.filter((c) => {
    // Status filter
    if (statusFilter === "Active" && c.isActive === false) return false;
    if (statusFilter === "Inactive" && c.isActive !== false) return false;

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = c.name?.toLowerCase().includes(q);
      const matchSlug = c.slug?.toLowerCase().includes(q);
      if (!matchName && !matchSlug) return false;
    }

    return true;
  });

  return (
    <div className="cat-page-container">
      {/* ── Page Header ── */}
      <div className="cat-header">
        <div className="cat-header-left">
          <div className="cat-header-icon-box">
            <Layers size={22} />
          </div>
          <div>
            <h1 className="cat-title">Categories</h1>
            <p className="cat-subtitle">
              Manage content categories and set curated display order for mobile apps and website.
            </p>
          </div>
        </div>

        <div className="cat-header-actions">
          <button
            className="cat-btn-refresh"
            onClick={handleRefresh}
            disabled={refreshing}
            title="Refresh categories"
          >
            <RotateCw size={16} className={refreshing ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>

          <button className="cat-btn-add" onClick={openCreateModal}>
            <Plus size={18} />
            <span>Add Category</span>
          </button>
        </div>
      </div>

      {/* ── Top Summary Stat Cards ── */}
      <div className="cat-stats-grid">
        <div className="cat-stat-card">
          <div className="cat-stat-value">{totalCount}</div>
          <div className="cat-stat-label">TOTAL</div>
        </div>

        <div className="cat-stat-card">
          <div className="cat-stat-value active-green">{activeCount}</div>
          <div className="cat-stat-label">ACTIVE</div>
        </div>

        <div className="cat-stat-card">
          <div className="cat-stat-value">{inactiveCount}</div>
          <div className="cat-stat-label">INACTIVE</div>
        </div>
      </div>

      {/* ── Search & Filter Controls Bar ── */}
      <div className="cat-filter-bar">
        <div className="cat-search-box">
          <Search size={17} />
          <input
            type="text"
            placeholder="Search categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="cat-filter-tabs">
          {["All", "Active", "Inactive"].map((tab) => (
            <button
              key={tab}
              className={`cat-filter-tab ${statusFilter === tab ? "active" : ""}`}
              onClick={() => setStatusFilter(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Categories Table Card ── */}
      <div className="cat-table-card">
        <div className="cat-table-wrapper">
          <table className="cat-table">
            <thead>
              <tr>
                <th style={{ width: "48px" }}>#</th>
                <th>CATEGORY</th>
                <th>SLUG</th>
                <th>PRIORITY</th>
                <th>STATUS</th>
                <th>CREATED</th>
                <th style={{ textAlign: "right", paddingRight: "28px" }}>ACTIONS</th>
              </tr>
            </thead>

            <tbody>
              {loading && categories.length === 0 ? (
                <tr>
                  <td colSpan="7" className="cat-empty-state">
                    Loading categories...
                  </td>
                </tr>
              ) : filteredCategories.length === 0 ? (
                <tr>
                  <td colSpan="7" className="cat-empty-state">
                    No categories found.
                  </td>
                </tr>
              ) : (
                filteredCategories.map((cat, index) => {
                  const isExpanded = expandedCatId === cat._id;
                  const catColor = cat.color || "#f59e0b";
                  const initialLetter = cat.name ? cat.name.charAt(0).toUpperCase() : "C";
                  const itemCount = cat.itemCount !== undefined ? cat.itemCount : 0;
                  const isActive = cat.isActive !== false;

                  const data = curatedData[cat._id] || {
                    curated: [],
                    available: [],
                    totalCount: 0,
                    loading: false,
                    saving: false,
                    filterContent: "",
                  };

                  // Filter curated and available in the drawer
                  const contentQuery = (data.filterContent || "").toLowerCase();
                  const filteredCurated = data.curated.filter((item) =>
                    item.title ? item.title.toLowerCase().includes(contentQuery) : true
                  );
                  const filteredAvailable = data.available.filter((item) =>
                    item.title ? item.title.toLowerCase().includes(contentQuery) : true
                  );

                  return (
                    <Fragment key={cat._id}>
                      <tr className={`cat-row ${isExpanded ? "expanded" : ""}`}>
                        {/* # */}
                        <td className="cat-col-num">{index + 1}</td>

                        {/* Category Name & Avatar */}
                        <td>
                          <div className="cat-info-cell">
                            <div className="cat-avatar" style={{ backgroundColor: catColor }}>
                              {initialLetter}
                            </div>
                            <div className="cat-name-wrap">
                              <span className="cat-name-text">{cat.name}</span>
                              <span className="cat-items-badge">{itemCount} items</span>
                            </div>
                          </div>
                        </td>

                        {/* Slug */}
                        <td>
                          <span className="cat-slug-pill">{cat.slug}</span>
                        </td>

                        {/* Priority */}
                        <td>
                          <span className="cat-priority-badge">{cat.priority || 1}</span>
                        </td>

                        {/* Status */}
                        <td>
                          <span className={`cat-status-pill ${isActive ? "active" : "inactive"}`}>
                            {isActive ? "ACTIVE" : "INACTIVE"}
                          </span>
                        </td>

                        {/* Created Date */}
                        <td className="cat-col-date">
                          {formatDate(cat.createdAt)}
                        </td>

                        {/* Actions */}
                        <td>
                          <div
                            className="cat-actions-cell"
                            style={{ justifyContent: "flex-end", paddingRight: "10px" }}
                          >
                            {/* Toggle Switch */}
                            <label className="cat-toggle-switch" title="Toggle active status">
                              <input
                                type="checkbox"
                                checked={isActive}
                                onChange={() => handleToggleStatus(cat._id)}
                              />
                              <span className="cat-toggle-slider" />
                            </label>

                            {/* Curated Grid Reorder Button */}
                            <button
                              className={`cat-icon-btn ${isExpanded ? "active-red" : ""}`}
                              onClick={() => toggleExpandCategory(cat._id)}
                              title="Curate series and movies display order"
                            >
                              <LayoutGrid size={16} />
                            </button>

                            {/* Edit Button */}
                            <button
                              className="cat-icon-btn"
                              onClick={() => openEditModal(cat)}
                              title="Edit Category"
                            >
                              <Pencil size={15} />
                            </button>

                            {/* Delete Button */}
                            <button
                              className="cat-icon-btn delete"
                              onClick={() => handleDeleteCategory(cat._id, cat.name)}
                              title="Delete Category"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* ── EXPANDED CURATED DISPLAY ORDER DRAWER ── */}
                      {isExpanded && (
                        <tr className="cat-expanded-row">
                          <td colSpan="7">
                            <div className="cat-drawer-container">
                              {/* Top Toolbar */}
                              <div className="cat-drawer-toolbar">
                                <div className="cat-drawer-tools-left">
                                  <span className="cat-selected-pill">
                                    {data.curated.length} of {data.totalCount || data.curated.length + data.available.length} Selected
                                  </span>

                                  <button
                                    className="cat-btn-tool"
                                    onClick={() => handleAddAll(cat._id)}
                                    disabled={data.available.length === 0}
                                    title="Add all remaining content to this category"
                                  >
                                    <Plus size={15} />
                                    <span>Add All ({data.available.length})</span>
                                  </button>

                                  <button
                                    className="cat-btn-tool"
                                    onClick={() => handleClearRow(cat._id)}
                                    disabled={data.curated.length === 0}
                                    title="Clear all selected content"
                                  >
                                    <span>Clear Row</span>
                                  </button>
                                </div>

                                <div className="cat-drawer-tools-right">
                                  <div className="cat-content-search">
                                    <Search size={15} />
                                    <input
                                      type="text"
                                      placeholder="Filter available content..."
                                      value={data.filterContent}
                                      onChange={(e) =>
                                        setCuratedData((prev) => ({
                                          ...prev,
                                          [cat._id]: {
                                            ...prev[cat._id],
                                            filterContent: e.target.value,
                                          },
                                        }))
                                      }
                                    />
                                  </div>

                                  <button
                                    className="cat-btn-save-order"
                                    onClick={() => handleSaveCuratedOrder(cat._id)}
                                    disabled={data.saving}
                                  >
                                    <Save size={16} />
                                    <span>{data.saving ? "Saving..." : "Save Curated Order"}</span>
                                  </button>
                                </div>
                              </div>

                              {/* Green Instruction Line */}
                              <div className="cat-curated-heading">
                                <span className="cat-green-dot" />
                                <span>
                                  CURATED DISPLAY ORDER (TYPE POSITION NUMBER AND PRESS ENTER TO REORDER):
                                </span>
                              </div>

                              {/* Loading / Cards Grid */}
                              {data.loading ? (
                                <div className="cat-empty-state" style={{ padding: "30px" }}>
                                  Loading content for {cat.name}...
                                </div>
                              ) : filteredCurated.length === 0 ? (
                                <div
                                  className="cat-empty-state"
                                  style={{
                                    padding: "24px",
                                    border: "1px dashed #223048",
                                    borderRadius: "8px",
                                  }}
                                >
                                  No content currently in this curated list. Click any item from "Available Content" below or click "+ Add All" to add!
                                </div>
                              ) : (
                                <div className="cat-cards-grid">
                                  {filteredCurated.map((item, cIndex) => {
                                    const posterUrl = getPosterUrl(item.poster || item.banner);
                                    const isSeries = item.contentType === "series" || item.type === "series";

                                    return (
                                      <div
                                        key={item._id}
                                        className="cat-card-poster"
                                        draggable
                                        onDragStart={() => handleDragStart(cIndex)}
                                        onDragOver={handleDragOver}
                                        onDrop={() => handleDrop(cat._id, cIndex)}
                                      >
                                        <div className="cat-poster-wrap">
                                          {posterUrl ? (
                                            <img
                                              src={posterUrl}
                                              alt={item.title}
                                              className="cat-poster-img"
                                              onError={(e) => {
                                                e.target.style.display = "none";
                                              }}
                                            />
                                          ) : (
                                            <div className="cat-poster-placeholder">
                                              {isSeries ? <Tv size={28} /> : <Film size={28} />}
                                            </div>
                                          )}

                                          {/* Selected Check Indicator */}
                                          <div className="cat-badge-check" title="Included in Category">
                                            <Check size={13} strokeWidth={3} />
                                          </div>

                                          {/* Remove Button */}
                                          <button
                                            className="cat-badge-remove"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleRemoveFromCurated(cat._id, item);
                                            }}
                                            title="Remove from curated list"
                                          >
                                            <X size={13} strokeWidth={3} />
                                          </button>

                                          {/* Red Position Badge & Controls */}
                                          <div className="cat-pos-overlay">
                                            <button
                                              className="cat-pos-arrow"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                moveCuratedItem(cat._id, cIndex, cIndex - 1);
                                              }}
                                              disabled={cIndex === 0}
                                              title="Move left (lower position)"
                                            >
                                              <ChevronLeft size={14} />
                                            </button>

                                            <div className="cat-pos-text-wrap">
                                              <span>POS</span>
                                              <input
                                                type="text"
                                                className="cat-pos-input"
                                                defaultValue={item.position || cIndex + 1}
                                                key={`${item._id}-${item.position || cIndex + 1}`}
                                                onClick={(e) => e.stopPropagation()}
                                                onKeyDown={(e) => {
                                                  if (e.key === "Enter") {
                                                    e.preventDefault();
                                                    e.target.blur();
                                                  }
                                                }}
                                                onBlur={(e) => {
                                                  handlePositionInputChange(cat._id, cIndex, e.target.value);
                                                }}
                                              />
                                            </div>

                                            <button
                                              className="cat-pos-arrow"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                moveCuratedItem(cat._id, cIndex, cIndex + 1);
                                              }}
                                              disabled={cIndex === filteredCurated.length - 1}
                                              title="Move right (higher position)"
                                            >
                                              <ChevronRight size={14} />
                                            </button>
                                          </div>
                                        </div>

                                        {/* Title & Type Badge */}
                                        <div className="cat-card-info">
                                          <h4 className="cat-card-title" title={item.title}>
                                            {item.title}
                                          </h4>
                                          <span className={`cat-type-pill ${isSeries ? "series" : "movie"}`}>
                                            {isSeries ? "SERIES" : "MOVIE"}
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {/* ── Available Content (Click to Add) Section ── */}
                              {filteredAvailable.length > 0 && (
                                <div className="cat-available-section">
                                  <div className="cat-available-heading">
                                    <Plus size={15} />
                                    <span>
                                      AVAILABLE CONTENT (CLICK POSTER TO ADD TO THIS CATEGORY): ({filteredAvailable.length})
                                    </span>
                                  </div>

                                  <div className="cat-cards-grid">
                                    {filteredAvailable.map((availItem) => {
                                      const posterUrl = getPosterUrl(availItem.poster || availItem.banner);
                                      const isSeries = availItem.contentType === "series" || availItem.type === "series";

                                      return (
                                        <div
                                          key={availItem._id}
                                          className="cat-card-poster cat-available-card"
                                          onClick={() => handleAddToCurated(cat._id, availItem)}
                                          title={`Click to add "${availItem.title}" to ${cat.name}`}
                                        >
                                          <div className="cat-poster-wrap cat-available-wrap">
                                            {posterUrl ? (
                                              <img
                                                src={posterUrl}
                                                alt={availItem.title}
                                                className="cat-poster-img"
                                              />
                                            ) : (
                                              <div className="cat-poster-placeholder">
                                                {isSeries ? <Tv size={24} /> : <Film size={24} />}
                                              </div>
                                            )}

                                            <div className="cat-add-overlay">
                                              <div className="cat-add-icon-circle">
                                                <Plus size={18} strokeWidth={3} />
                                              </div>
                                              <span>Add</span>
                                            </div>
                                          </div>

                                          <div className="cat-card-info">
                                            <h4 className="cat-card-title" title={availItem.title}>
                                              {availItem.title}
                                            </h4>
                                            <span className={`cat-type-pill ${isSeries ? "series" : "movie"}`}>
                                              {isSeries ? "SERIES" : "MOVIE"}
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add / Edit Category Modal ── */}
      {modalOpen && (
        <div className="cat-modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="cat-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="cat-modal-head">
              <h3 className="cat-modal-title">
                {modalMode === "edit" ? "Edit Category" : "Create New Category"}
              </h3>
              <button className="cat-modal-close" onClick={() => setModalOpen(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleModalSubmit}>
              <div className="cat-modal-body">
                {/* Name */}
                <div className="cat-form-group">
                  <label className="cat-form-label">Category Name</label>
                  <input
                    type="text"
                    className="cat-form-input"
                    placeholder="e.g. Trending, Action, Romance"
                    value={modalForm.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      setModalForm((prev) => ({
                        ...prev,
                        name,
                        slug:
                          modalMode === "create"
                            ? name
                                .toLowerCase()
                                .trim()
                                .replace(/\s+/g, "-")
                                .replace(/[^\w-]+/g, "")
                            : prev.slug,
                      }));
                    }}
                    required
                  />
                </div>

                {/* Slug */}
                <div className="cat-form-group">
                  <label className="cat-form-label">Category Slug</label>
                  <input
                    type="text"
                    className="cat-form-input"
                    placeholder="e.g. trending, action"
                    value={modalForm.slug}
                    onChange={(e) => setModalForm({ ...modalForm, slug: e.target.value })}
                  />
                </div>

                {/* Color & Priority in 2 Columns */}
                <div className="cat-form-row">
                  <div className="cat-form-group">
                    <label className="cat-form-label">Theme Color</label>
                    <div className="cat-color-picker-wrap">
                      <input
                        type="color"
                        className="cat-color-input"
                        value={modalForm.color}
                        onChange={(e) => setModalForm({ ...modalForm, color: e.target.value })}
                      />
                      <input
                        type="text"
                        className="cat-form-input"
                        style={{ flex: 1 }}
                        value={modalForm.color}
                        onChange={(e) => setModalForm({ ...modalForm, color: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="cat-form-group">
                    <label className="cat-form-label">Priority Order</label>
                    <input
                      type="number"
                      min="1"
                      className="cat-form-input"
                      placeholder="e.g. 1, 2, 3..."
                      value={modalForm.priority}
                      onChange={(e) => setModalForm({ ...modalForm, priority: e.target.value })}
                    />
                  </div>
                </div>

                {/* Status Toggle */}
                <div
                  className="cat-form-group"
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 0",
                  }}
                >
                  <div>
                    <div className="cat-form-label">Category Status</div>
                    <div style={{ fontSize: "0.82rem", color: "#64748b" }}>
                      Active categories are visible across apps and website
                    </div>
                  </div>

                  <label className="cat-toggle-switch">
                    <input
                      type="checkbox"
                      checked={modalForm.isActive}
                      onChange={(e) => setModalForm({ ...modalForm, isActive: e.target.checked })}
                    />
                    <span className="cat-toggle-slider" />
                  </label>
                </div>
              </div>

              <div className="cat-modal-foot">
                <button
                  type="button"
                  className="cat-btn-cancel"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="cat-btn-submit" disabled={modalSubmitting}>
                  {modalSubmitting ? "Saving..." : modalMode === "edit" ? "Update Category" : "Create Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
