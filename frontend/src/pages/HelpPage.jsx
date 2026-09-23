import { useEffect, useState } from "react";
import API from "../api/axios";
import { HelpCircle, Eye, Edit2, X, Save, Trash2 } from "lucide-react";
import "./Dashboard.css";

export default function HelpPage() {
  const [help, setHelp] = useState([]);
  const [contactInfo, setContactInfo] = useState({ supportNumber: "", supportEmail: "", isHide: false });
  const [selected, setSelected] = useState(null);
  const [mode, setMode] = useState("view");
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    fetchHelp();
    fetchContactInfo();
  }, []);

  const fetchContactInfo = async () => {
    try {
      const res = await API.get("/admin/help/contact-info");
      if (res.data && res.data.data) {
        setContactInfo(res.data.data);
      }
    } catch (error) {
      console.error("Fetch Contact Info Error:", error);
    }
  };

  const handleSaveContactInfo = async () => {
    try {
      await API.put("/admin/help/contact-info", contactInfo);
      alert("Contact Info saved successfully");
      fetchContactInfo();
    } catch (error) {
      console.error(error);
      alert("Failed to save contact info");
    }
  };

  const fetchHelp = async () => {
    try {
      const res = await API.get("/admin/help");
      setHelp(res.data.data || []);
    } catch (error) {
      console.error("Fetch Help Error:", error);
      setHelp([]);
    }
  };

  const handleSave = async () => {
    try {
      await API.put(`/admin/help/${selected._id}`, selected);
      setSelected(null);
      fetchHelp();
    } catch (error) {
      alert("Update failed");
      console.error(error);
    }
  };

  const handleCreate = async () => {
    try {
      await API.post("/admin/help", selected);
      setSelected(null);
      setIsAdding(false);
      fetchHelp();
    } catch (error) {
      alert("Create failed");
      console.error(error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this FAQ?")) return;
    try {
      await API.delete(`/admin/help/${id}`);
      fetchHelp();
    } catch (error) {
      alert("Delete failed");
      console.error(error);
    }
  };

  const handleTogglePublish = async (id) => {
    try {
      await API.patch(`/admin/help/${id}/toggle`);
      fetchHelp();
    } catch (error) {
      alert("Toggle visibility failed");
      console.error(error);
    }
  };

  const open = (item, m) => {
    setSelected(item);
    setMode(m);
  };

  return (
    <div className="page-section">
      <div className="pg-header">
        <div style={{ marginTop: 10 }}>
          <button
            className="btn btn-primary"
            onClick={() => {
              setSelected({ question: "", answer: "", category: "", isPublished: true });
              setMode("add");
              setIsAdding(true);
            }}
          >
            ➕ Add Help Card
          </button>
        </div>
        <div>
          <h1 className="pg-title">
            <HelpCircle size={28} style={{ display: "inline-block", marginRight: 8 }} /> Help Center
          </h1>
          <p className="pg-sub">Manage your platform's FAQ and support articles</p>
        </div>
      </div>

      <div className="content-box" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
          <h3>📞 Global Support Contact Info</h3>
          <button className="btn btn-primary" onClick={handleSaveContactInfo}>
            <Save size={16} style={{ marginRight: 6 }} /> Save Contact Info
          </button>
        </div>

        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 250 }}>
            <label className="form-label">Support Contact Number</label>
            <input
              className="form-input"
              placeholder="+91 99999 99999"
              value={contactInfo.supportNumber}
              onChange={e => setContactInfo({ ...contactInfo, supportNumber: e.target.value })}
            />
          </div>

          <div style={{ flex: 1, minWidth: 250 }}>
            <label className="form-label">Support Email</label>
            <input
              className="form-input"
              type="email"
              placeholder="support@example.com"
              value={contactInfo.supportEmail}
              onChange={e => setContactInfo({ ...contactInfo, supportEmail: e.target.value })}
            />
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 15 }}>
          <input
            type="checkbox"
            id="isHide"
            checked={contactInfo.isHide === true}
            style={{ width: 18, height: 18, cursor: "pointer" }}
            onChange={(e) => setContactInfo({ ...contactInfo, isHide: e.target.checked })}
          />
          <label htmlFor="isHide" className="form-label" style={{ margin: 0, cursor: "pointer", color: "var(--red)" }}>
            Hide Contact Info from Users
          </label>
        </div>
      </div>

      {help.length === 0 ? (
        <div className="content-box">
          <div className="empty-state">
            <p>No help articles found.</p>
          </div>
        </div>
      ) : (
        <div className="doc-grid">
          {help.map((item, i) => (
            <div key={item._id || i} className="doc-card" style={{ opacity: item.isPublished === false ? 0.75 : 1 }}>
              <div className="doc-card-head">
                <h3>{item.question}</h3>
                <div className="doc-card-actions">
                  <button className="icon-btn view" onClick={() => open(item, "view")} title="View">
                    <Eye size={16} />
                  </button>
                  <button className="icon-btn edit" onClick={() => open(item, "edit")} title="Edit">
                    <Edit2 size={16} />
                  </button>
                  <button className="icon-btn del" onClick={() => handleDelete(item._id)} title="Delete">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap", marginTop: 4, marginBottom: 8 }}>
                {item.category && <span className="badge badge-active">{item.category}</span>}
                <span
                  className={`badge ${item.isPublished !== false ? "badge-pub" : "badge-draft"}`}
                  style={{ cursor: "pointer" }}
                  onClick={() => handleTogglePublish(item._id)}
                  title="Click to toggle visibility"
                >
                  {item.isPublished !== false ? "👁️ Published" : "👁️‍🗨️ Draft"}
                </span>
              </div>

              <p className="doc-excerpt">{item.answer}</p>
            </div>
          ))}
        </div>
      )}

      {(selected || isAdding) && selected && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 560, maxHeight: "calc(100dvh - 40px)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div className="modal-head" style={{ flexShrink: 0 }}>
              <h3>
                {mode === "view" ? (
                  <>👁️ View FAQ</>
                ) : mode === "edit" ? (
                  <>✏️ Edit FAQ</>
                ) : (
                  <>➕ Add FAQ</>
                )}
              </h3>
              <button
                className="modal-close"
                onClick={() => {
                  setSelected(null);
                  setIsAdding(false);
                }}
              >
                <X size={24} />
              </button>
            </div>
            <div className="modal-body" style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
              <div className="form-row">
                <label className="form-label">Question</label>
                <input
                  className="form-input"
                  value={selected.question || ""}
                  disabled={mode === "view"}
                  onChange={(e) => setSelected({ ...selected, question: e.target.value })}
                />
              </div>
              <div className="form-row">
                <label className="form-label">Category</label>
                <select
                  className="form-input"
                  value={selected.category || ""}
                  disabled={mode === "view"}
                  onChange={(e) => setSelected({ ...selected, category: e.target.value })}
                >
                  <option value="">Select Category</option>
                  <option value="faq">FAQ</option>
                  <option value="account-help">Account Help</option>
                  <option value="contact-support">Contact Support</option>
                  <option value="cancel-subscription">Cancel Subscription</option>
                  <option value="report-problem">Report Problem</option>
                </select>
              </div>
              <div className="form-row" style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 }}>
                <input
                  type="checkbox"
                  id="isPublished"
                  checked={selected.isPublished !== false}
                  disabled={mode === "view"}
                  style={{ width: 18, height: 18, cursor: mode === "view" ? "not-allowed" : "pointer" }}
                  onChange={(e) => setSelected({ ...selected, isPublished: e.target.checked })}
                />
                <label htmlFor="isPublished" className="form-label" style={{ margin: 0, cursor: mode === "view" ? "not-allowed" : "pointer" }}>
                  Publish Article (Visible to users)
                </label>
              </div>
              <div className="form-row">
                <label className="form-label">Answer</label>
                <textarea
                  className="form-input"
                  rows={6}
                  value={selected.answer || ""}
                  disabled={mode === "view"}
                  style={{ resize: "vertical" }}
                  onChange={(e) => setSelected({ ...selected, answer: e.target.value })}
                />
              </div>
            </div>
            {(mode === "edit" || mode === "add") && (
              <div className="modal-foot" style={{ flexShrink: 0 }}>
                <button
                  className="btn btn-ghost"
                  onClick={() => {
                    setSelected(null);
                    setIsAdding(false);
                  }}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={mode === "edit" ? handleSave : handleCreate}
                >
                  <Save size={16} style={{ marginRight: 6 }} />
                  {mode === "edit" ? "Save Changes" : "Create"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

