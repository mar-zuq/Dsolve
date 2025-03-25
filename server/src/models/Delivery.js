const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
  food: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Food',
    required: true
  },
  volunteer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  shelter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'in-progress', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  pickupTime: {
    type: Date,
    required: true
  },
  estimatedDeliveryTime: {
    type: Date,
    required: true
  },
  actualDeliveryTime: {
    type: Date
  },
  route: {
    start: {
      coordinates: {
        lat: Number,
        lng: Number
      },
      address: String
    },
    end: {
      coordinates: {
        lat: Number,
        lng: Number
      },
      address: String
    },
    distance: Number,
    duration: Number
  },
  notes: {
    type: String
  },
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  feedback: {
    type: String
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
deliverySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for efficient querying
deliverySchema.index({ status: 1, volunteer: 1 });
deliverySchema.index({ pickupTime: 1 });
deliverySchema.index({ shelter: 1 });

const Delivery = mongoose.model('Delivery', deliverySchema);

module.exports = Delivery; 