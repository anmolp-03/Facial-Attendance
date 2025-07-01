const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendance.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Employee self-attendance (e.g., via face recognition service)
router.post('/mark', attendanceController.markAttendance);

// Admin only attendance routes (require admin privileges)
router.post('/admin/add', authMiddleware.verifyToken, authMiddleware.verifyAdmin, attendanceController.addAttendanceRecord);
router.put('/admin/:id', authMiddleware.verifyToken, authMiddleware.verifyAdmin, attendanceController.updateAttendanceRecord);
router.delete('/admin/:id', authMiddleware.verifyToken, authMiddleware.verifyAdmin, attendanceController.deleteAttendanceRecord);

// Admin only performance and analysis routes (require admin privileges)
router.get('/admin/user/:userId', authMiddleware.verifyToken, authMiddleware.verifyAdmin, attendanceController.getAttendanceRecordsByUser);
router.get('/admin/summary', authMiddleware.verifyToken, authMiddleware.verifyAdmin, attendanceController.getAttendanceSummary);
router.get('/admin/payroll', authMiddleware.verifyToken, authMiddleware.verifyAdmin, attendanceController.getPayrollData);

// Employee self-service performance routes (require any authenticated user)
router.get('/my-records', authMiddleware.verifyToken, attendanceController.getMyAttendanceRecords);
router.get('/my-summary', authMiddleware.verifyToken, attendanceController.getMyAttendanceSummary);

// New POST route '/scan'
router.post('/scan', attendanceController.scanAndMarkAttendance);

module.exports = router; 