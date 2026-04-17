// API Configuration
const API_URL = '/api';
let authToken = localStorage.getItem('chaiToken');
let currentUser = null;

try {
  const userStr = localStorage.getItem('chaiUser');
  if (userStr) currentUser = JSON.parse(userStr);
} catch(e) {
  currentUser = null;
}

// State
let customers = [];
let inventory = { available: 0 };
let today = { date: new Date().toISOString().slice(0,10), packetsSold: 0 };

// Check login status on load
if (authToken && currentUser) {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('mainApp').style.display = 'block';
  initApp();
} else {
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('mainApp').style.display = 'none';
}

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
  if (!name) return '?';
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
  
  try {
    const res = await fetch(`${API_URL}${endpoint}`, options);
    const data = await res.json();
    
    if (!res.ok) {
      throw new Error(data.error || 'Request failed');
    }
    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// Login Handler
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const phone = document.getElementById('loginPhone').value.trim();
  const password = document.getElementById('loginPassword').value;
  
  if (!phone || !password) {
    showToast('❌ Please enter mobile and password');
    return;
  }
  
  const loginBtn = e.target.querySelector('button');
  loginBtn.disabled = true;
  loginBtn.textContent = 'Logging in...';
  
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
      
      showToast('✅ Login successful!');
      initApp();
    } else {
      showToast('❌ ' + (data.error || 'Invalid credentials'));
    }
  } catch (error) {
    console.error('Login error:', error);
    showToast('❌ Connection error. Please try again.');
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = 'Login';
  }
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('chaiToken');
  localStorage.removeItem('chaiUser');
  authToken = null;
  currentUser = null;
  document.getElementById('mainApp').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('loginPhone').value = '';
  document.getElementById('loginPassword').value = '';
  showToast('👋 Logged out successfully');
});

// Initialize App
async function initApp() {
  updateHeaderStats();
  await loadData();
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
    showToast('⚠️ Could not load data');
  }
}

function updateHeaderStats() {
  const totalUdhaar = customers.reduce((s, c) => s + (c.udhaar || 0), 0);
  document.getElementById('availablePackets').textContent = inventory.available || 0;
  document.getElementById('headerTodayPackets').textContent = today.packetsSold || 0;
  document.getElementById('headerTotalUdhaar').textContent = '₹' + totalUdhaar;
  
  const pendingCount = customers.filter(c => c.udhaar > 0).length;
  const pendingEl = document.getElementById('pendingCount');
  if (pendingEl) pendingEl.textContent = pendingCount;
  
  const d = new Date();
  document.getElementById('dateDisplay').textContent = d.toLocaleDateString('en-IN', { 
    weekday: 'short', day: '2-digit', month: 'short' 
  });
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
  if (!container) return;
  
  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>📭 No customers found</p><p style="font-size:0.85rem; margin-top:8px;">Tap "Add New Customer" to begin</p></div>';
    updateHeaderStats();
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
          <button class="btn btn-danger" data-action="deleteCustomer" data-id="${c._id}">🗑️ Delete</button>
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
  if (!container) return;
  
  const pendingCount = document.getElementById('pendingCount');
  if (pendingCount) pendingCount.textContent = dueCustomers.length;
  
  if (dueCustomers.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>🎉 No pending payments!</p><p style="font-size:0.85rem; margin-top:8px;">All customers have paid</p></div>';
    updateHeaderStats();
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
            <div class="customer-mobile">📦 ${c.creditPackets || 0} credit packets</div>
          </div>
        </div>
        <div style="text-align:center; margin:12px 0;">
          <span style="font-size:2rem; font-weight:800; color:var(--danger);">₹${c.udhaar}</span>
          <span style="color:var(--text-muted); margin-left:8px;">pending</span>
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
    topHtml += `<div style="display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid var(--border-light);"><span><strong>#${i+1}</strong> ${c.name}</span><span style="background:var(--primary-light); padding:4px 12px; border-radius:20px; font-weight:600;">${c.totalPackets || 0} pkts</span></div>`;
  });
  
  const container = document.getElementById('summaryContent');
  if (!container) return;
  
  container.innerHTML = `
    <div class="summary-grid">
      <div class="summary-card"><div class="value">${inventory.available || 0}</div><div class="label">In Stock</div></div>
      <div class="summary-card"><div class="value">${today.packetsSold || 0}</div><div class="label">Sold Today</div></div>
      <div class="summary-card"><div class="value" style="color:var(--danger);">₹${totalUdhaar}</div><div class="label">Total Udhaar</div></div>
      <div class="summary-card"><div class="value" style="color:var(--success);">${paidCount}</div><div class="label">Fully Paid</div></div>
    </div>
    
    <div class="section-header" style="margin-top:20px;">
      <h2 class="section-title">🏆 Top Customers</h2>
    </div>
    <div class="customer-card" style="padding:8px 16px;">
      ${topHtml || '<p style="color:var(--text-muted); text-align:center; padding:20px;">No sales data yet</p>'}
    </div>
    
    <div class="section-header" style="margin-top:20px;">
      <h2 class="section-title">📊 Quick Stats</h2>
    </div>
    <div class="customer-card" style="text-align:center;">
      <p style="font-size:1.1rem; color:var(--text-secondary);">Total Customers: <strong>${customers.length}</strong></p>
      <p style="font-size:1.1rem; color:var(--text-secondary); margin-top:8px;">Total Packets Sold: <strong>${customers.reduce((s,c) => s + (c.totalPackets || 0), 0)}</strong></p>
    </div>
  `;
  updateHeaderStats();
}

