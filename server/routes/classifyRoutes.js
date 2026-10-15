const express = require('express');
const { protect } = require('../middleware/auth');
const { validateClassify, handleValidationErrors } = require('../middleware/validate');
const { uploadCsv } = require('../middleware/upload');
const classifyController = require('../controllers/classifyController');

const router = express.Router();

router.post(
  '/',
  protect,
  validateClassify,
  handleValidationErrors,
  classifyController.classifyText
);

router.post('/bulk', protect, uploadCsv, classifyController.bulkClassify);

router.post('/gmail', protect, classifyController.classifyGmail);

module.exports = router;
