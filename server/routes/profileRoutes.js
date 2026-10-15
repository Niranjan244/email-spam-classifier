const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { protect } = require('../middleware/auth');
const {
  validateUpdateProfile,
  validateChangePassword
} = require('../middleware/profileValidation');
const { uploadAvatar } = require('../middleware/upload');

// All profile routes are protected
router.use(protect);

router.get('/', profileController.getProfile);
router.patch('/', validateUpdateProfile, profileController.updateProfile);
router.patch('/password', validateChangePassword, profileController.changePassword);
router.post('/avatar', uploadAvatar, profileController.uploadAvatar);
router.delete('/avatar', profileController.deleteAvatar);

module.exports = router;
