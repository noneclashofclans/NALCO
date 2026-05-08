import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import UserDashboard from './pages/UserDashboard'
import Form from './pages/Form'
import HodDashboard from './pages/HodDashboard'
import Competant from './pages/Competant'
import Network from './pages/Network'
import { Toaster } from 'react-hot-toast'
import ProtectedRoute from './components/ProtectedRoute';

const App = () => {
  return (
    <div>
      <Toaster position="top-center" />
      
      <Routes>
        {/* ── PUBLIC ROUTES ── */}
        <Route path='/' element={<Landing />} />
        <Route path='/login' element={<Login />} />
        <Route path='/register' element={<Register />} />

        {/* ── STANDARD USER ROUTES ── */}
        <Route 
          path='/user-dashboard' 
          element={
            <ProtectedRoute routeType="user">
              <UserDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path='/fill-form' 
          element={
            <ProtectedRoute routeType="user">
              <Form />
            </ProtectedRoute>
          } 
        />

        {/* ── HOD ROUTE ── */}
        <Route 
          path='/hod' 
          element={
            <ProtectedRoute routeType="hod">
              <HodDashboard />
            </ProtectedRoute>
          } 
        />

        {/* ── SPECIAL ADMIN ROUTES (PASSWORD PROTECTED) ── */}
        <Route 
          path='/competant' 
          element={
            <ProtectedRoute routeType="competant">
              <Competant />
            </ProtectedRoute>
          } 
        />
        <Route 
          path='/network' 
          element={
            <ProtectedRoute routeType="network">
              <Network />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </div>
  )
}

export default App;