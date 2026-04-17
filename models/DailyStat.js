const mongoose = require('mongoose');

const dailyStatSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  date: { 
    type: String, 
    required: true 
  },
  packets: { 
    type: Number, 
    default: 0 
  },
  credit: { 
    type: Number, 
    default: 0 
  },
  paid: { 
    type: Number, 
    default: 0 
  }
});

dailyStatSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DailyStat', dailyStatSchema);
