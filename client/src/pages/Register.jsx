import React, { useState } from "react";
import Navbar from "../components/Navbar";
import logo2 from "../assets/logo2.png";
import "./Register.css";
import axios from 'axios';
import { useNavigate } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";

/* ── Toast helpers ─────────────────────────────────────── */

const toastStyle = {
  fontFamily: "'DM Sans', sans-serif",
  fontSize: "0.875rem",
  fontWeight: 500,
  borderRadius: "10px",
  padding: "12px 16px",
  boxShadow: "0 4px 24px rgba(28,26,21,0.12), 0 1px 4px rgba(28,26,21,0.08)",
  minWidth: "280px",
  maxWidth: "380px",
};

const showSuccess = (msg) =>
  toast.success(msg, {
    duration: 3500,
    icon: "✦",
    style: {
      ...toastStyle,
      background: "#FDFCF9",
      color: "#1C1A15",
      border: "1px solid #C6D9BB",
    },
    iconTheme: { primary: "#2D7A52", secondary: "#EAF3DE" },
  });

const showError = (msg) =>
  toast.error(msg, {
    duration: 4000,
    style: {
      ...toastStyle,
      background: "#FDFCF9",
      color: "#1C1A15",
      border: "1px solid #E8A49B",
    },
    iconTheme: { primary: "#C0392B", secondary: "#FDECEA" },
  });

/* ── Component ─────────────────────────────────────────── */

const Register = () => {
  const BASE_URL = 'http://localhost:3000';
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: '',
    personalNumber: '',
    unit: '',
    department: '',
    scale: '',
    password: '',
    confirmPassword: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "unit") {
      setFormData(prev => ({ ...prev, unit: value, department: "" }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.username ||
      !formData.personalNumber ||
      !formData.unit ||
      !formData.scale ||
      !formData.department ||
      !formData.password ||
      !formData.confirmPassword
    ) {
      return setError('All fields are required');
    }

    if (formData.password !== formData.confirmPassword) {
      return setError("Passwords do not match");
    }

    if (formData.password.length < 4) {
      return setError('Password cannot be less than 4 characters');
    }

    setLoading(true);

    try {
      await axios.post(`${BASE_URL}/api/auth/register`, formData);
      showSuccess("Registration successful — welcome aboard!");
      setTimeout(() => navigate("/login"), 2500);
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed. Please try again.';
      showError(msg);
      setError(msg);
    } finally {
      setLoading(false);
      setFormData({
        username: '',
        personalNumber: '',
        unit: '',
        department: '',
        scale: '',
        password: '',
        confirmPassword: ''
      });
    }
  };

  return (
    <>
      {/* Toaster — place once, outside the form card */}
      <Toaster
        position="top-right"
        gutter={10}
        containerStyle={{ top: 20, right: 20 }}
        toastOptions={{ style: toastStyle }}
      />

      <div className="register-container">
        <Navbar />

        <div className="register-box">
          <div className="register-logo-section">
            <img src={logo2} alt="NALCO Logo" />
          </div>

          <h2 className="register-title">Create Account</h2>

          {/* Decorative divider */}
          <div className="register-divider">
            <span>Employee Registration</span>
          </div>

          <form className="register-form" onSubmit={handleSubmit}>

            <div className="form-row">
              <div className="field-group">
                <label htmlFor="username">Employee Name</label>
                <input
                  id="username"
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                />
              </div>

              <div className="field-group">
                <label htmlFor="personalNumber">Personal Number</label>
                <input
                  id="personalNumber"
                  type="text"
                  name="personalNumber"
                  inputMode="numeric"
                  value={formData.personalNumber}
                  onChange={handleChange}
                  placeholder="Enter personal number"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="field-group">
                <label htmlFor="unit">Unit</label>
                <select
                  id="unit"
                  name="unit"
                  value={formData.unit}
                  onChange={handleChange}
                >
                  <option value="">Select Unit</option>
                  <option value="1000">1000 — Corporate Office, Bhubaneswar</option>
                  <option value="1100">1100 — Mines Division, Damanjodi</option>
                  <option value="1200">1200 — Alumina Division, Damanjodi</option>
                  <option value="1300">1300 — CPP Division, Angul</option>
                  <option value="1400">1400 — Smelter Division, Angul</option>
                  <option value="1500">1500 — NALCO Port Facilities</option>
                  <option value="2000">2000 — New Delhi Marketing Office</option>
                  <option value="3000">3000 — Kolkata Marketing Office</option>
                  <option value="4000">4000 — Mumbai Marketing Office</option>
                  <option value="5000">5000 — Chennai Marketing Office</option>
                  <option value="6000">6000 — Utkal D&amp;E Captive Coal Mines, Angul</option>
                </select>
              </div>

              <div className="field-group">
                <label htmlFor="department">Department</label>
                <select
                  id="department"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                >
                  <option value="">Select Department</option>
                  <option value="ADMINISTRATION">Administration</option>
                  <option value="ASH MANAGEMENT">Ash Management</option>
                  <option value="BUSINESS DEVELOPMENT">Business Development</option>
                  <option value="C.R.S">C.R.S</option>
                  <option value="CHEMICAL">Chemical</option>
                  <option value="CIVIL">Civil</option>
                  <option value="COAL HANDLING PLANT">Coal Handling Plant</option>
                  <option value="CORPORATE PLANNING & STRATEGIC MGMT.">Corporate Planning &amp; Strategic Mgmt.</option>
                  <option value="E&I">E&amp;I</option>
                  <option value="ELECTRICAL">Electrical</option>
                  <option value="FINANCE & ACCOUNTS">Finance &amp; Accounts</option>
                  <option value="FINANCE-I">Finance-I</option>
                  <option value="GEOLOGY">Geology</option>
                  <option value="HR">HR</option>
                  <option value="LABORATORY">Laboratory</option>
                  <option value="MARKETING">Marketing</option>
                  <option value="MATERIALS">Materials</option>
                  <option value="MECHANICAL">Mechanical</option>
                  <option value="MEDICAL">Medical</option>
                  <option value="MINING">Mining</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="field-group">
                <label htmlFor="scale">Scale</label>
                <select
                  id="scale"
                  name="scale"
                  value={formData.scale}
                  onChange={handleChange}
                >
                  <option value="">Select Scale</option>
                  <option value="E1">E1 — Assistant Manager</option>
                  <option value="E2">E2 — Deputy Manager</option>
                  <option value="E3">E3 — Manager</option>
                  <option value="E4">E4 — Senior Manager</option>
                  <option value="E5">E5 — Assistant General Manager</option>
                  <option value="E6">E6 — Deputy General Manager</option>
                  <option value="E7">E7 — General Manager</option>
                  <option value="E8">E8 — Chief General Manager</option>
                  <option value="E9">E9 — Executive Director</option>
                </select>
              </div>

              {/* Empty spacer keeps grid aligned */}
              <div className="field-group" aria-hidden="true" />
            </div>

            <div className="form-row">
              <div className="field-group">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Minimum 4 characters"
                />
              </div>

              <div className="field-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Re-enter password"
                />
              </div>
            </div>

            {error && <p className="error-text">{error}</p>}

            <button type="submit" className="register-btn" disabled={loading}>
              {loading ? (
                <span className="btn-loader-wrap">
                  <span className="btn-loader"></span>
                  Creating Account...
                </span>
              ) : (
                "Register"
              )}
            </button>

          </form>

          <p className="register-footer">Official Use Only · NALCO</p>
        </div>
      </div>
    </>
  );
};

export default Register;