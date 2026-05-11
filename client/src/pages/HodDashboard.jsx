import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import "./Dashboard.css";
import toast, { Toaster } from 'react-hot-toast';

const HOD_HISTORY_KEY = "hod_action_history";
const MAX_HISTORY = 10;

const HodDashboard = () => {
  const BASE_URL = 'http://localhost:3000';
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const [activeNav, setActiveNav] = useState("team-approvals");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [teamRequests, setTeamRequests] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [remarks, setRemarks] = useState("");
  const [filterHistory, setFilterHistory] = useState("all");
  const [historySeen, setHistorySeen] = useState(false);
  const [actionHistory, setActionHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(HOD_HISTORY_KEY) || "[]");
    } catch {
      return [];
    }
  });

  const saveHistoryEntry = (req, actionType, hodRemarks) => {
    const entry = {
      id: req._id,
      formNumber: req.formNumber || req._id.slice(-5),
      employeeName: req.userId?.username || "Unknown",
      employeeNumber: req.userId?.personalNumber || "",
      requestType: req.requestType,
      action: actionType,
      remarks: hodRemarks || "",
      timestamp: new Date().toISOString(),
    };
    setHistorySeen(false);
    setActionHistory(prev => {
      const updated = [entry, ...prev].slice(0, MAX_HISTORY);
      localStorage.setItem(HOD_HISTORY_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const fetchTeamRequests = async () => {
    try {
      if (!user.department) return;
      const res = await fetch(`${BASE_URL}/api/requests/hod-pending?department=${user.department}`);
      if (!res.ok) throw new Error(`Server Error ${res.status}`);
      const data = await res.json();
      if (data.success) setTeamRequests(data.requests);
    } catch (err) {
      console.error("Failed to fetch team requests:", err);
    }
  };

  const fetchMyRequests = async () => {
    try {
      const userId = user._id || user.id;
      if (!userId) return;
      const res = await fetch(`${BASE_URL}/api/requests/my-requests?userId=${userId}`);
      if (!res.ok) throw new Error(`Server Error ${res.status}`);
      const data = await res.json();
      if (data.success) setMyRequests(data.requests || []);
    } catch (err) {
      console.error("Failed to fetch personal requests:", err);
    }
  };

  useEffect(() => {
    fetchTeamRequests();
    fetchMyRequests();
  }, []);

  const handleAction = async (actionType) => {
    if (!selectedRequest) return;

    if (actionType === 'reject' && !remarks.trim()) {
      toast.error("Remarks are mandatory when rejecting a request.");
      return;
    }

    try {
      const res = await fetch(`${BASE_URL}/api/requests/${selectedRequest._id}/hod-action`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: actionType,
          remarks: remarks.trim(),
          hodId: user._id || user.id
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Request ${actionType}d successfully!`);
        saveHistoryEntry(selectedRequest, actionType, remarks.trim());
        setSelectedRequest(null);
        setRemarks("");
        fetchTeamRequests();
        fetchMyRequests();
      } else {
        toast.error(data.message || "Action failed");
      }
    } catch (err) {
      console.error("Action error", err);
      toast.error("Action failed");
    }
  };

  const formatTimestamp = (iso) => {
    const d = new Date(iso);
    return {
      date: d.toLocaleDateString(),
      time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
  };

  const navItems = [
    { id: "team-approvals", icon: "◎", label: "Team Approvals" },
    { id: "my-requests", icon: "↗", label: "My History" },
    { id: "action-history", icon: "🕐", label: "Action History" },
    { id: "new", icon: "+", label: "New Personal Request" }
  ];

  return (
    <div className="dashboard-container">
      <Navbar />
      <Toaster position="top-center" />
      <div className="dashboard-body">
        {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
        <button className="sidebar-toggle" onClick={() => setSidebarOpen((o) => !o)}>
          {sidebarOpen ? "✕" : "☰"}
        </button>

        <aside className={`sidebar ${sidebarOpen ? "sidebar--open" : ""}`}>
          <div className="sidebar-scroll">
            <div className="sidebar-group">
              <div className="sidebar-group-label">HOD Actions</div>
              <ul className="sidebar-menu">
                {navItems.map((item) => (
                  <li
                    key={item.id}
                    className={activeNav === item.id ? "active" : ""}
                    onClick={() => {
                      if (item.id === "new") navigate("/fill-form");
                      else {
                        setActiveNav(item.id);
                        setSidebarOpen(false);
                        if (item.id === "action-history") setHistorySeen(true);
                      }
                    }}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    <span className="nav-label">
                      {item.label}
                      {item.id === "team-approvals" && teamRequests.length > 0 && (
                        <span style={{ marginLeft: 'auto', background: '#ef4444', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '11px' }}>
                          {teamRequests.length}
                        </span>
                      )}
                      {item.id === "action-history" && actionHistory.length > 0 && !historySeen && (
                        <span style={{ marginLeft: 'auto', background: '#6366f1', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '11px' }}>
                          {actionHistory.length}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </aside>

        <main className="dashboard-content">
          <div className="content-max-width">
            <header className="db-header">
              <div className="db-welcome">
                <h1>HOD Dashboard</h1>
                <p>Manage department requests and your own applications.</p>
              </div>
            </header>

            {/* ── Team Approvals ── */}
            {activeNav === "team-approvals" && (
              <section className="db-section">
                <div className="section-header"><h2>Pending Department Approvals</h2></div>
                {teamRequests.length === 0 ? (
                  <div className="empty-state"><p>No pending requests in your department.</p></div>
                ) : (
                  <div className="requests-table-wrap">
                    <table className="requests-table">
                      <thead>
                        <tr>
                          <th>Req ID</th>
                          <th>Employee</th>
                          <th>Type</th>
                          <th>Justification</th>
                          <th>Date</th>
                          <th>Documents</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teamRequests.map((req) => (
                          <tr key={req._id}>
                            <td className="req-id">#{req.formNumber || req._id.slice(-5)}</td>
                            <td>
                              <strong>{req.userId?.username || "Unknown"}</strong><br />
                              <span style={{ fontSize: '12px', color: '#64748b' }}>{req.userId?.personalNumber}</span>
                            </td>
                            <td>{req.requestType}</td>
                            <td className="justification-cell" title={req.justification || ""}>
                              {req.justification
                                ? (req.justification.length > 25 ? req.justification.slice(0, 25) + '...' : req.justification)
                                : "—"}
                            </td>
                            <td>{new Date(req.requestDate).toLocaleDateString()}</td>
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
                              ) : "—"}
                            </td>
                            <td>
                              <button
                                className="primary-btn"
                                style={{ padding: '6px 12px', fontSize: '12px' }}
                                onClick={() => setSelectedRequest(req)}
                              >
                                Review
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}

            {/* ── My Requests ── */}
            {activeNav === "my-requests" && (
              <section className="db-section">
                <div className="section-header"><h2>My Personal Requests</h2></div>
                {myRequests.length === 0 ? (
                  <div className="empty-state"><p>You have no personal request history.</p></div>
                ) : (
                  <div className="requests-table-wrap">
                    <table className="requests-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Type</th>
                          <th>Documents</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {myRequests.map((req) => (
                          <tr key={req._id}>
                            <td className="req-id">#{req.formNumber}</td>
                            <td>{req.requestType}</td>
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
                              ) : "—"}
                            </td>
                            <td><span className="badge badge--blue">{req.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}

            {/* ── Action History ── */}
            {activeNav === "action-history" && (
              <section className="db-section">
                <div className="section-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h2>Action History</h2>
                  {actionHistory.length > 0 && (
                    <button
                      className="ff-btn ff-btn--secondary"
                      style={{ fontSize: '12px', padding: '4px 12px' }}
                      onClick={() => {
                        if (window.confirm("Clear all action history?")) {
                          setActionHistory([]);
                          setFilterHistory("all");
                          localStorage.removeItem(HOD_HISTORY_KEY);
                        }
                      }}
                    >
                      Clear history
                    </button>
                  )}
                </div>

                {/* Filter buttons — only show if there's history */}
                {actionHistory.length > 0 && (
                  <div className="top-action-buttons" style={{ marginBottom: '16px' }}>
                    <button
                      className={`small-btn filter-btn ${filterHistory === "all" ? "active-filter" : ""}`}
                      onClick={() => setFilterHistory("all")}
                    >
                      All
                    </button>
                    <button
                      className={`accepted ${filterHistory === "approved" ? "active-filter" : ""}`}
                      onClick={() => setFilterHistory("approved")}
                    >
                      Accepted
                    </button>
                    <button
                      className={`rejectedBtn ${filterHistory === "rejected" ? "active-filter" : ""}`}
                      onClick={() => setFilterHistory("rejected")}
                    >
                      Rejected
                    </button>
                  </div>
                )}

                {(() => {
                  const filtered = actionHistory.filter(entry => {
                    if (filterHistory === "all") return true;
                    if (filterHistory === "approved") return entry.action === "approve";
                    if (filterHistory === "rejected") return entry.action === "reject";
                    return true;
                  });

                  return filtered.length === 0 ? (
                    <div className="empty-state">
                      <p>
                        {actionHistory.length === 0
                          ? "No actions taken yet. Approved or rejected requests will appear here."
                          : `No ${filterHistory} actions found.`}
                      </p>
                    </div>
                  ) : (
                    <div className="requests-table-wrap">
                      <table className="requests-table">
                        <thead>
                          <tr>
                            <th>Req ID</th>
                            <th>Employee</th>
                            <th>Type</th>
                            <th>Action</th>
                            <th>Remarks</th>
                            <th>Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map((entry, idx) => {
                            const { date, time } = formatTimestamp(entry.timestamp);
                            return (
                              <tr key={idx}>
                                <td className="req-id">#{entry.formNumber}</td>
                                <td>
                                  <strong>{entry.employeeName}</strong>
                                  {entry.employeeNumber && (
                                    <><br /><span style={{ fontSize: '12px', color: '#64748b' }}>{entry.employeeNumber}</span></>
                                  )}
                                </td>
                                <td>{entry.requestType}</td>
                                <td>
                                  <span style={{
                                    display: 'inline-block',
                                    padding: '2px 10px',
                                    borderRadius: '12px',
                                    fontSize: '11px',
                                    fontWeight: '500',
                                    background: entry.action === 'approve' ? '#d1fae5' : '#fee2e2',
                                    color: entry.action === 'approve' ? '#065f46' : '#991b1b',
                                  }}>
                                    {entry.action === 'approve' ? 'Approved' : 'Rejected'}
                                  </span>
                                </td>
                                <td style={{ fontSize: '12px', color: '#64748b', fontStyle: entry.remarks ? 'normal' : 'italic' }}>
                                  {entry.remarks || "—"}
                                </td>
                                <td style={{ fontSize: '12px' }}>
                                  {date}<br />
                                  <span style={{ color: '#64748b' }}>{time}</span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </section>
            )}

          </div>
        </main>
      </div>

      {/* ── Review Modal ── */}
      {selectedRequest && (
        <div className="hod-modal-overlay">
          <div className="hod-modal">
            <h3>Review Request</h3>
            <p><strong>Employee:</strong> {selectedRequest.userId?.username || "Unknown"}</p>
            <p><strong>Type:</strong> {selectedRequest.requestType}</p>

            <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#64748b' }}><strong>Justification:</strong></p>
              <p style={{ margin: 0, fontSize: '14px', color: '#0f172a', whiteSpace: 'pre-wrap' }}>
                {selectedRequest.justification || "No justification provided."}
              </p>
            </div>

            <div style={{ marginTop: '16px', marginBottom: '12px' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '13px' }}><strong>Attached Documents:</strong></p>
              {selectedRequest.documents && selectedRequest.documents.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  {selectedRequest.documents.map((doc, idx) => (
                    <a
                      key={idx}
                      href={`${BASE_URL}/api/requests/document/${doc.storedName}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={doc.originalName}
                      style={{ fontSize: '13px', color: '#3b82f6', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      📄 {doc.originalName}
                    </a>
                  ))}
                </div>
              ) : (
                <span style={{ fontSize: '13px', color: '#64748b' }}>No documents attached.</span>
              )}
            </div>

            <div style={{ marginTop: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', fontWeight: '600' }}>
                HOD Remarks (Optional)
              </label>
              <textarea
                rows="3"
                className="ff-input"
                style={{ width: '100%', resize: 'none' }}
                placeholder="Add any comments here..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '24px', justifyContent: 'flex-end' }}>
              <button className="ff-btn ff-btn--secondary" onClick={() => setSelectedRequest(null)}>Cancel</button>
              <button className="ff-btn" style={{ background: '#ef4444', color: 'white' }} onClick={() => handleAction('reject')}>Reject</button>
              <button className="ff-btn" style={{ background: '#10b981', color: 'white' }} onClick={() => handleAction('approve')}>Approve</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HodDashboard;