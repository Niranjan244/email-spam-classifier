const express = require('express');
const authController = require('../controllers/authController');
const { protect, adminOnly } = require('../middleware/auth');
const {
  validateRegister,
  validateLogin,
  handleValidationErrors
} = require('../middleware/validate');
const authLimiter = require('../middleware/rateLimiter');

const router = express.Router();

router.post(
  '/register',
  authLimiter,
  validateRegister,
  handleValidationErrors,
  authController.register
);

router.post('/login', authLimiter, validateLogin, handleValidationErrors, authController.login);

router.post('/google', authLimiter, authController.googleLogin);

router.post('/forgot-password', authLimiter, authController.forgotPassword);
router.post('/reset-password/:token', authLimiter, authController.resetPassword);
router.post('/reset-password', authLimiter, authController.resetPassword);

router.post('/verify-2fa', authLimiter, authController.verify2FA);
router.post('/resend-2fa', authLimiter, authController.resend2FA);
router.put('/2fa/toggle', protect, authController.toggle2FA);

router.get('/me', protect, authController.getMe);

router.get('/admin', protect, adminOnly, authController.checkAdmin);

module.exports = router;
