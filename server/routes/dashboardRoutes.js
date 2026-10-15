const express = require('express');
const { protect } = require('../middleware/auth');
const dashboardController = require('../controllers/dashboardController');

const router = express.Router();

router.use(protect);

router.get('/', dashboardController.getDashboard);

module.exports = router;
