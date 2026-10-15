const express = require('express');
const { protect } = require('../middleware/auth');
const analyticsController = require('../controllers/analyticsController');

const router = express.Router();

router.use(protect);

router.get('/', analyticsController.getAnalytics);
router.get('/raw', analyticsController.getRawAnalytics);
router.get('/raw/export', analyticsController.exportRawAnalytics);

module.exports = router;
