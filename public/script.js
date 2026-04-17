// API Configuration
const API_URL = '/api';
let authToken = localStorage.getItem('chaiToken');
let currentUser = JSON.parse(localStorage.getItem('chaiUser') || 'null');

// State
let customers = [];
let inventory = { available: 0 };
let today = { date: new Date().toISOString().slice(0,10), packetsSold: 0 };

// Check login status
if (authToken && currentUser) {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('registerScreen').style.display = 'none';
  document.getElementById('mainApp').style.display = 'block';
  initApp();
}

// Toggle Login/Register
document.getElementById('showRegister').addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('registerScreen').style.display = 'flex';
});

document.getElementById('showLogin').addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('registerScreen').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
});

// Login
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const phone = document.getElementById('loginPhone').value;
  const password = document.getElementById('loginPassword').value;
  
  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password })
    });
    const data = await res.json();
    
    if (res.ok) {
      authToken = data.token;
      currentUser = data.user;
      localStorage.setItem('chaiToken', authToken);
      localStorage.setItem('chaiUser', JSON.stringify(currentUser));
      document.getElementById('loginScreen').style.display = 'none';
      document.getElementById('mainApp').style.display = 'block';
      initApp();
      showToast('✅ Login successful!');
    } else {
      showToast('❌ ' + data.error);
    }
  } catch (error) {
    showToast('❌ Connection error');
  }
});

// Register
document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('regName').value;
  const phone = document.getElementById('regPhone').value;
  const password = document.getElementById('regPassword').value;
  
  try {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, password })
    });
    const data = await res.json();
    
    if (res.ok) {
      authToken = data.token;
      currentUser = data.user;
      localStorage.setItem('chaiToken', authToken);
      localStorage.setItem('chaiUser', JSON.stringify(currentUser));
      document.getElementById('registerScreen').style.display = 'none';
      document.getElementById('mainApp').style.display = 'block';
      initApp();
      showToast('✅ Registration successful!');
    } else {
      showToast('❌ ' + data.error);
    }
  } catch (error) {
    showToast('❌ Connection error');
  }
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('chaiToken');
  localStorage.removeItem('chaiUser');
  location.reload();
});

// Helper Functions
function showToast(msg, duration = 2000) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

function closeModal(id) {
  document.getElementById(id).classList.remove('show');
}

function openModal(id) {
  document.getElementById(id).classList.add('show');
}

function getInitials(name) {
  return name.trim().split(/\s+/).slice(0,2).map(w => w[0] || '').join('').toUpperCase();
}

async function apiCall(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    }
  };
  if (body) options.body = JSON.stringify(body);
  
  const res = await fetch(`${API_URL}${endpoint}`, options);
  return res.json();
}

// Initialize App
async function initApp() {
  await loadData();
  updateHeaderStats();
  renderCustomers();
  setupEventListeners();
  setInterval(checkDailyReset, 60000);
}

async function loadData() {
  try {
    customers = await apiCall('/customers');
    const inv = await apiCall('/inventory');
    inventory = inv;
    const stats = await apiCall('/stats');
    const todayStr = new Date().toISOString().slice(0,10);
    const todayStat = stats.find(s => s.date === todayStr);
    if (todayStat) {
      today = { date: todayStr, packetsSold: todayStat.packets || 0 };
    }
  } catch (error) {
    console.error('Load error:', error);
  }
}

function updateHeaderStats() {
  const totalUdhaar = customers.reduce((s, c) => s + (c.udhaar || 0), 0);
  document.getElementById('availablePackets').textContent = inventory.available || 0;
  document.getElementById('headerTodayPackets').textContent = today.packetsSold || 0;
  document.getElementById('headerTotalUdhaar').textContent = '₹' + totalUdhaar;
  document.getElementById('dateDisplay').textContent = new Date().toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' });
}

function checkDailyReset() {
  const todayStr = new Date().toISOString().slice(0,10);
  if (today.date !== todayStr) {
    today = { date: todayStr, packetsSold: 0 };
    updateHeaderStats();
    if (document.querySelector('#view-summary.active')) renderSummary();
  }
}

