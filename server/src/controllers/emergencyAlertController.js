const EmergencyAlert = require('../models/EmergencyAlert');
const Food = require('../models/Food');
const { validationResult } = require('express-validator');

// Create emergency alert
exports.createEmergencyAlert = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const alert = new EmergencyAlert({
      ...req.body,
      shelter: req.user.id
    });

    await alert.save();

    // Find matching food listings
    const matchingFood = await Food.find({
      status: 'available',
      category: { $in: alert.foodNeeds.map(need => need.category) },
      expiryDate: { $gt: alert.deadline }
    }).populate('donor', 'name businessName businessType');

    // Emit socket event for real-time notifications
    req.app.get('io').emit('new-emergency-alert', {
      alert,
      matchingFood
    });

    res.status(201).json({
      success: true,
      data: {
        alert,
        matchingFood
      }
    });
  } catch (error) {
    console.error('Create emergency alert error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating emergency alert',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get all emergency alerts
exports.getEmergencyAlerts = async (req, res) => {
  try {
    const {
      status,
      priority,
      minDeadline,
      maxDeadline,
      location,
      radius
    } = req.query;

    const query = {};

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (minDeadline || maxDeadline) {
      query.deadline = {};
      if (minDeadline) query.deadline.$gte = new Date(minDeadline);
      if (maxDeadline) query.deadline.$lte = new Date(maxDeadline);
    }

    // Location-based query
    if (location && radius) {
      const [lat, lng] = location.split(',').map(Number);
      query.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat]
          },
          $maxDistance: radius * 1000 // Convert km to meters
        }
      };
    }

    const alerts = await EmergencyAlert.find(query)
      .populate('shelter', 'name address')
      .populate('responses.donor', 'name businessName businessType')
      .populate('responses.food')
      .sort({ priority: -1, deadline: 1 });

    res.json({
      success: true,
      count: alerts.length,
      data: alerts
    });
  } catch (error) {
    console.error('Get emergency alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching emergency alerts',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get single emergency alert
exports.getEmergencyAlert = async (req, res) => {
  try {
    const alert = await EmergencyAlert.findById(req.params.id)
      .populate('shelter', 'name address')
      .populate('responses.donor', 'name businessName businessType')
      .populate('responses.food');

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Emergency alert not found'
      });
    }

    res.json({
      success: true,
      data: alert
    });
  } catch (error) {
    console.error('Get emergency alert error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching emergency alert',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Respond to emergency alert
exports.respondToAlert = async (req, res) => {
  try {
    const { foodId } = req.body;
    const alert = await EmergencyAlert.findById(req.params.id);

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Emergency alert not found'
      });
    }

    if (alert.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Alert is no longer active'
      });
    }

    const food = await Food.findById(foodId);
    if (!food || food.status !== 'available') {
      return res.status(404).json({
        success: false,
        message: 'Food not available'
      });
    }

    // Add response to alert
    alert.responses.push({
      donor: req.user.id,
      food: foodId,
      status: 'pending'
    });

    await alert.save();

    // Emit socket event for real-time updates
    req.app.get('io').emit('alert-response', {
      alert,
      food
    });

    res.json({
      success: true,
      data: alert
    });
  } catch (error) {
    console.error('Respond to alert error:', error);
    res.status(500).json({
      success: false,
      message: 'Error responding to alert',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update emergency alert status
exports.updateAlertStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const alert = await EmergencyAlert.findById(req.params.id);

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Emergency alert not found'
      });
    }

    alert.status = status;
    await alert.save();

    // Emit socket event for real-time updates
    req.app.get('io').emit('alert-status-update', {
      alert
    });

    res.json({
      success: true,
      data: alert
    });
  } catch (error) {
    console.error('Update alert status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating alert status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Delete emergency alert
exports.deleteEmergencyAlert = async (req, res) => {
  try {
    const alert = await EmergencyAlert.findByIdAndDelete(req.params.id);

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Emergency alert not found'
      });
    }

    res.json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error('Delete emergency alert error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting emergency alert',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}; 