import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import "./Dashboard.css";

const UserDashboard = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const BASE_URL = 'http://localhost:3000';

  const [stats, setStats] = useState({ total: 0, pending: 0, completed: 0, rejected: 0 });
  const [recentRequests, setRecentRequests] = useState([]);
  const [activeNav, setActiveNav] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [workflowStatus, setWorkflowStatus] = useState({
    hod: { pending: 0, approved: 0, rejected: 0 },
    authority: { pending: 0, approved: 0, rejected: 0 },
    network: { pending: 0, approved: 0, rejected: 0 }
  });

  const normalizeStatus = (status) => status?.replace(/-/g, '_') || 'pending';

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const userId = user._id || user.id;
        if (!userId) return;

        const res = await fetch(`${BASE_URL}/api/requests/my-requests?userId=${userId}`);
        if (!res.ok) throw new Error("Failed to fetch requests");

        const data = await res.json();
        const requests = data.requests || [];
        setRecentRequests(requests);

        setStats({
          total: requests.length,
          pending: requests.filter(r => r.status === 'pending-hod' || r.status === 'pending-authority').length,
          completed: requests.filter(r => r.status === 'approved').length,
          rejected: requests.filter(r => r.status === 'rejected').length,
        });

        const workflowCounts = {
          hod: { pending: 0, approved: 0, rejected: 0 },
          authority: { pending: 0, approved: 0, rejected: 0 },
          network: { pending: 0, approved: 0, rejected: 0 }
        };

        requests.forEach(req => {
          const status = req.status;
          if (status === 'pending-hod') {
            workflowCounts.hod.pending++;
          } else if (status === 'pending-authority') {
            workflowCounts.hod.approved++;
            workflowCounts.authority.pending++;
          } else if (status === 'approved') {
            workflowCounts.hod.approved++;
            workflowCounts.authority.approved++;
            workflowCounts.network.approved++;
          }
        });
        setWorkflowStatus(workflowCounts);
      } catch (err) {
        console.error("Dashboard error:", err);
      }
    };
    fetchRequests();
  }, [user._id, user.id]);

  const getStepStatus = (req, step) => {
    const status = req.status;
    if (status === 'approved') return 'approved';

    if (status === 'rejected') {
      let rejectedStage = null;
      if (req.hodRemarks && req.hodRemarks.trim() !== '') rejectedStage = 'hod';
      else if (req.authorityRemarks && req.authorityRemarks.trim() !== '') rejectedStage = 'authority';
      else if (req.networkRemarks && req.networkRemarks.trim() !== '') rejectedStage = 'network';

      if (rejectedStage) {
        const stepsOrder = ['hod', 'authority', 'network'];
        const stepIndex = stepsOrder.indexOf(step);
        const rejectedIndex = stepsOrder.indexOf(rejectedStage);

        if (stepIndex === rejectedIndex) return 'rejected';
        if (stepIndex < rejectedIndex) return 'approved';
        return 'pending';
      }
    }

    if (step === 'hod') {
      if (status === 'pending-hod') return 'pending';
      if (status === 'pending-authority' || status === 'approved') return 'approved';
      return 'pending';
    }
    if (step === 'authority') {
      if (status === 'pending-authority') return 'pending';
      if (status === 'pending-hod') return 'pending';
      if (status === 'approved') return 'approved';
      return 'pending';
    }
    if (step === 'network') {
      if (status === 'approved') return 'approved';
      return 'pending';
    }
    return 'pending';
  };

  const getWorkflowBadge = (workflowKey) => {
    const status = workflowStatus[workflowKey];
    if (!status) return null;
    if (status.pending > 0) {
      return <span className="workflow-badge workflow-badge--pending">{status.pending}</span>;
    }
    if (status.approved > 0 && workflowKey === 'network') {
      return <span className="workflow-badge workflow-badge--approved">✓</span>;
    }
    return null;
  };

  const statusClass = (s) => {
    if (s === 'approved') return 'badge--green';
    if (s === 'pending-hod' || s === 'pending-authority') return 'badge--orange';
    if (s === 'rejected') return 'badge--red';
    return 'badge--blue';
  };

  const StatusMap = ({ request }) => {
    const steps = [
      { key: 'hod', label: 'HOD Approval' },
      { key: 'authority', label: 'Authority Approval' },
      { key: 'network', label: 'Network Admin' },
    ];
    return (
      <div className="status-map">
        {steps.map((step, idx) => {
          const stepStatus = getStepStatus(request, step.key);
          return (
            <React.Fragment key={step.key}>
              <div className={`status-step status-step--${stepStatus}`}>
                <div className="status-step-icon">
                  {stepStatus === 'approved' && '✓'}
                  {stepStatus === 'rejected' && '✕'}
                  {stepStatus === 'pending' && '○'}
                </div>
                <div className="status-step-label">{step.label}</div>
                <div className="status-step-status">
                  {stepStatus === 'approved' ? 'Approved' : stepStatus === 'rejected' ? 'Rejected' : 'Pending'}
                </div>
              </div>
              {idx < steps.length - 1 && (
                <div className={`status-connector ${stepStatus === 'approved' ? 'status-connector--active' : ''}`} />
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
    else if (item.id === "requests") {
      document.querySelector('.db-section')?.scrollIntoView({ behavior: 'smooth' });
    } else if (item.id === "hod") {
      const count = recentRequests.filter(r => r.status === 'pending-hod').length;
      alert(count ? `${count} request(s) pending HOD approval` : "No pending HOD approvals");
    } else if (item.id === "authority") {
      const count = recentRequests.filter(r => r.status === 'pending-authority').length;
      alert(count ? `${count} request(s) pending Authority approval` : "No pending Authority approvals");
    } else if (item.id === "network") {
      alert("Network approval will be available after Authority approves.");
    }
  };

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
    { label: "Workflow", ids: ["hod", "authority", "network"] },
  ];

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
                {group.label && <div className="sidebar-group-label">{group.label}</div>}
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
              <button className="primary-btn" onClick={() => navigate("/fill-form")}>+ New Request</button>
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
                        <th>ID</th>
                        <th>Date</th>
                        <th>Department</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>HOD Remarks</th>
                        <th>Workflow Status</th>
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