const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');

router.get('/attendance-trend', analyticsController.getAttendanceTrend);
router.get('/status-breakdown', analyticsController.getStatusBreakdown);
router.get('/status-breakdown/employee/:employeeId', analyticsController.getEmployeeStatusBreakdown);
router.get('/status-breakdown/department/:department', analyticsController.getDepartmentStatusBreakdown);
router.get('/leaderboard', analyticsController.getAttendanceLeaderboard);
router.get('/overtime', analyticsController.getOvertimeSummary);
router.post('/generate-sample-data', analyticsController.generateSampleData);
router.get('/average-work-hours', analyticsController.getAverageWorkHours);

module.exports = router; 