// Render Functions
function renderCustomers() {
  const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
  let filtered = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm) || (c.mobile && c.mobile.includes(searchTerm))
  );
  filtered.sort((a, b) => a.name.localeCompare(b.name));
  
  const container = document.getElementById('customersList');
  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No customers found</p></div>';
    return;
  }
  
  let html = '';
  filtered.forEach(c => {
    html += `
      <div class="customer-card">
        <div class="customer-header">
          <div class="avatar">${getInitials(c.name)}</div>
          <div class="customer-title">
            <div class="customer-name">${c.name}</div>
            <div class="customer-mobile">📞 ${c.mobile || 'No mobile'}</div>
          </div>
        </div>
        <div class="stats-container">
          <div class="stat-box"><div class="stat-label-small">📦 Total</div><div class="stat-number">${c.totalPackets || 0}</div></div>
          <div class="stat-box credit-box"><div class="stat-label-small">⚠️ Credit</div><div class="stat-number credit-amount">${c.creditPackets || 0}</div></div>
          <div class="stat-box paid-box"><div class="stat-label-small">✅ Paid</div><div class="stat-number">${c.paidPackets || 0}</div></div>
          <div class="stat-box ${c.udhaar > 0 ? 'credit-box' : ''}"><div class="stat-label-small">💰 Due</div><div class="stat-number ${c.udhaar > 0 ? 'credit-amount' : ''}">₹${c.udhaar || 0}</div></div>
        </div>
        <div class="card-actions">
          <button class="btn btn-primary" data-action="quickSale" data-id="${c._id}">➕ Sell</button>
          <button class="btn btn-danger" data-action="deleteCustomer" data-id="${c._id}">🗑️</button>
        </div>
      </div>
    `;
  });
  container.innerHTML = html;
  updateHeaderStats();
}

function renderUdhaar() {
  const dueCustomers = customers.filter(c => c.udhaar > 0).sort((a, b) => b.udhaar - a.udhaar);
  const container = document.getElementById('udhaarList');
  
  if (dueCustomers.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No pending udhaar! 🎉</p></div>';
    return;
  }
  
  let html = '';
  dueCustomers.forEach(c => {
    html += `
      <div class="customer-card">
        <div class="customer-header">
          <div class="avatar" style="background:#FEE2E2;">${getInitials(c.name)}</div>
          <div class="customer-title">
            <div class="customer-name">${c.name}</div>
            <div class="customer-mobile">Credit: ${c.creditPackets || 0} packets</div>
          </div>
        </div>
        <div style="text-align:center; margin:8px 0;">
          <span style="font-size:1.8rem; font-weight:800; color:var(--danger);">₹${c.udhaar}</span>
        </div>
        <button class="btn btn-success" data-action="payUdhaar" data-id="${c._id}" style="width:100%;">💸 Receive Payment</button>
      </div>
    `;
  });
  container.innerHTML = html;
  updateHeaderStats();
}

function renderSummary() {
  const totalUdhaar = customers.reduce((s, c) => s + (c.udhaar || 0), 0);
  const paidCount = customers.filter(c => c.udhaar === 0).length;
  const top5 = [...customers].sort((a, b) => (b.totalPackets || 0) - (a.totalPackets || 0)).slice(0, 5);
  
  let topHtml = '';
  top5.forEach((c, i) => {
    topHtml += `<div style="display:flex; justify-content:space-between; padding:6px 0;"><span>#${i+1} ${c.name}</span><span style="background:var(--primary-light); padding:3px 10px; border-radius:20px;">${c.totalPackets || 0} pkts</span></div>`;
  });
  
  document.getElementById('summaryContent').innerHTML = `
    <div class="summary-grid">
      <div class="summary-card"><div class="value">${inventory.available || 0}</div><div class="label">In Stock</div></div>
      <div class="summary-card"><div class="value">${today.packetsSold || 0}</div><div class="label">Sold Today</div></div>
      <div class="summary-card"><div class="value" style="color:var(--danger);">₹${totalUdhaar}</div><div class="label">Udhaar</div></div>
      <div class="summary-card"><div class="value">${customers.length}</div><div class="label">Customers</div></div>
    </div>
    <div class="section-title">🏆 Top Customers</div>
    <div class="customer-card">${topHtml || '<p>No data</p>'}</div>
  `;
  updateHeaderStats();
}

