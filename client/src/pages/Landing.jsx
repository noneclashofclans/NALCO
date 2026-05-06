import React from 'react'
import Navbar from '../components/Navbar'
import logo from '../assets/nalco.png'
import './Landing.css'

const Landing = () => {
  return (
    <div className="landing-container">
      <Navbar />

      <div className="content">

        <img src={logo} alt="NALCO logo" className="logo-circle" />

        <h1 className="welcome-text">Welcome to NALCO <em>Hardware Control Portal</em></h1>

        <p className="beta-text">Beta Version</p>
      </div>
    </div>
  )
}

export default Landing