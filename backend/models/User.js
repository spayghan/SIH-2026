const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['Inspector', 'Administrator'],
    required: true
  },
  department: {
    type: String,
    default: 'Retail & Food Safety Inspection'
  },
  district: {
    type: String,
    default: 'Amravati'
  },
  assignedRegion: {
    type: String,
    default: 'Amravati Urban'
  },
  designation: {
    type: String,
    default: 'Field Inspector'
  },
  level: {
    type: String,
    default: 'Administrative Level'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', UserSchema);
