import React from 'react'
import Navbar from '../components/Navbar'
import logo from '../assets/logo4.png'
import './Landing.css'

const Landing = () => {
  return (
    <div className="landing-container">
      <Navbar />

      <div className="content">

        <img src={logo} alt="NALCO logo" className="logo-circle" />

        <h1 className="welcome-text">External Storage Media Access Portal</h1>

      </div>
    </div>
  )
}

export default Landing