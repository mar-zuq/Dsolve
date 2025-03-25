const mongoose = require('mongoose');

const emergencyAlertSchema = new mongoose.Schema({
  shelter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  priority: {
    type: String,
    enum: ['high', 'medium', 'low'],
    default: 'medium'
  },
  foodNeeds: [{
    category: {
      type: String,
      enum: ['prepared', 'produce', 'dairy', 'meat', 'pantry', 'other'],
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    unit: {
      type: String,
      required: true,
      enum: ['servings', 'pounds', 'items', 'boxes', 'bags']
    },
    urgency: {
      type: String,
      enum: ['immediate', 'today', 'this-week'],
      required: true
    }
  }],
  location: {
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String
    },
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  status: {
    type: String,
    enum: ['active', 'partially-fulfilled', 'fulfilled', 'cancelled'],
    default: 'active'
  },
  responses: [{
    donor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    food: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Food'
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'delivered', 'cancelled']
    },
    responseTime: {
      type: Date,
      default: Date.now
    }
  }],
  deadline: {
    type: Date,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt timestamp before saving
emergencyAlertSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for efficient querying
emergencyAlertSchema.index({ status: 1, location: '2dsphere' });
emergencyAlertSchema.index({ priority: 1, deadline: 1 });
emergencyAlertSchema.index({ shelter: 1 });

const EmergencyAlert = mongoose.model('EmergencyAlert', emergencyAlertSchema);

module.exports = EmergencyAlert; 