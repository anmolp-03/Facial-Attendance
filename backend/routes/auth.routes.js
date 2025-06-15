const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

// Placeholder: User login
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);

module.exports = router; 