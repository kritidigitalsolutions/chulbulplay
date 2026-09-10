import { useEffect, useState, useRef } from "react";
import API, { API_BASE_URL } from "../api/axios";
import { Eye, Trash2, X, User, Ban, Plus, Search } from "lucide-react";
import "./Subscription.css";

export default function SubscriptionPage() {
  const [subs, setSubs] = useState([]);
  const [selectedSub, setSelectedSub] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  // Search & Filter State
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  // Give Subscription modal state
  const [isGiveOpen, setIsGiveOpen] = useState(false);
  const [usersList, setUsersList] = useState([]);
  const [plansList, setPlansList] = useState([]);
  const [giveForm, setGiveForm] = useState({
    user: "",
    plan: "",
    amount: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    paymentId: "",
    subscriptionId: "",
  });
  const [giveError, setGiveError] = useState("");
  const [giving, setGiving] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [planSearchTerm, setPlanSearchTerm] = useState("");
  const [showPlanDropdown, setShowPlanDropdown] = useState(false);
  const userDropdownRef = useRef(null);
  const planDropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
        setShowUserDropdown(false);
      }
      if (planDropdownRef.current && !planDropdownRef.current.contains(event.target)) {
        setShowPlanDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    fetchSubs();
  }, [page, search, status]);

  useEffect(() => {
    if (isGiveOpen) {
      loadGiveData();
      setGiveForm({
        user: "",
        plan: "",
        amount: "",
        startDate: new Date().toISOString().split("T")[0],
        endDate: "",
        paymentId: "",
        subscriptionId: "",
      });
      setUserSearchTerm("");
      setShowUserDropdown(false);
      setPlanSearchTerm("");
      setShowPlanDropdown(false);
      setGiveError("");
    }
  }, [isGiveOpen]);

  const fetchSubs = async () => {
    try {
      const res = await API.get(
        `/admin/subscription/all?page=${page}&limit=${limit}&search=${search}&status=${status}`
      );
      setSubs(res.data.subscriptions || []);
      setTotalPages(res.data.pagination?.pages || 1);
    } catch (err) {
      console.error("Failed to fetch subscriptions:", err);
      setSubs([]);
      setTotalPages(1);
    }
  };

  const loadGiveData = async () => {
    try {
      const [usersRes, plansRes] = await Promise.all([
        API.get("/admin/users"),
        API.get("/admin/plan"),
      ]);
      setUsersList(usersRes.data.users || []);
      setPlansList((plansRes.data.plans || []).filter(p => p.isActive !== false));
    } catch (err) {
      console.error("Failed to load users or plans:", err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this subscription permanently?")) return;
    try {
      await API.delete(`/admin/subscription/${id}`);
      if (subs.length === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        fetchSubs();
      }
      alert("Subscription deleted successfully");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete subscription");
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm("Are you sure you want to cancel this subscription?")) return;
    try {
      await API.patch(`/admin/subscription/${id}/cancel`);
      setSubs((prev) =>
        prev.map((sub) =>
          sub._id === id ? { ...sub, status: "cancelled" } : sub
        )
      );
      alert("Subscription cancelled successfully");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to cancel subscription");
    }
  };

  const handlePlanChange = (planId) => {
    const selected = plansList.find((p) => p._id === planId);
    if (!selected) {
      setGiveForm((prev) => ({
        ...prev,
        plan: "",
        amount: "",
        endDate: "",
      }));
      return;
    }

    const start = new Date(giveForm.startDate || new Date());
    const end = new Date(start.getTime() + selected.duration * 24 * 60 * 60 * 1000);
    const endDateStr = end.toISOString().split("T")[0];

    setGiveForm((prev) => ({
      ...prev,
      plan: planId,
      amount: selected.price,
      endDate: endDateStr,
    }));
  };

  const handleStartDateChange = (dateVal) => {
    const selected = plansList.find((p) => p._id === giveForm.plan);
    let endDateStr = giveForm.endDate;

    if (selected && dateVal) {
      const start = new Date(dateVal);
      const end = new Date(start.getTime() + selected.duration * 24 * 60 * 60 * 1000);
      endDateStr = end.toISOString().split("T")[0];
    }

    setGiveForm((prev) => ({
      ...prev,
      startDate: dateVal,
      endDate: endDateStr,
    }));
  };

  const handleGiveSubmit = async (e) => {
    e.preventDefault();
    setGiveError("");
    setGiving(true);

    try {
      await API.post("/admin/subscription", {
        user: giveForm.user,
        plan: giveForm.plan,
        amount: Number(giveForm.amount),
        currency: "INR",
        startDate: giveForm.startDate,
        endDate: giveForm.endDate,
        paymentId: giveForm.paymentId || undefined,
        subscriptionId: giveForm.subscriptionId || undefined,
      });

      setIsGiveOpen(false);
      fetchSubs();
      alert("Subscription assigned successfully!");
    } catch (err) {
      setGiveError(err.response?.data?.message || "Failed to assign subscription");
    } finally {
      setGiving(false);
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
    <div className="subscription-page">
      {/* Header section */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h2 style={{ margin: 0 }}>💳 Subscribed Users</h2>
        <button
          className="btn btn-primary"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 16px",
            background: "var(--primary)",
            color: "white",
            border: "none",
            borderRadius: "var(--radius-sm)",
            cursor: "pointer",
            fontWeight: "600"
          }}
          onClick={() => setIsGiveOpen(true)}
        >
          <Plus size={16} /> Give Subscription
        </button>
      </div>

      {/* Search & Filter Controls */}
      <div style={{ display: "flex", gap: "16px", marginBottom: "20px" }}>
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
        <select
          className="form-input"
          style={{
            width: "180px",
            padding: "10px 12px",
            background: "var(--bg2)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            color: "var(--text)",
            cursor: "pointer"
          }}
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="cancelled">Cancelled</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      <table className="subscription-table">
        <thead>
          <tr>
            <th>User</th>
            <th>Plan</th>
            <th>Status</th>
            <th>Amount</th>
            <th>Expiry</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {subs.map((sub) => {
            const isActive =
              sub.status === "active" &&
              new Date(sub.endDate) > new Date();

            return (
              <tr key={sub._id}>
                <td>{sub.user?.name || "-"}</td>

                <td className="plan">{sub.plan?.name || sub.plan || "-"}</td>

                <td>
                  <span className={isActive ? "status active" : "status expired"}>
                    {sub.status === "active" ? "Active" : sub.status === "cancelled" ? "Cancelled" : "Expired"}
                  </span>
                </td>

                <td>₹{sub.amount || 0}</td>

                <td>
                  {sub.endDate
                    ? new Date(sub.endDate).toLocaleDateString("en-IN")
                    : "-"}
                </td>

                <td>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <button
                      className="icon-btn view"
                      onClick={() => setSelectedSub(sub)}
                      title="View Details"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      className="icon-btn cancel"
                      style={{
                        width: "auto",
                        padding: "0 10px",
                        gap: "4px",
                        display: "flex",
                        alignItems: "center",
                        borderColor: isActive ? "rgba(245, 158, 11, 0.3)" : "var(--border)",
                        background: isActive ? "var(--orange-dim)" : "transparent",
                        color: isActive ? "var(--orange)" : "var(--text-muted)",
                        opacity: isActive ? 1 : 0.4,
                        cursor: isActive ? "pointer" : "not-allowed",
                        fontWeight: 600,
                        fontSize: "0.75rem"
                      }}
                      disabled={!isActive}
                      onClick={() => handleCancel(sub._id)}
                      title={isActive ? "Cancel Subscription" : "Subscription is not active"}
                    >
                      <Ban size={14} /> Cancel
                    </button>
                    <button
                      className="icon-btn del"
                      onClick={() => handleDelete(sub._id)}
                      title="Delete Subscription"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

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

      {/* Give Subscription Modal */}
      {isGiveOpen && (
        <div className="modal-overlay" onClick={() => setIsGiveOpen(false)} style={{
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
              <h3 style={{ margin: 0, fontSize: "1.25rem", color: "var(--text)" }}>Give Subscription</h3>
              <button
                onClick={() => setIsGiveOpen(false)}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleGiveSubmit}>
              <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "16px", maxHeight: "60vh", overflowY: "auto", paddingRight: "4px" }}>
                {giveError && (
                  <div style={{ color: "var(--red)", background: "rgba(239, 68, 68, 0.1)", padding: "10px 14px", borderRadius: 6, fontSize: "0.9rem" }}>
                    {giveError}
                  </div>
                )}

                <div className="form-row" ref={userDropdownRef} style={{ display: "flex", flexDirection: "column", gap: "6px", position: "relative" }}>
                  <label className="form-label" style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-soft)" }}>Select User *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Search user by name, email, or phone..."
                    style={{ background: "var(--bg3)", border: "1px solid var(--border)", color: "var(--text)", padding: "8px 12px", borderRadius: "var(--radius-sm)", width: "100%" }}
                    value={userSearchTerm}
                    onChange={(e) => {
                      setUserSearchTerm(e.target.value);
                      setShowUserDropdown(true);
                      if (giveForm.user) setGiveForm({ ...giveForm, user: "" });
                    }}
                    onFocus={() => setShowUserDropdown(true)}
                  />
                  {showUserDropdown && (
                    <div style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      background: "var(--bg3)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-sm)",
                      maxHeight: "200px",
                      overflowY: "auto",
                      zIndex: 100,
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.5)",
                      marginTop: "4px"
                    }}>
                      {usersList.filter(u => 
                        !userSearchTerm || 
                        (u.name && u.name.toLowerCase().includes(userSearchTerm.toLowerCase())) ||
                        (u.email && u.email.toLowerCase().includes(userSearchTerm.toLowerCase())) ||
                        (u.phone && String(u.phone).toLowerCase().includes(userSearchTerm.toLowerCase()))
                      ).map((u) => (
                        <div 
                          key={u._id}
                          style={{ 
                            padding: "8px 12px", 
                            cursor: "pointer", 
                            borderBottom: "1px solid var(--border)",
                            color: "var(--text)",
                            fontSize: "0.9rem"
                          }}
                          onClick={() => {
                            setGiveForm({ ...giveForm, user: u._id });
                            setUserSearchTerm(`${u.name} (${u.email || u.phone || u._id})`);
                            setShowUserDropdown(false);
                          }}
                          onMouseEnter={(e) => e.target.style.background = "var(--bg2)"}
                          onMouseLeave={(e) => e.target.style.background = "transparent"}
                        >
                          {u.name} ({u.email || u.phone || u._id})
                        </div>
                      ))}
                      {usersList.filter(u => 
                        !userSearchTerm || 
                        (u.name && u.name.toLowerCase().includes(userSearchTerm.toLowerCase())) ||
                        (u.email && u.email.toLowerCase().includes(userSearchTerm.toLowerCase())) ||
                        (u.phone && String(u.phone).toLowerCase().includes(userSearchTerm.toLowerCase()))
                      ).length === 0 && (
                        <div style={{ padding: "8px 12px", color: "var(--text-muted)", fontSize: "0.9rem", fontStyle: "italic" }}>
                          No users found.
                        </div>
                      )}
                    </div>
                  )}
                  {/* Hidden required input for form validation */}
                  <input type="hidden" required value={giveForm.user} />
                </div>

                <div className="form-row" ref={planDropdownRef} style={{ display: "flex", flexDirection: "column", gap: "6px", position: "relative" }}>
                  <label className="form-label" style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-soft)" }}>Select Plan *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Search plan by name..."
                    style={{ background: "var(--bg3)", border: "1px solid var(--border)", color: "var(--text)", padding: "8px 12px", borderRadius: "var(--radius-sm)", width: "100%" }}
                    value={planSearchTerm}
                    onChange={(e) => {
                      setPlanSearchTerm(e.target.value);
                      setShowPlanDropdown(true);
                      if (giveForm.plan) handlePlanChange(""); 
                    }}
                    onFocus={() => setShowPlanDropdown(true)}
                  />
                  {showPlanDropdown && (
                    <div style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      background: "var(--bg3)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-sm)",
                      maxHeight: "200px",
                      overflowY: "auto",
                      zIndex: 100,
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.5)",
                      marginTop: "4px"
                    }}>
                      {plansList.filter(p => 
                        !planSearchTerm || 
                        (p.name && p.name.toLowerCase().includes(planSearchTerm.toLowerCase()))
                      ).map((p) => (
                        <div 
                          key={p._id}
                          style={{ 
                            padding: "8px 12px", 
                            cursor: "pointer", 
                            borderBottom: "1px solid var(--border)",
                            color: "var(--text)",
                            fontSize: "0.9rem"
                          }}
                          onClick={() => {
                            handlePlanChange(p._id);
                            setPlanSearchTerm(`${p.name} (₹${p.price} - ${p.duration} days)`);
                            setShowPlanDropdown(false);
                          }}
                          onMouseEnter={(e) => e.target.style.background = "var(--bg2)"}
                          onMouseLeave={(e) => e.target.style.background = "transparent"}
                        >
                          {p.name} (₹{p.price} - {p.duration} days)
                        </div>
                      ))}
                      {plansList.filter(p => 
                        !planSearchTerm || 
                        (p.name && p.name.toLowerCase().includes(planSearchTerm.toLowerCase()))
                      ).length === 0 && (
                        <div style={{ padding: "8px 12px", color: "var(--text-muted)", fontSize: "0.9rem", fontStyle: "italic" }}>
                          No plans found.
                        </div>
                      )}
                    </div>
                  )}
                  {/* Hidden required input for form validation */}
                  <input type="hidden" required value={giveForm.plan} />
                </div>

                <div className="form-row" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label className="form-label" style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-soft)" }}>Amount Paid *</label>
                  <input
                    type="number"
                    className="form-input"
                    required
                    min="0"
                    placeholder="e.g. 299"
                    style={{ background: "var(--bg3)", border: "1px solid var(--border)", color: "var(--text)", padding: "8px 12px", borderRadius: "var(--radius-sm)", width: "100%" }}
                    value={giveForm.amount}
                    onChange={(e) => setGiveForm({ ...giveForm, amount: e.target.value })}
                  />
                </div>

                <div className="form-row" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label className="form-label" style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-soft)" }}>Start Date *</label>
                  <input
                    type="date"
                    className="form-input"
                    required
                    style={{ background: "var(--bg3)", border: "1px solid var(--border)", color: "var(--text)", padding: "8px 12px", borderRadius: "var(--radius-sm)", width: "100%" }}
                    value={giveForm.startDate}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                  />
                </div>

                <div className="form-row" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label className="form-label" style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-soft)" }}>Expiry Date *</label>
                  <input
                    type="date"
                    className="form-input"
                    required
                    style={{ background: "var(--bg3)", border: "1px solid var(--border)", color: "var(--text)", padding: "8px 12px", borderRadius: "var(--radius-sm)", width: "100%" }}
                    value={giveForm.endDate}
                    onChange={(e) => setGiveForm({ ...giveForm, endDate: e.target.value })}
                  />
                </div>

                <div className="form-row" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label className="form-label" style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-soft)" }}>Payment ID (Optional)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. pay_manual_123"
                    style={{ background: "var(--bg3)", border: "1px solid var(--border)", color: "var(--text)", padding: "8px 12px", borderRadius: "var(--radius-sm)", width: "100%" }}
                    value={giveForm.paymentId}
                    onChange={(e) => setGiveForm({ ...giveForm, paymentId: e.target.value })}
                  />
                </div>

                <div className="form-row" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label className="form-label" style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-soft)" }}>Subscription ID (Optional)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. sub_manual_123"
                    style={{ background: "var(--bg3)", border: "1px solid var(--border)", color: "var(--text)", padding: "8px 12px", borderRadius: "var(--radius-sm)", width: "100%" }}
                    value={giveForm.subscriptionId}
                    onChange={(e) => setGiveForm({ ...giveForm, subscriptionId: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-foot" style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{
                    padding: "10px 16px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border)",
                    background: "transparent",
                    color: "var(--text-soft)",
                    cursor: "pointer",
                    fontWeight: "600"
                  }}
                  onClick={() => setIsGiveOpen(false)}
                  disabled={giving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{
                    padding: "10px 16px",
                    borderRadius: "var(--radius-sm)",
                    border: "none",
                    background: "var(--primary)",
                    color: "white",
                    cursor: "pointer",
                    fontWeight: "600"
                  }}
                  disabled={giving}
                >
                  {giving ? "Assigning..." : "Give Subscription"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal View Details */}
      {selectedSub && (
        <div className="modal-overlay" onClick={() => setSelectedSub(null)} style={{
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
              <h3 style={{ margin: 0, fontSize: "1.25rem", color: "var(--text)" }}>Subscription Details</h3>
              <button
                onClick={() => setSelectedSub(null)}
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
                  {selectedSub.user?.profileImage ? (
                    <img src={getImageUrl(selectedSub.user.profileImage)} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <User size={24} style={{ color: "var(--text-soft)" }} />
                  )}
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: "1rem", color: "var(--text)" }}>{selectedSub.user?.name || "Unknown User"}</h4>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-soft)" }}>{selectedSub.user?.email || "No Email"}</p>
                  <p style={{ margin: "2px 0 0 0", fontSize: "0.8rem", color: "var(--text-muted)", fontFamily: "monospace" }}>{selectedSub.user?.phone || "No Phone"}</p>
                </div>
              </div>

              {/* Plan Section */}
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed var(--border)", paddingBottom: "6px" }}>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-soft)" }}>Plan Name</span>
                  <span style={{ fontSize: "0.85rem", fontWeight: "700", color: "var(--text)" }}>{selectedSub.plan?.name || selectedSub.plan || "-"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed var(--border)", paddingBottom: "6px" }}>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-soft)" }}>Status</span>
                  <span style={{
                    fontSize: "0.75rem",
                    fontWeight: "600",
                    padding: "2px 8px",
                    borderRadius: "12px",
                    background: selectedSub.status === "active" ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                    color: selectedSub.status === "active" ? "#10b981" : "#ef4444"
                  }}>
                    {selectedSub.status === "active" ? "Active" : selectedSub.status === "cancelled" ? "Cancelled" : "Expired"}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed var(--border)", paddingBottom: "6px" }}>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-soft)" }}>Amount Paid</span>
                  <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text)" }}>₹{selectedSub.amount || 0}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed var(--border)", paddingBottom: "6px" }}>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-soft)" }}>Currency</span>
                  <span style={{ fontSize: "0.85rem", color: "var(--text)" }}>{selectedSub.currency || "INR"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed var(--border)", paddingBottom: "6px" }}>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-soft)" }}>Payment Gateway</span>
                  <span style={{ fontSize: "0.85rem", fontWeight: "600", textTransform: "capitalize", color: selectedSub.paymentGateway === "zaakpay" ? "#3b82f6" : "#22c55e" }}>
                    {selectedSub.paymentGateway || "Razorpay"}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed var(--border)", paddingBottom: "6px" }}>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-soft)" }}>Transaction / Payment ID</span>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-soft)", fontFamily: "monospace" }}>{selectedSub.paymentId || selectedSub.subscriptionId || "N/A"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed var(--border)", paddingBottom: "6px" }}>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-soft)" }}>Start Date</span>
                  <span style={{ fontSize: "0.85rem", color: "var(--text)" }}>
                    {selectedSub.startDate ? new Date(selectedSub.startDate).toLocaleDateString("en-IN", { day: 'numeric', month: 'long', year: 'numeric' }) : "-"}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed var(--border)", paddingBottom: "6px" }}>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-soft)" }}>Expiry Date</span>
                  <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text)" }}>
                    {selectedSub.endDate ? new Date(selectedSub.endDate).toLocaleDateString("en-IN", { day: 'numeric', month: 'long', year: 'numeric' }) : "-"}
                  </span>
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
                onClick={() => setSelectedSub(null)}
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