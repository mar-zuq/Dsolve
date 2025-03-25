const express = require('express');
const { body } = require('express-validator');
const { protect, authorize, checkOwnership } = require('../middleware/auth');
const {
  createFoodListing,
  getFoodListings,
  getFoodListing,
  updateFoodListing,
  matchFood,
  deleteFoodListing
} = require('../controllers/foodController');
const Food = require('../models/Food');

const router = express.Router();

// Validation middleware
const foodValidation = [
  body('title').notEmpty().withMessage('Title is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('unit')
    .isIn(['servings', 'pounds', 'items', 'boxes', 'bags'])
    .withMessage('Invalid unit'),
  body('category')
    .isIn(['prepared', 'produce', 'dairy', 'meat', 'pantry', 'other'])
    .withMessage('Invalid category'),
  body('expiryDate').isISO8601().withMessage('Invalid expiry date'),
  body('pickupTime.start').isISO8601().withMessage('Invalid pickup start time'),
  body('pickupTime.end').isISO8601().withMessage('Invalid pickup end time'),
  body('location.address').optional().isObject().withMessage('Invalid address format'),
  body('location.coordinates.lat').optional().isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  body('location.coordinates.lng').optional().isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
  body('allergens').optional().isArray().withMessage('Allergens must be an array'),
  body('dietaryRestrictions').optional().isArray().withMessage('Dietary restrictions must be an array')
];

// Routes
router.post(
  '/',
  protect,
  authorize('donor'),
  foodValidation,
  createFoodListing
);

router.get('/', getFoodListings);

router.get('/:id', getFoodListing);

router.put(
  '/:id',
  protect,
  authorize('donor'),
  checkOwnership(Food),
  foodValidation,
  updateFoodListing
);

router.post(
  '/:id/match',
  protect,
  authorize('shelter'),
  body('shelterId').isMongoId().withMessage('Invalid shelter ID'),
  matchFood
);

router.delete(
  '/:id',
  protect,
  authorize('donor'),
  checkOwnership(Food),
  deleteFoodListing
);

module.exports = router; 