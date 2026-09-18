import { useState, useEffect } from "react";
import { Pencil, Trash2, Eye, X, ToggleLeft, ToggleRight } from "lucide-react";
import API from "../api/axios";
import "./Dashboard.css";

export default function PlansPage() {
  const [form, setForm] = useState({
    name: "",
    price: "",
    duration: "",
    features: "",
    planType: "monthly",
    sortOrder: 0,
    isRecommended: false,
    isActive: true
  });

  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState([]);
  const [editId, setEditId] = useState(null);
  const [viewPlan, setViewPlan] = useState(null);

  // =========================
  // 🧠 INPUT CHANGE
  // =========================
  const ch = (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm({ ...form, [e.target.name]: value });
  };

  // =========================
  // 📥 FETCH PLANS
  // =========================
  const fetchPlans = async () => {
    try {
      const res = await API.get("/admin/plan?platform=app");
      setPlans(res.data.plans);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  // =========================
  // ➕ CREATE / ✏️ UPDATE
  // =========================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        name: form.name,
        price: Number(form.price),
        duration: Number(form.duration),
        features: form.features
          .split(",")
          .map((f) => f.trim())
          .filter(Boolean),
        planType: form.planType,
        sortOrder: Number(form.sortOrder),
        isRecommended: form.isRecommended,
        isActive: form.isActive,
        platform: "app"
      };

      if (editId) {
        await API.patch(`/admin/plan/${editId}`, payload);
        alert("Plan updated successfully.");
      } else {
        await API.post("/admin/plan", payload);
        alert("Plan created successfully.");
      }

      setForm({
        name: "",
        price: "", 
        duration: "",
        features: "",
        planType: "monthly",
        sortOrder: 0,
        isRecommended: false,
        isActive: true
      });

      setEditId(null);
      fetchPlans();

    } catch (err) {
      console.error(err);
      alert("An error occurred. Please try again.");
    }

    setLoading(false);
  };

  // =========================
  // ❌ DELETE
  // =========================
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this plan?")) return;

    try {
      await API.delete(`/admin/plan/${id}`);
      fetchPlans();
    } catch (err) {
      console.error(err);
    }
  };

  // =========================
  // 🔄 TOGGLE STATUS
  // =========================
  const handleToggleStatus = async (plan) => {
    try {
      const res = await API.patch(`/admin/plan/${plan._id}/toggle-status`);
      setPlans(prev =>
        prev.map(p => p._id === plan._id ? { ...p, isActive: res.data.isActive } : p)
      );
    } catch (err) {
      console.error(err);
      alert("Failed to toggle plan status");
    }
  };

  // =========================
  // ✏️ EDIT
  // =========================
  const handleEdit = (plan) => {
    setForm({
      name: plan.name,
      price: plan.price,
      duration: plan.duration,
      features: plan.features.join(", "),
      planType: plan.planType || "monthly",
      sortOrder: plan.sortOrder || 0,
      isRecommended: plan.isRecommended || false,
      isActive: plan.isActive !== false
    });
    setEditId(plan._id);
  };

  return (
    <div className="add-content-page">
      {/* Header */}
      <div className="pg-header">
        <h1 className="pg-title">📱 App Subscription Plans</h1>
        <p className="pg-sub">Create and manage plans for Mobile App users</p>
      </div>

      {/* ================= FORM ================= */}
      <form onSubmit={handleSubmit}>
        <div className="form-card">
          <h3>{editId ? "Edit Plan" : "Create New Plan"}</h3>

          <div className="form-2col">
            <div className="form-row">
              <label className="form-label">Plan Name</label>
              <input
                className="form-input-styled"
                name="name"
                placeholder="Plan Name (Basic, Premium)"
                value={form.name}
                onChange={ch}
                required
              />
            </div>

            <div className="form-row">
              <label className="form-label">Price (₹)</label>
              <input
                className="form-input-styled"
                name="price"
                type="number"
                placeholder="Price (₹)"
                value={form.price}
                onChange={ch}
                required
              />
            </div>

            <div className="form-row">
              <label className="form-label">Duration (days)</label>
              <input
                className="form-input-styled"
                name="duration"
                type="number"
                placeholder="Duration (days)"
                value={form.duration}
                onChange={ch}
                required
              />
            </div>

            <div className="form-row form-full">
              <label className="form-label">Features (comma separated)</label>
              <input
                className="form-input-styled form-full"
                name="features"
                placeholder="Features (comma separated)"
                value={form.features}
                onChange={ch}
              />
            </div>

            <div className="form-row">
              <label className="form-label">Plan Type</label>
              <select
                className="form-input-styled"
                name="planType"
                value={form.planType}
                onChange={ch}
              >
                <option value="daily">Daily / Day Wise</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
                <option value="lifetime">Lifetime</option>
              </select>
            </div>

            <div className="form-row">
              <label className="form-label">Sort Order</label>
              <input
                className="form-input-styled"
                name="sortOrder"
                type="number"
                placeholder="Sort Order (e.g. 1)"
                value={form.sortOrder}
                onChange={ch}
              />
            </div>

            {/* Recommended Toggle */}
            <label
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                gap: 8, marginTop: 8, padding: "12px 16px",
                background: form.isRecommended ? "rgba(255,152,0,0.1)" : "var(--bg3)",
                border: `1px solid ${form.isRecommended ? "rgba(255,152,0,0.3)" : "var(--border)"}`,
                borderRadius: 10, cursor: "pointer",
                color: form.isRecommended ? "#ff9800" : "var(--text)",
                transition: "all 0.2s"
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 500 }}>
                ⭐ Recommended Plan
              </span>
              <input type="checkbox" name="isRecommended" checked={form.isRecommended} onChange={ch} style={{ display: "none" }} />
              {form.isRecommended ? <ToggleRight size={26} /> : <ToggleLeft size={26} color="var(--text-muted)" />}
            </label>

            {/* Active Toggle */}
            <label
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                gap: 8, marginTop: 8, padding: "12px 16px",
                background: form.isActive ? "rgba(16,185,129,0.1)" : "rgba(220,38,38,0.1)",
                border: `1px solid ${form.isActive ? "rgba(16,185,129,0.3)" : "rgba(220,38,38,0.3)"}`,
                borderRadius: 10, cursor: "pointer",
                color: form.isActive ? "#10b981" : "var(--red)",
                transition: "all 0.2s"
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 500 }}>
                {form.isActive ? "✓ Active" : "✗ Inactive"} (Visible to users)
              </span>
              <input type="checkbox" name="isActive" checked={form.isActive} onChange={ch} style={{ display: "none" }} />
              {form.isActive ? <ToggleRight size={26} /> : <ToggleLeft size={26} />}
            </label>
          </div>

          <button
            className="btn-lg"
            type="submit"
            style={{ marginTop: 16 }}
            disabled={loading}
          >
            {loading
              ? "Processing..."
              : editId
              ? "Update Plan"
              : "Create Plan"}
          </button>
        </div>
      </form>

      {/* ================= TABLE ================= */}
      <div className="content-box" style={{ marginTop: 24 }}>
        <h3>All Plans</h3>

        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Name</th>
                <th>Price</th>
                <th>Duration</th>
                <th>Type</th>
                <th>Status</th>
                <th>Recommended</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {plans.length === 0 ? (
                <tr>
                  <td colSpan="5">No plans found</td>
                </tr>
              ) : (
                plans.map((p) => (
                  <tr key={p._id}>
                    <td>{p.name}</td>
                    <td>₹{p.price}</td>
                    <td>{p.duration} days</td>
                    <td style={{ textTransform: 'capitalize' }}>{p.planType || "Monthly"}</td>
                    <td>
                      <button
                        onClick={() => handleToggleStatus(p)}
                        title={p.isActive !== false ? "Click to Deactivate" : "Click to Activate"}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 6,
                          padding: "4px 12px", borderRadius: 20, border: "1px solid",
                          cursor: "pointer", fontWeight: 600, fontSize: "0.8rem",
                          transition: "all 0.2s",
                          background: p.isActive !== false ? "rgba(16,185,129,0.12)" : "rgba(220,38,38,0.12)",
                          borderColor: p.isActive !== false ? "rgba(16,185,129,0.4)" : "rgba(220,38,38,0.4)",
                          color: p.isActive !== false ? "#10b981" : "var(--red)",
                        }}
                      >
                        {p.isActive !== false
                          ? <><ToggleRight size={16} /> Active</>
                          : <><ToggleLeft size={16} /> Inactive</>}
                      </button>
                    </td>
                    <td>{p.isRecommended ? "Yes" : "No"}</td>

                    {/* <td style={{ display: "flex", gap: 8 }}>
                      <button
                        className="btn-sm"
                        onClick={() => handleEdit(p)}
                      >
                        ✏️ Edit
                      </button>

                      <button
                        className="btn-sm danger"
                        onClick={() => handleDelete(p._id)}
                      >
                        ❌ Delete
                      </button>
                    </td> */}
                    <td className="actions">
                      <button
                        className="icon-btn view"
                        onClick={() => setViewPlan(p)}
                        title="View"
                      >
                        <Eye size={16} />
                      </button>

                      <button
                        className="icon-btn edit"
                        onClick={() => handleEdit(p)}
                        title="Edit"
                      >
                        <Pencil size={16} />
                      </button>

  <button
    className="icon-btn delete"
    onClick={() => handleDelete(p._id)}
    title="Delete"
  >
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
      {/* ================= VIEW MODAL ================= */}
      {viewPlan && (
        <div className="modal-overlay" onClick={() => setViewPlan(null)}>
          <div className="modal-box modal-box-view" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h3>💳 Plan Details</h3>
              <button className="modal-close" onClick={() => setViewPlan(null)}><X size={24} /></button>
            </div>
            
            <div className="modal-body p-0">
              <div className="profile-details-grid" style={{ padding: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="p-detail-card" style={{ background: 'var(--bg-card-soft)', padding: '16px', borderRadius: '8px' }}>
                  <span className="p-detail-label" style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Plan Name</span>
                  <span className="p-detail-value" style={{ fontWeight: 600, fontSize: '1.1rem' }}>{viewPlan.name}</span>
                </div>
                <div className="p-detail-card" style={{ background: 'var(--bg-card-soft)', padding: '16px', borderRadius: '8px' }}>
                  <span className="p-detail-label" style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Price</span>
                  <span className="p-detail-value" style={{ fontWeight: 600, fontSize: '1.1rem' }}>₹{viewPlan.price}</span>
                </div>
                <div className="p-detail-card" style={{ background: 'var(--bg-card-soft)', padding: '16px', borderRadius: '8px' }}>
                  <span className="p-detail-label" style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Duration</span>
                  <span className="p-detail-value" style={{ fontWeight: 600, fontSize: '1.1rem' }}>{viewPlan.duration} days</span>
                </div>
                <div className="p-detail-card" style={{ background: 'var(--bg-card-soft)', padding: '16px', borderRadius: '8px' }}>
                  <span className="p-detail-label" style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Type</span>
                  <span className="p-detail-value" style={{ fontWeight: 600, fontSize: '1.1rem', textTransform: 'capitalize' }}>{viewPlan.planType || 'Monthly'}</span>
                </div>
                <div className="p-detail-card" style={{ background: 'var(--bg-card-soft)', padding: '16px', borderRadius: '8px' }}>
                  <span className="p-detail-label" style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Status</span>
                  <span className="p-detail-value" style={{ fontWeight: 600, fontSize: '1.1rem' }}>
                    <span className={viewPlan.isActive !== false ? "status active" : "status expired"}>
                      {viewPlan.isActive !== false ? "Active" : "Inactive"}
                    </span>
                  </span>
                </div>
                <div className="p-detail-card" style={{ background: 'var(--bg-card-soft)', padding: '16px', borderRadius: '8px', gridColumn: '1 / -1' }}>
                  <span className="p-detail-label" style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Recommended</span>
                  <span className="p-detail-value" style={{ fontWeight: 600, fontSize: '1.1rem' }}>{viewPlan.isRecommended ? 'Yes' : 'No'}</span>
                </div>
                <div className="p-detail-card" style={{ background: 'var(--bg-card-soft)', padding: '16px', borderRadius: '8px', gridColumn: "1 / -1" }}>
                  <span className="p-detail-label" style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Features</span>
                  <span className="p-detail-value" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {viewPlan.features && viewPlan.features.length > 0 
                      ? viewPlan.features.map((f, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem' }}>
                            <span style={{ color: 'var(--primary-color)' }}>✓</span> {f}
                          </div>
                        )) 
                      : "No features added"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}