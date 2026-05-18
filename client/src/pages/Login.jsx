import React, { useState } from "react";
import Navbar from "../components/Navbar";
import "./Login.css";
import toast, { Toaster } from "react-hot-toast";
import axios from 'axios';
import { useNavigate } from "react-router-dom";

/* ── Toast helpers ─────────────────────────────────────────── */

const toastStyle = {
  fontFamily: "'DM Sans', sans-serif",
  fontSize: "0.875rem",
  fontWeight: 500,
  borderRadius: "10px",
  padding: "12px 16px",
  boxShadow: "0 4px 24px rgba(28,26,21,0.12), 0 1px 4px rgba(28,26,21,0.08)",
  minWidth: "260px",
  maxWidth: "360px",
};

const showSuccess = (msg) =>
  toast.success(msg, {
    duration: 2500,
    icon: "✦",
    style: { ...toastStyle, background: "#FDFCF9", color: "#1C1A15", border: "1px solid #C6D9BB" },
    iconTheme: { primary: "#2D7A52", secondary: "#EAF3DE" },
  });

const showError = (msg) =>
  toast.error(msg, {
    duration: 4000,
    style: { ...toastStyle, background: "#FDFCF9", color: "#1C1A15", border: "1px solid #E8A49B" },
    iconTheme: { primary: "#C0392B", secondary: "#FDECEA" },
  });

/* ── Component ─────────────────────────────────────────────── */

const Login = () => {
  const BASE_URL = 'https://nalco.onrender.com';
  const navigate = useNavigate();

  // Regular employee login
  const [formData, setFormData] = useState({ personalNumber: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.personalNumber || !formData.password)
      return setError('Please fill all the fields');

    setLoading(true);
    setError('');

    try {
      const res = await axios.post(`${BASE_URL}/api/auth/login`, formData);
      const { token, user } = res.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      showSuccess("Welcome back — login successful!");
      setTimeout(() => navigate('/user-dashboard'), 1500);
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid credentials. Please try again.';
      showError(msg);
      setError(msg);
    } finally {
      setLoading(false);
      setFormData({ personalNumber: '', password: '' });
    }
  };

  /* ── Render ── */

  return (
    <>
      <div className="login-container">
        <Navbar />

        {/* ── Employee Login Card ── */}
        <div className="login-box">
          <h2 className="login-title">Welcome Back</h2>

          <div className="login-divider">
            <span>Employee Sign-In</span>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="field-group">
              <label htmlFor="personalNumber">Personal Number</label>
              <input
                id="personalNumber"
                type="text"
                name="personalNumber"
                value={formData.personalNumber}
                onChange={handleChange}
                placeholder="Enter personal number"
                inputMode="numeric"
                autoComplete="username"
              />
            </div>

            <div className="field-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter password"
                autoComplete="current-password"
              />
            </div>

            {error && <p className="error-text">{error}</p>}

            <button type="submit" className="register-btn" disabled={loading}>
              {loading ? (
                <span className="btn-loader-wrap">
                  <span className="btn-loader"></span>
                  Submitting details...
                </span>
              ) : "Login"}
            </button>
          </form>

          <p className="login-footer">Authorized Personnel Only · NALCO</p>
        </div>
      </div>
    </>
  );
};

export default Login;