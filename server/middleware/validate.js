const { body, validationResult } = require('express-validator');

const validateRegister = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail({ gmail_remove_dots: false }),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
];

const validateLogin = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail({ gmail_remove_dots: false }),
  body('password').notEmpty().withMessage('Password is required')
];

const validateClassify = [
  body('text')
    .exists({ checkFalsy: false })
    .withMessage('Email text is required and cannot be empty')
    .isString()
    .withMessage('Email text must be a string')
    .trim()
    .notEmpty()
    .withMessage('Email text is required and cannot be empty')
    .isLength({ max: 20000 })
    .withMessage('Email text cannot exceed 20,000 characters')
];

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      data: null,
      message: errors.array()[0].msg
    });
  }
  return next();
};

module.exports = {
  validateRegister,
  validateLogin,
  validateClassify,
  handleValidationErrors
};
