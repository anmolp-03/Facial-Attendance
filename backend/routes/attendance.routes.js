const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendance.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Placeholder: Mark attendance
router.post('/mark', attendanceController.markAttendance);

module.exports = router; 