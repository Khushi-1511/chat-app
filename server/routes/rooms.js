const express = require('express');
const router = express.Router();
const Room = require('../models/Room');

// Get all rooms
router.get('/', async (req, res) => {
  try {
    const rooms = await Room.find();
    res.status(200).json(rooms);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new room
router.post('/create', async (req, res) => {
  try {
    const { name, userId } = req.body;

    const existingRoom = await Room.findOne({ name });
    if (existingRoom) {
      return res.status(400).json({ message: 'Room already exists' });
    }

    const room = new Room({ name, createdBy: userId });
    await room.save();

    res.status(201).json(room);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;