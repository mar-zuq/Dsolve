const Delivery = require('../models/Delivery');
const Food = require('../models/Food');
const User = require('../models/User');
const { validationResult } = require('express-validator');

// Get all deliveries
exports.getDeliveries = async (req, res) => {
  try {
    const {
      status,
      volunteer,
      shelter,
      minPickupTime,
      maxPickupTime
    } = req.query;

    const query = {};

    if (status) query.status = status;
    if (volunteer) query.volunteer = volunteer;
    if (shelter) query.shelter = shelter;
    if (minPickupTime || maxPickupTime) {
      query.pickupTime = {};
      if (minPickupTime) query.pickupTime.$gte = new Date(minPickupTime);
      if (maxPickupTime) query.pickupTime.$lte = new Date(maxPickupTime);
    }

    const deliveries = await Delivery.find(query)
      .populate('food')
      .populate('volunteer', 'name phone')
      .populate('shelter', 'name address')
      .sort({ pickupTime: 1 });

    res.json({
      success: true,
      count: deliveries.length,
      data: deliveries
    });
  } catch (error) {
    console.error('Get deliveries error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching deliveries',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get single delivery
exports.getDelivery = async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id)
      .populate('food')
      .populate('volunteer', 'name phone')
      .populate('shelter', 'name address');

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: 'Delivery not found'
      });
    }

    res.json({
      success: true,
      data: delivery
    });
  } catch (error) {
    console.error('Get delivery error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching delivery',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update delivery status
exports.updateDeliveryStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const delivery = await Delivery.findById(req.params.id);

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: 'Delivery not found'
      });
    }

    // Update delivery status
    delivery.status = status;
    if (status === 'completed') {
      delivery.actualDeliveryTime = new Date();
    }
    await delivery.save();

    // Update food status
    const food = await Food.findById(delivery.food);
    if (food) {
      food.status = status === 'completed' ? 'picked-up' : 'reserved';
      await food.save();
    }

    // Update volunteer stats
    if (status === 'completed') {
      await User.findByIdAndUpdate(delivery.volunteer, {
        $inc: { completedDeliveries: 1 }
      });
    }

    // Emit socket event for real-time updates
    req.app.get('io').emit('delivery-status-update', {
      delivery,
      food
    });

    res.json({
      success: true,
      data: delivery
    });
  } catch (error) {
    console.error('Update delivery status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating delivery status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Rate delivery
exports.rateDelivery = async (req, res) => {
  try {
    const { rating, feedback } = req.body;
    const delivery = await Delivery.findById(req.params.id);

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: 'Delivery not found'
      });
    }

    if (delivery.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Can only rate completed deliveries'
      });
    }

    // Update delivery rating
    delivery.rating = rating;
    delivery.feedback = feedback;
    await delivery.save();

    // Update volunteer's average rating
    const volunteer = await User.findById(delivery.volunteer);
    if (volunteer) {
      const allDeliveries = await Delivery.find({
        volunteer: delivery.volunteer,
        rating: { $exists: true }
      });
      
      const averageRating = allDeliveries.reduce((acc, curr) => acc + curr.rating, 0) / allDeliveries.length;
      volunteer.rating = averageRating;
      await volunteer.save();
    }

    res.json({
      success: true,
      data: delivery
    });
  } catch (error) {
    console.error('Rate delivery error:', error);
    res.status(500).json({
      success: false,
      message: 'Error rating delivery',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Cancel delivery
exports.cancelDelivery = async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id);

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: 'Delivery not found'
      });
    }

    if (delivery.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel completed delivery'
      });
    }

    // Update delivery status
    delivery.status = 'cancelled';
    await delivery.save();

    // Update food status
    const food = await Food.findById(delivery.food);
    if (food) {
      food.status = 'available';
      food.matchedShelter = null;
      food.assignedVolunteer = null;
      await food.save();
    }

    // Emit socket event for real-time updates
    req.app.get('io').emit('delivery-cancelled', {
      delivery,
      food
    });

    res.json({
      success: true,
      data: delivery
    });
  } catch (error) {
    console.error('Cancel delivery error:', error);
    res.status(500).json({
      success: false,
      message: 'Error cancelling delivery',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}; 