async function refreshUI() {
  await loadData();
  const activeView = document.querySelector('.view.active');
  if (activeView.id === 'view-customers') renderCustomers();
  else if (activeView.id === 'view-udhaar') renderUdhaar();
  else if (activeView.id === 'view-summary') renderSummary();
}

// Actions
async function addCustomer(name, mobile) {
  if (!name.trim()) { showToast('Name required'); return false; }
  try {
    const res = await apiCall('/customers', 'POST', { name: name.trim(), mobile: mobile.trim() });
    if (res.error) { showToast('❌ ' + res.error); return false; }
    showToast(`✅ ${name} added`);
    await refreshUI();
    return true;
  } catch (error) {
    showToast('❌ Error adding customer');
    return false;
  }
}

async function deleteCustomer(id) {
  const cust = customers.find(c => c._id === id);
  if (!cust) return;
  if (cust.udhaar > 0 && !confirm(`${cust.name} owes ₹${cust.udhaar}. Delete anyway?`)) return;
  if (!confirm(`Delete ${cust.name}?`)) return;
  
  try {
    await apiCall(`/customers/${id}`, 'DELETE');
    showToast(`Removed ${cust.name}`);
    await refreshUI();
  } catch (error) {
    showToast('❌ Error deleting');
  }
}

async function addSale(customerId, qty, price, isUdhaar) {
  qty = parseFloat(qty); price = parseFloat(price);
  if (qty <= 0 || price < 0) { showToast('Invalid input'); return false; }
  if (qty > inventory.available) { showToast(`Only ${inventory.available} packets left!`); return false; }
  
  const cust = customers.find(c => c._id === customerId);
  if (!cust) return false;
  
  const total = qty * price;
  
  // Update inventory
  inventory.available -= qty;
  await apiCall('/inventory', 'PUT', { available: inventory.available });
  
  // Update customer
  cust.totalPackets = (cust.totalPackets || 0) + qty;
  if (isUdhaar) {
    cust.creditPackets = (cust.creditPackets || 0) + qty;
    cust.udhaar = (cust.udhaar || 0) + total;
  } else {
    cust.paidPackets = (cust.paidPackets || 0) + qty;
  }
  await apiCall(`/customers/${customerId}`, 'PUT', cust);
  
  // Update today's stats
  today.packetsSold += qty;
  const todayStr = new Date().toISOString().slice(0,10);
  await apiCall('/stats/today', 'PUT', {
    date: todayStr,
    packets: today.packetsSold,
    credit: isUdhaar ? qty : 0,
    paid: isUdhaar ? 0 : qty
  });
  
  showToast(`📦 ${qty} packets to ${cust.name}`);
  await refreshUI();
  return true;
}

async function addPayment(customerId, amount) {
  amount = parseFloat(amount);
  const cust = customers.find(c => c._id === customerId);
  if (!cust) return false;
  if (amount <= 0) { showToast('Enter amount'); return false; }
  if (amount > cust.udhaar) { showToast(`Due: ₹${cust.udhaar}`); return false; }
  
  const paymentRatio = amount / cust.udhaar;
  const packetsToConvert = Math.floor((cust.creditPackets || 0) * paymentRatio);
  
  cust.udhaar -= amount;
  cust.creditPackets = (cust.creditPackets || 0) - packetsToConvert;
  cust.paidPackets = (cust.paidPackets || 0) + packetsToConvert;
  
  await apiCall(`/customers/${customerId}`, 'PUT', cust);
  showToast(`💵 ₹${amount} received`);
  await refreshUI();
  return true;
}

async function addInventory(qty) {
  qty = parseInt(qty);
  if (qty <= 0) { showToast('Enter valid quantity'); return false; }
  inventory.available += qty;
  await apiCall('/inventory', 'PUT', { available: inventory.available });
  showToast(`✅ Added ${qty} packets`);
  await refreshUI();
  return true;
}

