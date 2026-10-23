import { useEffect, useState, useRef } from "react";
import API from "../api/axios";
import {
  CreditCard,
  RefreshCw,
  Zap,
  Plus,
  Users,
  Wallet,
  TrendingUp,
  Calendar,
  Clock,
  Search,
  Eye,
  Trash2,
  Ban,
  X,
  User,
  Smartphone,
  Globe,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import "./Subscription.css";

export default function SubscriptionPage() {
  // ── Tab State ──
  const [activeTab, setActiveTab] = useState("subscribers"); // 'subscribers' | 'transactions'

  // ── Subscriptions Data & Pagination ──
  const [subs, setSubs] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const limit = 10;

  // ── Filters State ──
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [platform, setPlatform] = useState("all");
  const [gateway, setGateway] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");

  // ── Dashboard Metrics State ──
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalSubscribers: 0,
    activeCount: 0,
    expiredCount: 0,
    cancelledCount: 0,
    totalRevenue: 0,
  });

  const [incomeStats, setIncomeStats] = useState({
    todayIncome: 0,
    yesterdayIncome: 0,
    monthlyIncome: 0,
    totalIncome: 0,
  });

  const [cardTodayGateway, setCardTodayGateway] = useState("all");
  const [cardMonthlyGateway, setCardMonthlyGateway] = useState("all");

  // ── Gateway Transactions State ──
  const [gatewayTx, setGatewayTx] = useState([]);
  const [loadingTx, setLoadingTx] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [txGatewayFilter, setTxGatewayFilter] = useState("all");
  const [txSearch, setTxSearch] = useState("");

  // ── Modals State ──
  const [selectedSub, setSelectedSub] = useState(null);
  const [selectedTx, setSelectedTx] = useState(null);
  const [isGiveOpen, setIsGiveOpen] = useState(false);
  const [usersList, setUsersList] = useState([]);
  const [plansList, setPlansList] = useState([]);

  const [giveForm, setGiveForm] = useState({
    user: "",
    plan: "",
    amount: "",
    platform: "app",
    paymentGateway: "manual",
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

  // Close dropdowns on outside click
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

  // Fetch Subscriptions when filters/page change
  useEffect(() => {
    fetchSubs();
  }, [page, search, status, platform, gateway, planFilter, sortOrder]);

  // Fetch Stats & Plans on mount
  useEffect(() => {
    fetchStats();
    loadPlans();
    fetchGatewayTransactions();
  }, []);

  // Fetch income stats when card gateway filters change
  useEffect(() => {
    fetchIncomeStats();
  }, [cardTodayGateway, cardMonthlyGateway]);

  // Give subscription modal open handler
  useEffect(() => {
    if (isGiveOpen) {
      loadGiveData();
      setGiveForm({
        user: "",
        plan: "",
        amount: "",
        platform: "app",
        paymentGateway: "manual",
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

  // ── Fetch Functions ──
  const fetchSubs = async () => {
    setLoadingSubs(true);
    try {
      const res = await API.get(
        `/admin/subscription/all?page=${page}&limit=${limit}&search=${encodeURIComponent(
          search
        )}&status=${status}&platform=${platform}&gateway=${gateway}&plan=${planFilter}&sort=${sortOrder}`
      );
      setSubs(res.data.subscriptions || []);
      setTotalPages(res.data.pagination?.pages || 1);
    } catch (err) {
      console.error("Failed to fetch subscriptions:", err);
      setSubs([]);
      setTotalPages(1);
    } finally {
      setLoadingSubs(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await API.get("/admin/subscription/stats");
      const d = res.data.data || {};
      setStats({
        totalUsers: d.totalUsers || 0,
        totalSubscribers: d.totalSubscribedUsers || 0,
        activeCount: d.activeSubscriptionCount || d.totalSubscribedUsers || 0,
        expiredCount: d.expiredSubscriptionCount || d.expirySubscriptionCount || 0,
        cancelledCount: d.cancelledSubscriptionCount || 0,
        totalRevenue: d.totalRevenue || 0,
      });
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
    fetchIncomeStats();
  };

  const fetchIncomeStats = async () => {
    try {
      const gw = cardTodayGateway !== "all" ? cardTodayGateway : "all";
      const res = await API.get(`/admin/subscription/income-stats?gateway=${gw}`);
      const d = res.data.data || {};
      setIncomeStats({
        todayIncome: d.todayIncome || 0,
        yesterdayIncome: d.yesterdayIncome || 0,
        monthlyIncome: d.monthlyIncome || 0,
        totalIncome: d.totalIncome || 0,
      });
    } catch (err) {
      console.error("Failed to fetch income stats:", err);
    }
  };

  const loadPlans = async () => {
    try {
      const res = await API.get("/admin/plan");
      setPlansList(res.data.plans || []);
    } catch (err) {
      console.error("Failed to load plans:", err);
    }
  };

  const fetchGatewayTransactions = async () => {
    setLoadingTx(true);
    try {
      const res = await API.get(`/admin/subscription/gateway-transactions?gateway=${txGatewayFilter}`);
      // Exclude SabPaisa from gateway transactions if any
      const txs = (res.data.transactions || []).filter(
        (t) => (t.gateway || "").toLowerCase() !== "sabpaisa"
      );
      setGatewayTx(txs);
    } catch (err) {
      console.error("Failed to fetch gateway transactions:", err);
      setGatewayTx([]);
    } finally {
      setLoadingTx(false);
    }
  };

  const loadGiveData = async () => {
    try {
      const [usersRes, plansRes] = await Promise.all([
        API.get("/admin/users"),
        API.get("/admin/plan"),
      ]);
      setUsersList(usersRes.data.users || []);
      setPlansList((plansRes.data.plans || []).filter((p) => p.isActive !== false));
    } catch (err) {
      console.error("Failed to load give data:", err);
    }
  };

  // ── Sync Live Payments ──
  const handleSyncPayments = async () => {
    setSyncing(true);
    try {
      const res = await API.post("/admin/subscription/sync-gateway-payments");
      alert(res.data.message || "Payment sync completed!");
      fetchSubs();
      fetchStats();
      fetchGatewayTransactions();
    } catch (err) {
      console.error("Sync error:", err);
      alert(err.response?.data?.message || "Failed to synchronize payments");
    } finally {
      setSyncing(false);
    }
  };

  // ── Sync Single Transaction ──
  const handleSyncSingleTx = async (tx) => {
    if (!window.confirm(`Activate subscription for ${tx.customerName || tx.customerPhone} (${tx.gateway})?`)) {
      return;
    }
    try {
      const res = await API.post("/admin/subscription/sync-single-order", {
        transactionId: tx.id,
        orderId: tx.orderId,
        gateway: tx.gateway,
        userId: tx.userId,
        phone: tx.customerPhone,
        email: tx.customerEmail,
        amount: tx.amount,
        planId: tx.planId,
      });
      alert(res.data.message || "Subscription activated successfully!");
      fetchSubs();
      fetchStats();
      fetchGatewayTransactions();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to activate subscription for this transaction");
    }
  };

  // ── Actions Handlers ──
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this subscription permanently?")) return;
    try {
      await API.delete(`/admin/subscription/${id}`);
      fetchSubs();
      fetchStats();
      alert("Subscription deleted successfully");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete subscription");
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm("Are you sure you want to cancel this subscription?")) return;
    try {
      await API.patch(`/admin/subscription/${id}/cancel`);
      fetchSubs();
      fetchStats();
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
      platform: selected.platform || "app",
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
        platform: giveForm.platform,
        paymentGateway: giveForm.paymentGateway,
        startDate: giveForm.startDate,
        endDate: giveForm.endDate,
        paymentId: giveForm.paymentId || undefined,
        subscriptionId: giveForm.subscriptionId || undefined,
      });

      setIsGiveOpen(false);
      fetchSubs();
      fetchStats();
      alert("Subscription assigned successfully! 🎉");
    } catch (err) {
      setGiveError(err.response?.data?.message || "Failed to assign subscription");
    } finally {
      setGiving(false);
    }
  };

  // ── Helper Formatter Functions ──
  const getValidityInfo = (endDate, subStatus) => {
    if (!endDate) return { date: "-", subtext: "-", isRemaining: false };
    const end = new Date(endDate);
    const now = new Date();
    const diffDays = Math.ceil((end - now) / (1000 * 60 * 60 * 24));

    const dateStr = end.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    if (subStatus === "active" && diffDays > 0) {
      return {
        date: dateStr,
        subtext: `${diffDays} days remaining`,
        isRemaining: true,
      };
    } else if (subStatus === "active" && diffDays === 0) {
      return {
        date: dateStr,
        subtext: "Expires today",
        isRemaining: true,
      };
    } else {
      const daysAgo = Math.abs(diffDays);
      return {
        date: dateStr,
        subtext: `Expired ${daysAgo > 0 ? `${daysAgo} days ago` : "today"}`,
        isRemaining: false,
      };
    }
  };

  const getGatewayPillClass = (gw) => {
    const g = (gw || "").toLowerCase();
    if (g.includes("razorpay")) return "gateway-razorpay";
    if (g.includes("easebuzz")) return "gateway-easebuzz";
    if (g.includes("zaakpay")) return "gateway-zaakpay";
    return "gateway-manual";
  };

  const getGatewayDisplayName = (gw) => {
    const g = (gw || "manual").toLowerCase();
    if (g === "razorpay") return "Razorpay";
    if (g === "easebuzz") return "Easebuzz";
    if (g === "zaakpay") return "Zaakpay";
    if (g === "voucher") return "Voucher";
    return "Manual";
  };

  const filteredGatewayTx = gatewayTx.filter((tx) => {
    if (txGatewayFilter !== "all" && tx.gateway !== txGatewayFilter) return false;
    if (txSearch) {
      const q = txSearch.toLowerCase();
      const match =
        (tx.id || "").toLowerCase().includes(q) ||
        (tx.orderId || "").toLowerCase().includes(q) ||
        (tx.customerName || "").toLowerCase().includes(q) ||
        (tx.customerEmail || "").toLowerCase().includes(q) ||
        (tx.customerPhone || "").toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="sub-monitor-container">
      {/* ── Page Header ── */}
      <div className="sub-header">
        <div className="sub-header-left">
          <div className="sub-title-row">
            <CreditCard className="sub-header-icon" />
            <h1 className="sub-title">Subscribed Users &amp; Monitoring</h1>
          </div>
          <p className="sub-subtitle">
            Real-time subscriber metrics, revenue breakdown, and user subscription management
          </p>
        </div>

        <div className="sub-header-actions">
          <button
            className="btn-header-action"
            onClick={() => {
              fetchSubs();
              fetchStats();
              fetchGatewayTransactions();
            }}
            title="Refresh subscriber and income data"
          >
            <RefreshCw size={15} className={loadingSubs || loadingTx ? "spinning" : ""} />
            Refresh
          </button>

          <button
            className="btn-header-action sync-btn"
            onClick={handleSyncPayments}
            disabled={syncing}
            title="Fetch live captured payments from Razorpay / Gateways and activate subscriptions"
          >
            <Zap size={15} className={syncing ? "spinning" : ""} />
            {syncing ? "Syncing..." : "Sync Payments"}
          </button>

          <button
            className="btn-header-primary"
            onClick={() => setIsGiveOpen(true)}
          >
            <Plus size={16} />
            Give Subscription
          </button>
        </div>
      </div>

      {/* ── 5 Metric KPI Cards ── */}
      <div className="sub-stats-grid">
        {/* Card 1: Subscribed Users */}
        <div className="sub-stat-card card-blue">
          <div className="sub-stat-card-head">
            <span className="sub-stat-label">SUBSCRIBED USERS</span>
            <div className="sub-stat-icon-wrap blue">
              <Users size={16} />
            </div>
          </div>
          <div className="sub-stat-value">{stats.activeCount || stats.totalSubscribers}</div>
          <div className="sub-stat-subtext">
            <span className="dot-indicator"></span>
            {stats.activeCount || stats.totalSubscribers} active subscriptions
          </div>
        </div>

        {/* Card 2: Total Revenue */}
        <div className="sub-stat-card card-pink">
          <div className="sub-stat-card-head">
            <span className="sub-stat-label">TOTAL REVENUE</span>
            <div className="sub-stat-icon-wrap pink">
              <Wallet size={16} />
            </div>
          </div>
          <div className="sub-stat-value">₹{(stats.totalRevenue || 0).toLocaleString("en-IN")}</div>
          <div className="sub-stat-subtext">All-time subscription earnings</div>
        </div>

        {/* Card 3: Today's Income */}
        <div className="sub-stat-card card-green">
          <div className="sub-stat-card-head">
            <span className="sub-stat-label">TODAY'S INCOME</span>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <select
                className="sub-card-gateway-select"
                value={cardTodayGateway}
                onChange={(e) => setCardTodayGateway(e.target.value)}
              >
                <option value="all">All Gateways</option>
                <option value="razorpay">Razorpay</option>
                <option value="easebuzz">Easebuzz</option>
              </select>
              <div className="sub-stat-icon-wrap green">
                <TrendingUp size={16} />
              </div>
            </div>
          </div>
          <div className="sub-stat-value">₹{(incomeStats.todayIncome || 0).toLocaleString("en-IN")}</div>
          <div className="sub-stat-subtext">
            Yesterday: ₹{(incomeStats.yesterdayIncome || 0).toLocaleString("en-IN")} • {getGatewayDisplayName(cardTodayGateway)}
          </div>
        </div>

        {/* Card 4: Monthly Income */}
        <div className="sub-stat-card card-amber">
          <div className="sub-stat-card-head">
            <span className="sub-stat-label">MONTHLY INCOME</span>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <select
                className="sub-card-gateway-select"
                value={cardMonthlyGateway}
                onChange={(e) => setCardMonthlyGateway(e.target.value)}
              >
                <option value="all">All Gateways</option>
                <option value="razorpay">Razorpay</option>
                <option value="easebuzz">Easebuzz</option>
              </select>
              <div className="sub-stat-icon-wrap amber">
                <Calendar size={16} />
              </div>
            </div>
          </div>
          <div className="sub-stat-value">₹{(incomeStats.monthlyIncome || 0).toLocaleString("en-IN")}</div>
          <div className="sub-stat-subtext">
            Current month collections • {getGatewayDisplayName(cardMonthlyGateway)}
          </div>
        </div>

        {/* Card 5: Expired & Cancelled */}
        <div className="sub-stat-card card-purple">
          <div className="sub-stat-card-head">
            <span className="sub-stat-label">EXPIRED &amp; CANCELLED</span>
            <div className="sub-stat-icon-wrap purple">
              <Clock size={16} />
            </div>
          </div>
          <div className="sub-stat-value">{stats.expiredCount + stats.cancelledCount}</div>
          <div className="sub-stat-subtext">
            {stats.cancelledCount} cancelled subscriptions
          </div>
        </div>
      </div>

      {/* ── View Mode Tabs ── */}
      <div className="sub-tabs-container">
        <button
          className={`sub-tab-btn ${activeTab === "subscribers" ? "active" : ""}`}
          onClick={() => setActiveTab("subscribers")}
        >
          Subscribed Users
          <span className="sub-tab-badge">{subs.length}</span>
        </button>

        <button
          className={`sub-tab-btn ${activeTab === "transactions" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("transactions");
            if (!gatewayTx.length) fetchGatewayTransactions();
          }}
        >
          Payment Gateway Transactions
          <span className="sub-tab-badge">{gatewayTx.length}</span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TAB 1: SUBSCRIBED USERS VIEW (Exact Match to Image 3)
          ───────────────────────────────────────────────────────────── */}
      {activeTab === "subscribers" && (
        <>
          {/* Filter Bar */}
          <div className="sub-filter-bar">
            {/* Search Input */}
            <div className="sub-search-wrap">
              <Search size={16} className="sub-search-icon" />
              <input
                type="text"
                className="sub-search-input"
                placeholder="Search by user name, email, or phone..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            {/* Status Dropdown */}
            <select
              className="sub-select-filter"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="cancelled">Cancelled</option>
            </select>

            {/* Platform Dropdown */}
            <select
              className="sub-select-filter"
              value={platform}
              onChange={(e) => {
                setPlatform(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All Platforms</option>
              <option value="app">App</option>
              <option value="website">Website</option>
            </select>

            {/* Plan Dropdown */}
            <select
              className="sub-select-filter"
              value={planFilter}
              onChange={(e) => {
                setPlanFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All Plans</option>
              {plansList.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>

            {/* Gateway Dropdown (SabPaisa removed) */}
            <select
              className="sub-select-filter"
              value={gateway}
              onChange={(e) => {
                setGateway(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All Gateways</option>
              <option value="razorpay">Razorpay</option>
              <option value="easebuzz">Easebuzz</option>
              <option value="manual">Manual</option>
              <option value="voucher">Voucher</option>
            </select>

            {/* Sort Dropdown */}
            <select
              className="sub-select-filter"
              value={sortOrder}
              onChange={(e) => {
                setSortOrder(e.target.value);
                setPage(1);
              }}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="amount_high">Amount: High to Low</option>
              <option value="amount_low">Amount: Low to High</option>
            </select>
          </div>

          {/* Table Container */}
          <div className="sub-table-container">
            <table className="sub-table">
              <thead>
                <tr>
                  <th>SUBSCRIBER</th>
                  <th>PLAN</th>
                  <th>PLATFORM</th>
                  <th>GATEWAY</th>
                  <th>AMOUNT</th>
                  <th>VALIDITY</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>

              <tbody>
                {loadingSubs ? (
                  <tr>
                    <td colSpan="8" className="empty-table-state">
                      <RefreshCw size={28} className="spinning" style={{ margin: "0 auto", color: "#38bdf8" }} />
                      <p>Loading subscriptions...</p>
                    </td>
                  </tr>
                ) : subs.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="empty-table-state">
                      <AlertCircle size={32} style={{ margin: "0 auto", color: "#64748b" }} />
                      <p>No subscriptions found matching your filters.</p>
                      <button
                        className="btn-header-action sync-btn"
                        style={{ marginTop: "12px" }}
                        onClick={handleSyncPayments}
                      >
                        <Zap size={14} /> Sync Recent Payments
                      </button>
                    </td>
                  </tr>
                ) : (
                  subs.map((sub) => {
                    const validity = getValidityInfo(sub.endDate, sub.status);
                    const isActive = sub.status === "active";

                    return (
                      <tr key={sub._id}>
                        {/* 1. SUBSCRIBER */}
                        <td>
                          <div className="subscriber-info-cell">
                            <div className="subscriber-avatar">
                              {sub.user?.profileImage ? (
                                <img src={sub.user.profileImage} alt={sub.user.name || "User"} />
                              ) : (
                                <User size={18} />
                              )}
                            </div>
                            <div className="subscriber-text">
                              <span className="subscriber-name">{sub.user?.name || "Subscriber"}</span>
                              <span className="subscriber-email">{sub.user?.email || "No email"}</span>
                              <span className="subscriber-phone">{sub.user?.phone || "--"}</span>
                            </div>
                          </div>
                        </td>

                        {/* 2. PLAN */}
                        <td>
                          <div className="plan-cell">
                            <span className="plan-name">{sub.plan?.name || "Standard Plan"}</span>
                            <span className="plan-details">
                              {sub.plan?.duration ? `${sub.plan.duration} Days` : "30 Days"}
                              {sub.plan?.planType ? ` • ${sub.plan.planType}` : ""}
                            </span>
                          </div>
                        </td>

                        {/* 3. PLATFORM */}
                        <td>
                          {sub.platform === "website" ? (
                            <span className="badge-pill platform-website">
                              <Globe size={11} /> Website
                            </span>
                          ) : (
                            <span className="badge-pill platform-app">
                              <Smartphone size={11} /> App
                            </span>
                          )}
                        </td>

                        {/* 4. GATEWAY */}
                        <td>
                          <span className={`badge-pill ${getGatewayPillClass(sub.paymentGateway)}`}>
                            {getGatewayDisplayName(sub.paymentGateway)}
                          </span>
                        </td>

                        {/* 5. AMOUNT */}
                        <td>
                          <span className="amount-cell">₹{sub.amount || 0}</span>
                        </td>

                        {/* 6. VALIDITY */}
                        <td>
                          <div className="validity-cell">
                            <span className="validity-date">{validity.date}</span>
                            <span
                              className={`validity-subtext ${validity.isRemaining ? "remaining" : "expired"}`}
                            >
                              {validity.subtext}
                            </span>
                          </div>
                        </td>

                        {/* 7. STATUS */}
                        <td>
                          <span
                            className={`badge-pill ${
                              sub.status === "active"
                                ? "status-active"
                                : sub.status === "cancelled"
                                ? "status-cancelled"
                                : "status-expired"
                            }`}
                          >
                            {sub.status === "active"
                              ? "Active"
                              : sub.status === "cancelled"
                              ? "Cancelled"
                              : "Expired"}
                          </span>
                        </td>

                        {/* 8. ACTIONS */}
                        <td>
                          <div className="actions-cell-wrap">
                            <button
                              className="icon-action-btn view"
                              onClick={() => setSelectedSub(sub)}
                              title="View Subscription Details"
                            >
                              <Eye size={15} />
                            </button>

                            <button
                              className="icon-action-btn cancel"
                              disabled={!isActive}
                              onClick={() => handleCancel(sub._id)}
                              title={isActive ? "Cancel Subscription" : "Subscription not active"}
                            >
                              <Ban size={15} />
                            </button>

                            <button
                              className="icon-action-btn delete"
                              onClick={() => handleDelete(sub._id)}
                              title="Delete Subscription Permanently"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="sub-pagination-wrap">
                <span className="pagination-info">
                  Showing page {page} of {totalPages}
                </span>
                <div className="pagination-btn-group">
                  <button
                    className="pagination-btn"
                    disabled={page === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </button>
                  <button
                    className="pagination-btn"
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 2: PAYMENT GATEWAY TRANSACTIONS (Razorpay, Easebuzz)
          ───────────────────────────────────────────────────────────── */}
      {activeTab === "transactions" && (
        <>
          {/* Transactions Filter Bar */}
          <div className="sub-filter-bar">
            <div className="sub-search-wrap">
              <Search size={16} className="sub-search-icon" />
              <input
                type="text"
                className="sub-search-input"
                placeholder="Search transaction ID, order ID, phone, email, name..."
                value={txSearch}
                onChange={(e) => setTxSearch(e.target.value)}
              />
            </div>

            <select
              className="sub-select-filter"
              value={txGatewayFilter}
              onChange={(e) => setTxGatewayFilter(e.target.value)}
            >
              <option value="all">All Gateways</option>
              <option value="razorpay">Razorpay</option>
              <option value="easebuzz">Easebuzz</option>
            </select>

            <button
              className="btn-header-action sync-btn"
              onClick={handleSyncPayments}
              disabled={syncing}
            >
              <Zap size={15} className={syncing ? "spinning" : ""} />
              {syncing ? "Syncing..." : "Sync Live Payments"}
            </button>
          </div>

          {/* Transactions Table */}
          <div className="sub-table-container">
            <table className="sub-table">
              <thead>
                <tr>
                  <th>PAYMENT / ORDER ID</th>
                  <th>GATEWAY</th>
                  <th>CUSTOMER DETAIL</th>
                  <th>AMOUNT</th>
                  <th>DATE &amp; TIME</th>
                  <th>PAYMENT STATUS</th>
                  <th>SUBSCRIPTION</th>
                  <th>ACTION</th>
                </tr>
              </thead>

              <tbody>
                {loadingTx ? (
                  <tr>
                    <td colSpan="8" className="empty-table-state">
                      <RefreshCw size={28} className="spinning" style={{ margin: "0 auto", color: "#38bdf8" }} />
                      <p>Fetching payment transactions from gateways...</p>
                    </td>
                  </tr>
                ) : filteredGatewayTx.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="empty-table-state">
                      <AlertCircle size={32} style={{ margin: "0 auto", color: "#64748b" }} />
                      <p>No transactions found for the selected gateway filter.</p>
                    </td>
                  </tr>
                ) : (
                  filteredGatewayTx.map((tx, idx) => {
                    const isSuccess =
                      tx.status === "success" ||
                      tx.status === "captured" ||
                      tx.rawStatus === "completed";

                    const isFailed =
                      tx.status === "failed" ||
                      tx.status === "bounced" ||
                      tx.status === "dropped";

                    return (
                      <tr key={tx.id || idx}>
                        {/* ID */}
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                            <span style={{ fontWeight: 600, color: "var(--text, #f8fafc)", fontFamily: "monospace" }}>
                              {tx.id}
                            </span>
                            {tx.orderId && tx.orderId !== tx.id && (
                              <span style={{ fontSize: "0.75rem", color: "var(--text-muted, #64748b)" }}>
                                Order: {tx.orderId}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Gateway */}
                        <td>
                          <span className={`badge-pill ${getGatewayPillClass(tx.gateway)}`}>
                            {getGatewayDisplayName(tx.gateway)}
                          </span>
                        </td>

                        {/* Customer */}
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                            <span style={{ fontWeight: 600, color: "var(--text, #f1f5f9)" }}>
                              {tx.customerName || "Customer"}
                            </span>
                            <span style={{ fontSize: "0.78rem", color: "var(--text-muted, #94a3b8)" }}>
                              {tx.customerPhone || "--"}
                            </span>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-soft, #64748b)" }}>
                              {tx.customerEmail || "--"}
                            </span>
                          </div>
                        </td>

                        {/* Amount */}
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                            <span className="amount-cell">₹{tx.amount}</span>
                            <span style={{ fontSize: "0.72rem", color: "var(--text-muted, #94a3b8)", textTransform: "uppercase" }}>
                              {tx.method || "Online"}
                            </span>
                          </div>
                        </td>

                        {/* Date */}
                        <td>
                          <span style={{ fontSize: "0.825rem", color: "var(--text, #cbd5e1)" }}>
                            {tx.createdAt ? new Date(tx.createdAt).toLocaleString("en-IN") : "--"}
                          </span>
                        </td>

                        {/* Payment Status */}
                        <td>
                          <span
                            className={`badge-pill ${
                              isSuccess
                                ? "status-active"
                                : isFailed
                                ? "status-expired"
                                : "status-cancelled"
                            }`}
                          >
                            {isSuccess ? "● Captured / Success" : isFailed ? "✕ " + (tx.rawStatus || "Failed") : tx.status}
                          </span>
                        </td>

                        {/* Subscription Status */}
                        <td>
                          {tx.hasSubscription ? (
                            <span className="badge-pill status-active">
                              <CheckCircle2 size={12} /> Subscribed
                            </span>
                          ) : (
                            <span className="badge-pill status-cancelled">
                              Not Subscribed
                            </span>
                          )}
                        </td>

                        {/* Action */}
                        <td>
                          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                            {!tx.hasSubscription && (
                              <button
                                className="gateway-sync-btn"
                                onClick={() => handleSyncSingleTx(tx)}
                                title="Activate subscription for this payment"
                              >
                                <Zap size={12} /> Sync
                              </button>
                            )}
                            <button
                              className="icon-action-btn view"
                              onClick={() => setSelectedTx(tx)}
                              title="View Payment Details"
                            >
                              <Eye size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 1: VIEW SUBSCRIPTION DETAILS
          ───────────────────────────────────────────────────────────── */}
      {selectedSub && (
        <div className="sub-modal-overlay" onClick={() => setSelectedSub(null)}>
          <div className="sub-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="sub-modal-head">
              <h3>Subscription Details</h3>
              <button className="sub-modal-close-btn" onClick={() => setSelectedSub(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="sub-modal-body">
              <div className="detail-row-item">
                <span className="detail-label">Subscriber Name</span>
                <span className="detail-val">{selectedSub.user?.name || "--"}</span>
              </div>

              <div className="detail-row-item">
                <span className="detail-label">Subscriber Email</span>
                <span className="detail-val">{selectedSub.user?.email || "--"}</span>
              </div>

              <div className="detail-row-item">
                <span className="detail-label">Subscriber Phone</span>
                <span className="detail-val">{selectedSub.user?.phone || "--"}</span>
              </div>

              <div className="detail-row-item">
                <span className="detail-label">Plan Name</span>
                <span className="detail-val">{selectedSub.plan?.name || "--"}</span>
              </div>

              <div className="detail-row-item">
                <span className="detail-label">Platform</span>
                <span className="detail-val">
                  {selectedSub.platform === "website" ? "Website" : "Mobile App"}
                </span>
              </div>

              <div className="detail-row-item">
                <span className="detail-label">Payment Gateway</span>
                <span className="detail-val">{getGatewayDisplayName(selectedSub.paymentGateway)}</span>
              </div>

              <div className="detail-row-item">
                <span className="detail-label">Payment ID</span>
                <span className="detail-val" style={{ fontFamily: "monospace" }}>
                  {selectedSub.paymentId || "--"}
                </span>
              </div>

              <div className="detail-row-item">
                <span className="detail-label">Subscription / Order ID</span>
                <span className="detail-val" style={{ fontFamily: "monospace" }}>
                  {selectedSub.subscriptionId || "--"}
                </span>
              </div>

              <div className="detail-row-item">
                <span className="detail-label">Amount Paid</span>
                <span className="detail-val" style={{ color: "#16a34a" }}>
                  ₹{selectedSub.amount || 0}
                </span>
              </div>

              <div className="detail-row-item">
                <span className="detail-label">Start Date</span>
                <span className="detail-val">
                  {selectedSub.startDate ? new Date(selectedSub.startDate).toLocaleDateString("en-IN") : "--"}
                </span>
              </div>

              <div className="detail-row-item">
                <span className="detail-label">End Date</span>
                <span className="detail-val">
                  {selectedSub.endDate ? new Date(selectedSub.endDate).toLocaleDateString("en-IN") : "--"}
                </span>
              </div>

              <div className="detail-row-item">
                <span className="detail-label">Status</span>
                <span
                  className={`badge-pill ${
                    selectedSub.status === "active"
                      ? "status-active"
                      : selectedSub.status === "cancelled"
                      ? "status-cancelled"
                      : "status-expired"
                  }`}
                >
                  {selectedSub.status}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 2: VIEW GATEWAY TRANSACTION DETAILS
          ───────────────────────────────────────────────────────────── */}
      {selectedTx && (
        <div className="sub-modal-overlay" onClick={() => setSelectedTx(null)}>
          <div className="sub-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="sub-modal-head">
              <h3>Gateway Payment Transaction</h3>
              <button className="sub-modal-close-btn" onClick={() => setSelectedTx(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="sub-modal-body">
              <div className="detail-row-item">
                <span className="detail-label">Gateway</span>
                <span className="detail-val">{getGatewayDisplayName(selectedTx.gateway)}</span>
              </div>

              <div className="detail-row-item">
                <span className="detail-label">Transaction / Payment ID</span>
                <span className="detail-val" style={{ fontFamily: "monospace" }}>
                  {selectedTx.id}
                </span>
              </div>

              <div className="detail-row-item">
                <span className="detail-label">Order ID</span>
                <span className="detail-val" style={{ fontFamily: "monospace" }}>
                  {selectedTx.orderId || "--"}
                </span>
              </div>

              <div className="detail-row-item">
                <span className="detail-label">Customer Name</span>
                <span className="detail-val">{selectedTx.customerName || "Customer"}</span>
              </div>

              <div className="detail-row-item">
                <span className="detail-label">Customer Phone</span>
                <span className="detail-val">{selectedTx.customerPhone || "--"}</span>
              </div>

              <div className="detail-row-item">
                <span className="detail-label">Customer Email</span>
                <span className="detail-val">{selectedTx.customerEmail || "--"}</span>
              </div>

              <div className="detail-row-item">
                <span className="detail-label">Amount</span>
                <span className="detail-val" style={{ color: "#16a34a" }}>
                  ₹{selectedTx.amount}
                </span>
              </div>

              <div className="detail-row-item">
                <span className="detail-label">Payment Method</span>
                <span className="detail-val" style={{ textTransform: "uppercase" }}>
                  {selectedTx.method || "Online"}
                </span>
              </div>

              <div className="detail-row-item">
                <span className="detail-label">Payment Status</span>
                <span className="detail-val">{selectedTx.rawStatus || selectedTx.status}</span>
              </div>

              <div className="detail-row-item">
                <span className="detail-label">Subscription Status</span>
                <span className="detail-val">
                  {selectedTx.hasSubscription ? "Active Subscription Linked" : "Not Linked to Subscription"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 3: GIVE SUBSCRIPTION MODAL
          ───────────────────────────────────────────────────────────── */}
      {isGiveOpen && (
        <div className="sub-modal-overlay" onClick={() => setIsGiveOpen(false)}>
          <div className="sub-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="sub-modal-head">
              <h3>Give Subscription</h3>
              <button className="sub-modal-close-btn" onClick={() => setIsGiveOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleGiveSubmit}>
              <div className="sub-modal-body">
                {giveError && (
                  <div
                    style={{
                      color: "#ef4444",
                      background: "rgba(239, 68, 68, 0.1)",
                      padding: "10px 14px",
                      borderRadius: 8,
                      fontSize: "0.85rem",
                    }}
                  >
                    {giveError}
                  </div>
                )}

                {/* User Picker */}
                <div ref={userDropdownRef} style={{ position: "relative" }}>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted, #94a3b8)", marginBottom: 6 }}>
                    Select User *
                  </label>
                  <input
                    type="text"
                    className="sub-search-input"
                    style={{ paddingLeft: 14 }}
                    placeholder="Search user by name, email, or phone..."
                    value={userSearchTerm}
                    onFocus={() => setShowUserDropdown(true)}
                    onChange={(e) => {
                      setUserSearchTerm(e.target.value);
                      setShowUserDropdown(true);
                      setGiveForm((prev) => ({ ...prev, user: "" }));
                    }}
                    required={!giveForm.user}
                  />

                  {showUserDropdown && (
                    <div
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        background: "var(--bg2, #0c0f18)",
                        border: "1px solid var(--border2, rgba(255, 255, 255, 0.15))",
                        borderRadius: 8,
                        maxHeight: 180,
                        overflowY: "auto",
                        zIndex: 10,
                        marginTop: 4,
                        boxShadow: "0 10px 20px rgba(0, 0, 0, 0.5)",
                      }}
                    >
                      {usersList
                        .filter((u) => {
                          const term = userSearchTerm.toLowerCase();
                          return (
                            (u.name || "").toLowerCase().includes(term) ||
                            (u.email || "").toLowerCase().includes(term) ||
                            (u.phone || "").toLowerCase().includes(term)
                          );
                        })
                        .map((u) => (
                          <div
                            key={u._id}
                            style={{
                              padding: "10px 14px",
                              cursor: "pointer",
                              borderBottom: "1px solid var(--border, rgba(255, 255, 255, 0.05))",
                              fontSize: "0.85rem",
                            }}
                            onClick={() => {
                              setGiveForm((prev) => ({ ...prev, user: u._id }));
                              setUserSearchTerm(`${u.name || "User"} (${u.phone || u.email || u._id})`);
                              setShowUserDropdown(false);
                            }}
                          >
                            <div style={{ fontWeight: 600, color: "var(--text, #f8fafc)" }}>{u.name || "User"}</div>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-muted, #94a3b8)" }}>{u.phone || u.email}</div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* Plan Picker */}
                <div ref={planDropdownRef} style={{ position: "relative" }}>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted, #94a3b8)", marginBottom: 6 }}>
                    Select Plan *
                  </label>
                  <input
                    type="text"
                    className="sub-search-input"
                    style={{ paddingLeft: 14 }}
                    placeholder="Search or select subscription plan..."
                    value={planSearchTerm}
                    onFocus={() => setShowPlanDropdown(true)}
                    onChange={(e) => {
                      setPlanSearchTerm(e.target.value);
                      setShowPlanDropdown(true);
                    }}
                    required={!giveForm.plan}
                  />

                  {showPlanDropdown && (
                    <div
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        background: "var(--bg2, #0c0f18)",
                        border: "1px solid var(--border2, rgba(255, 255, 255, 0.15))",
                        borderRadius: 8,
                        maxHeight: 180,
                        overflowY: "auto",
                        zIndex: 10,
                        marginTop: 4,
                        boxShadow: "0 10px 20px rgba(0, 0, 0, 0.5)",
                      }}
                    >
                      {plansList
                        .filter((p) => (p.name || "").toLowerCase().includes(planSearchTerm.toLowerCase()))
                        .map((p) => (
                          <div
                            key={p._id}
                            style={{
                              padding: "10px 14px",
                              cursor: "pointer",
                              borderBottom: "1px solid var(--border, rgba(255, 255, 255, 0.05))",
                              fontSize: "0.85rem",
                            }}
                            onClick={() => {
                              handlePlanChange(p._id);
                              setPlanSearchTerm(`${p.name} (₹${p.price} - ${p.duration} Days)`);
                              setShowPlanDropdown(false);
                            }}
                          >
                            <div style={{ fontWeight: 600, color: "var(--text, #f8fafc)" }}>
                              {p.name} • ₹{p.price}
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-muted, #94a3b8)" }}>
                              Duration: {p.duration} Days • Platform: {p.platform || "App"}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* Amount */}
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted, #94a3b8)", marginBottom: 6 }}>
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    className="sub-search-input"
                    style={{ paddingLeft: 14 }}
                    value={giveForm.amount}
                    onChange={(e) => setGiveForm((prev) => ({ ...prev, amount: e.target.value }))}
                    placeholder="Enter amount"
                  />
                </div>

                {/* Gateway & Platform (SabPaisa removed) */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted, #94a3b8)", marginBottom: 6 }}>
                      Gateway
                    </label>
                    <select
                      className="sub-select-filter"
                      style={{ width: "100%" }}
                      value={giveForm.paymentGateway}
                      onChange={(e) => setGiveForm((prev) => ({ ...prev, paymentGateway: e.target.value }))}
                    >
                      <option value="manual">Manual</option>
                      <option value="razorpay">Razorpay</option>
                      <option value="easebuzz">Easebuzz</option>
                      <option value="voucher">Voucher</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted, #94a3b8)", marginBottom: 6 }}>
                      Platform
                    </label>
                    <select
                      className="sub-select-filter"
                      style={{ width: "100%" }}
                      value={giveForm.platform}
                      onChange={(e) => setGiveForm((prev) => ({ ...prev, platform: e.target.value }))}
                    >
                      <option value="app">Mobile App</option>
                      <option value="website">Website</option>
                    </select>
                  </div>
                </div>

                {/* Dates */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted, #94a3b8)", marginBottom: 6 }}>
                      Start Date *
                    </label>
                    <input
                      type="date"
                      className="sub-search-input"
                      style={{ paddingLeft: 14 }}
                      value={giveForm.startDate}
                      onChange={(e) => handleStartDateChange(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted, #94a3b8)", marginBottom: 6 }}>
                      End Date *
                    </label>
                    <input
                      type="date"
                      className="sub-search-input"
                      style={{ paddingLeft: 14 }}
                      value={giveForm.endDate}
                      onChange={(e) => setGiveForm((prev) => ({ ...prev, endDate: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                {/* Optional Payment ID */}
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted, #94a3b8)", marginBottom: 6 }}>
                    Payment ID (Optional)
                  </label>
                  <input
                    type="text"
                    className="sub-search-input"
                    style={{ paddingLeft: 14 }}
                    placeholder="e.g. pay_xxx or EB_xxx"
                    value={giveForm.paymentId}
                    onChange={(e) => setGiveForm((prev) => ({ ...prev, paymentId: e.target.value }))}
                  />
                </div>

                {/* Modal Submit Actions */}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 12 }}>
                  <button
                    type="button"
                    className="btn-header-action"
                    onClick={() => setIsGiveOpen(false)}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="btn-header-primary"
                    disabled={giving}
                  >
                    {giving ? "Assigning..." : "Assign Subscription"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}