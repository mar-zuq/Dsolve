const express = require('express');
const { body } = require('express-validator');
const { protect, authorize, checkOwnership } = require('../middleware/auth');
const {
  createEmergencyAlert,
  getEmergencyAlerts,
  getEmergencyAlert,
  respondToAlert,
  updateAlertStatus,
  deleteEmergencyAlert
} = require('../controllers/emergencyAlertController');
const EmergencyAlert = require('../models/EmergencyAlert');

const router = express.Router();

// Validation middleware
const alertValidation = [
  body('title').notEmpty().withMessage('Title is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('priority')
    .isIn(['high', 'medium', 'low'])
    .withMessage('Invalid priority level'),
  body('foodNeeds').isArray().withMessage('Food needs must be an array'),
  body('foodNeeds.*.category')
    .isIn(['prepared', 'produce', 'dairy', 'meat', 'pantry', 'other'])
    .withMessage('Invalid food category'),
  body('foodNeeds.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),
  body('foodNeeds.*.unit')
    .isIn(['servings', 'pounds', 'items', 'boxes', 'bags'])
    .withMessage('Invalid unit'),
  body('foodNeeds.*.urgency')
    .isIn(['immediate', 'today', 'this-week'])
    .withMessage('Invalid urgency level'),
  body('location.address').optional().isObject().withMessage('Invalid address format'),
  body('location.coordinates.lat').optional().isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  body('location.coordinates.lng').optional().isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
  body('deadline').isISO8601().withMessage('Invalid deadline date')
];

// Routes
router.post(
  '/',
  protect,
  authorize('shelter'),
  alertValidation,
  createEmergencyAlert
);

router.get('/', getEmergencyAlerts);

router.get('/:id', getEmergencyAlert);

router.post(
  '/:id/respond',
  protect,
  authorize('donor'),
  body('foodId').isMongoId().withMessage('Invalid food ID'),
  respondToAlert
);

router.patch(
  '/:id/status',
  protect,
  authorize('shelter'),
  checkOwnership(EmergencyAlert),
  body('status')
    .isIn(['active', 'partially-fulfilled', 'fulfilled', 'cancelled'])
    .withMessage('Invalid status'),
  updateAlertStatus
);

router.delete(
  '/:id',
  protect,
  authorize('shelter'),
  checkOwnership(EmergencyAlert),
  deleteEmergencyAlert
);

module.exports = router; 