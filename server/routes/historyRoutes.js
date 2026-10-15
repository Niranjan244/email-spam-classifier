const express = require('express');
const { protect } = require('../middleware/auth');
const historyController = require('../controllers/historyController');

const router = express.Router();

router.use(protect);

router.get('/', historyController.getHistory);
router.get('/:id', historyController.getHistoryById);
router.delete('/:id', historyController.deleteHistoryById);

module.exports = router;
