const express = require('express');
const { protect, adminOnly } = require('../middleware/auth');
const { uploadDatasetDisk } = require('../middleware/upload');
const adminController = require('../controllers/adminController');

const router = express.Router();

router.use(protect, adminOnly);

router.get('/users', adminController.getUsers);
router.patch('/users/:id/status', adminController.updateUserStatus);
router.patch('/users/:id/role', adminController.updateUserRole);
router.get('/stats', adminController.getAdminStats);

router.post('/datasets', uploadDatasetDisk, adminController.uploadDataset);
router.get('/datasets', adminController.getDatasets);
router.delete('/datasets/:id', adminController.deleteDataset);

router.post('/train', adminController.trainModel);
router.get('/models', adminController.getModels);
router.post('/models/:id/activate', adminController.activateModel);

module.exports = router;
