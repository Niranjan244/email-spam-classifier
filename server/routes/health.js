const express = require('express');

const router = express.Router();

router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'healthy'
    },
    message: 'Server is healthy'
  });
});

module.exports = router;
