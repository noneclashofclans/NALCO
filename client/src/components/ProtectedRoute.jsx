import React from 'react';
import { Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const ProtectedRoute = ({ children, routeType }) => {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const specialRole = localStorage.getItem('specialRole');

  // ── RULE 1: Competent Authority Access ──
  // Blocks manual URL entry if they haven't entered the password
  if (routeType === 'competant') {
    if (specialRole === 'competant') return children;
    
    toast.error("Unauthorized: Competent Authority access required.");
    return user ? <Navigate to="/user-dashboard" replace /> : <Navigate to="/login" replace />;
  }

  // ── RULE 2: Network Admin Access ──
  // Blocks manual URL entry if they haven't entered the password
  if (routeType === 'network') {
    if (specialRole === 'network') return children;
    
    toast.error("Unauthorized: Network Admin access required.");
    return user ? <Navigate to="/user-dashboard" replace /> : <Navigate to="/login" replace />;
  }

  // ── RULE 3: Basic Employee Login ──
  // For the Dashboard, Form, and HOD pages, they MUST be logged in.
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // ── RULE 4: HOD Scale Check ──
  // Blocks manual URL entry to /hod if their scale is less than E6
  if (routeType === 'hod') {
    const scaleLevel = parseInt(user.scale?.replace('E', ''), 10);
    if (!scaleLevel || scaleLevel < 6) {
      toast.error("Access Denied: Requires Scale E6 or higher.");
      return <Navigate to="/user-dashboard" replace />;
    }
  }

  // ── RULE 5: Standard Access ──
  return children;
};

export default ProtectedRoute;