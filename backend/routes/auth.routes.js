const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const adminAuth = require('../middlewares/admin.middleware');

// Public routes
router.post('/login', authController.login);  // Regular employee login
router.post('/admin/login', authController.adminLogin);  // Admin login
router.post('/logout', authController.logout);
router.post('/setup-admin', authController.setupFirstAdmin);
router.post('/admin-reset-password', authController.adminResetPassword);

// Admin only routes
router.post('/register', adminAuth, authController.register);
router.get('/users', adminAuth, authController.getAllUsers);
router.delete('/users/:id', adminAuth, authController.deleteUser);
router.post('/register-with-face', adminAuth, authController.registerWithFace);
router.post('/add-face-to-user', adminAuth, authController.addFaceToUser);
router.post('/admin/reauth', authController.adminReauth);
router.put('/users/:id', adminAuth, authController.updateUser);

module.exports = router; 