async function refreshUI() {
  await loadData();
  const activeView = document.querySelector('.view.active');
  if (activeView.id === 'view-customers') renderCustomers();
  else if (activeView.id === 'view-udhaar') renderUdhaar();
  else if (activeView.id === 'view-summary') renderSummary();
  updateHeaderStats();
}

// Actions
async function addCustomer(name, mobile) {
  if (!name.trim()) { showToast('❌ Name is required'); return false; }
  try {
    await apiCall('/customers', 'POST', { name: name.trim(), mobile: mobile.trim() });
    showToast(`✅ ${name} added successfully`);
    await refreshUI();
    return true;
  } catch (error) {
    showToast('❌ ' + (error.message || 'Error adding customer'));
    return false;
  }
}

async function deleteCustomer(id) {
  const cust = customers.find(c => c._id === id);
  if (!cust) return;
  if (cust.udhaar > 0 && !confirm(`${cust.name} still owes ₹${cust.udhaar}. Delete anyway?`)) return;
  if (!confirm(`Are you sure you want to delete ${cust.name}?`)) return;
  
  try {
    await apiCall(`/customers/${id}`, 'DELETE');
    showToast(`🗑️ ${cust.name} removed`);
    await refreshUI();
  } catch (error) {
    showToast('❌ Error deleting customer');
  }
}

async function addSale(customerId, qty, price, isUdhaar) {
  qty = parseFloat(qty);
  price = parseFloat(price);
  
  if (qty <= 0 || price < 0) { showToast('❌ Invalid quantity or price'); return false; }
  if (qty > inventory.available) { showToast(`❌ Only ${inventory.available} packets in stock!`); return false; }
  
  const cust = customers.find(c => c._id === customerId);
  if (!cust) return false;
  
  const total = qty * price;
  
  try {
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
    
    showToast(`✅ ${qty} packets sold to ${cust.name} ${isUdhaar ? '(Credit)' : '(Paid)'}`);
    await refreshUI();
    return true;
  } catch (error) {
    showToast('❌ Error processing sale');
    return false;
  }
}

async function addPayment(customerId, amount) {
  amount = parseFloat(amount);
  const cust = customers.find(c => c._id === customerId);
  if (!cust) return false;
  if (amount <= 0) { showToast('❌ Enter valid amount'); return false; }
  if (amount > cust.udhaar) { showToast(`❌ Due amount is only ₹${cust.udhaar}`); return false; }
  
  try {
    const paymentRatio = amount / cust.udhaar;
    const packetsToConvert = Math.floor((cust.creditPackets || 0) * paymentRatio);
    
    cust.udhaar -= amount;
    cust.creditPackets = (cust.creditPackets || 0) - packetsToConvert;
    cust.paidPackets = (cust.paidPackets || 0) + packetsToConvert;
    
    await apiCall(`/customers/${customerId}`, 'PUT', cust);
    showToast(`💵 ₹${amount} received from ${cust.name}`);
    await refreshUI();
    return true;
  } catch (error) {
    showToast('❌ Error processing payment');
    return false;
  }
}

async function addInventory(qty) {
  qty = parseInt(qty);
  if (qty <= 0) { showToast('❌ Enter valid quantity'); return false; }
  
  try {
    inventory.available += qty;
    await apiCall('/inventory', 'PUT', { available: inventory.available });
    showToast(`📦 Added ${qty} packets to inventory`);
    await refreshUI();
    return true;
  } catch (error) {
    showToast('❌ Error adding inventory');
    return false;
  }
}

