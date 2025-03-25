const Food = require('../models/Food');
const User = require('../models/User');
const Delivery = require('../models/Delivery');
const EmergencyAlert = require('../models/EmergencyAlert');
const { validationResult } = require('express-validator');

// Create new food listing
exports.createFoodListing = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const food = new Food({
      ...req.body,
      donor: req.user.id
    });

    await food.save();

    // Check for matching emergency alerts
    const matchingAlerts = await EmergencyAlert.find({
      status: 'active',
      'foodNeeds.category': food.category,
      deadline: { $gt: food.expiryDate }
    });

    if (matchingAlerts.length > 0) {
      // Emit socket event for emergency alerts
      req.app.get('io').emit('new-food-listing', {
        food,
        matchingAlerts
      });
    }

    res.status(201).json({
      success: true,
      data: food
    });
  } catch (error) {
    console.error('Create food listing error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating food listing',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get all food listings with filters
exports.getFoodListings = async (req, res) => {
  try {
    const {
      status,
      category,
      minExpiryDate,
      maxExpiryDate,
      location,
      radius
    } = req.query;

    const query = {};

    if (status) query.status = status;
    if (category) query.category = category;
    if (minExpiryDate || maxExpiryDate) {
      query.expiryDate = {};
      if (minExpiryDate) query.expiryDate.$gte = new Date(minExpiryDate);
      if (maxExpiryDate) query.expiryDate.$lte = new Date(maxExpiryDate);
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

    const food = await Food.find(query)
      .populate('donor', 'name businessName businessType')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: food.length,
      data: food
    });
  } catch (error) {
    console.error('Get food listings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching food listings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get single food listing
exports.getFoodListing = async (req, res) => {
  try {
    const food = await Food.findById(req.params.id)
      .populate('donor', 'name businessName businessType')
      .populate('matchedShelter', 'name address')
      .populate('assignedVolunteer', 'name phone');

    if (!food) {
      return res.status(404).json({
        success: false,
        message: 'Food listing not found'
      });
    }

    res.json({
      success: true,
      data: food
    });
  } catch (error) {
    console.error('Get food listing error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching food listing',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update food listing
exports.updateFoodListing = async (req, res) => {
  try {
    const food = await Food.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!food) {
      return res.status(404).json({
        success: false,
        message: 'Food listing not found'
      });
    }

    res.json({
      success: true,
      data: food
    });
  } catch (error) {
    console.error('Update food listing error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating food listing',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Match food with shelter
exports.matchFood = async (req, res) => {
  try {
    const { shelterId } = req.body;
    const food = await Food.findById(req.params.id);

    if (!food) {
      return res.status(404).json({
        success: false,
        message: 'Food listing not found'
      });
    }

    if (food.status !== 'available') {
      return res.status(400).json({
        success: false,
        message: 'Food is no longer available'
      });
    }

    const shelter = await User.findById(shelterId);
    if (!shelter || shelter.userType !== 'shelter') {
      return res.status(404).json({
        success: false,
        message: 'Shelter not found'
      });
    }

    // Find available volunteer
    const volunteer = await User.findOne({
      userType: 'volunteer',
      availability: {
        $elemMatch: {
          day: new Date(food.pickupTime.start).toLocaleDateString('en-US', { weekday: 'long' }),
          startTime: { $lte: new Date(food.pickupTime.start).toLocaleTimeString('en-US', { hour12: false }) },
          endTime: { $gte: new Date(food.pickupTime.end).toLocaleTimeString('en-US', { hour12: false }) }
        }
      }
    });

    if (!volunteer) {
      return res.status(404).json({
        success: false,
        message: 'No available volunteers found'
      });
    }

    // Create delivery
    const delivery = new Delivery({
      food: food._id,
      volunteer: volunteer._id,
      shelter: shelterId,
      pickupTime: food.pickupTime.start,
      estimatedDeliveryTime: new Date(food.pickupTime.start.getTime() + 30 * 60000) // 30 minutes after pickup
    });

    await delivery.save();

    // Update food status
    food.status = 'reserved';
    food.matchedShelter = shelterId;
    food.assignedVolunteer = volunteer._id;
    await food.save();

    // Emit socket event for real-time updates
    req.app.get('io').emit('food-matched', {
      food,
      delivery
    });

    res.json({
      success: true,
      data: {
        food,
        delivery
      }
    });
  } catch (error) {
    console.error('Match food error:', error);
    res.status(500).json({
      success: false,
      message: 'Error matching food',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Delete food listing
exports.deleteFoodListing = async (req, res) => {
  try {
    const food = await Food.findByIdAndDelete(req.params.id);

    if (!food) {
      return res.status(404).json({
        success: false,
        message: 'Food listing not found'
      });
    }

    res.json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error('Delete food listing error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting food listing',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}; 