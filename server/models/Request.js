const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
    requestId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    department:{
        type: String,
        required: true
    },

    designation: {
        type: String,
        required: true,
    },

    formNumber: { type: String, required: true, unique: true },
    serialNo: { type: Number, required: true },
    requestType: { type: String, default: 'External media access' },
    requestDate: { type: Date, default: Date.now },

    status: {
        type: String,
        enum: ['pending-hod', 'pending-authority', 'pending-network', 'approved', 'rejected'],
        default: 'pending-hod'
    },

    hodRemarks: { type: String, default: '' },
    hodApprovedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    hodApprovalDate: { type: Date },

    authorityRemarks: { type: String, default: '' },
    authorityApprovedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    authorityApprovalDate: { type: Date },

    networkRemarks: { type: String, default: '' },
    networkApprovedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    networkApprovalDate: { type: Date },


}, {timestamps: true});

module.exports = mongoose.model('Request', requestSchema);