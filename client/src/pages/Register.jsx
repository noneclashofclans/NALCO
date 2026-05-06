import React, { useState } from "react";
import Navbar from "../components/Navbar";
import logo from "../assets/nalco.png";
import "./Register.css";
import axios from 'axios';
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const Register = () => {

  const BASE_URL = 'http://localhost:3000';

  const navigate = useNavigate();

  const [formData, setformData] = useState({
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
      setformData({
        ...formData,
        unit: value,
        department: ""
      });
    } else {
      setformData({
        ...formData,
        [name]: value
      });
    }

    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    let len = formData.password.length;
    let len2 = formData.confirmPassword.length;

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

    if (len < 4) {
      return setError('Password cannot be less than 4 charecters');
    }

    setLoading(true);

    try {
      await axios.post(`${BASE_URL}/api/auth/register`, formData)
      toast.success("Registration successful 🎉");

      setTimeout(() => {
        navigate("/login");
      }, 2000);

    }
    catch (err) {
      setError(
        err.response?.data?.message || 'Registration failed. Try again.'
      )
    }
    finally {
      setLoading(false);
      setformData({
        username: '',
        personalNumber: '',
        unit: '',
        department: '',
        password: '',
        confirmPassword: '',
        scale: ''
      });
    }
  }

  return (
    <div className="register-container">
      <Navbar />

      <div className="register-box">
        <div className="register-logo-section">
          <img src={logo} alt="NALCO Logo" />
        </div>

        <h2 className="register-title">Register</h2>

        <form className="register-form" onSubmit={handleSubmit}>
          <label>Employee Name</label>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            placeholder="Enter your name"
          />

          <label>Personal number</label>
          <input
            type="text"
            name="personalNumber"
            inputMode="numeric"
            value={formData.personalNumber}
            onChange={handleChange}
            placeholder="Enter personal number"
          />

          {/* Unit input dropdown */}
          <label>Unit</label>
          <select
            name="unit"
            value={formData.unit}
            onChange={handleChange}
            className="unit-dropdown"
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
            <option value="6000">6000 - UTKAL D&E CAPTIVE COAL MINES, ANGUL</option>
          </select>

          {/* Unit dropdown ends */}



          <label>Department</label>
          <select
            name="department"
            value={formData.department}
            onChange={handleChange}
            className="unit-dropdown"
            disabled={!formData.unit}
          >
            <option value="">Select Department</option>
            <option>ADMINISTRATION</option>
            <option>ASH MANAGEMENT</option>
            <option>BUSINESS DEVELOPMENT</option>
            <option>C.R.S</option>
            <option>CHEMICAL</option>
            <option>CIVIL</option>
            <option>COAL HANDLING PLANT</option>
            <option>CORPORATE PLANNING & STRATEGIC MGMT.</option>
            <option>E&I</option>
            <option>ELECTRICAL</option>
            <option>FINANCE & ACCOUNTS</option>
            <option>FINANCE-I</option>
            <option>GEOLOGY</option>
            <option>HR</option>
            <option>LABORATORY</option>
            <option>MARKETING</option>
            <option>MATERIALS</option>
            <option>MECHANICAL</option>
            <option>MEDICAL</option>
            <option>MINING</option>
          </select>

          <label>Scale</label>
          <select
            name="scale"
            value={formData.scale}
            onChange={handleChange}
            className="unit-dropdown"
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


          <label>Password</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Enter password"
          />

          <label>Confirm Password</label>
          <input
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="Confirm password"
          />

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