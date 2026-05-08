const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');
const Request  = require('../models/Request');

// ── Upload directory setup ───────────────────────────────────

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'documents');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// ── Multer — PDF only ────────────────────────────────────────

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename:    (_req, _file, cb) => cb(null, `${uuidv4()}.pdf`),
});

const fileFilter = (_req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(Object.assign(new Error('Only PDF files are allowed.'), { code: 'INVALID_TYPE' }));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },  // 2 MB, max 1 file
});

// ── Cleanup helper ───────────────────────────────────────────

const cleanupFiles = (files = []) =>
  files.forEach((f) => fs.unlink(f.path, () => {}));

// ── Multer error handler ─────────────────────────────────────

const handleMulterError = (err, _req, res, next) => {
  if (err instanceof multer.MulterError) {
    const map = {
      LIMIT_FILE_SIZE:       'PDF must be under 2 MB.',
      LIMIT_FILE_COUNT:      'You may upload at most 1 PDF.',
      LIMIT_UNEXPECTED_FILE: 'Unexpected file field.',
    };
    return res.status(400).json({ success: false, message: map[err.code] || 'File upload error.' });
  }
  if (err?.code === 'INVALID_TYPE') {
    return res.status(400).json({ success: false, message: err.message });
  }
  next(err);
};

// ── POST /submit ─────────────────────────────────────────────

router.post(
  '/submit',
  upload.array('documents', 1),
  handleMulterError,
  async (req, res) => {
    try {
      const {
        userId, department, designation, formNumber, serialNo,
        date, requestType, justification, accessFrom, accessTo,
      } = req.body;

      if (!userId || !department) {
        cleanupFiles(req.files);
        return res.status(400).json({ success: false, message: 'Missing user ID or department.' });
      }

      if (!accessFrom || !accessTo) {
        cleanupFiles(req.files);
        return res.status(400).json({ success: false, message: 'Access period (from/to dates) is required.' });
      }

      const from = new Date(accessFrom);
      const to   = new Date(accessTo);

      if (isNaN(from) || isNaN(to)) {
        cleanupFiles(req.files);
        return res.status(400).json({ success: false, message: 'Invalid date format.' });
      }

      if (to < from) {
        cleanupFiles(req.files);
        return res.status(400).json({ success: false, message: 'End date cannot be before start date.' });
      }

      const documents = (req.files || []).map((f) => ({
        originalName: f.originalname,
        storedName:   f.filename,
        mimeType:     f.mimetype,
        sizeBytes:    f.size,
      }));

      const newRequest = new Request({
        userId:        userId,
        designation,
        department,
        formNumber,
        serialNo,
        requestDate:   date,
        requestType:   requestType || 'External Media Access',
        justification: justification || '',
        accessFrom:    from,
        accessTo:      to,
        documents,
        status:        'pending-hod',
      });

      await newRequest.save();
      res.status(201).json({ success: true, message: 'Request submitted', request: newRequest });

    } catch (error) {
      cleanupFiles(req.files);
      console.error('Submission error:', error);
      if (error.code === 11000) {
        return res.status(400).json({ success: false, message: 'This Form Number already exists.' });
      }
      res.status(500).json({ success: false, message: 'Server error during submission.' });
    }
  }
);


router.get('/my-requests', async (req, res) => {
  try {
    const { userId } = req.query;

    // Step 1 — must be present and non-empty
    if (!userId || !userId.trim()) {
      return res.status(400).json({ success: false, message: 'User ID is required.' });
    }

    // Step 2 — must be a valid 24-char hex ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid User ID.' });
    }

    // Step 3 — cast explicitly before passing to find()
    const userRequests = await Request
      .find({ userId: new mongoose.Types.ObjectId(userId) })
      .sort({ requestDate: -1 });

    res.status(200).json({ success: true, requests: userRequests });

  } catch (error) {
    console.error('Fetch my-requests error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching requests.' });
  }
});

// ── GET /document/:storedName ────────────────────────────────

router.get('/document/:storedName', (req, res) => {
  const safeName = path.basename(req.params.storedName);
  const filePath = path.join(UPLOAD_DIR, safeName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: 'Document not found.' });
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.sendFile(filePath);
});

