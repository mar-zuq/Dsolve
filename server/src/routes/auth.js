const express = require('express');
const { body } = require('express-validator');
const { protect } = require('../middleware/auth');
const {
  register,
  login,
  getProfile,
  updateProfile
} = require('../controllers/authController');

const router = express.Router();

// Validation middleware
const registerValidation = [
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('name').notEmpty().withMessage('Name is required'),
  body('userType')
    .isIn(['donor', 'volunteer', 'shelter'])
    .withMessage('Invalid user type'),
  body('phone').optional().isMobilePhone().withMessage('Invalid phone number'),
  body('address').optional().isObject().withMessage('Invalid address format'),
  body('businessName')
    .optional()
    .notEmpty()
    .withMessage('Business name is required for donors'),
  body('businessType')
    .optional()
    .isIn(['restaurant', 'grocery', 'individual'])
    .withMessage('Invalid business type'),
  body('shelterCapacity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Shelter capacity must be a positive number'),
  body('currentOccupancy')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Current occupancy must be a non-negative number'),
  body('availability')
    .optional()
    .isArray()
    .withMessage('Availability must be an array')
];

const loginValidation = [
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password').notEmpty().withMessage('Password is required')
];

// Routes
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);

module.exports = router; 