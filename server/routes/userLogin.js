const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken')
const User = require('../models/User.js');

router.post('/register', async(req, res) => {

    try{

        const {username, personalNumber, unit, department, scale, password, confirmPassword} = req.body;

        if (!username || !personalNumber || 
            !unit || !department || !password || !confirmPassword || !scale){
            return res.status(400).json({message: 'Please fill all the fields'});
        }

        if (password !== confirmPassword){
            return res.status(400).json({message: 'confirm password does not match'});
        }

        let len = password.length;
        if (len < 4) 
            return res.status(400).json({message: 'password length must be at least 4 charecters'})


        const normalizedPN = personalNumber?.trim().toLowerCase();

        const existing_user = await User.findOne({personalNumber: normalizedPN});

        if (existing_user) return res.status(400).json({message: 'User is already present. Kindly login.'});

        const salt = await bcrypt.genSalt(10);

        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = await User.create({
            username,
            personalNumber: normalizedPN,
            unit,
            department,
            scale,
            password: hashedPassword
        });

        res.status(201).json({
            message: 'User registration successfull',
            user:{
                _id: newUser._id,
                username: newUser.username,
                personalNumber: newUser.personalNumber,
                unit: newUser.unit,
                department: newUser.department,
                scale: newUser.scale
            }
        })
    }
    catch(err){
        console.log(err.message);
        res.status(500).json({message: 'Error during registration'});
    }
})

router.post('/login', async(req, res) => {
    try{
        const {personalNumber, password} = req.body;
        const normalizedPN = personalNumber?.trim().toLowerCase();

        const user = await User.findOne({personalNumber: normalizedPN});

        if (!user) return res.status(401).json({message: 'Invalid personal number or password'});

        const matched = await bcrypt.compare(password, user.password);

        if (!matched) 
           return res.status(401).json({message: 'Entered password is invalid'});

        const payload = {
            _id: user._id
        }


        const token = jwt.sign(payload, process.env.JWT_SECRET_KEY, {expiresIn: '10d'});

        res.status(200).json({
            message: 'Logged in successfuly',
            token,
            user:{
                _id: user._id,
                username: user.username,
                personalNumber: user.personalNumber,
                unit: user.unit,
                department: user.department,
                scale: user.scale
            }
        });

    }
    catch(err){
        console.log(err.message);
        res.status(500).json({message: 'Error during login'});
    }
})


module.exports = router; 