const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const customers = await Customer.find({ userId: req.userId }).sort({ name: 1 });
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, mobile } = req.body;
    
    const existing = await Customer.findOne({ userId: req.userId, name });
    if (existing) {
      return res.status(400).json({ error: 'Customer already exists' });
    }

    const customer = new Customer({
      userId: req.userId,
      name,
      mobile: mobile || ''
    });

    await customer.save();
    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      req.body,
      { new: true }
    );
    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await Customer.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
