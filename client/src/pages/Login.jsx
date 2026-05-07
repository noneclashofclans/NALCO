import React, { useState } from "react";
import Navbar from "../components/Navbar";
import logo2 from "../assets/logo2.png";
import "./Login.css";
import toast from "react-hot-toast";
import axios from 'axios';
import { useNavigate } from "react-router-dom";

const Login = () => {
    const BASE_URL = 'http://localhost:3000';

    const navigate = useNavigate();

    const [formData, setformData] = useState({
        personalNumber: '',
        password: ''
    })

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleChange = (e) => {
        setformData({ ...formData, [e.target.name]: e.target.value })
        setError('')
    }

    const handleSubmit = async(e) => {
        e.preventDefault();
        if (!formData.personalNumber || !formData.password){
            return setError('Please fill all the fields');
        }

        setLoading(true);
        setError('');

        try{
           const res = await axios.post(`${BASE_URL}/api/auth/login`, formData);

           const {token, user} = res.data;

            localStorage.setItem('token', token)
            localStorage.setItem('user', JSON.stringify(user))    

            toast.success("Login successful 🎉");

            setTimeout(() => {
                navigate('/user-dashboard');
            }, 1000);
        }
        catch(err){
            setError(
                err.response?.data?.message || 'Invalid credentials. Try again.'
            )
        }
        finally{
            setLoading(false);
            setformData({
                personalNumber: '',
                password: ''
            });
        }
    }

    return (
        <div className="login-container">
        <Navbar />

        <div className="login-box">
            <div className="login-logo-section">
                <img src={logo2} alt="NALCO Logo" />
            </div>

            <h2 className="login-title">Login</h2>

            <form className="login-form" onSubmit={handleSubmit}>
            <label>Personal number</label>
            <input
                type="text"
                name="personalNumber"
                value={formData.personalNumber}
                onChange={handleChange}
                placeholder="Enter personal number"
            />

            <label>Password</label>
            <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter password"
            />

            {error && <p className="error-text">{error}</p>}

            <button type="submit" className="login-btn" disabled={loading}>
                {loading ? "Logging in..." : "Login"}
            </button>
            </form>

            <p className="login-footer">Authorized Personnel Only</p>
        </div>
        </div>
    );
};

export default Login;