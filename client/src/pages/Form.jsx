import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import "./Form.css";

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

  const [formNumber] = useState(generateFormNumber);
  const [serialNo] = useState(1);
  const [date, setDate] = useState(todayISO());

  const [designation, setDesignation] = useState(user?.designation || "");
  const [justification, setJustification] = useState("");
  const [accessFrom, setAccessFrom] = useState("");
  const [accessTo, setAccessTo] = useState("");

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
    const combined = [...uploadedFiles, ...valid].slice(0, MAX_FILES);
    setUploadedFiles(combined);
    setFileErrors(errors);
  };

  const handleFileSelect = (e) => {
    const { valid, errors } = validateFiles(e.target.files);
    const combined = [...uploadedFiles, ...valid].slice(0, MAX_FILES);
    setUploadedFiles(combined);
    setFileErrors(errors);
    e.target.value = "";
  };

  const removeFile = (index) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const formatBytes = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (_file) => "📄";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!agreed) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }
    if (dateRangeError) return;

    try {
      const formData = new FormData();
      formData.append("userId", user._id || user.id);
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

          {/* ── Page Header ─────────────────────────────────────────── */}
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

            {/* ── Employee Details ───────────────────────────────────── */}
            <div className="ff-section">
              <h3 className="ff-section-title">Employee Details</h3>
              <div className="ff-fields-grid">
                <div className="ff-field">
                  <label className="ff-label">Employee Name</label>
                  <input
                    className="ff-input ff-input--readonly"
                    value={user?.username || "—"}
                    readOnly
                    tabIndex={-1}
                  />
                </div>

                <div className="ff-field">
                  <label className="ff-label">Personal Number (PN)</label>
                  <input
                    className="ff-input ff-input--readonly"
                    value={user?.personalNumber || "—"}
                    readOnly
                    tabIndex={-1}
                  />
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
                  <input
                    className="ff-input ff-input--readonly"
                    value={user?.department || "—"}
                    readOnly
                    tabIndex={-1}
                  />
                </div>

                <div className="ff-field ff-field--full">
                  <label className="ff-label">Scale / Grade</label>
                  <input
                    className="ff-input ff-input--readonly"
                    value={user?.scale || "—"}
                    readOnly
                    tabIndex={-1}
                  />
                </div>
              </div>
            </div>

            {/* ── Access Period ──────────────────────────────────────── */}
            <div className="ff-section">
              <h3 className="ff-section-title">Access Period</h3>
              <div className="ff-fields-grid">
                <div className="ff-field">
                  <label className="ff-label">
                    From Date <span className="ff-required">*</span>
                  </label>
                  <input
                    type="date"
                    className="ff-input"
                    value={accessFrom}
                    onChange={(e) => setAccessFrom(e.target.value)}
                    required
                  />
                </div>

                <div className="ff-field">
                  <label className="ff-label">
                    To Date <span className="ff-required">*</span>
                  </label>
                  <input
                    type="date"
                    className={`ff-input ${dateRangeError ? "ff-input--error" : ""}`}
                    value={accessTo}
                    min={accessFrom || undefined}
                    onChange={(e) => setAccessTo(e.target.value)}
                    required
                  />
                  {dateRangeError && (
                    <p className="ff-field-error">⚠ {dateRangeError}</p>
                  )}
                </div>
              </div>
            </div>

            {/* ── Justification ──────────────────────────────────────── */}
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

            {/* ── Document Upload ────────────────────────────────────── */}
            <div className="ff-section">
              <h3 className="ff-section-title">Supporting Documents</h3>
              <p className="ff-section-desc">
                Attach any relevant approvals, project briefs, or authorisation letters.
                Accepted: PDF only · Max {MAX_FILE_SIZE_MB} MB per file · Up to {MAX_FILES} files.
              </p>

              {/* Drop Zone */}
              <div
                className={`ff-dropzone ${dragActive ? "ff-dropzone--active" : ""} ${
                  uploadedFiles.length >= MAX_FILES ? "ff-dropzone--full" : ""
                }`}
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleFileDrop}
                onClick={() => uploadedFiles.length < MAX_FILES && fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf"
                  className="ff-file-input"
                  onChange={handleFileSelect}
                />
                <div className="ff-dropzone-icon">
                  {dragActive ? "📂" : "📁"}
                </div>
                <p className="ff-dropzone-primary">
                  {uploadedFiles.length >= MAX_FILES
                    ? "Maximum files reached"
                    : dragActive
                    ? "Release to upload"
                    : "Drag & drop files here"}
                </p>
                {uploadedFiles.length < MAX_FILES && (
                  <p className="ff-dropzone-secondary">
                    or <span className="ff-dropzone-link">browse files</span>
                  </p>
                )}
              </div>

              {/* File Errors */}
              {fileErrors.length > 0 && (
                <div className="ff-file-errors">
                  {fileErrors.map((err, i) => (
                    <p key={i} className="ff-field-error">⚠ {err}</p>
                  ))}
                </div>
              )}

              {/* File List */}
              {uploadedFiles.length > 0 && (
                <ul className="ff-file-list">
                  {uploadedFiles.map((file, i) => (
                    <li key={i} className="ff-file-item">
                      <span className="ff-file-icon">{getFileIcon(file)}</span>
                      <div className="ff-file-info">
                        <span className="ff-file-name">{file.name}</span>
                        <span className="ff-file-size">{formatBytes(file.size)}</span>
                      </div>
                      <button
                        type="button"
                        className="ff-file-remove"
                        onClick={() => removeFile(i)}
                        aria-label="Remove file"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* ── Declaration ────────────────────────────────────────── */}
            <div className={`ff-declaration ${shake ? "ff-shake" : ""}`}>
              <label className="ff-checkbox-label">
                <input
                  type="checkbox"
                  className="ff-checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                />
                <span className="ff-checkbox-custom" />
                <span className="ff-checkbox-text">
                  I hereby abide by and follow all norms for external media access/usage provided to me.
                  I understand that any misuse may lead to disciplinary action as per company policy.
                </span>
              </label>
              {!agreed && shake && (
                <p className="ff-checkbox-error">
                  ⚠ You must accept the declaration before proceeding.
                </p>
              )}
            </div>

            <div className="ff-actions">
              <button
                type="button"
                className="ff-btn ff-btn--secondary"
                onClick={() => navigate("/user-dashboard")}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`ff-btn ff-btn--primary ${
                  !agreed || dateRangeError ? "ff-btn--disabled" : ""
                }`}
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