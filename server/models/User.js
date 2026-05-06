const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        trim: true
    },

    personalNumber: {
        type: String,
        required: true,
        unique: true
    },

    unit: {
        type: String,
        required: true
    },

    scale: {
        type: String,
        required: true
    },

    department: {
        type: String,
        required: true
    },

    password: {
        type: String,
        required: true,
        minlength: 4
    }

}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);