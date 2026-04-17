const express = require('express');
const router = express.Router();
const Inventory = require('../models/Inventory');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    let inventory = await Inventory.findOne({ userId: req.userId });
    if (!inventory) {
      inventory = new Inventory({ userId: req.userId, available: 0 });
      await inventory.save();
    }
    res.json(inventory);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/', auth, async (req, res) => {
  try {
    const { available } = req.body;
    const inventory = await Inventory.findOneAndUpdate(
      { userId: req.userId },
      { available, updatedAt: new Date() },
      { new: true, upsert: true }
    );
    res.json(inventory);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
