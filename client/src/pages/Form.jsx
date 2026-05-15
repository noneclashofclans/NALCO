import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import "./Form.css";
import { sendHodNotificationEmail } from "../utils/emailService";

const generateFormNumber = () => {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `REQ-${ts}-${rand}`;
};

const todayISO = () => new Date().toISOString().split("T")[0];

const ALLOWED_TYPES = ["application/pdf"];
const MAX_FILE_SIZE_MB = 5;
const MAX_FILES = 5;

const Form = () => {
  const BASE_URL = "http://localhost:3000";
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const fileInputRef = useRef(null);
  const hodDropdownRef = useRef(null);

  const [formNumber] = useState(generateFormNumber);
  const [serialNo] = useState(1);
  const [date, setDate] = useState(todayISO());

  const [designation, setDesignation] = useState(user?.designation || "");
  const [justification, setJustification] = useState("");
  const [accessFrom, setAccessFrom] = useState("");
  const [accessTo, setAccessTo] = useState("");

  const [hods, setHods] = useState([]);
  const [hodsLoading, setHodsLoading] = useState(true);
  const [hodsError, setHodsError] = useState("");
  const [selectedHod, setSelectedHod] = useState(null);
  const [hodSearch, setHodSearch] = useState("");
  const [hodDropdownOpen, setHodDropdownOpen] = useState(false);

  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [fileErrors, setFileErrors] = useState([]);

  const [agreed, setAgreed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [shake, setShake] = useState(false);

  const dateRangeError =
    accessFrom && accessTo && accessTo < accessFrom
      ? "End date cannot be before start date."
      : null;

  useEffect(() => {
    const fetchHods = async () => {
      setHodsLoading(true);
      setHodsError("");
      try {
        const dept = encodeURIComponent(user?.department || "");
        const token = localStorage.getItem("token");
        const res = await fetch(`${BASE_URL}/api/requests/hods?department=${dept}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to load HODs");
        const data = await res.json();
        setHods(data.hods || []);
      } catch (err) {
        setHodsError("Could not load HODs. Please refresh and try again.");
      } finally {
        setHodsLoading(false);
      }
    };
    fetchHods();
  }, [user?.department]);

  useEffect(() => {
    const handleClick = (e) => {
      if (hodDropdownRef.current && !hodDropdownRef.current.contains(e.target)) {
        setHodDropdownOpen(false);
      }
    };
    const handleKeydown = (e) => {
      if (e.key === "Escape") setHodDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKeydown);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeydown);
    };
  }, []);

  const filteredHods = hods.filter((h) => {
    const q = hodSearch.toLowerCase();
    return (
      h.username.toLowerCase().includes(q) ||
      h.scale?.toLowerCase().includes(q)
    );
  });

  const selectHod = (hod) => {
    setSelectedHod(hod);
    setHodSearch("");
    setHodDropdownOpen(false);
  };

  const clearHod = () => {
    setSelectedHod(null);
    setHodSearch("");
  };

  const validateFiles = (files) => {
    const errors = [];
    const valid = [];
    Array.from(files).forEach((file) => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        errors.push(`"${file.name}" — unsupported file type.`);
        return;
      }
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        errors.push(`"${file.name}" — exceeds ${MAX_FILE_SIZE_MB} MB limit.`);
        return;
      }
      valid.push(file);
    });
    return { valid, errors };
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const { valid, errors } = validateFiles(e.dataTransfer.files);
    setUploadedFiles((prev) => [...prev, ...valid].slice(0, MAX_FILES));
    setFileErrors(errors);
  };

  const handleFileSelect = (e) => {
    const { valid, errors } = validateFiles(e.target.files);
    setUploadedFiles((prev) => [...prev, ...valid].slice(0, MAX_FILES));
    setFileErrors(errors);
    e.target.value = "";
  };

  const removeFile = (index) =>
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));

  const formatBytes = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!agreed) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }
    if (dateRangeError) return;
    if (!selectedHod) {
      alert("Please select a Head of Department before submitting.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("userId", user._id || user.id);
      formData.append("hodId", selectedHod._id);
      formData.append("department", user.department);
      formData.append("designation", designation);
      formData.append("formNumber", formNumber);
      formData.append("serialNo", serialNo);
      formData.append("date", date);
      formData.append("requestType", "External Media Access");
      formData.append("justification", justification);
      formData.append("accessFrom", accessFrom);
      formData.append("accessTo", accessTo);
      uploadedFiles.forEach((file) => formData.append("documents", file));

      const response = await fetch(`${BASE_URL}/api/requests/submit`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        try {
          if (selectedHod?.email) {
            await sendHodNotificationEmail({
              hodEmail:       selectedHod.email,
              hodName:        selectedHod.username,
              employeeName:   user?.username       || "",
              employeeNumber: user?.personalNumber || "",
              department:     user?.department     || "",
              requestType:    "External Media Access",
              justification:  justification,
              formNumber:     formNumber,
              submittedDate:  new Date().toLocaleString(),
            });
          }
        } catch (emailErr) {
          console.error("HOD email notification failed:", emailErr);
        }

        setSubmitted(true);
      } else {
        alert(`Failed to submit: ${data.message}`);
      }
    } catch (error) {
      console.error("Submission error:", error);
      alert("Error connecting to the server. Please try again later.");
    }
  };

  if (submitted) {
    return (
      <div className="ff-container">
        <Navbar />
        <div className="ff-success">
          <div className="ff-success-icon">✅</div>
          <h2>Request Submitted</h2>
          <p>Your external media access request has been recorded successfully.</p>
          <div className="ff-ref-box">
            <span>Reference No:</span>
            <strong>{formNumber}</strong>
          </div>
          {selectedHod && (
            <div className="ff-ref-box">
              <span>Sent to HOD:</span>
              <strong>{selectedHod.username} ({selectedHod.scale})</strong>
            </div>
          )}
          <button
            className="ff-btn ff-btn--primary"
            onClick={() => navigate("/user-dashboard")}
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ff-container">
      <Navbar />

      <main className="ff-content">
        <div className="ff-page">

          <div className="ff-page-header">
            <h1 className="ff-page-title">External Media Access Request</h1>
            <div className="ff-meta-bar">
              <div className="ff-meta-item">
                <span className="ff-meta-label">Form No.</span>
                <span className="ff-meta-value ff-mono">{formNumber}</span>
              </div>
              <div className="ff-meta-item">
                <span className="ff-meta-label">Serial No.</span>
                <span className="ff-meta-value ff-mono">{String(serialNo).padStart(4, "0")}</span>
              </div>
              <div className="ff-meta-item">
                <span className="ff-meta-label">Unit No.</span>
                <span className="ff-meta-value">{user?.unit || "—"}</span>
              </div>
              <div className="ff-meta-item">
                <span className="ff-meta-label">Date</span>
                <input
                  type="date"
                  className="ff-date-input"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          <form className="ff-form" onSubmit={handleSubmit}>

            <div className="ff-section">
              <h3 className="ff-section-title">Employee Details</h3>
              <div className="ff-fields-grid">
                <div className="ff-field">
                  <label className="ff-label">Employee Name</label>
                  <input className="ff-input ff-input--readonly" value={user?.username || "—"} readOnly tabIndex={-1} />
                </div>
                <div className="ff-field">
                  <label className="ff-label">Personal Number (PN)</label>
                  <input className="ff-input ff-input--readonly" value={user?.personalNumber || "—"} readOnly tabIndex={-1} />
                </div>
                <div className="ff-field">
                  <label className="ff-label">Designation</label>
                  <input
                    className="ff-input"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder="Enter your designation"
                  />
                </div>
                <div className="ff-field">
                  <label className="ff-label">Department</label>
                  <input className="ff-input ff-input--readonly" value={user?.department || "—"} readOnly tabIndex={-1} />
                </div>
                <div className="ff-field ff-field--full">
                  <label className="ff-label">Scale / Grade</label>
                  <input className="ff-input ff-input--readonly" value={user?.scale || "—"} readOnly tabIndex={-1} />
                </div>
              </div>
            </div>

            <div className="ff-section">
              <h3 className="ff-section-title">Approval Authority</h3>
              <p className="ff-section-desc">
                Select the HOD for your department (<strong>{user?.department || "—"}</strong>) who will review this request first.
                Only employees at scale E6 and above are listed.
              </p>

              {hodsLoading ? (
                <div className="ff-hod-loading">
                  <span className="ff-hod-spinner" />
                  Loading HODs for your department…
                </div>
              ) : hodsError ? (
                <p className="ff-field-error">⚠ {hodsError}</p>
              ) : hods.length === 0 ? (
                <div className="ff-hod-empty">
                  No eligible HOD found for department <strong>{user?.department}</strong>.
                </div>
              ) : (
                <div className="ff-field" ref={hodDropdownRef}>
                  <label className="ff-label">
                    Select HOD <span className="ff-required">*</span>
                  </label>

                  <div
                    className={!selectedHod ? `ff-hod-trigger ${hodDropdownOpen ? "ff-hod-trigger--open" : ""}` : ""}
                    onClick={() => { if (!selectedHod) setHodDropdownOpen((v) => !v); }}
                    role={!selectedHod ? "button" : undefined}
                    tabIndex={!selectedHod ? 0 : undefined}
                    onKeyDown={(e) => e.key === "Enter" && !selectedHod && setHodDropdownOpen((v) => !v)}
                  >
                    {selectedHod ? (
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        width: '100%', background: '#FDF0F0', border: '1.5px solid #E8A49B',
                        padding: '12px 16px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(174, 40, 40, 0.05)'
                      }}>
                        <div className="ff-hod-selected-info" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <div className="ff-hod-avatar" style={{
                            background: '#AE2828', color: 'white', width: '40px', height: '40px',
                            borderRadius: '50%', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', fontWeight: 'bold', fontSize: '18px'
                          }}>
                            {selectedHod.username.charAt(0).toUpperCase()}
                          </div>
                          <div className="ff-hod-selected-text" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span className="ff-hod-name" style={{ fontWeight: '700', color: '#1E1917', fontSize: '15px' }}>
                              {selectedHod.username}
                              <span style={{ fontSize: '12px', background: '#FFFFFF', padding: '2px 6px', borderRadius: '4px', border: '1px solid #E8A49B', color: '#AE2828', marginLeft: '6px' }}>
                                {selectedHod.scale}
                              </span>
                            </span>
                            <span className="ff-hod-meta" style={{ fontSize: '13px', color: '#9A7070' }}>
                              {selectedHod.department} Department
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="ff-hod-clear"
                          style={{
                            background: 'transparent', border: 'none', color: '#AE2828',
                            cursor: 'pointer', fontSize: '20px', padding: '4px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'transform 0.15s ease'
                          }}
                          onMouseEnter={(e) => e.target.style.transform = 'scale(1.2)'}
                          onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                          onClick={(e) => { e.stopPropagation(); clearHod(); }}
                          aria-label="Clear selection"
                          title="Remove selected HOD"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="ff-hod-select-box">
                        <span className="ff-hod-placeholder">Select a HOD…</span>
                        <span className="ff-hod-arrow">{hodDropdownOpen ? "▲" : "▼"}</span>
                      </div>
                    )}
                  </div>

                  {hodDropdownOpen && !selectedHod && (
                    <div className="ff-hod-dropdown" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div className="ff-hod-search-wrap" style={{ padding: '8px 8px 0' }}>
                        <span className="ff-hod-search-icon">🔍</span>
                        <input
                          className="ff-hod-search"
                          type="text"
                          placeholder="Search by name or scale..."
                          value={hodSearch}
                          onChange={(e) => setHodSearch(e.target.value)}
                          autoFocus
                        />
                        {hodSearch && (
                          <button
                            type="button"
                            className="ff-hod-search-clear"
                            onClick={() => setHodSearch("")}
                            title="Clear Search"
                          >✕</button>
                        )}
                      </div>

                      <ul className="ff-hod-list">
                        {filteredHods.length === 0 ? (
                          <li className="ff-hod-no-results" style={{ textAlign: 'center', padding: '24px 12px' }}>
                            <p style={{ margin: '0 0 4px', fontWeight: '600', color: '#1E1917' }}>No HODs found</p>
                            <span style={{ fontSize: '12px', color: '#9A7070' }}>Could not find any matches for "{hodSearch}"</span>
                          </li>
                        ) : (
                          filteredHods.map((hod) => (
                            <li key={hod._id} className="ff-hod-option" onClick={() => selectHod(hod)}>
                              <div className="ff-hod-avatar ff-hod-avatar--sm">
                                {hod.username.charAt(0).toUpperCase()}
                              </div>
                              <div className="ff-hod-option-text">
                                <span className="ff-hod-name">{hod.username}</span>
                                <span className="ff-hod-meta">{hod.department} • Unit: {hod.unit || "N/A"}</span>
                                <span>{hod.scale} • {hod.designation}</span>
                              </div>
                              <span className="ff-hod-scale-badge">{hod.scale}</span>
                            </li>
                          ))
                        )}
                      </ul>

                      <div className="ff-hod-footer" style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '10px 14px', borderTop: '1px solid #EDE0DE', background: '#FDFAF9',
                        fontSize: '12px', color: '#9A7070', borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px'
                      }}>
                        <span><strong>{filteredHods.length}</strong> available</span>
                        <span style={{ cursor: 'pointer', fontWeight: '600', color: '#AE2828' }} onClick={() => setHodDropdownOpen(false)}>Close</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="ff-section">
              <h3 className="ff-section-title">Access Period</h3>
              <div className="ff-fields-grid">
                <div className="ff-field">
                  <label className="ff-label">From Date <span className="ff-required">*</span></label>
                  <input
                    type="date"
                    className="ff-input"
                    value={accessFrom}
                    onChange={(e) => setAccessFrom(e.target.value)}
                    required
                  />
                </div>
                <div className="ff-field">
                  <label className="ff-label">To Date <span className="ff-required">*</span></label>
                  <input
                    type="date"
                    className={`ff-input ${dateRangeError ? "ff-input--error" : ""}`}
                    value={accessTo}
                    min={accessFrom || undefined}
                    onChange={(e) => setAccessTo(e.target.value)}
                    required
                  />
                  {dateRangeError && <p className="ff-field-error">⚠ {dateRangeError}</p>}
                </div>
              </div>
            </div>

            <div className="ff-section">
              <h3 className="ff-section-title">Justification</h3>
              <div className="ff-field">
                <label className="ff-label">
                  Reason for External Media Access <span className="ff-required">*</span>
                </label>
                <textarea
                  className="ff-textarea"
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="Describe why you require external media access, what data will be transferred, and any relevant project or task details…"
                  rows={4}
                  maxLength={500}
                  required
                />
                <span className="ff-char-count">{justification.length} / 500</span>
              </div>
            </div>

            <div className="ff-section">
              <h3 className="ff-section-title">Supporting Documents</h3>
              <p className="ff-section-desc">
                Attach any relevant approvals, project briefs, or authorisation letters.
                Accepted: PDF only · Max {MAX_FILE_SIZE_MB} MB per file · Up to {MAX_FILES} files.
              </p>

              <div
                className={`ff-dropzone ${dragActive ? "ff-dropzone--active" : ""} ${uploadedFiles.length >= MAX_FILES ? "ff-dropzone--full" : ""}`}
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleFileDrop}
                onClick={() => uploadedFiles.length < MAX_FILES && fileInputRef.current?.click()}
              >
                <input ref={fileInputRef} type="file" multiple accept=".pdf" className="ff-file-input" onChange={handleFileSelect} />
                <div className="ff-dropzone-icon">{dragActive ? "📂" : "📁"}</div>
                <p className="ff-dropzone-primary">
                  {uploadedFiles.length >= MAX_FILES ? "Maximum files reached" : dragActive ? "Release to upload" : "Drag & drop files here"}
                </p>
                {uploadedFiles.length < MAX_FILES && (
                  <p className="ff-dropzone-secondary">or <span className="ff-dropzone-link">browse files</span></p>
                )}
              </div>

              {fileErrors.length > 0 && (
                <div className="ff-file-errors">
                  {fileErrors.map((err, i) => <p key={i} className="ff-field-error">⚠ {err}</p>)}
                </div>
              )}

              {uploadedFiles.length > 0 && (
                <ul className="ff-file-list">
                  {uploadedFiles.map((file, i) => (
                    <li key={i} className="ff-file-item">
                      <span className="ff-file-icon">📄</span>
                      <div className="ff-file-info">
                        <span className="ff-file-name">{file.name}</span>
                        <span className="ff-file-size">{formatBytes(file.size)}</span>
                      </div>
                      <button type="button" className="ff-file-remove" onClick={() => removeFile(i)} aria-label="Remove file">✕</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className={`ff-declaration ${shake ? "ff-shake" : ""}`}>
              <label className="ff-checkbox-label">
                <input type="checkbox" className="ff-checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
                <span className="ff-checkbox-custom" />
                <span className="ff-checkbox-text">
                  I hereby abide by and follow all norms for external media access/usage provided to me.
                  I understand that any misuse may lead to disciplinary action as per company policy.
                </span>
              </label>
              {!agreed && shake && (
                <p className="ff-checkbox-error">⚠ You must accept the declaration before proceeding.</p>
              )}
            </div>

            <div className="ff-actions">
              <button type="button" className="ff-btn ff-btn--secondary" onClick={() => navigate("/user-dashboard")}>
                Cancel
              </button>
              <button
                type="submit"
                className={`ff-btn ff-btn--primary ${(!agreed || dateRangeError || !selectedHod) ? "ff-btn--disabled" : ""}`}
              >
                Submit Request
              </button>
            </div>

          </form>
        </div>
      </main>
    </div>
  );
};

export default Form;