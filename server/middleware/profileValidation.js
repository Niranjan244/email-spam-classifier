const { body, validationResult } = require('express-validator');

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

const validateUpdateProfile = [
  body('name')
    .exists({ checkFalsy: false })
    .withMessage('Name is required')
    .isString()
    .withMessage('Name must be a string')
    .bail()
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .bail()
    .isLength({ min: 2, max: 60 })
    .withMessage('Name must be between 2 and 60 characters'),
  handleValidationErrors
];

const validateChangePassword = [
  body('currentPassword')
    .exists({ checkFalsy: false })
    .withMessage('Current password is required')
    .isString()
    .withMessage('Current password must be a string')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .exists({ checkFalsy: false })
    .withMessage('New password is required')
    .isString()
    .withMessage('New password must be a string')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long'),
  body('confirmPassword')
    .exists({ checkFalsy: false })
    .withMessage('Password confirmation is required')
    .isString()
    .withMessage('Password confirmation must be a string')
    .notEmpty()
    .withMessage('Password confirmation is required')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('New password and confirmation do not match');
      }
      return true;
    }),
  body('newPassword').custom((value, { req }) => {
    if (value && req.body.currentPassword && value === req.body.currentPassword) {
      throw new Error('New password must be different from current password');
    }
    return true;
  }),
  handleValidationErrors
];

module.exports = {
  validateUpdateProfile,
  validateChangePassword,
  handleValidationErrors
};
