const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json());
app.use(express.static('public'));

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://cha_data:chadatauser%401509@chaclust.nkg0nnm.mongodb.net/chaihisaab?retryWrites=true&w=majority&appName=chaclust';
const JWT_SECRET = process.env.JWT_SECRET || 'chai_hisaab_secret_key_2024';

console.log('🔄 Connecting to MongoDB...');
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected Successfully'))
  .catch(err => console.error('❌ MongoDB Error:', err.message));

// Schemas
const userSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const customerSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  mobile: { type: String, default: '' },
  totalPackets: { type: Number, default: 0 },
  creditPackets: { type: Number, default: 0 },
  paidPackets: { type: Number, default: 0 },
  udhaar: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const inventorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  available: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now }
});

const dailyStatSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true },
  packets: { type: Number, default: 0 },
  credit: { type: Number, default: 0 },
  paid: { type: Number, default: 0 }
});

const User = mongoose.model('User', userSchema);
const Customer = mongoose.model('Customer', customerSchema);
const Inventory = mongoose.model('Inventory', inventorySchema);
const DailyStat = mongoose.model('DailyStat', dailyStatSchema);

// Auth Middleware
const auth = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// ============ ROUTES ============

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Chai Hisaab API Running',
    mongodb: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  });
});

// Auth Routes
app.post('/api/auth/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    console.log('🔐 Login attempt:', phone);
    
    const user = await User.findOne({ phone });
    if (!user) {
      console.log('❌ User not found:', phone);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      console.log('❌ Invalid password for:', phone);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign({ userId: user._id }, JWT_SECRET);
    console.log('✅ Login successful:', phone);
    
    res.json({ token, user: { id: user._id, name: user.name, phone: user.phone } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Customer Routes
app.get('/api/customers', auth, async (req, res) => {
  try {
    const customers = await Customer.find({ userId: req.userId }).sort({ name: 1 });
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/customers', auth, async (req, res) => {
  try {
    const { name, mobile } = req.body;
    const existing = await Customer.findOne({ userId: req.userId, name });
    if (existing) return res.status(400).json({ error: 'Customer exists' });
    
    const customer = new Customer({ userId: req.userId, name, mobile: mobile || '' });
    await customer.save();
    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/customers/:id', auth, async (req, res) => {
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

app.delete('/api/customers/:id', auth, async (req, res) => {
  try {
    await Customer.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Inventory Routes
app.get('/api/inventory', auth, async (req, res) => {
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

app.put('/api/inventory', auth, async (req, res) => {
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

// Stats Routes
app.get('/api/stats', auth, async (req, res) => {
  try {
    const stats = await DailyStat.find({ userId: req.userId }).sort({ date: -1 }).limit(30);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/stats/today', auth, async (req, res) => {
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

// Serve Frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 API Health: http://localhost:${PORT}/api/health`);
});
