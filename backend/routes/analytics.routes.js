const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');

router.get('/attendance-trend', analyticsController.getAttendanceTrend);
router.get('/status-breakdown', analyticsController.getStatusBreakdown);
router.get('/leaderboard', analyticsController.getAttendanceLeaderboard);
router.get('/overtime', analyticsController.getOvertimeSummary);

module.exports = router; 