// ── GET /hod-pending ─────────────────────────────────────────

router.get('/hod-pending', async (req, res) => {
  try {
    const { department } = req.query;
    if (!department) {
      return res.status(400).json({ success: false, message: 'Department is required.' });
    }

    const pendingRequests = await Request
      .find({ department, status: 'pending-hod' })
      .populate('userId', 'username personalNumber designation');

    res.status(200).json({ success: true, requests: pendingRequests });
  } catch (error) {
    console.error('HOD Fetch Error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching HOD requests.' });
  }
});

// ── PUT /:id/hod-action ──────────────────────────────────────

router.put('/:id/hod-action', async (req, res) => {
  try {
    const { action, remarks, hodId } = req.body;
    const nextStatus = action === 'approve' ? 'pending-authority' : 'rejected';

    const updatedRequest = await Request.findByIdAndUpdate(
      req.params.id,
      { status: nextStatus, hodRemarks: remarks || '', hodApprovedBy: hodId, hodApprovalDate: Date.now() },
      { returnDocument: 'after' }
    );

    if (!updatedRequest) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    res.status(200).json({ success: true, message: `Request ${action}d`, request: updatedRequest });
  } catch (error) {
    console.error('HOD Action Error:', error);
    res.status(500).json({ success: false, message: 'Server error processing action.' });
  }
});

// ── GET /authority-pending ───────────────────────────────────

router.get('/authority-pending', async (req, res) => {
  try {
    const { department } = req.query;
    if (!department) {
      return res.status(400).json({ success: false, message: 'Department is required.' });
    }

    const pendingRequests = await Request
      .find({ department, status: 'pending-authority' })
      .populate('userId', 'username personalNumber designation');

    res.status(200).json({ success: true, requests: pendingRequests });
  } catch (error) {
    console.error('Authority Fetch Error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching Authority requests.' });
  }
});

// ── PUT /:id/authority-action ────────────────────────────────

router.put('/:id/authority-action', async (req, res) => {
  try {
    const { action, remarks, authorityId } = req.body;
    const nextStatus = action === 'approve' ? 'pending-network' : 'rejected';

    const updatedRequest = await Request.findByIdAndUpdate(
      req.params.id,
      { status: nextStatus, authorityRemarks: remarks || '', authorityApprovedBy: authorityId, authorityApprovalDate: Date.now() },
      { returnDocument: 'after' }
    );

    if (!updatedRequest) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    res.status(200).json({ success: true, message: `Request ${action}d by Authority`, request: updatedRequest });
  } catch (error) {
    console.error('Authority Action Error:', error);
    res.status(500).json({ success: false, message: 'Server error processing Authority action.' });
  }
});

// ── GET /network-pending ─────────────────────────────────────

router.get('/network-pending', async (req, res) => {
  try {
    const { department } = req.query;
    if (!department) {
      return res.status(400).json({ success: false, message: 'Department is required.' });
    }

    const pendingRequests = await Request
      .find({ department, status: 'pending-network' })
      .populate('userId', 'username personalNumber designation');

    res.status(200).json({ success: true, requests: pendingRequests });
  } catch (error) {
    console.error('Network Fetch Error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching Network requests.' });
  }
});

// ── PUT /:id/network-action ──────────────────────────────────

router.put('/:id/network-action', async (req, res) => {
  try {
    const { action, remarks, networkId } = req.body;
    const finalStatus = action === 'approve' ? 'approved' : 'rejected';

    const updatedRequest = await Request.findByIdAndUpdate(
      req.params.id,
      { status: finalStatus, networkRemarks: remarks || '', networkApprovedBy: networkId, networkApprovalDate: Date.now() },
      { returnDocument: 'after' }
    );

    if (!updatedRequest) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    res.status(200).json({ success: true, message: `Request ${action}d by Network Admin`, request: updatedRequest });
  } catch (error) {
    console.error('Network Action Error:', error);
    res.status(500).json({ success: false, message: 'Server error processing Network action.' });
  }
});

module.exports = router;