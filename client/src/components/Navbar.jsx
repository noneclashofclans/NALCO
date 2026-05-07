import "./Navbar.css";
import logo2 from "../assets/logo2.png"; 
import { useNavigate, useLocation } from "react-router-dom";
import React, { useState, useEffect, useRef } from "react";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  const token = localStorage.getItem("token");

  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("user"));
  } catch {
    user = null;
  }

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [location]);

  return (
    <div className="navbar">
      <div className="logo-section" onClick={() => navigate("/")}>
        <img src={logo2} alt="NALCO Logo" />
      </div>

      <div className="nav-buttons">
        {!token ? (
          <>
            <button className="btn" onClick={() => navigate("/login")}>
              Login
            </button>
            <button className="btn btn-primary" onClick={() => navigate("/register")}>
              Register
            </button>
          </>
        ) : (
          <div className="user-section">
            {location.pathname !== "/user-dashboard" && (
              <button className="btn dashboard-btn" onClick={() => navigate("/user-dashboard")}>
                Dashboard
              </button>
            )}

            <div className="user-dropdown" ref={dropdownRef}>
              <div className="user-box" onClick={() => setOpen((prev) => !prev)}>
                <div className="user-avatar">
                  {user?.username ? user.username.charAt(0).toUpperCase() : "U"}
                </div>
                <span className="user-name">{user?.username || "User"}</span>
                <span className={`dropdown-arrow ${open ? "rotate" : ""}`}>▼</span>
              </div>

              {open && (
                <div className="dropdown-menu">
                  <div className="dropdown-header">
                    <span className="dropdown-title">Profile Details</span>
                  </div>
                  <div className="dropdown-body">
                    <p><span>Name:</span> <strong>{user?.username || "—"}</strong></p>
                    <p><span>PN:</span> <strong>{user?.personalNumber || "—"}</strong></p>
                    <p><span>Unit:</span> <strong>{user?.unit || "—"}</strong></p>
                    <p><span>Dept:</span> <strong>{user?.department || "—"}</strong></p>
                    <p><span>Scale:</span> <strong>{user?.scale || "—"}</strong></p>
                  </div>
                  <div className="dropdown-footer">
                    <button className="btn logout-btn" onClick={handleLogout}>
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}