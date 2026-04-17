const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  name: { 
    type: String, 
    required: true 
  },
  mobile: { 
    type: String, 
    default: '' 
  },
  totalPackets: { 
    type: Number, 
    default: 0 
  },
  creditPackets: { 
    type: Number, 
    default: 0 
  },
  paidPackets: { 
    type: Number, 
    default: 0 
  },
  udhaar: { 
    type: Number, 
    default: 0 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model('Customer', customerSchema);
