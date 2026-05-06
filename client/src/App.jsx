import React from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import UserDashboard from './pages/UserDashboard'
import Form from './pages/Form'
import HodDashboard from './pages/HodDashboard'
import Competant from './pages/Competant'
import Network from './pages/Network'
import { Toaster } from 'react-hot-toast'

const App = () => {
  return (
    <div>
      <Toaster position="top-center" />
      <Routes>
        <Route path='/' element={<Landing></Landing>}></Route>
        <Route path='/login' element={<Login></Login>}></Route>
        <Route path='/register' element={<Register></Register>}></Route>
        <Route path='/user-dashboard' element={<UserDashboard></UserDashboard>}></Route>
        <Route path='/fill-form' element={<Form></Form>}></Route>
        <Route path='/hod' element={<HodDashboard></HodDashboard>}></Route>
        <Route path='/competant' element={<Competant></Competant>}></Route>
        <Route path='/network' element={<Network></Network>}></Route>
      </Routes>
    </div>
  )
}

export default App
