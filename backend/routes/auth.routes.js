const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const adminAuth = require('../middlewares/admin.middleware');

// Public routes
router.post('/login', authController.login);  // Regular employee login
router.post('/admin/login', authController.adminLogin);  // Admin login
router.post('/logout', authController.logout);
router.post('/setup-admin', authController.setupFirstAdmin);

// Admin only routes
router.post('/register', adminAuth, authController.register);
router.get('/users', adminAuth, authController.getAllUsers);
router.delete('/users/:id', adminAuth, authController.deleteUser);

module.exports = router; 