import { useState, useEffect } from "react";
import { 
  Eye, 
  Edit2, 
  Trash2, 
  Plus, 
  Tag, 
  Ticket, 
  X, 
  Search,
  Activity,
  Layers,
  Calendar,
  User
} from "lucide-react";
import API from "../api/axios";
import "./PromoVoucher.css";
import "../pages/Content.css"; // Reuse Content.css styles

export default function PromoVoucher() {
  const [tab, setTab] = useState("promo");
  const [plans, setPlans] = useState([]);
  const [promos, setPromos] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modals
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  
  const [editId, setEditId] = useState(null);
  const [viewData, setViewData] = useState(null);

  const [promoForm, setPromoForm] = useState({
    code: "",
    discountType: "percentage",
    discountValue: "",
    maxUses: "",
    applicablePlans: ""
  });

  const [voucherForm, setVoucherForm] = useState({
    code: "",
    plan: "",
    validityDays: ""
  });

  const fetchPlans = async () => {
    try {
      const res = await API.get("/admin/plan");
      setPlans((res.data.plans || []).filter(p => p.isActive !== false));
    } catch (err) { console.error(err); }
  };

  const fetchPromos = async () => {
    try {
      const res = await API.get("/admin/promo");
      setPromos(res.data.promos || []);
    } catch (err) { console.error(err); }
  };

  const fetchVouchers = async () => {
    try {
      const res = await API.get("/admin/voucher");
      setVouchers(res.data.vouchers || []);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchPlans();
    fetchPromos();
    fetchVouchers();
  }, []);

  const handleCreatePromo = async () => {
    if (!promoForm.code) return alert("Code is required");
    setLoading(true);
    try {
      const payload = {
        ...promoForm,
        applicablePlans: promoForm.applicablePlans ? [promoForm.applicablePlans] : []
      };

      if (editId) {
        await API.put(`/admin/promo/${editId}`, payload);
      } else {
        await API.post("/admin/promo", payload);
      }
      closeModals();
      fetchPromos();
    } catch (err) { alert(err.response?.data?.message || "Error saving promo"); }
    setLoading(false);
  };

  const handleCreateVoucher = async () => {
    if (!voucherForm.code) return alert("Code is required");
    if (!voucherForm.plan) return alert("Please select a plan for this voucher");
    setLoading(true);
    try {
      if (editId) {
        await API.put(`/admin/voucher/${editId}`, voucherForm);
      } else {
        await API.post("/admin/voucher", voucherForm);
      }
      closeModals();
      fetchVouchers();
    } catch (err) { alert(err.response?.data?.message || "Error saving voucher"); }
    setLoading(false);
  };

  const handleDelete = async (type, id) => {
    if (!window.confirm(`Delete this ${type} permanently?`)) return;
    try {
      await API.delete(`/admin/${type}/${id}`);
      type === "promo" ? fetchPromos() : fetchVouchers();
    } catch (err) { alert("Delete failed"); }
  };

  const openEdit = (type, data) => {
    setEditId(data._id);
    if (type === "promo") {
      setPromoForm({
        code: data.code,
        discountType: data.discountType,
        discountValue: data.discountValue,
        maxUses: data.maxUses,
        applicablePlans: data.applicablePlans?.[0] || ""
      });
      setShowPromoModal(true);
    } else {
      setVoucherForm({
        code: data.code,
        plan: data.plan?._id || data.plan || "",
        validityDays: data.validityDays
      });
      setShowVoucherModal(true);
    }
  };

  const openView = (type, data) => {
    setViewData({ ...data, _type: type });
    setShowViewModal(true);
  };

  const closeModals = () => {
    setShowPromoModal(false);
    setShowVoucherModal(false);
    setShowViewModal(false);
    setEditId(null);
    setViewData(null);
    setPromoForm({ code: "", discountType: "percentage", discountValue: "", maxUses: "", applicablePlans: "" });
    setVoucherForm({ code: "", plan: "", validityDays: "" });
  };

  return (
    <div className="page-section">
      <div className="pg-header">
        <div>
          <h1 className="pg-title"><Activity size={32} /> Promo & Voucher Hub</h1>
          <p className="pg-sub">Manage discounts and prepaid access</p>
        </div>
      </div>

      <div className="content-box">
        <div className="filter-row" style={{ display: "flex", gap: 12, marginBottom: 32, alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "20px" }}>
          <div className="tab-group" style={{ display: "flex", background: "var(--bg3)", padding: "4px", borderRadius: "12px", gap: "4px" }}>
            <button 
              className={`btn ${tab === "promo" ? "btn-primary" : "btn-ghost"}`} 
              onClick={() => setTab("promo")}
              style={{ borderRadius: "8px" }}
            >
              <Tag size={18} /> Promo Codes
            </button>
            <button 
              className={`btn ${tab === "voucher" ? "btn-primary" : "btn-ghost"}`} 
              onClick={() => setTab("voucher")}
              style={{ borderRadius: "8px" }}
            >
              <Ticket size={18} /> Vouchers
            </button>
          </div>
        </div>

        {tab === "promo" ? (
          <div className="table-section">
            <div className="section-head" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <h3 style={{ margin: 0 }}><Tag size={20} /> Active Promo Codes</h3>
              <button className="btn btn-primary" onClick={() => setShowPromoModal(true)}>
                <Plus size={18} /> Add Promo
              </button>
            </div>

            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Code</th><th>Type</th><th>Discount</th><th>Usage</th><th>Plan</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {promos.length === 0 ? (
                    <tr><td colSpan={6}>No promos found</td></tr>
                  ) : promos.map((p) => (
                    <tr key={p._id}>
                      <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{p.code}</td>
                      <td style={{ textTransform: 'capitalize' }}>{p.discountType}</td>
                      <td>{p.discountType === 'percentage' ? `${p.discountValue}%` : `$${p.discountValue}`}</td>
                      <td>{p.usedCount} / {p.maxUses}</td>
                      <td>
                        <span className={`badge ${p.applicablePlans?.length ? 'badge-pub' : 'badge-draft'}`}>
                          {p.applicablePlans?.length ? plans.find(pl => pl._id === p.applicablePlans[0])?.name || 'Selected Plan' : 'All Plans'}
                        </span>
                      </td>
                      <td>
                        <div className="tbl-actions">
                          <button className="icon-btn view" onClick={() => openView('promo', p)} title="View">
                            <Eye size={18} />
                          </button>
                          <button className="icon-btn edit" onClick={() => openEdit('promo', p)} title="Edit">
                            <Edit2 size={18} />
                          </button>
                          <button className="icon-btn del" onClick={() => handleDelete('promo', p._id)} title="Delete">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="table-section">
            <div className="section-head" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <h3 style={{ margin: 0 }}><Ticket size={20} /> Managed Vouchers</h3>
              <button className="btn btn-primary" onClick={() => setShowVoucherModal(true)}>
                <Plus size={18} /> Add Voucher
              </button>
            </div>

            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Code</th><th>Linked Plan</th><th>Validity</th><th>Status</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vouchers.length === 0 ? (
                    <tr><td colSpan={5}>No vouchers found</td></tr>
                  ) : vouchers.map((v) => (
                    <tr key={v._id}>
                      <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{v.code}</td>
                      <td>{v.plan?.name || "N/A"}</td>
                      <td>{v.validityDays} Days</td>
                      <td>
                        <span className={`badge ${v.isUsed ? 'badge-draft' : 'badge-pub'}`}>
                          {v.isUsed ? 'Used' : 'Available'}
                        </span>
                      </td>
                      <td>
                        <div className="tbl-actions">
                          <button className="icon-btn view" onClick={() => openView('voucher', v)} title="View">
                            <Eye size={18} />
                          </button>
                          <button className="icon-btn edit" onClick={() => openEdit('voucher', v)} title="Edit">
                            <Edit2 size={18} />
                          </button>
                          <button className="icon-btn del" onClick={() => handleDelete('voucher', v._id)} title="Delete">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* PROMO MODAL */}
      {showPromoModal && (
        <div className="modal-overlay" onClick={closeModals}>
          <div className="modal-box modal-box-form" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>{editId ? "Edit Promo Code" : "Create New Promo"}</h3>
              <button className="modal-close" onClick={closeModals}><X size={24} /></button>
            </div>
            <div className="modal-body">
              <div className="form-grid-2">
                <div className="form-row">
                  <label className="form-label">Promo Code *</label>
                  <input className="form-input" placeholder="SUMMER50" value={promoForm.code} onChange={(e) => setPromoForm({...promoForm, code: e.target.value.toUpperCase()})} />
                </div>
                <div className="form-row">
                  <label className="form-label">Discount Type</label>
                  <select className="form-input" value={promoForm.discountType} onChange={(e) => setPromoForm({...promoForm, discountType: e.target.value})}>
                    <option value="percentage">Percentage (%)</option>
                    <option value="flat">Flat Amount</option>
                  </select>
                </div>
                <div className="form-row">
                  <label className="form-label">Discount Value</label>
                  <input className="form-input" type="number" placeholder="10" value={promoForm.discountValue} onChange={(e) => setPromoForm({...promoForm, discountValue: e.target.value})} />
                </div>
                <div className="form-row">
                  <label className="form-label">Max Usage Limit</label>
                  <input className="form-input" type="number" placeholder="100" value={promoForm.maxUses} onChange={(e) => setPromoForm({...promoForm, maxUses: e.target.value})} />
                </div>
              </div>
              <div className="form-row" style={{ marginTop: '16px' }}>
                <label className="form-label">Applicable Plan</label>
                <select className="form-input" value={promoForm.applicablePlans} onChange={(e) => setPromoForm({...promoForm, applicablePlans: e.target.value})}>
                  <option value="">All Plans (Default)</option>
                  {plans.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                </select>
                <p className="pg-sub" style={{ fontSize: '0.75rem' }}>If no plan is selected, the promo will apply to all subscription plans.</p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={closeModals}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreatePromo} disabled={loading}>
                {loading ? "Saving..." : (editId ? "Update Promo" : "Create Promo")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VOUCHER MODAL */}
      {showVoucherModal && (
        <div className="modal-overlay" onClick={closeModals}>
          <div className="modal-box modal-box-form" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>{editId ? "Edit Voucher" : "Generate New Voucher"}</h3>
              <button className="modal-close" onClick={closeModals}><X size={24} /></button>
            </div>
            <div className="modal-body">
              <div className="form-row" style={{ marginBottom: '16px' }}>
                <label className="form-label">Voucher Code *</label>
                <input className="form-input" placeholder="VOUCH-123" value={voucherForm.code} onChange={(e) => setVoucherForm({...voucherForm, code: e.target.value.toUpperCase()})} />
              </div>
              <div className="form-grid-2">
                <div className="form-row">
                  <label className="form-label">Assign to Plan *</label>
                  <select className="form-input" value={voucherForm.plan} onChange={(e) => setVoucherForm({...voucherForm, plan: e.target.value})}>
                    <option value="">Select Plan</option>
                    {plans.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="form-row">
                  <label className="form-label">Validity (Days) *</label>
                  <input className="pv-input form-input" type="number" placeholder="30" value={voucherForm.validityDays} onChange={(e) => setVoucherForm({...voucherForm, validityDays: e.target.value})} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={closeModals}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreateVoucher} disabled={loading}>
                {loading ? "Saving..." : (editId ? "Update Voucher" : "Generate Voucher")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODAL */}
      {showViewModal && viewData && (
        <div className="modal-overlay" onClick={closeModals}>
          <div className="modal-box modal-box-view" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head" style={{ background: 'linear-gradient(135deg, var(--bg2) 0%, var(--bg3) 100%)', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ 
                  background: viewData._type === 'promo' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(244, 72, 182, 0.2)', 
                  padding: '8px', 
                  borderRadius: '10px' 
                }}>
                  {viewData._type === 'promo' ? <Tag size={20} color="var(--pv-primary)" /> : <Ticket size={20} color="var(--pv-secondary)" />}
                </div>
                <h3 style={{ margin: 0 }}>{viewData._type.toUpperCase()} Details</h3>
              </div>
              <button className="modal-close" onClick={closeModals}><X size={24} /></button>
            </div>

            <div className="modal-body" style={{ padding: '30px' }}>
              {/* Header Info */}
              <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <h2 style={{ 
                  fontSize: '2.5rem', 
                  fontWeight: 900, 
                  margin: '0 0 8px 0', 
                  letterSpacing: '2px',
                  color: viewData._type === 'promo' ? 'var(--pv-primary)' : 'var(--pv-secondary)'
                }}>
                  {viewData.code}
                </h2>
                <span className={`badge ${viewData.isUsed || (viewData.usedCount >= viewData.maxUses) ? 'badge-draft' : 'badge-pub'}`} style={{ padding: '6px 16px', fontSize: '0.85rem' }}>
                  {viewData._type === 'promo' ? `${viewData.usedCount}/${viewData.maxUses} Used` : (viewData.isUsed ? 'Redeemed' : 'Available')}
                </span>
              </div>

              {/* Details Grid */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: '24px', 
                background: 'rgba(15, 23, 42, 0.3)', 
                padding: '24px', 
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.05)'
              }}>
                <div className="detail-item">
                  <strong style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    <Activity size={14} /> DISCOUNT
                  </strong>
                  <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                    {viewData._type === 'promo' ? `${viewData.discountValue}${viewData.discountType === 'percentage' ? '%' : '$'}` : 'N/A'}
                  </span>
                  {viewData._type === 'promo' && <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>({viewData.discountType})</small>}
                </div>

                <div className="detail-item">
                  <strong style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    <Layers size={14} /> PLAN 
                  </strong>
                  <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                    {viewData._type === 'promo' 
                      ? (viewData.applicablePlans?.length ? plans.find(pl => pl._id === viewData.applicablePlans[0])?.name : 'All Plans')
                      : (viewData.plan?.name || "N/A")}
                  </span>
                </div>

                <div className="detail-item">
                  <strong style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    <Calendar size={14} /> VALIDITY
                  </strong>
                  <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                    {viewData._type === 'promo' ? 'Forever' : `${viewData.validityDays} Days`}
                  </span>
                </div>

                <div className="detail-item">
                  <strong style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    <User size={14} /> USAGE LIMIT
                  </strong>
                  <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                    {viewData._type === 'promo' ? viewData.maxUses : '1 Time'}
                  </span>
                </div>

                <div className="detail-item" style={{ gridColumn: 'span 2', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    <span>Created: {new Date(viewData.createdAt).toLocaleDateString()}</span>
                    <span>Updated: {new Date(viewData.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ borderTop: 'none' }}>
              <button className="btn btn-ghost" onClick={closeModals} style={{ width: '100%', borderRadius: '12px' }}>Close Window</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}