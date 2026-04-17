const express = require('express');
const router = express.Router();
const DailyStat = require('../models/DailyStat');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const stats = await DailyStat.find({ userId: req.userId })
      .sort({ date: -1 })
      .limit(30);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/today', auth, async (req, res) => {
  try {
    const { date, packets, credit, paid } = req.body;
    const stat = await DailyStat.findOneAndUpdate(
      { userId: req.userId, date },
      { packets, credit, paid },
      { new: true, upsert: true }
    );
    res.json(stat);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
