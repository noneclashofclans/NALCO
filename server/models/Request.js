const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  originalName: { type: String, required: true },   
  storedName:   { type: String, required: true },   
  mimeType:     { type: String, required: true },
  sizeBytes:    { type: Number, required: true },
  uploadedAt:   { type: Date,   default: Date.now },
}, { _id: true });

const requestSchema = new mongoose.Schema({
  userId: {                                         
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  department:  { type: String, required: true },
  designation: { type: String, required: true },

  formNumber:  { type: String, required: true, unique: true },
  serialNo:    { type: Number, required: true },
  requestType: { type: String, default: 'External Media Access' },
  requestDate: { type: Date,   default: Date.now },

  justification: { type: String, default: '' },
  accessFrom:    { type: Date },
  accessTo:      { type: Date },

  documents: {
    type:    [documentSchema],
    default: [],
  },

  status: {
    type: String,
    enum: ['pending-hod', 'pending-authority', 'pending-network', 'approved', 'rejected'],
    default: 'pending-hod',
  },

  hodRemarks:        { type: String, default: '' },
  hodApprovedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  hodApprovalDate:   { type: Date },

  authorityRemarks:      { type: String, default: '' },
  authorityApprovedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  authorityApprovalDate: { type: Date },

  networkRemarks:      { type: String, default: '' },
  networkApprovedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  networkApprovalDate: { type: Date },

}, { timestamps: true });

module.exports = mongoose.model('Request', requestSchema);