// Event Listeners
function setupEventListeners() {
  // Search
  document.getElementById('searchInput').addEventListener('input', renderCustomers);
  
  // Tab Navigation
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      item.classList.add('active');
      const tab = item.dataset.tab;
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
      document.getElementById(`view-${tab}`).classList.add('active');
      document.getElementById('fabAddSale').classList.toggle('hidden', tab !== 'customers');
      
      if (tab === 'customers') renderCustomers();
      else if (tab === 'udhaar') renderUdhaar();
      else if (tab === 'summary') renderSummary();
    });
  });
  
  // Inventory
  document.getElementById('addInventoryBtn').addEventListener('click', () => openModal('inventoryModal'));
  document.getElementById('saveInventory').addEventListener('click', async () => {
    const qty = document.getElementById('inventoryQty').value;
    if (await addInventory(qty)) closeModal('inventoryModal');
  });
  
  // Customer
  document.getElementById('addCustomerBtn').addEventListener('click', () => openModal('customerModal'));
  document.getElementById('saveCustomer').addEventListener('click', async () => {
    const name = document.getElementById('custName').value;
    const mobile = document.getElementById('custMobile').value;
    if (await addCustomer(name, mobile)) closeModal('customerModal');
  });
  
  // FAB Sale
  document.getElementById('fabAddSale').addEventListener('click', () => {
    if (customers.length === 0) { showToast('Add a customer first'); return; }
    if (inventory.available <= 0) { showToast('No stock! Add inventory.'); return; }
    
    const select = document.getElementById('saleCustomerSelect');
    select.innerHTML = customers.map(c => `<option value="${c._id}">${c.name}</option>`).join('');
    document.getElementById('saleQty').value = 1;
    document.getElementById('salePrice').value = 10;
    document.getElementById('saleUdhaarCheck').checked = true;
    openModal('saleModal');
  });
  
  // Sale
  document.getElementById('saveSale').addEventListener('click', async () => {
    const custId = document.getElementById('saleCustomerSelect').value;
    const qty = document.getElementById('saleQty').value;
    const price = document.getElementById('salePrice').value;
    const isUdhaar = document.getElementById('saleUdhaarCheck').checked;
    if (await addSale(custId, qty, price, isUdhaar)) closeModal('saleModal');
  });
  
  // Payment
  document.getElementById('submitPayment').addEventListener('click', async () => {
    const custId = document.getElementById('payCustomerId').value;
    const amt = document.getElementById('payAmount').value;
    if (await addPayment(custId, amt)) closeModal('paymentModal');
  });
  
  // Delegation
  document.body.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const id = btn.dataset.id;
    
    if (action === 'quickSale') {
      const cust = customers.find(c => c._id === id);
      if (cust) {
        if (inventory.available <= 0) { showToast('No stock!'); return; }
        const select = document.getElementById('saleCustomerSelect');
        select.innerHTML = customers.map(c => `<option value="${c._id}">${c.name}</option>`).join('');
        select.value = cust._id;
        document.getElementById('saleQty').value = 1;
        document.getElementById('salePrice').value = 10;
        document.getElementById('saleUdhaarCheck').checked = true;
        openModal('saleModal');
      }
    } else if (action === 'deleteCustomer') {
      deleteCustomer(id);
    } else if (action === 'payUdhaar') {
      const cust = customers.find(c => c._id === id);
      if (cust) {
        document.getElementById('payCustomerId').value = cust._id;
        document.getElementById('payCustomerName').textContent = cust.name;
        document.getElementById('payDueAmount').textContent = cust.udhaar;
        document.getElementById('payCreditPackets').textContent = cust.creditPackets || 0;
        document.getElementById('payAmount').value = cust.udhaar;
        openModal('paymentModal');
      }
    }
  });
  
  // Close modals
  document.querySelectorAll('.modal').forEach(m => {
    m.addEventListener('click', e => { if (e.target === m) m.classList.remove('show'); });
  });
}

// Make closeModal global
window.closeModal = closeModal;
