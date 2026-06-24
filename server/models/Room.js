const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  createdBy: {
    type: String  // changed this to String for now
  }
}, { timestamps: true });

module.exports = mongoose.model('Room', roomSchema);