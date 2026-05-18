import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import "./Dashboard.css";

const userFromStorage = JSON.parse(localStorage.getItem("user") || "{}");

const SNAPSHOT_KEY = `dashboard_request_snapshot_${userFromStorage?._id || userFromStorage?.id || 'anon'}`;
const NOTIFICATIONS_KEY = `dashboard_notifications_${userFromStorage?._id || userFromStorage?.id || 'anon'}`;

const loadPersistedSnapshot = () => {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

const savePersistedSnapshot = (requests) => {
  try {
    const slim = requests.map(r => ({ _id: r._id, status: r.status, formNumber: r.formNumber }));
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(slim));
  } catch { }
};

const loadPersistedNotifications = () => {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return parsed.filter(n => new Date(n.timestamp).getTime() > cutoff);
  } catch { return []; }
};

const savePersistedNotifications = (notifications) => {
  try {
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications.slice(0, 50)));
  } catch { }
};


const UserDashboard = () => {
  const navigate = useNavigate();
  const BASE_URL = 'https://nalco.onrender.com';

  const userRef = useRef(JSON.parse(localStorage.getItem("user") || "{}"));
  const user = userRef.current;
  const isHod = parseInt(user?.scale?.replace("E", "") || "0", 10) >= 6;

  const [stats, setStats] = useState({ total: 0, pending: 0, completed: 0, rejected: 0 });
  const [recentRequests, setRecentRequests] = useState([]);
  const [activeNav, setActiveNav] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [showSpecialModal, setShowSpecialModal] = useState(false);
  const [specialTarget, setSpecialTarget] = useState('');
  const [specialPassword, setSpecialPassword] = useState('');
  const [specialLoading, setSpecialLoading] = useState(false);
  const [specialError, setSpecialError] = useState('');

  const [workflowStatus, setWorkflowStatus] = useState({
    hod: { pending: 0, approved: 0, rejected: 0 },
    authority: { pending: 0, approved: 0, rejected: 0 },
    network: { pending: 0, approved: 0, rejected: 0 },
  });

  const [notifications, setNotifications] = useState(() => loadPersistedNotifications());
  const [showNotifications, setShowNotifications] = useState(false);

  // adding filter for accepted, pending and rejected requests
  const [filterStatus, setFilterStatus] = useState("all");

  // pagination UI
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 3;

  const prevRequestsRef = useRef([]);
  const fetchRequestsRef = useRef(null);
  const isFirstFetchRef = useRef(true);

  useEffect(() => { savePersistedNotifications(notifications); }, [notifications]);


  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus]);

  const getReadableStatus = (status) => ({
    'pending-hod': 'Pending HOD approval',
    'pending-authority': 'Pending Authority approval',
    'pending-network': 'Pending Network approval',
    'approved': 'Approved',
    'rejected': 'Rejected',
  }[status] ?? status);

  const normalizeStatus = (status) => status?.replace(/-/g, '_') || 'pending';

  const addNotification = useCallback((message, requestId) => {
    setNotifications(prev => [
      { id: Date.now() + Math.random(), message, requestId, timestamp: new Date(), read: false },
      ...prev,
    ]);
  }, []);

  const compareAndNotify = useCallback((oldReqs, newReqs) => {
    const oldIds = new Set(oldReqs.map(r => r._id));
    newReqs.filter(r => !oldIds.has(r._id)).forEach(req => {
      addNotification(`📄 New request #${req.formNumber || req._id.slice(-5)} submitted`, req._id);
    });
    const oldMap = new Map(oldReqs.map(r => [r._id, r.status]));
    newReqs.forEach(req => {
      const prev = oldMap.get(req._id);
      if (prev && prev !== req.status) {
        addNotification(
          `🔄 Request #${req.formNumber || req._id.slice(-5)}: ${getReadableStatus(prev)} → ${getReadableStatus(req.status)}`,
          req._id
        );
      }
    });
  }, [addNotification]);

  /* ── Core fetch ──────────────────────────────────────────── */

  const fetchRequests = useCallback(async () => {
    const userId = user?._id || user?.id;

    if (!userId || typeof userId !== 'string' || !userId.trim()) {
      return;
    }

    try {
      const res = await fetch(`${BASE_URL}/api/requests/my-requests?userId=${encodeURIComponent(userId)}`);

      if (res.status === 400) return;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const newRequests = data.requests || [];

      const baseline = isFirstFetchRef.current
        ? loadPersistedSnapshot()
        : prevRequestsRef.current;
      isFirstFetchRef.current = false;

      if (baseline.length > 0) compareAndNotify(baseline, newRequests);

      prevRequestsRef.current = newRequests;
      savePersistedSnapshot(newRequests);
      setRecentRequests(newRequests);

      setStats({
        total: newRequests.length,
        pending: newRequests.filter(r =>
          ['pending-hod', 'pending-authority', 'pending-network'].includes(r.status)
        ).length,
        completed: newRequests.filter(r => r.status === 'approved').length,
        rejected: newRequests.filter(r => r.status === 'rejected').length,
      });

      const wf = {
        hod: { pending: 0, approved: 0, rejected: 0 },
        authority: { pending: 0, approved: 0, rejected: 0 },
        network: { pending: 0, approved: 0, rejected: 0 },
      };
      newRequests.forEach(({ status }) => {
        if (status === 'pending-hod') { wf.hod.pending++; }
        else if (status === 'pending-authority') { wf.hod.approved++; wf.authority.pending++; }
        else if (status === 'pending-network') { wf.hod.approved++; wf.authority.approved++; wf.network.pending++; }
        else if (status === 'approved') { wf.hod.approved++; wf.authority.approved++; wf.network.approved++; }
        else if (status === 'rejected') { wf.hod.rejected++; }
      });
      setWorkflowStatus(wf);

    } catch (err) {
      console.error('Dashboard fetch error:', err);
    }
  }, [compareAndNotify, user]);


  useEffect(() => { fetchRequestsRef.current = fetchRequests; }, [fetchRequests]);

  useEffect(() => {
    fetchRequestsRef.current();
    const id = setInterval(() => fetchRequestsRef.current(), 10_000);
    return () => clearInterval(id);
  }, []);


  const getStepStatus = (req, step) => {
    const { status } = req;
    if (status === 'approved') return 'approved';
    if (status === 'rejected') {
      const stage =
        req.networkRemarks?.trim() ? 'network' :
          req.authorityRemarks?.trim() ? 'authority' :
            req.hodRemarks?.trim() ? 'hod' : null;
      if (stage) {
        const order = ['hod', 'authority', 'network'];
        const si = order.indexOf(step), ri = order.indexOf(stage);
        if (si === ri) return 'rejected';
        if (si < ri) return 'approved';
        return 'inactive';
      }
      return 'pending';
    }
    const order = ['hod', 'authority', 'network'];
    const currentStageIndex = { 'pending-hod': 0, 'pending-authority': 1, 'pending-network': 2 }[status] ?? -1;
    const stepIndex = order.indexOf(step);
    if (stepIndex < currentStageIndex) return 'approved';
    if (stepIndex === currentStageIndex) return 'pending';
    return 'inactive';
  };


  const getWorkflowBadge = (key) => {
    const s = workflowStatus[key];
    if (!s) return null;
    if (s.pending > 0)
      return <span className="workflow-badge workflow-badge--pending">{s.pending}</span>;
    if (s.approved > 0 && key === 'network')
      return <span className="workflow-badge workflow-badge--approved">✓</span>;
    return null;
  };

  const statusClass = (s) => {
    if (s === 'approved') return 'badge--green';
    if (['pending-hod', 'pending-authority', 'pending-network'].includes(s)) return 'badge--orange';
    if (s === 'rejected') return 'badge--red';
    return 'badge--blue';
  };


  const openSpecialLogin = (role) => {
    if (localStorage.getItem('specialRole') === role) {
      navigate(`/${role}`);
      return;
    }
    setSpecialTarget(role);
    setSpecialPassword('');
    setSpecialError('');
    setShowSpecialModal(true);
  };

  const closeSpecialModal = () => {
    setShowSpecialModal(false);
    setSpecialPassword('');
    setSpecialError('');
  };

  const handleSpecialSubmit = async (e) => {
    e.preventDefault();
    if (!specialPassword) return setSpecialError('Password is required');

    setSpecialLoading(true);
    setSpecialError('');

    try {
      const res = await fetch(`${BASE_URL}/api/requests/special-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: specialTarget, password: specialPassword })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        localStorage.setItem('specialRole', data.role);
        closeSpecialModal();
        navigate(`/${data.role}`);
      } else {
        setSpecialError(data.message || 'Invalid password.');
      }
    } catch (err) {
      setSpecialError('Server error. Please try again.');
    } finally {
      setSpecialLoading(false);
    }
  };



  const StatusMap = ({ request }) => {
    const steps = [
      { key: 'hod', label: 'HOD' },
      { key: 'authority', label: 'Authority' },
      { key: 'network', label: 'Network' },
    ];
    return (
      <div className="status-map">
        {steps.map((step, idx) => {
          const ss = getStepStatus(request, step.key);
          return (
            <React.Fragment key={step.key}>
              <div className={`status-step status-step--${ss}`}>
                <div className="status-step-icon">
                  {ss === 'approved' ? '✓' : ss === 'rejected' ? '✕' : '○'}
                </div>
                <div className="status-step-label">{step.label}</div>
                <div className="status-step-status">
                  {ss === 'approved' ? 'Done'
                    : ss === 'rejected' ? 'Rejected'
                      : ss === 'inactive' ? 'N/A'
                        : 'Pending'}
                </div>
              </div>
              {idx < steps.length - 1 && (
                <div className={`status-connector ${ss === 'approved' ? 'status-connector--active' : ''}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };


  const handleNavigation = (item) => {
    setActiveNav(item.id);
    setSidebarOpen(false);
    if (item.id === "new") navigate("/fill-form");
    else if (item.id === "requests")
      document.querySelector('.db-section')?.scrollIntoView({ behavior: 'smooth' });
    else if (item.id === "hod") {
      const n = recentRequests.filter(r => r.status === 'pending-hod').length;
      alert(n ? `${n} request(s) pending HOD approval` : "No pending HOD approvals");
    } else if (item.id === "authority") {
      const n = recentRequests.filter(r => r.status === 'pending-authority').length;
      alert(n ? `${n} request(s) pending Authority approval` : "No pending Authority approvals");
    } else if (item.id === "network") {
      const n = recentRequests.filter(r => r.status === 'pending-network').length;
      alert(n ? `${n} request(s) pending Network approval` : "No pending Network approvals");
    }
  };

  const markAsRead = (id) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  const unreadCount = notifications.filter(n => !n.read).length;

  const navItems = [
    { id: "dashboard", icon: "▦", label: "Dashboard" },
    { id: "requests", icon: "↗", label: "My Requests" },
    { id: "new", icon: "+", label: "New Request" },
    { id: "hod", icon: "◎", label: "HOD Approval", workflowKey: "hod" },
    { id: "authority", icon: "⊕", label: "Authority Approval", workflowKey: "authority" },
    { id: "network", icon: "⊙", label: "Network Admin", workflowKey: "network" },
  ];

  const navGroups = [
    { label: "Main Menu", ids: ["dashboard", "requests", "new"] },
  ];


  const downloadReceipt = async (requestId, currentUser) => {
    try {
      const res = await fetch(`${BASE_URL}/api/requests/receipt/${requestId}`);
      const data = await res.json();
      if (!data.success) return alert("Failed to fetch receipt data.");

      const request = data.request;
      const formatDate = (date) => new Date(date).toLocaleString();
      const generationTime = new Date().toLocaleString();
      const logoUrl = "https://nalcoindia.com/wp-content/themes/nalco/images/logo.png";

      const formatDesignation = (scale) => {
        const designations = {
          E1: "Assistant Manager",
          E2: "Deputy Manager",
          E3: "Manager",
          E4: "Senior Manager",
          E5: "Assistant General Manager",
          E6: "Deputy General Manager",
          E7: "General Manager",
          E8: "Chief General Manager",
          E9: "Executive Director",
        };
        return designations[scale] || scale;
      };

      const receiptHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    :root { --primary-blue: #7b130a; --text-dark: #1e293b; --text-muted: #64748b; --border-color: #cbd5e1; --bg-light: #f8fafc; }
    body { font-family: 'Arial', sans-serif; margin: 0; padding: 40px; background-color: #f1f5f9; color: var(--text-dark); }
    .receipt-container { max-width: 850px; margin: 0 auto; background: #ffffff; border: 1px solid var(--border-color); padding: 40px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
    .header { display: flex; flex-direction: column; align-items: center; border-bottom: 3px solid var(--primary-blue); padding-bottom: 20px; margin-bottom: 30px; }
    .logo-container img { width: 220px; height: 65px; object-fit: contain; }
    .header-text { text-align: center; margin-top: 12px; }
    .header-text h2 { margin: 0; font-size: 16px; color: #334155; }
    .section { margin-bottom: 30px; }
    .section-title { font-size: 15px; font-weight: bold; background-color: var(--primary-blue); color: white; padding: 8px 12px; margin-bottom: 16px; text-transform: uppercase; }
    .details-grid { display: grid; grid-template-columns: 1.2fr 2fr; border-top: 1px solid var(--border-color); border-left: 1px solid var(--border-color); border-right: 1px solid var(--border-color); }
    .details-grid > div { padding: 10px 12px; border-bottom: 1px solid var(--border-color); font-size: 14px; }
    .details-grid > div:nth-child(odd) { background-color: var(--bg-light); font-weight: bold; }
    .workflow-table { width: 100%; border-collapse: collapse; font-size: 14px; }
    .workflow-table th, .workflow-table td { border: 1px solid var(--border-color); padding: 10px 12px; text-align: left; }
    .workflow-table th { background-color: var(--bg-light); }
    .status-badge { font-weight: bold; padding: 4px 8px; border-radius: 4px; font-size: 12px; display: inline-block; }
    .status-approved { background-color: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
    .status-rejected { background-color: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
    .status-pending  { background-color: #fef9c3; color: #854d0e; border: 1px solid #fef08a; }
    .signature-section { display: flex; justify-content: space-between; margin-top: 50px; }
    .signature-box { width: 30%; text-align: center; }
    .signature-line { margin-bottom: 8px; height: 40px; display: flex; align-items: flex-end; justify-content: center; }
    .signature-name { font-size: 13px; font-weight: bold; color: var(--text-dark); border-bottom: 1px solid var(--text-dark); padding-bottom: 4px; min-width: 80%; }
    .signature-name-empty { border-bottom: 1px solid var(--text-dark); height: 1px; min-width: 80%; }
    .signature-label { font-weight: bold; font-size: 13px; margin-top: 8px; }
    .signature-designation { font-size: 12px; color: var(--text-muted); margin-top: 4px; font-style: italic; }
    .signature-meta { font-size: 11px; color: var(--text-muted); margin-top: 4px; }
    .footer { margin-top: 40px; text-align: center; font-size: 11px; color: var(--text-muted); border-top: 1px dashed var(--border-color); padding-top: 15px; }
    .controls { text-align: center; margin-top: 20px; }
    .download-btn { background-color: var(--primary-blue); color: white; border: none; padding: 10px 24px; font-size: 14px; border-radius: 6px; cursor: pointer; font-weight: bold; }
    @media print { body { background-color: white; padding: 0; } .receipt-container { box-shadow: none; border: none; padding: 10px; max-width: 100%; } .controls { display: none; } }
  </style>
</head>
<body>
  <div class="receipt-container">
    <div class="header">
      <div class="logo-container"><img src="${logoUrl}" alt="NALCO Logo" onerror="this.style.display='none'" /></div>
      <div class="header-text">
        <h2>External Storage Media Access Approval Receipt</h2>
      </div>
    </div>

    <div class="section">
      <div class="section-title">1. Employee & Request Details</div>
      <div class="details-grid">
        <div>Requester Name</div><div>${currentUser?.username || request.requestId?.username || "—"}</div>
        <div>Personal / Employee No.</div><div>${currentUser?.personalNumber || request.requestId?.personalNumber || "—"}</div>
        <div>Department</div><div>${request.department}</div>
        <div>Designation</div><div>${request.designation}</div>
        <div>Request Type</div><div>${request.requestType}</div>
        <div>Access Period</div><div>${request.accessFrom && request.accessTo ? new Date(request.accessFrom).toLocaleDateString() + "  to  " + new Date(request.accessTo).toLocaleDateString() : "—"}</div>
        <div>Justification</div><div>${request.justification || "—"}</div>
        <div>Date of Submission</div><div>${formatDate(request.requestDate)}</div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">2. Approval Workflow Status</div>
      <table class="workflow-table">
        <thead>
          <tr>
            <th style="width: 25%;">Authority</th>
            <th style="width: 20%;">Status</th>
            <th style="width: 55%;">Remarks</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>HOD (Stage 1)</strong></td>
            <td><span class="status-badge ${request.status !== 'pending-hod' ? 'status-approved' : 'status-pending'}">${request.status !== 'pending-hod' ? '✓ APPROVED' : 'PENDING'}</span></td>
            <td>${request.hodRemarks || "—"}</td>
          </tr>
          <tr>
            <td><strong>Competent Authority (Stage 2)</strong></td>
            <td><span class="status-badge ${request.status === 'pending-authority' ? 'status-pending' : (request.status === 'approved' || request.status === 'pending-network') ? 'status-approved' : 'status-pending'}">${request.status === 'pending-authority' ? 'PENDING' : (request.status === 'approved' || request.status !== 'pending-hod') ? '✓ APPROVED' : '—'}</span></td>
            <td>${request.authorityRemarks || "—"}</td>
          </tr>
          <tr>
            <td><strong>Network Admin (Stage 3)</strong></td>
            <td><span class="status-badge ${request.status === 'approved' ? 'status-approved' : 'status-pending'}">${request.status === 'approved' ? '✓ APPROVED' : (request.status === 'pending-network' ? 'PENDING' : '—')}</span></td>
            <td>${request.networkRemarks || "—"}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="signature-section">

      <div class="signature-box">
        <div class="signature-line">
          ${request.hodApprovedBy?.username
          ? `<span class="signature-name">${request.hodApprovedBy.username}</span>`
          : `<div class="signature-name-empty"></div>`}
        </div>
        <div class="signature-label">Head of Department</div>
        ${request.hodApprovedBy?.scale
          ? `<div class="signature-designation">${formatDesignation(request.hodApprovedBy.scale)}</div>`
          : ''}
        <div class="signature-meta">${request.hodApprovedBy ? `Signed: ${formatDate(request.hodApprovalDate)}` : "Awaiting Signature"}</div>
      </div>

      <div class="signature-box">
        <div class="signature-line">
          ${request.authorityApprovedBy?.username
          ? `<span class="signature-name">${request.authorityApprovedBy.username}</span>`
          : `<div class="signature-name-empty"></div>`}
        </div>
        <div class="signature-label">Competent Authority</div>
        ${request.authorityApprovedBy?.scale
          ? `<div class="signature-designation">${formatDesignation(request.authorityApprovedBy.scale)}</div>`
          : ''}
        <div class="signature-meta">${request.authorityApprovedBy ? `Signed: ${formatDate(request.authorityApprovalDate)}` : "Awaiting Signature"}</div>
      </div>

      <div class="signature-box">
        <div class="signature-line">
          ${request.networkApprovedBy?.username
          ? `<span class="signature-name">${request.networkApprovedBy.username}</span>`
          : `<div class="signature-name-empty"></div>`}
        </div>
        <div class="signature-label">Network Administrator</div>
        ${request.networkApprovedBy?.scale
          ? `<div class="signature-designation">${formatDesignation(request.networkApprovedBy.scale)}</div>`
          : ''}
        <div class="signature-meta">${request.networkApprovedBy ? `Signed: ${formatDate(request.networkApprovalDate)}` : "Awaiting Signature"}</div>
      </div>

    </div>

    <div class="footer">
      System-Generated Document • Valid only with all 3 digital approvals.<br/>
      Generated on: ${generationTime}
    </div>
  </div>
  <div class="controls">
    <button class="download-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
  </div>
</body>
</html>`;

      const win = window.open('', '_blank');
      win.document.write(receiptHtml);
      win.document.close();

    } catch (err) {
      console.error("Receipt error:", err);
      alert("Failed to generate receipt.");
    }
  };



  const filteredRequests =
    filterStatus === "all"
      ? recentRequests
      : recentRequests.filter(req => {
        if (filterStatus === "pending") {
          return ["pending-hod", "pending-authority", "pending-network"].includes(req.status);
        }
        if (filterStatus === "approved") return req.status === "approved";
        if (filterStatus === "rejected") return req.status === "rejected";
        return true;
      });

  const totalPages = Math.ceil(filteredRequests.length / ITEMS_PER_PAGE);
  const paginatedRequests = filteredRequests.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );


  return (
    <div className="dashboard-container">
      <Navbar />

      <div className="dashboard-body">

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Floating sidebar toggle (mobile) */}
        <button
          className="sidebar-toggle"
          onClick={() => setSidebarOpen(o => !o)}
          aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
        >
          {sidebarOpen ? "✕" : "☰"}
        </button>

        {/* ── Sidebar ── */}
        <aside className={`sidebar ${sidebarOpen ? "sidebar--open" : ""}`}>
          <div className="sidebar-scroll">

            {navGroups.map(group => (
              <div key={group.label} className="sidebar-group">
                <div className="sidebar-group-label">{group.label}</div>
                <ul className="sidebar-menu">
                  {navItems
                    .filter(item => group.ids.includes(item.id))
                    .map(item => (
                      <li
                        key={item.id}
                        className={activeNav === item.id ? "active" : ""}
                        onClick={() => handleNavigation(item)}
                      >
                        <span className="nav-icon">{item.icon}</span>
                        <span className="nav-label">{item.label}</span>
                        {item.workflowKey && getWorkflowBadge(item.workflowKey)}
                      </li>
                    ))}
                </ul>
              </div>
            ))}

            {isHod && (
              <div className="sidebar-group" style={{ marginTop: '16px' }}>
                <div className="sidebar-group-label">Management Portals</div>
                <ul className="sidebar-menu">

                  <li onClick={() => navigate("/hod")} className="hod-portal-link">
                    <span className="nav-icon">🛡️</span>
                    <span className="nav-label">My HOD Dashboard</span>
                  </li>

                  {/* Always visible *if they are E6+*, but guarded by Password Modal */}
                  <li onClick={() => openSpecialLogin('competant')}>
                    <span className="nav-icon">⊕</span>
                    <span className="nav-label">Competent Authority</span>
                  </li>

                  <li onClick={() => openSpecialLogin('network')}>
                    <span className="nav-icon">⊙</span>
                    <span className="nav-label">Network Admin</span>
                  </li>

                </ul>
              </div>
            )}

          </div>
        </aside>

        {/* ── Main Content ── */}
        <main className="dashboard-content">
          <div className="content-max-width">

            {/* Header */}
            <header className="db-header">
              <div className="db-welcome">
                <h1>Welcome, {user?.username || "User"}</h1>
                <p>Track and manage your media access approval requests</p>
              </div>

              <div className="db-header-actions">
                {/* Notification bell */}
                <div className="notification-wrapper">
                  <button
                    className="bell-btn"
                    onClick={() => setShowNotifications(v => !v)}
                    aria-label="Notifications"
                  >
                    <span className="bell-icon">🔔</span>
                    {unreadCount > 0 && (
                      <span className="bell-badge">{unreadCount}</span>
                    )}
                  </button>

                  {showNotifications && (
                    <div className="notification-dropdown">
                      <div className="notification-header">
                        <span>Notifications</span>
                        <button className="clear-btn" onClick={() => setNotifications([])}>
                          Clear all
                        </button>
                      </div>
                      <div className="notification-list">
                        {notifications.length === 0 ? (
                          <div className="notification-empty">No notifications yet</div>
                        ) : (
                          notifications.map(notif => (
                            <div
                              key={notif.id}
                              className={`notification-item ${!notif.read ? "unread" : ""}`}
                              onClick={() => markAsRead(notif.id)}
                            >
                              <div className="notif-message">{notif.message}</div>
                              <div className="notif-time">
                                {new Date(notif.timestamp).toLocaleTimeString()}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <button className="primary-btn" onClick={() => navigate("/fill-form")}>
                  + New Request
                </button>
              </div>
            </header>

            {/* Stats */}
            <section className="stats-grid">
              <div className="stat-card">
                <span>Total Requests</span>
                <h2>{stats.total}</h2>
              </div>
              <div className="stat-card pending">
                <span>Pending</span>
                <h2>{stats.pending}</h2>
              </div>
              <div className="stat-card approved">
                <span>Approved</span>
                <h2>{stats.completed}</h2>
              </div>
              <div className="stat-card rejected">
                <span>Rejected</span>
                <h2>{stats.rejected}</h2>
              </div>
            </section>


            <div className="top-action-buttons">

              <button
                className="new"
                onClick={() => navigate("/fill-form")}
              >
                + New Request
              </button>

              <button
                className="recent"
                onClick={() =>
                  document
                    .getElementById("recent-requests")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                Recent Requests
              </button>

              <button
                className={`small-btn filter-btn   ${filterStatus === "pending" ? "active-filter" : ""
                  }`}
                onClick={() => setFilterStatus("pending")}
              >
                Pending
              </button>

              <button
                className={`accepted ${filterStatus === "approved" ? "active-filter" : ""
                  }`}
                onClick={() => setFilterStatus("approved")}
              >
                Accepted
              </button>

              <button
                className={`rejectedBtn ${filterStatus === "rejected" ? "active-filter" : ""
                  }`}
                onClick={() => setFilterStatus("rejected")}
              >
                Rejected
              </button>

            </div>

            {/* Requests table */}
            <section className="db-section">
              <div className="section-header">
                <h2>Recent Requests</h2>
              </div>

              {stats.total === 0 ? (
                <div className="empty-state">
                  <p>You haven't submitted any requests yet.</p>
                  <button className="primary-btn" onClick={() => navigate("/fill-form")}>
                    + Submit your first request
                  </button>
                </div>
              ) : (
                <div className="requests-table-wrap">
                  <table className="requests-table">
                    <thead>
                      <tr>
                        <th>Form ID</th>
                        <th>Date</th>
                        <th>Department</th>
                        <th>Type</th>
                        <th>Access Period</th>
                        <th>Justification</th>
                        <th>Status</th>
                        <th>HOD Remarks</th>
                        <th>Authority Remarks</th>
                        <th>Network Remarks</th>
                        <th>Documents</th>
                        <th>Receipt</th>
                        <th>Workflow</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedRequests.map(req => (
                        <tr key={req._id}>
                          <td className="req-id">
                            #{req.formNumber || req._id.slice(-5)}
                          </td>
                          <td>{new Date(req.requestDate).toLocaleDateString()}</td>
                          <td>{req.department}</td>
                          <td>{req.requestType}</td>
                          <td className="access-period-cell">
                            {req.accessFrom && req.accessTo ? (
                              <>
                                <span>{new Date(req.accessFrom).toLocaleDateString()}</span>
                                <span className="period-arrow">→</span>
                                <span>{new Date(req.accessTo).toLocaleDateString()}</span>
                              </>
                            ) : "—"}
                          </td>
                          <td className="justification-cell" title={req.justification || ""}>
                            {req.justification || "—"}
                          </td>
                          <td>
                            <span className={`badge ${statusClass(req.status)}`}>
                              {normalizeStatus(req.status)}
                            </span>
                          </td>
                          <td>{req.hodRemarks || "—"}</td>
                          <td>{req.authorityRemarks || "—"}</td>
                          <td>{req.networkRemarks || "—"}</td>

                          <td className="documents-cell">
                            {req.documents && req.documents.length > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {req.documents.map((doc, idx) => (
                                  <a
                                    key={idx}
                                    href={`${BASE_URL}/api/requests/document/${doc.storedName}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="doc-preview-link"
                                    title={doc.originalName}
                                    style={{ fontSize: '12px', color: '#3b82f6', textDecoration: 'none' }}
                                  >
                                    📄 {doc.originalName.length > 15 ? doc.originalName.slice(0, 15) + '...' : doc.originalName}
                                  </a>
                                ))}
                              </div>
                            ) : (
                              "—"
                            )}
                          </td>

                          <td>
                            {req.status === 'approved' && (
                              <button
                                className="download-receipt-btn"
                                onClick={() => downloadReceipt(req._id, user)}
                              >
                                📄 Receipt
                              </button>
                            )}
                          </td>
                          <td className="workflow-status-cell">
                            <StatusMap request={req} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Pagination added here */}

                  {totalPages > 1 && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '16px 0 8px',
                    }}>
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        style={{
                          padding: '5px 12px',
                          borderRadius: '6px',
                          border: '1px solid #e2e8f0',
                          background: currentPage === 1 ? '#f8fafc' : '#fff',
                          color: currentPage === 1 ? '#cbd5e1' : '#374151',
                          cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                          fontSize: '13px',
                        }}
                      >
                        ← Prev
                      </button>

                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          style={{
                            padding: '5px 11px',
                            borderRadius: '6px',
                            border: '1px solid',
                            borderColor: currentPage === page ? '#6366f1' : '#e2e8f0',
                            background: currentPage === page ? '#6366f1' : '#fff',
                            color: currentPage === page ? '#fff' : '#374151',
                            fontWeight: currentPage === page ? '600' : '400',
                            cursor: 'pointer',
                            fontSize: '13px',
                            minWidth: '32px',
                          }}
                        >
                          {page}
                        </button>
                      ))}

                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        style={{
                          padding: '5px 12px',
                          borderRadius: '6px',
                          border: '1px solid #e2e8f0',
                          background: currentPage === totalPages ? '#f8fafc' : '#fff',
                          color: currentPage === totalPages ? '#cbd5e1' : '#374151',
                          cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                          fontSize: '13px',
                        }}
                      >
                        Next →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </section>

          </div>
        </main>
      </div>

      {/* ── Special Login Modal ── */}
      {showSpecialModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(30, 25, 23, 0.6)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
        }} onClick={closeSpecialModal}>

          <div style={{
            background: '#FDFAF9', padding: '28px', borderRadius: '12px',
            width: '90%', maxWidth: '400px', boxShadow: '0 12px 32px rgba(30, 25, 23, 0.15)',
            borderTop: '4px solid #AE2828'
          }} onClick={(e) => e.stopPropagation()}>

            <h3 style={{ margin: '0 0 12px 0', color: '#1E1917', fontSize: '1.25rem' }}>
              {specialTarget === 'competant' ? 'Competent Authority' : 'Network Admin'}
            </h3>

            <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#64748b' }}>
              Please enter the portal password to continue.
            </p>

            <form onSubmit={handleSpecialSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <input
                  type="password"
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: '8px',
                    border: '1px solid #DDD0CE', fontSize: '14px',
                    fontFamily: 'inherit', outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#AE2828'}
                  onBlur={(e) => e.target.style.borderColor = '#DDD0CE'}
                  placeholder="Enter password..."
                  value={specialPassword}
                  onChange={e => { setSpecialPassword(e.target.value); setSpecialError(''); }}
                  autoFocus
                />
                {specialError && (
                  <p style={{ color: '#ef4444', fontSize: '13px', marginTop: '6px', marginBottom: 0 }}>
                    ⚠ {specialError}
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={closeSpecialModal}
                  style={{
                    background: '#F5F0EF', border: '1px solid #DDD0CE', color: '#1E1917',
                    padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={specialLoading}
                  style={{
                    background: '#AE2828', border: 'none', color: '#FFFFFF',
                    padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold',
                    opacity: specialLoading ? 0.7 : 1
                  }}
                >
                  {specialLoading ? 'Verifying...' : 'Access Portal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default UserDashboard;