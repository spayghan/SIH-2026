const express = require('express');
const router = express.Router();
const User = require('../models/User');

// POST /auth/inspector-login
router.post('/inspector-login', async (req, res) => {
  try {
    const inspectorId = req.body.inspector_id || req.body.inspectorId;
    const password = req.body.password;

    if (!inspectorId || !password) {
      return res.status(400).json({ success: false, detail: 'Inspector ID and Password required.' });
    }

    const user = await User.findOne({
      userId: inspectorId,
      password: password,
      role: 'Inspector'
    });

    if (!user) {
      return res.status(401).json({ success: false, detail: 'Invalid Inspector ID or Password' });
    }

    return res.json({
      success: true,
      message: 'Inspector login successful',
      role: 'Inspector',
      user: {
        inspector_id: user.userId,
        name: user.name,
        department: user.department,
        district: user.district,
        assigned_region: user.assignedRegion,
        designation: user.designation
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, detail: error.message });
  }
});

// POST /auth/admin-login
router.post('/admin-login', async (req, res) => {
  try {
    const adminId = req.body.admin_id || req.body.adminId;
    const password = req.body.password;

    if (!adminId || !password) {
      return res.status(400).json({ success: false, detail: 'Administrator ID and Password required.' });
    }

    const user = await User.findOne({
      userId: adminId,
      password: password,
      role: 'Administrator'
    });

    if (!user) {
      return res.status(401).json({ success: false, detail: 'Invalid Administrator ID or Password' });
    }

    return res.json({
      success: true,
      message: 'Administrator login successful',
      role: 'Administrator',
      user: {
        admin_id: user.userId,
        name: user.name,
        department: user.department,
        role: user.role,
        level: user.level
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, detail: error.message });
  }
});

module.exports = router;