// Event Listeners
function setupEventListeners() {
  // Search
  const searchInput = document.getElementById('searchInput');
  if (searchInput) searchInput.addEventListener('input', renderCustomers);
  
  // Tab Navigation
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      item.classList.add('active');
      const tab = item.dataset.tab;
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
      document.getElementById(`view-${tab}`).classList.add('active');
      
      const fab = document.getElementById('fabAddSale');
      if (fab) fab.classList.toggle('hidden', tab !== 'customers');
      
      if (tab === 'customers') renderCustomers();
      else if (tab === 'udhaar') renderUdhaar();
      else if (tab === 'summary') renderSummary();
    });
  });
  
  // Inventory
  const addInvBtn = document.getElementById('addInventoryBtn');
  if (addInvBtn) addInvBtn.addEventListener('click', () => openModal('inventoryModal'));
  
  const saveInvBtn = document.getElementById('saveInventory');
  if (saveInvBtn) saveInvBtn.addEventListener('click', async () => {
    const qty = document.getElementById('inventoryQty').value;
    if (await addInventory(qty)) closeModal('inventoryModal');
  });
  
  // Customer
  const addCustBtn = document.getElementById('addCustomerBtn');
  if (addCustBtn) addCustBtn.addEventListener('click', () => openModal('customerModal'));
  
  const saveCustBtn = document.getElementById('saveCustomer');
  if (saveCustBtn) saveCustBtn.addEventListener('click', async () => {
    const name = document.getElementById('custName').value;
    const mobile = document.getElementById('custMobile').value;
    if (await addCustomer(name, mobile)) {
      document.getElementById('custName').value = '';
      document.getElementById('custMobile').value = '';
      closeModal('customerModal');
    }
  });
  
  // FAB Sale
  const fabBtn = document.getElementById('fabAddSale');
  if (fabBtn) fabBtn.addEventListener('click', () => {
    if (customers.length === 0) { showToast('❌ Add a customer first'); return; }
    if (inventory.available <= 0) { showToast('❌ No stock available! Add inventory first.'); return; }
    
    const select = document.getElementById('saleCustomerSelect');
    if (select) {
      select.innerHTML = customers.map(c => `<option value="${c._id}">${c.name}</option>`).join('');
    }
    document.getElementById('saleQty').value = 1;
    document.getElementById('salePrice').value = 10;
    document.getElementById('saleUdhaarCheck').checked = true;
    document.getElementById('availabilityWarning').textContent = '';
    openModal('saleModal');
  });
  
  // Sale
  const saleQty = document.getElementById('saleQty');
  if (saleQty) saleQty.addEventListener('input', () => {
    const qty = parseFloat(saleQty.value) || 0;
    const warning = document.getElementById('availabilityWarning');
    if (warning) warning.textContent = qty > inventory.available ? `⚠️ Only ${inventory.available} packets available!` : '';
  });
  
  const saveSaleBtn = document.getElementById('saveSale');
  if (saveSaleBtn) saveSaleBtn.addEventListener('click', async () => {
    const custId = document.getElementById('saleCustomerSelect').value;
    const qty = document.getElementById('saleQty').value;
    const price = document.getElementById('salePrice').value;
    const isUdhaar = document.getElementById('saleUdhaarCheck').checked;
    if (await addSale(custId, qty, price, isUdhaar)) closeModal('saleModal');
  });
  
  // Payment
  const submitPayBtn = document.getElementById('submitPayment');
  if (submitPayBtn) submitPayBtn.addEventListener('click', async () => {
    const custId = document.getElementById('payCustomerId').value;
    const amt = document.getElementById('payAmount').value;
    if (await addPayment(custId, amt)) closeModal('paymentModal');
  });
  
  // Delegation for dynamic buttons
  document.body.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    
    const action = btn.dataset.action;
    const id = btn.dataset.id;
    
    if (action === 'quickSale') {
      const cust = customers.find(c => c._id === id);
      if (cust) {
        if (inventory.available <= 0) { showToast('❌ No stock available!'); return; }
        const select = document.getElementById('saleCustomerSelect');
        if (select) {
          select.innerHTML = customers.map(c => `<option value="${c._id}">${c.name}</option>`).join('');
          select.value = cust._id;
        }
        document.getElementById('saleQty').value = 1;
        document.getElementById('salePrice').value = 10;
        document.getElementById('saleUdhaarCheck').checked = true;
        document.getElementById('availabilityWarning').textContent = '';
        openModal('saleModal');
      }
    } else if (action === 'deleteCustomer') {
      deleteCustomer(id);
    } else if (action === 'payUdhaar') {
      const cust = customers.find(c => c._id === id);
      if (cust) {
        document.getElementById('payCustomerId').value = cust._id;
        document.getElementById('payCustomerName').textContent = cust.name;
        document.getElementById('payDueAmount').textContent = `₹${cust.udhaar}`;
        document.getElementById('payCreditPackets').textContent = cust.creditPackets || 0;
        document.getElementById('payAmount').value = cust.udhaar;
        openModal('paymentModal');
      }
    }
  });
  
  // Close modals on overlay click
  document.querySelectorAll('.modal').forEach(m => {
    m.addEventListener('click', (e) => { 
      if (e.target === m) m.classList.remove('show'); 
    });
  });
}

// Make closeModal available globally
window.closeModal = closeModal;
