const express = require('express');
const router = express.Router();
const Request = require('../models/Request');

router.post('/submit', async (req, res) => {
  try {
    const { userId, department, designation, formNumber, serialNo, date, requestType } = req.body;

    if (!userId || !department) {
      return res.status(400).json({ success: false, message: 'Missing user ID or department' });
    }

    const newRequest = new Request({
      requestId: userId,        
      designation: designation, 
      department: department,
      formNumber: formNumber,
      serialNo: serialNo,
      requestDate: date,
      requestType: requestType || 'External Media Access',
      status: 'pending-hod' 
    });

    await newRequest.save();
    res.status(201).json({ success: true, message: 'Request submitted', request: newRequest });

  } catch (error) {
    console.error('Submission error:', error);
    if (error.code === 11000) {
       return res.status(400).json({ success: false, message: 'This Form Number already exists.' });
    }
    res.status(500).json({ success: false, message: 'Server error during submission' });
  }
});

router.get('/my-requests', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    const userRequests = await Request.find({ requestId: userId }).sort({ requestDate: -1 });
    res.status(200).json({ success: true, requests: userRequests });

  } catch (error) {
    console.error('Fetch my-requests error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching requests' });
  }
});

router.get('/hod-pending', async (req, res) => {
  try {
    const { department } = req.query;
    if (!department) {
      return res.status(400).json({ success: false, message: 'Department is required' });
    }

    const pendingRequests = await Request.find({ 
      department: department, 
      status: 'pending-hod' 
    }).populate('requestId', 'username personalNumber designation'); 

    res.status(200).json({ success: true, requests: pendingRequests });

  } catch (error) {
    console.error('HOD Fetch Error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching HOD requests' });
  }
});

router.put('/:id/hod-action', async (req, res) => {
  try {
    const requestId = req.params.id;
    const { action, remarks, hodId } = req.body; 

    const nextStatus = action === 'approve' ? 'pending-authority' : 'rejected';

    const updatedRequest = await Request.findByIdAndUpdate(
      requestId,
      {
        status: nextStatus,
        hodRemarks: remarks || '',
        hodApprovedBy: hodId,
        hodApprovalDate: Date.now()
      },
      { returnDocument: 'after' } 
    );

    if (!updatedRequest) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    res.status(200).json({ success: true, message: `Request ${action}d`, request: updatedRequest });

  } catch (error) {
    console.error('HOD Action Error:', error);
    res.status(500).json({ success: false, message: 'Server error processing action' });
  }
});

router.get('/authority-pending', async (req, res) => {
  try {
    const { department } = req.query;
    if (!department) {
      return res.status(400).json({ success: false, message: 'Department is required' });
    }

    const pendingRequests = await Request.find({
      department: department,
      status: 'pending-authority'
    }).populate('requestId', 'username personalNumber designation');

    res.status(200).json({ success: true, requests: pendingRequests });
  } catch (error) {
    console.error('Authority Fetch Error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching Authority requests' });
  }
});

router.put('/:id/authority-action', async (req, res) => {
  try {
    const requestId = req.params.id;
    const { action, remarks, authorityId } = req.body;

    let nextStatus;
    if (action === 'approve') {
      nextStatus = 'pending-network';
    } else {
      nextStatus = 'rejected';
    }

    const updatedRequest = await Request.findByIdAndUpdate(
      requestId,
      {
        status: nextStatus,
        authorityRemarks: remarks || '',
        authorityApprovedBy: authorityId,
        authorityApprovalDate: Date.now()
      },
      { returnDocument: 'after' }
    );

    if (!updatedRequest) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    res.status(200).json({ success: true, message: `Request ${action}d by Authority`, request: updatedRequest });
  } catch (error) {
    console.error('Authority Action Error:', error);
    res.status(500).json({ success: false, message: 'Server error processing Authority action' });
  }
});

router.get('/network-pending', async (req, res) => {
  try {
    const { department } = req.query;
    if (!department) {
      return res.status(400).json({ success: false, message: 'Department is required' });
    }

    const pendingRequests = await Request.find({
      department: department,
      status: 'pending-network'
    }).populate('requestId', 'username personalNumber designation');

    res.status(200).json({ success: true, requests: pendingRequests });
  } catch (error) {
    console.error('Network Fetch Error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching Network requests' });
  }
});

router.put('/:id/network-action', async (req, res) => {
  try {
    const requestId = req.params.id;
    const { action, remarks, networkId } = req.body;

    let finalStatus;
    if (action === 'approve') {
      finalStatus = 'approved';
    } else {
      finalStatus = 'rejected';
    }

    const updatedRequest = await Request.findByIdAndUpdate(
      requestId,
      {
        status: finalStatus,
        networkRemarks: remarks || '',
        networkApprovedBy: networkId,
        networkApprovalDate: Date.now()
      },
      { returnDocument: 'after' }
    );

    if (!updatedRequest) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    res.status(200).json({ success: true, message: `Request ${action}d by Network Admin`, request: updatedRequest });
  } catch (error) {
    console.error('Network Action Error:', error);
    res.status(500).json({ success: false, message: 'Server error processing Network action' });
  }
});





module.exports = router;