import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import "./Form.css";

const generateFormNumber = () => {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `REQ-${ts}-${rand}`;
};

const todayISO = () => new Date().toISOString().split("T")[0];

const Form = () => {
  const BASE_URL = 'http://localhost:3000';
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const [formNumber] = useState(generateFormNumber);
  const [serialNo] = useState(1); 
  const [date, setDate] = useState(todayISO());
  
  const [designation, setDesignation] = useState(user?.designation || "");
  
  const [agreed, setAgreed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [shake, setShake] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!agreed) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    try {
      const payload = {
        userId: user._id || user.id, 
        department: user.department,
        designation: designation, 
        formNumber: formNumber,
        serialNo: serialNo,
        date: date,
        requestType: "External Media Access" 
      };

      const response = await fetch(`${BASE_URL}/api/requests/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload)
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
          <button className="ff-btn ff-btn--primary" onClick={() => navigate("/user-dashboard")}>
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
            <div className="ff-form-footer">
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
                {/* 3. CHANGED: Made this a controlled input using value and onChange */}
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

            {/* Declaration */}
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
                className={`ff-btn ff-btn--primary ${!agreed ? "ff-btn--disabled" : ""}`}
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