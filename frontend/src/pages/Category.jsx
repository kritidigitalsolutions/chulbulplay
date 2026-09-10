import { useState, useEffect, useCallback } from "react";
import { Pencil, Trash2, Eye } from "lucide-react";
import API from "../api/axios";
import "./Dashboard.css";

export default function CategoryPage() {
  const [form, setForm] = useState({ name: "", color: "#6366f1", priority: 0 });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState(null);
  const [viewCat, setViewCat] = useState(null);

  const ch = (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm({ ...form, [e.target.name]: value });
  };

  const fetchCategories = useCallback(async () => {
    try {
      const res = await API.get("/admin/categories");
      setCategories(res.data.categories || []);
    } catch (err) {
      console.error(err);
      alert("Failed to load categories");
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        name: form.name,
        color: form.color,
        priority: form.priority !== undefined ? Number(form.priority) : undefined,
      };

      if (editId) {
        await API.patch(`/admin/categories/${editId}`, payload);
        alert("Category updated successfully.");
      } else {
        await API.post("/admin/categories", payload);
        alert("Category created successfully.");
      }

      setForm({ name: "", color: "#6366f1", priority: 0 });
      setEditId(null);
      fetchCategories();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "An error occurred. Please try again.");
    }

    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this category?")) return;
    try {
      await API.delete(`/admin/categories/${id}`);
      fetchCategories();
    } catch (err) {
      console.error(err);
      alert("Failed to delete category");
    }
  };

  const handleEdit = (cat) => {
    setForm({ name: cat.name || "", color: cat.color || "#6366f1", priority: cat.priority !== undefined ? cat.priority : 0 });
    setEditId(cat._id);
  };

  return (
    <div className="add-content-page">
      <div className="pg-header">
        <h1 className="pg-title">🏷️ Categories</h1>
        <p className="pg-sub">Create and manage content categories</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-card">
          <h3>{editId ? "Edit Category" : "Create New Category"}</h3>

          <div className="form-2col">
            <input
              className="form-input-styled"
              name="name"
              placeholder="Category Name (e.g. Trending)"
              value={form.name}
              onChange={ch}
              required
            />

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                className="form-input-styled"
                name="color"
                type="color"
                value={form.color}
                onChange={ch}
                style={{ width: 64, padding: 6 }}
              />
              <input
                className="form-input-styled"
                name="priority"
                type="number"
                min="0"
                placeholder="0 = Auto-assign (bottom), 1, 2, 3... = ranked"
                value={form.priority}
                onChange={ch}
                style={{ flex: 1 }}
              />
            </div>

          </div>

          <button className="btn-lg" type="submit" style={{ marginTop: 16 }} disabled={loading}>
            {loading ? "Processing..." : editId ? "Update Category" : "Create Category"}
          </button>
        </div>
      </form>

      <div className="content-box" style={{ marginTop: 24 }}>
        <h3>All Categories</h3>

        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Name</th>
                <th>Color</th>
                <th>Priority</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {categories.length === 0 ? (
                <tr>
                  <td colSpan="4">No categories found</td>
                </tr>
              ) : (
                categories.map((c) => (
                  <tr key={c._id}>
                    <td>{c.name}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 20, height: 20, borderRadius: 4, background: c.color || '#6366f1', border: '1px solid rgba(0,0,0,0.08)' }} />
                        <span style={{ fontSize: '0.9rem' }}>{c.color}</span>
                      </div>
                    </td>
                    <td>{c.priority}</td>
                    <td className="actions">
                      <button className="icon-btn view" onClick={() => setViewCat(c)} title="View">
                        <Eye size={16} />
                      </button>

                      <button className="icon-btn edit" onClick={() => handleEdit(c)} title="Edit">
                        <Pencil size={16} />
                      </button>

                      <button className="icon-btn delete" onClick={() => handleDelete(c._id)} title="Delete">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {viewCat && (
        <div className="modal-overlay" onClick={() => setViewCat(null)}>
          <div className="modal-box modal-box-view" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>🏷️ Category Details</h3>
              <button className="modal-close" onClick={() => setViewCat(null)}>✕</button>
            </div>

            <div className="modal-body p-0" style={{ padding: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ padding: 12 }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Name</div>
                  <div style={{ fontWeight: 600 }}>{viewCat.name}</div>
                </div>
                <div style={{ padding: 12 }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Slug</div>
                  <div style={{ fontWeight: 600 }}>{viewCat.slug}</div>
                </div>
                <div style={{ padding: 12 }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Color</div>
                  <div style={{ fontWeight: 600 }}>
                    <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ width: 20, height: 20, background: viewCat.color, display: 'inline-block', borderRadius: 4, border: '1px solid rgba(0,0,0,0.08)' }} />
                      {viewCat.color}
                    </span>
                  </div>
                </div>
                <div style={{ padding: 12 }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Priority</div>
                  <div style={{ fontWeight: 600 }}>{viewCat.priority}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
