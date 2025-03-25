const express = require('express');
const { body } = require('express-validator');
const { protect, authorize } = require('../middleware/auth');
const {
  getDeliveries,
  getDelivery,
  updateDeliveryStatus,
  rateDelivery,
  cancelDelivery
} = require('../controllers/deliveryController');

const router = express.Router();

// Routes
router.get(
  '/',
  protect,
  authorize('volunteer', 'shelter', 'donor'),
  getDeliveries
);

router.get(
  '/:id',
  protect,
  authorize('volunteer', 'shelter', 'donor'),
  getDelivery
);

router.patch(
  '/:id/status',
  protect,
  authorize('volunteer'),
  body('status')
    .isIn(['scheduled', 'in-progress', 'completed', 'cancelled'])
    .withMessage('Invalid status'),
  updateDeliveryStatus
);

router.post(
  '/:id/rate',
  protect,
  authorize('shelter'),
  [
    body('rating')
      .isInt({ min: 1, max: 5 })
      .withMessage('Rating must be between 1 and 5'),
    body('feedback')
      .optional()
      .isString()
      .trim()
      .notEmpty()
      .withMessage('Feedback must be a non-empty string')
  ],
  rateDelivery
);

router.post(
  '/:id/cancel',
  protect,
  authorize('volunteer', 'shelter'),
  cancelDelivery
);

module.exports = router; 