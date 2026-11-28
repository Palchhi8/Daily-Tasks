const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { registerSchema, loginSchema } = require('../validators/authValidators');

// Public endpoints
router.post('/register', validate(registerSchema, 'body'), authController.register);
router.post('/login', validate(loginSchema, 'body'), authController.login);

// Protected endpoints
router.get('/me', authenticateToken, authController.getMe);

module.exports = router;
