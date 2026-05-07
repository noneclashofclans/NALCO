import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import "./Dashboard.css";

const SNAPSHOT_KEY = "dashboard_request_snapshot";

const loadPersistedSnapshot = () => {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const savePersistedSnapshot = (requests) => {
  try {
    const slim = requests.map(r => ({ _id: r._id, status: r.status, formNumber: r.formNumber }));
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(slim));
  } catch {}
};

const NOTIFICATIONS_KEY = "dashboard_notifications";

const loadPersistedNotifications = () => {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    // Auto-expire notifications older than 7 days
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return parsed.filter(n => new Date(n.timestamp).getTime() > cutoff);
  } catch {
    return [];
  }
};

const savePersistedNotifications = (notifications) => {
  try {
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications.slice(0, 50)));
  } catch {}
};


const UserDashboard = () => {
  const navigate = useNavigate();
  const BASE_URL = 'http://localhost:3000';

  const userRef = useRef(JSON.parse(localStorage.getItem("user") || "{}"));
  const user = userRef.current;

  const [stats, setStats]                   = useState({ total: 0, pending: 0, completed: 0, rejected: 0 });
  const [recentRequests, setRecentRequests] = useState([]);
  const [activeNav, setActiveNav]           = useState("dashboard");
  const [sidebarOpen, setSidebarOpen]       = useState(false);
  const [workflowStatus, setWorkflowStatus] = useState({
    hod:       { pending: 0, approved: 0, rejected: 0 },
    authority: { pending: 0, approved: 0, rejected: 0 },
    network:   { pending: 0, approved: 0, rejected: 0 },
  });

  const [notifications, setNotifications]         = useState(() => loadPersistedNotifications());
  const [showNotifications, setShowNotifications] = useState(false);

  const prevRequestsRef  = useRef([]);
  const fetchRequestsRef = useRef(null);
  const isFirstFetchRef  = useRef(true);

  useEffect(() => {
    savePersistedNotifications(notifications);
  }, [notifications]);

  const getReadableStatus = (status) => ({
    'pending-hod':       'Pending HOD approval',
    'pending-authority': 'Pending Authority approval',
    'pending-network':   'Pending Network approval',
    'approved':          'Approved',
    'rejected':          'Rejected',
  }[status] ?? status);

  const normalizeStatus = (status) => status?.replace(/-/g, '_') || 'pending';

  const addNotification = useCallback((message, requestId) => {
    setNotifications(prev => [
      { id: Date.now() + Math.random(), message, requestId, timestamp: new Date(), read: false },
      ...prev,
    ]);
  }, []);

  const compareAndNotify = useCallback((oldReqs, newReqs) => {
    // New requests not seen before
    const oldIds = new Set(oldReqs.map(r => r._id));
    newReqs.filter(r => !oldIds.has(r._id)).forEach(req => {
      addNotification(
        `📄 New request #${req.formNumber || req._id.slice(-5)} submitted`,
        req._id
      );
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

  const fetchRequests = useCallback(async () => {
    const userId = user._id || user.id;
    if (!userId) return;

    try {
      const res = await fetch(`${BASE_URL}/api/requests/my-requests?userId=${userId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data        = await res.json();
      const newRequests = data.requests || [];

      const baseline = isFirstFetchRef.current
        ? loadPersistedSnapshot()   
        : prevRequestsRef.current;  

      isFirstFetchRef.current = false;

      if (baseline.length > 0) {
        compareAndNotify(baseline, newRequests);
      }

      prevRequestsRef.current = newRequests;
      savePersistedSnapshot(newRequests);

      setRecentRequests(newRequests);
      setStats({
        total:     newRequests.length,
        pending:   newRequests.filter(r =>
          r.status === 'pending-hod' ||
          r.status === 'pending-authority' ||
          r.status === 'pending-network'
        ).length,
        completed: newRequests.filter(r => r.status === 'approved').length,
        rejected:  newRequests.filter(r => r.status === 'rejected').length,
      });

      const wf = {
        hod:       { pending: 0, approved: 0, rejected: 0 },
        authority: { pending: 0, approved: 0, rejected: 0 },
        network:   { pending: 0, approved: 0, rejected: 0 },
      };
      newRequests.forEach(({ status }) => {
        if      (status === 'pending-hod')       { wf.hod.pending++; }
        else if (status === 'pending-authority') { wf.hod.approved++; wf.authority.pending++; }
        else if (status === 'pending-network')   { wf.hod.approved++; wf.authority.approved++; wf.network.pending++; }
        else if (status === 'approved')          { wf.hod.approved++; wf.authority.approved++; wf.network.approved++; }
        else if (status === 'rejected')          { wf.hod.rejected++; }
      });
      setWorkflowStatus(wf);

    } catch (err) {
      console.error("Dashboard fetch error:", err);
    }
  }, [compareAndNotify]);

  useEffect(() => {
    fetchRequestsRef.current = fetchRequests;
  }, [fetchRequests]);

  useEffect(() => {
    fetchRequestsRef.current();
    const id = setInterval(() => fetchRequestsRef.current(), 10_000);
    return () => clearInterval(id);
  }, []);

  // ─── Workflow step status ──────────────────────────────────────────────────
  const getStepStatus = (req, step) => {
  const { status } = req;

  if (status === 'approved') return 'approved';

  if (status === 'rejected') {
    const stage =
      req.networkRemarks?.trim()     ? 'network'
      : req.authorityRemarks?.trim() ? 'authority'
      : req.hodRemarks?.trim()       ? 'hod'
      : null;

    if (stage) {
      const order = ['hod', 'authority', 'network'];
      const si = order.indexOf(step), ri = order.indexOf(stage);
      if (si === ri) return 'rejected';
      if (si < ri)   return 'approved';
      return 'inactive';   // ← steps after rejection point are greyed out
    }
    return 'pending';
  }

  const order = ['hod', 'authority', 'network'];
  const currentStageIndex = {
    'pending-hod':       0,
    'pending-authority': 1,
    'pending-network':   2,
  }[status] ?? -1;

  const stepIndex = order.indexOf(step);
  if (stepIndex < currentStageIndex)   return 'approved';
  if (stepIndex === currentStageIndex) return 'pending';
  return 'inactive';   
};

  // ─── Sidebar workflow badges ───────────────────────────────────────────────
  const getWorkflowBadge = (key) => {
    const s = workflowStatus[key];
    if (!s) return null;
    if (s.pending > 0)                       return <span className="workflow-badge workflow-badge--pending">{s.pending}</span>;
    if (s.approved > 0 && key === 'network') return <span className="workflow-badge workflow-badge--approved">✓</span>;
    return null;
  };

  const statusClass = (s) => {
    if (s === 'approved')                                  return 'badge--green';
    if (s === 'pending-hod' || s === 'pending-authority'
        || s === 'pending-network')                        return 'badge--orange';
    if (s === 'rejected')                                  return 'badge--red';
    return 'badge--blue';
  };

  const StatusMap = ({ request }) => {
  const steps = [
    { key: 'hod',       label: 'HOD Approval' },
    { key: 'authority', label: 'Authority Approval' },
    { key: 'network',   label: 'Network Admin' },
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
                {ss === 'approved' ? 'Approved'
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

  // ─── Sidebar navigation ───────────────────────────────────────────────────
  const handleNavigation = (item) => {
    setActiveNav(item.id);
    setSidebarOpen(false);
    if (item.id === "new")           navigate("/fill-form");
    else if (item.id === "requests") document.querySelector('.db-section')?.scrollIntoView({ behavior: 'smooth' });
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

  const markAsRead  = (id) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  const unreadCount = notifications.filter(n => !n.read).length;

  const navItems = [
    { id: "dashboard", icon: "▦", label: "Dashboard" },
    { id: "requests",  icon: "↗", label: "My Requests" },
    { id: "new",       icon: "+", label: "New Request" },
    { id: "hod",       icon: "◎", label: "HOD Approval",       workflowKey: "hod" },
    { id: "authority", icon: "⊕", label: "Authority Approval", workflowKey: "authority" },
    { id: "network",   icon: "⊙", label: "Network Admin",      workflowKey: "network" },
  ];
  const navGroups = [
    { label: "Main Menu", ids: ["dashboard", "requests", "new"] },
    { label: "Workflow",  ids: ["hod", "authority", "network"] },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="dashboard-container">
      <Navbar />
      <div className="dashboard-body">
        {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
        <button className="sidebar-toggle" onClick={() => setSidebarOpen(o => !o)}>
          {sidebarOpen ? "✕" : "☰"}
        </button>

        <aside className={`sidebar ${sidebarOpen ? "sidebar--open" : ""}`}>
          <div className="sidebar-scroll">
            {navGroups.map(group => (
              <div key={group.label} className="sidebar-group">
                <div className="sidebar-group-label">{group.label}</div>
                <ul className="sidebar-menu">
                  {navItems.filter(item => group.ids.includes(item.id)).map(item => (
                    <li key={item.id} className={activeNav === item.id ? "active" : ""} onClick={() => handleNavigation(item)}>
                      <span className="nav-icon">{item.icon}</span>
                      <span className="nav-label">{item.label}</span>
                      {item.workflowKey && getWorkflowBadge(item.workflowKey)}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </aside>

        <main className="dashboard-content">
          <div className="content-max-width">
            <header className="db-header">
              <div className="db-welcome">
                <h1>Welcome, {user?.username || "User"}</h1>
                <p>Track and manage your approval requests</p>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div className="notification-wrapper">
                  <button className="bell-btn" onClick={() => setShowNotifications(v => !v)}>
                    <span className="bell-icon">🔔</span>
                    {unreadCount > 0 && <span className="bell-badge">{unreadCount}</span>}
                  </button>
                  {showNotifications && (
                    <div className="notification-dropdown">
                      <div className="notification-header">
                        <span>Notifications</span>
                        <button className="clear-btn" onClick={() => setNotifications([])}>Clear all</button>
                      </div>
                      <div className="notification-list">
                        {notifications.length === 0 ? (
                          <div className="notification-empty">No notifications</div>
                        ) : (
                          notifications.map(notif => (
                            <div
                              key={notif.id}
                              className={`notification-item ${!notif.read ? 'unread' : ''}`}
                              onClick={() => markAsRead(notif.id)}
                            >
                              <div className="notif-message">{notif.message}</div>
                              <div className="notif-time">{new Date(notif.timestamp).toLocaleTimeString()}</div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <button className="primary-btn" onClick={() => navigate("/fill-form")}>+ New Request</button>
              </div>
            </header>

            <section className="stats-grid">
              <div className="stat-card"><span>Total</span><h2>{stats.total}</h2></div>
              <div className="stat-card pending"><span>Pending</span><h2>{stats.pending}</h2></div>
              <div className="stat-card approved"><span>Approved</span><h2>{stats.completed}</h2></div>
              <div className="stat-card rejected"><span>Rejected</span><h2>{stats.rejected}</h2></div>
            </section>

            <section className="db-section">
              <div className="section-header"><h2>Recent Requests</h2></div>
              {stats.total === 0 ? (
                <div className="empty-state">
                  <p>No requests yet</p>
                  <button className="primary-btn" onClick={() => navigate("/fill-form")}>+ Submit Request</button>
                </div>
              ) : (
                <div className="requests-table-wrap">
                  <table className="requests-table">
                    <thead>
                      <tr>
                        <th>ID</th><th>Date</th><th>Department</th><th>Type</th>
                        <th>Status</th><th>HOD Remarks</th><th>Workflow Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentRequests.map(req => (
                        <tr key={req._id}>
                          <td className="req-id">#{req.formNumber || req._id.slice(-5)}</td>
                          <td>{new Date(req.requestDate).toLocaleDateString()}</td>
                          <td>{req.department}</td>
                          <td>{req.requestType}</td>
                          <td><span className={`badge ${statusClass(req.status)}`}>{normalizeStatus(req.status)}</span></td>
                          <td>{req.hodRemarks || "—"}</td>
                          <td className="workflow-status-cell"><StatusMap request={req} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
};

export default UserDashboard;