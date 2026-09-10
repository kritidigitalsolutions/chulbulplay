import { useEffect, useState } from "react";
import API, { API_BASE_URL } from "../api/axios";
import { Users, RefreshCw, User, CheckCircle, AlertCircle, Search, Loader, Eye, Trash2, Ban, X, Plus, Pencil } from "lucide-react";
import "./Dashboard.css";

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);

  // New state variables for Add/Edit actions
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    role: "USER",
  });
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    const serverUrl = API_BASE_URL.replace("/api", "").replace(/\/+$/, "");
    const cleanPath = path.replace(/\\/g, "/").replace(/^\/+/, "");
    return `${serverUrl}/${cleanPath}`;
  };

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await API.get("/admin/users");
      setUsers(res.data.users || []);
    } catch { setUsers([]); }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this user permanently?")) return;
    try {
      await API.delete(`/admin/users/${id}`);
      setUsers(p => p.filter(u => u._id !== id));
    } catch { alert("Failed to delete"); }
  };

  const handleToggleBlock = async (id) => {
    const user = users.find(u => u._id === id);
    const actionText = user.isBlocked ? "unblock" : "block";
    if (!window.confirm(`Are you sure you want to ${actionText} this user?`)) return;
    try {
      const res = await API.patch(`/admin/users/${id}/toggle-block`);
      setUsers(p => p.map(u => u._id === id ? { ...u, isBlocked: res.data.isBlocked } : u));
    } catch (err) {
      alert(err.response?.data?.message || `Failed to ${actionText} user`);
    }
  };

  const resetForm = () => {
    setFormData({ name: "", phone: "", email: "", role: "USER" });
    setProfileImageFile(null);
    setFormError("");
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    const data = new FormData();
    data.append("name", formData.name);
    
    const formattedPhone = formData.phone.startsWith("+91") ? formData.phone : `+91${formData.phone}`;
    data.append("phone", formattedPhone);
    data.append("email", formData.email);
    if (profileImageFile) {
      data.append("profileImage", profileImageFile);
    }

    try {
      await API.post("/admin/users", data, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setIsAddOpen(false);
      resetForm();
      fetchUsers();
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to create user");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (user) => {
    setEditUser(user);
    let cleanPhone = user.phone || "";
    if (cleanPhone.startsWith("+91")) {
      cleanPhone = cleanPhone.slice(3);
    } else if (cleanPhone.startsWith("91") && cleanPhone.length === 12) {
      cleanPhone = cleanPhone.slice(2);
    }
    setFormData({
      name: user.name || "",
      phone: cleanPhone,
      email: user.email || "",
      role: user.role || "USER",
    });
    setProfileImageFile(null);
    setFormError("");
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    const data = new FormData();
    data.append("name", formData.name);
    
    const formattedPhone = formData.phone.startsWith("+91") ? formData.phone : `+91${formData.phone}`;
    data.append("phone", formattedPhone);
    data.append("email", formData.email);
    if (profileImageFile) {
      data.append("profileImage", profileImageFile);
    }

    try {
      await API.patch(`/admin/users/${editUser._id}`, data, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setIsEditOpen(false);
      setEditUser(null);
      resetForm();
      fetchUsers();
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to update user");
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = users.filter(u =>
    (u.name?.toLowerCase() || "").includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-section">
      {/* Header */}
      <div className="pg-header">
        <div>
          <h1 className="pg-title"><Users size={28} style={{ display: "inline-block", marginRight: 8 }} /> User Management</h1>
          <p className="pg-sub">View, search, and manage all platform users</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-primary" onClick={() => setIsAddOpen(true)}>
            <Plus size={16} style={{ display: "inline-block", marginRight: 6 }} /> Add User
          </button>
          <button className="btn btn-ghost" onClick={fetchUsers}>
            <RefreshCw size={16} style={{ display: "inline-block", marginRight: 6 }} /> Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid">
        <div className="stat-card s-green">
          <div className="stat-icon"><User size={24} /></div>
          <div className="stat-label">Total Users</div>
          <div className="stat-value">{users.length}</div>
        </div>
        <div className="stat-card s-blue">
          <div className="stat-icon"><CheckCircle size={24} /></div>
          <div className="stat-label">Active</div>
          <div className="stat-value">{users.filter(u => !u.isBlocked).length}</div>
        </div>
        <div className="stat-card s-red">
          <div className="stat-icon"><AlertCircle size={24} /></div>
          <div className="stat-label">Blocked</div>
          <div className="stat-value">{users.filter(u => u.isBlocked).length}</div>
        </div>
      </div>

      {/* Table Card */}
      <div className="content-box">
        <div className="search-row" style={{ marginBottom: 20 }}>
          <div className="search-field">
            <Search size={18} />
            <input placeholder="Search by name or email..." value={search}
              onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {loading ? (
          <div className="empty-state"><p><Loader size={20} style={{ display: "inline-block", marginRight: 8 }} /> Loading users...</p></div>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>#</th>
                  <th>User</th>
                  <th>Email</th>
                  <th>Joined</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6}>
                    <div className="empty-state"><p>No users found 😕</p></div>
                  </td></tr>
                ) : filtered.map((u, i) => (
                  <tr key={u._id || i}>
                    <td style={{ color: "var(--text-muted)", fontWeight: 600 }}>{i + 1}</td>
                    <td>
                      <div className="user-cell">
                        <div className="u-avatar">
                          {u.profileImage ? (
                            <img src={getImageUrl(u.profileImage)} alt={u.name} />
                          ) : (
                            u.name ? u.name[0].toUpperCase() : "U"
                          )}
                        </div>
                        <span className="u-name">{u.name || "Unknown"}</span>
                      </div>
                    </td>
                    <td style={{ color: "var(--text-soft)" }}>{u.email}</td>
                    <td style={{ color: "var(--text-muted)" }}>{new Date(u.createdAt).toLocaleDateString("en-IN")}</td>
                    <td>
                      <span className={`badge ${u.isBlocked ? "badge-blocked" : u.isSubscriber ? "badge-subscriber" : "badge-individual"}`}>
                        {u.isBlocked ? "Blocked" : u.isSubscriber ? "Subscriber" : "Individual"}
                      </span>
                    </td>
                    <td>
                      <div className="tbl-actions">
                        <button className="icon-btn view" onClick={() => setSelected(u)} title="View"><Eye size={16} /></button>
                        <button className="icon-btn edit" onClick={() => handleEditClick(u)} title="Edit"><Pencil size={16} /></button>
                        <button className="icon-btn block-btn" onClick={() => handleToggleBlock(u._id)} title={u.isBlocked ? "Unblock User" : "Block User"}>
                          <Ban size={16} style={{ color: u.isBlocked ? "var(--green)" : "var(--primary)" }} />
                        </button>
                        <button className="icon-btn del" onClick={() => handleDelete(u._id)} title="Delete"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-box modal-box-view" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h3><User size={20} style={{ display: "inline-block", marginRight: 8 }} /> User Profile</h3>
              <button className="modal-close" onClick={() => setSelected(null)}><X size={24} /></button>
            </div>
            
            <div className="modal-body p-0">
              {/* Profile Hero */}
              <div className="profile-hero">
                <div className="profile-hero-bg" />
                <div className="profile-hero-content">
                  <div className="u-avatar large">
                    {selected.profileImage ? (
                      <img src={getImageUrl(selected.profileImage)} alt={selected.name} />
                    ) : (
                      selected.name?.[0]?.toUpperCase() || "U"
                    )}
                  </div>
                  <div className="profile-hero-text">
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                      <h2 style={{ margin: 0 }}>{selected.name || "Unknown User"}</h2>
                      {selected.profileComplete && (
                        <span className="badge badge-active" style={{ fontSize: "0.65rem", padding: "2px 8px" }}>✓ VERIFIED</span>
                      )}
                    </div>
                    <p>{selected.email}</p>
                    <span className={`badge ${selected.isBlocked ? "badge-blocked" : selected.isSubscriber ? "badge-subscriber" : "badge-individual"}`}>
                      {selected.isBlocked ? "BLOCKED" : selected.isSubscriber ? "SUBSCRIBER" : "INDIVIDUAL"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Profile Details Grid */}
              <div className="profile-details-grid">
                <div className="p-detail-card">
                  <span className="p-detail-label">Full Name</span>
                  <span className="p-detail-value">{selected.name || "—"}</span>
                </div>
                <div className="p-detail-card">
                  <span className="p-detail-label">Phone Number</span>
                  <span className="p-detail-value mono">{selected.phone || "—"}</span>
                </div>
                <div className="p-detail-card">
                  <span className="p-detail-label">Email Address</span>
                  <span className="p-detail-value">{selected.email || "—"}</span>
                </div>
                <div className="p-detail-card">
                  <span className="p-detail-label">Profile Status</span>
                  <span className={`p-detail-value ${selected.profileComplete ? "text-success" : "text-warning"}`}>
                    {selected.profileComplete ? "Complete" : "Incomplete"}
                  </span>
                </div>
                <div className="p-detail-card">
                  <span className="p-detail-label">Subscription Status</span>
                  <span className={`p-detail-value ${selected.isSubscriber ? "text-success" : "text-muted"}`}>
                    {selected.isSubscriber ? "Active Subscriber" : "Individual (Free)"}
                  </span>
                </div>
                <div className="p-detail-card">
                  <span className="p-detail-label">Account ID</span>
                  <span className="p-detail-value mono">{selected._id}</span>
                </div>
                <div className="p-detail-card">
                  <span className="p-detail-label">Member Since</span>
                  <span className="p-detail-value">
                    {selected.createdAt?.$date 
                      ? new Date(selected.createdAt.$date).toLocaleDateString("en-IN", { day: 'numeric', month: 'long', year: 'numeric' })
                      : selected.createdAt 
                        ? new Date(selected.createdAt).toLocaleDateString("en-IN", { day: 'numeric', month: 'long', year: 'numeric' })
                        : "—"}
                  </span>
                </div>
              </div>
            </div>

            <div className="modal-foot">
              <button className="btn btn-ghost" style={{ width: "100%" }} onClick={() => setSelected(null)}>Close Window</button>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {isAddOpen && (
        <div className="modal-overlay" onClick={() => { setIsAddOpen(false); resetForm(); }}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h3><User size={20} style={{ display: "inline-block", marginRight: 8 }} /> Add New User</h3>
              <button className="modal-close" onClick={() => { setIsAddOpen(false); resetForm(); }}><X size={24} /></button>
            </div>
            <form onSubmit={handleAddSubmit}>
              <div className="modal-body">
                {formError && (
                  <div style={{ color: "var(--red)", background: "rgba(239, 68, 68, 0.1)", padding: "10px 14px", borderRadius: 6, fontSize: "0.9rem" }}>
                    {formError}
                  </div>
                )}
                
                <div className="form-row">
                  <label className="form-label">Full Name</label>
                  <input className="form-input" placeholder="Enter full name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                </div>

                <div className="form-row">
                  <label className="form-label">Phone Number *</label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <span style={{ display: "flex", alignItems: "center", background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "0 12px", color: "var(--text-soft)", fontSize: "0.9rem", fontWeight: "600" }}>+91</span>
                    <input className="form-input" style={{ flex: 1 }} type="tel" maxLength="10" placeholder="99999 99999" required value={formData.phone} onChange={e => {
                      const cleanVal = e.target.value.replace(/\D/g, "").slice(0, 10);
                      setFormData({ ...formData, phone: cleanVal });
                    }} />
                  </div>
                </div>

                <div className="form-row">
                  <label className="form-label">Email Address</label>
                  <input className="form-input" type="email" placeholder="e.g. user@example.com" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                </div>


                <div className="form-row">
                  <label className="form-label">Profile Image</label>
                  <input className="form-input" type="file" accept="image/*" onChange={e => setProfileImageFile(e.target.files[0])} />
                </div>
              </div>
              
              <div className="modal-foot">
                <button type="button" className="btn btn-ghost" onClick={() => { setIsAddOpen(false); resetForm(); }} disabled={submitting}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? "Creating..." : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {isEditOpen && editUser && (
        <div className="modal-overlay" onClick={() => { setIsEditOpen(false); setEditUser(null); resetForm(); }}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h3><User size={20} style={{ display: "inline-block", marginRight: 8 }} /> Edit User</h3>
              <button className="modal-close" onClick={() => { setIsEditOpen(false); setEditUser(null); resetForm(); }}><X size={24} /></button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="modal-body">
                {formError && (
                  <div style={{ color: "var(--red)", background: "rgba(239, 68, 68, 0.1)", padding: "10px 14px", borderRadius: 6, fontSize: "0.9rem" }}>
                    {formError}
                  </div>
                )}
                
                <div className="form-row">
                  <label className="form-label">Full Name</label>
                  <input className="form-input" placeholder="Enter full name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                </div>

                <div className="form-row">
                  <label className="form-label">Phone Number *</label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <span style={{ display: "flex", alignItems: "center", background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "0 12px", color: "var(--text-soft)", fontSize: "0.9rem", fontWeight: "600" }}>+91</span>
                    <input className="form-input" style={{ flex: 1 }} type="tel" maxLength="10" placeholder="99999 99999" required value={formData.phone} onChange={e => {
                      const cleanVal = e.target.value.replace(/\D/g, "").slice(0, 10);
                      setFormData({ ...formData, phone: cleanVal });
                    }} />
                  </div>
                </div>

                <div className="form-row">
                  <label className="form-label">Email Address</label>
                  <input className="form-input" type="email" placeholder="e.g. user@example.com" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                </div>


                <div className="form-row">
                  <label className="form-label">Profile Image</label>
                  {editUser.profileImage && (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5 }}>
                      <img src={getImageUrl(editUser.profileImage)} alt="Current Profile" style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }} />
                      <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Current Image</span>
                    </div>
                  )}
                  <input className="form-input" type="file" accept="image/*" onChange={e => setProfileImageFile(e.target.files[0])} />
                </div>
              </div>
              
              <div className="modal-foot">
                <button type="button" className="btn btn-ghost" onClick={() => { setIsEditOpen(false); setEditUser(null); resetForm(); }} disabled={submitting}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}