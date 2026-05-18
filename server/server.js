require('dotenv').config();
const PORT = process.env.PORT || 5000;
const express = require('express');
const app = express();
const mongoose = require('mongoose');
const cors = require('cors');

app.use(cors());


app.use(express.json());
app.use(express.urlencoded({extended: true}));

const authRoutes = require('./routes/userLogin');
const userRoutes = require('./routes/requestRoutes');
app.use('/api/auth', authRoutes);
app.use('/api/requests', userRoutes);


app.get('/', (req, res) => {
    res.send('Welcome to NALCO backend');
})

mongoose.set('strictQuery', true);

mongoose.connect(process.env.MONGO_URI)
    .then(()=>{
        console.log('MongoDB connected');
        app.listen(PORT, (err) => {
            console.log(`Backend started at ${PORT}`);
        });
    })
    .catch(err => console.log("MongoDB Connection Error:", err));