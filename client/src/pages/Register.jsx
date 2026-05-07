import React, { useState } from "react";
import Navbar from "../components/Navbar";
import logo2 from "../assets/logo2.png";
import "./Register.css";
import axios from 'axios';
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

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
      toast.success("Registration successful 🎉");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Try again.');
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
    <div className="register-container">
      <Navbar />

      <div className="register-box">
        <div className="register-logo-section">
          <img src={logo2} alt="NALCO Logo" />
        </div>

        <h2 className="register-title">Register</h2>

        <form className="register-form" onSubmit={handleSubmit}>

          <div className="form-row">
            {/* Employee Name */}
            <div className="field-group">
              <label htmlFor="username">Employee Name</label>
              <input
                id="username"
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Enter your name"
              />
            </div>

            {/* Personal Number */}
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
            {/* Unit */}
            <div className="field-group">
              <label htmlFor="unit">Unit</label>
              <select
                id="unit"
                name="unit"
                value={formData.unit}
                onChange={handleChange}
              >
                <option value="">Select Unit</option>
                <option value="1000">1000 - CORPORATE OFFICE, BHUBANESWAR</option>
                <option value="1100">1100 - MINES DIVISION, DAMANJODI</option>
                <option value="1200">1200 - ALUMINA DIVISION, DAMANJODI</option>
                <option value="1300">1300 - CPP DIVISION, ANGUL</option>
                <option value="1400">1400 - SMELTER DIVISION, ANGUL</option>
                <option value="1500">1500 - NALCO PORT FACILITIES</option>
                <option value="2000">2000 - NEW DELHI MARKETING OFFICE</option>
                <option value="3000">3000 - KOLKATA MARKETING OFFICE</option>
                <option value="4000">4000 - MUMBAI MARKETING OFFICE</option>
                <option value="5000">5000 - CHENNAI MARKETING OFFICE</option>
                <option value="6000">6000 - UTKAL D&amp;E CAPTIVE COAL MINES, ANGUL</option>
              </select>
            </div>

            {/* Department */}
            <div className="field-group">
              <label htmlFor="department">Department</label>
              <select
                id="department"
                name="department"
                value={formData.department}
                onChange={handleChange}
              >
                <option value="">Select Department</option>
                <option value="ADMINISTRATION">ADMINISTRATION</option>
                <option value="ASH MANAGEMENT">ASH MANAGEMENT</option>
                <option value="BUSINESS DEVELOPMENT">BUSINESS DEVELOPMENT</option>
                <option value="C.R.S">C.R.S</option>
                <option value="CHEMICAL">CHEMICAL</option>
                <option value="CIVIL">CIVIL</option>
                <option value="COAL HANDLING PLANT">COAL HANDLING PLANT</option>
                <option value="CORPORATE PLANNING & STRATEGIC MGMT.">CORPORATE PLANNING &amp; STRATEGIC MGMT.</option>
                <option value="E&I">E&amp;I</option>
                <option value="ELECTRICAL">ELECTRICAL</option>
                <option value="FINANCE & ACCOUNTS">FINANCE &amp; ACCOUNTS</option>
                <option value="FINANCE-I">FINANCE-I</option>
                <option value="GEOLOGY">GEOLOGY</option>
                <option value="HR">HR</option>
                <option value="LABORATORY">LABORATORY</option>
                <option value="MARKETING">MARKETING</option>
                <option value="MATERIALS">MATERIALS</option>
                <option value="MECHANICAL">MECHANICAL</option>
                <option value="MEDICAL">MEDICAL</option>
                <option value="MINING">MINING</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            {/* Scale */}
            <div className="field-group">
              <label htmlFor="scale">Scale</label>
              <select
                id="scale"
                name="scale"
                value={formData.scale}
                onChange={handleChange}
              >
                <option value="">Select Scale</option>
                <option value="E1">E1 - Assistant Manager</option>
                <option value="E2">E2 - Deputy Manager</option>
                <option value="E3">E3 - Manager</option>
                <option value="E4">E4 - Senior Manager</option>
                <option value="E5">E5 - Assistant General Manager</option>
                <option value="E6">E6 - Deputy General Manager</option>
                <option value="E7">E7 - General Manager</option>
                <option value="E8">E8 - Chief General Manager</option>
                <option value="E9">E9 - Executive Director</option>
              </select>
            </div>

            {/* Spacer – keeps scale in the left column */}
            <div className="field-group" />
          </div>

          <div className="form-row">
            {/* Password */}
            <div className="field-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter password"
              />
            </div>

            {/* Confirm Password */}
            <div className="field-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm password"
              />
            </div>
          </div>

          {error && <p className="error-text">{error}</p>}

          <button type="submit" className="register-btn" disabled={loading}>
            {loading ? "Registering..." : "Register"}
          </button>

        </form>

        <p className="register-footer">Official Use Only</p>
      </div>
    </div>
  );
};

export default Register;