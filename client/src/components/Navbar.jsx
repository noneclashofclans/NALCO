import "./Navbar.css";
import logo2 from "../assets/logo2.png";
import { useNavigate, useLocation } from "react-router-dom";
import React, { useState, useEffect, useRef } from "react";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const [open, setOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const dropdownRef = useRef(null);
  const mobileMenuRef = useRef(null);

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

  // Close dropdown / mobile menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(e.target) &&
        !e.target.closest(".mobile-menu-btn")
      ) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close on route change
  useEffect(() => {
    setOpen(false);
    setMobileMenuOpen(false);
  }, [location]);

  const initials = user?.username
    ? user.username.charAt(0).toUpperCase()
    : "U";

  return (
    <nav className="navbar">
      {/* ── Top Container ── */}
      <div className="navbar-container">

        {/* LOGO */}
        <div className="logo-section" onClick={() => navigate("/")}>
          <img src={logo2} alt="NALCO" />
        </div>

        {/* DESKTOP NAV */}
        <div className="desktop-nav">
          {!token ? (
            /* Logged out — Login + Register */
            <div className="nav-buttons">
              <button
                className="btn btn-outline"
                onClick={() => navigate("/login")}
              >
                Login
              </button>
              <button
                className="btn btn-primary"
                onClick={() => navigate("/register")}
              >
                Register
              </button>
            </div>
          ) : (
            /* Logged in — Dashboard + User dropdown */
            <div className="user-section">
              {location.pathname !== "/user-dashboard" && (
                <button
                  className="btn dashboard-btn"
                  onClick={() => navigate("/user-dashboard")}
                >
                  Dashboard
                </button>
              )}

              {/* Dropdown wrapper */}
              <div className="user-dropdown" ref={dropdownRef}>
                {/* Trigger */}
                <div
                  className="user-box"
                  onClick={() => setOpen((prev) => !prev)}
                  aria-expanded={open}
                  aria-haspopup="true"
                  role="button"
                >
                  <div className="user-avatar">{initials}</div>
                  <span className="user-name">
                    {user?.username || "User"}
                  </span>
                  <span className={`dropdown-arrow ${open ? "rotate" : ""}`}>
                    ▼
                  </span>
                </div>

                {/* Dropdown panel */}
                {open && (
                  <div className="dropdown-menu" role="menu">
                    <div className="dropdown-header">
                      <span className="dropdown-title">Profile Details</span>
                    </div>

                    <div className="dropdown-body">
                      <p>
                        <span>Name</span>
                        <strong>{user?.username || "—"}</strong>
                      </p>
                      <p>
                        <span>PN</span>
                        <strong>{user?.personalNumber || "—"}</strong>
                      </p>
                      <p>
                        <span>Unit</span>
                        <strong>{user?.unit || "—"}</strong>
                      </p>
                      <p>
                        <span>Dept</span>
                        <strong>{user?.department || "—"}</strong>
                      </p>
                      <p>
                        <span>Scale</span>
                        <strong>{user?.scale || "—"}</strong>
                      </p>
                    </div>

                    <div className="dropdown-footer">
                      <button
                        className="btn logout-btn"
                        onClick={handleLogout}
                      >
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* MOBILE HAMBURGER */}
        <button
          className="mobile-menu-btn"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileMenuOpen}
        >
          <span className={`hamburger ${mobileMenuOpen ? "open" : ""}`}>
            <span></span>
            <span></span>
            <span></span>
          </span>
        </button>
      </div>

      {/* ── MOBILE NAV PANEL ── */}
      <div
        ref={mobileMenuRef}
        className={`mobile-nav ${mobileMenuOpen ? "open" : ""}`}
        aria-hidden={!mobileMenuOpen}
      >
        {!token ? (
          /* Logged out */
          <>
            <button
              className="btn btn-outline"
              onClick={() => navigate("/login")}
            >
              Login
            </button>
            <button
              className="btn btn-primary"
              onClick={() => navigate("/register")}
            >
              Register
            </button>
          </>
        ) : (
          /* Logged in */
          <>
            {location.pathname !== "/user-dashboard" && (
              <button
                className="btn dashboard-btn"
                onClick={() => navigate("/user-dashboard")}
              >
                Dashboard
              </button>
            )}

            <div className="mobile-user-info">
              <div className="user-avatar">{initials}</div>
              <span className="user-name">{user?.username || "User"}</span>
              <button className="btn logout-btn" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </>
        )}
      </div>
    </nav>
  );
}