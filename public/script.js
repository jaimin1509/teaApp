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

// Check login on load
if (authToken && currentUser) {
  showMainApp();
  initApp();
} else {
  showLoginScreen();
}

function showLoginScreen() {
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('registerScreen').style.display = 'none';
  document.getElementById('mainApp').style.display = 'none';
}

function showRegisterScreen() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('registerScreen').style.display = 'flex';
  document.getElementById('mainApp').style.display = 'none';
}

function showMainApp() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('registerScreen').style.display = 'none';
  document.getElementById('mainApp').style.display = 'block';
}

// Toggle Login/Register
document.addEventListener('click', (e) => {
  if (e.target.id === 'showRegister') {
    e.preventDefault();
    showRegisterScreen();
  }
  if (e.target.id === 'showLogin') {
    e.preventDefault();
    showLoginScreen();
  }
});

// Helper Functions
function showToast(msg, duration = 1500) {
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

// Register Handler
document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const name = document.getElementById('regName').value.trim();
  const phone = document.getElementById('regPhone').value.trim();
  const password = document.getElementById('regPassword').value;
  
  if (!name || !phone || !password) {
    showToast('All fields are required');
    return;
  }
  
  if (phone.length !== 10) {
    showToast('Enter valid 10-digit mobile');
    return;
  }
  
  const btn = e.target.querySelector('button');
  btn.disabled = true;
  btn.textContent = 'Creating...';
  
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
      
      showMainApp();
      showToast('Account created!');
      initApp();
    } else {
      showToast(data.error || 'Registration failed');
    }
  } catch (error) {
    showToast('Connection error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Create Account';
  }
});

// Login Handler
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const phone = document.getElementById('loginPhone').value.trim();
  const password = document.getElementById('loginPassword').value;
  
  if (!phone || !password) {
    showToast('Enter mobile and password');
    return;
  }
  
  const btn = e.target.querySelector('button');
  btn.disabled = true;
  btn.textContent = 'Logging in...';
  
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
      
      showMainApp();
      showToast('Login successful!');
      initApp();
    } else {
      showToast(data.error || 'Invalid credentials');
    }
  } catch (error) {
    showToast('Connection error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Login';
  }
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('chaiToken');
  localStorage.removeItem('chaiUser');
  authToken = null;
  currentUser = null;
  customers = [];
  showLoginScreen();
  document.getElementById('loginPhone').value = '';
  document.getElementById('loginPassword').value = '';
  showToast('Logged out');
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

function renderCustomers() {
  const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
  let filtered = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm) || (c.mobile && c.mobile.includes(searchTerm))
  );
  filtered.sort((a, b) => a.name.localeCompare(b.name));
  
  const container = document.getElementById('customersList');
  if (!container) return;
  
  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>📭 No customers</p><p style="font-size:0.85rem;">Tap "Add New Customer"</p></div>';
    updateHeaderStats();
    return;
  }
  
  let html = '';
  filtered.forEach(c => {
    html += `
      <div class="customer-card">
        <div class="card-header">
          <div class="avatar">${getInitials(c.name)}</div>
          <div class="card-title">
            <div class="customer-name">${c.name}</div>
            <div class="customer-phone">📞 ${c.mobile || 'No mobile'}</div>
          </div>
        </div>
        <div class="stats-grid">
          <div class="stat-box"><div class="label">Total</div><div class="value">${c.totalPackets || 0}</div></div>
          <div class="stat-box credit"><div class="label">Credit</div><div class="value">${c.creditPackets || 0}</div></div>
          <div class="stat-box paid"><div class="label">Paid</div><div class="value">${c.paidPackets || 0}</div></div>
          <div class="stat-box ${c.udhaar > 0 ? 'credit' : ''}"><div class="label">Due</div><div class="value">₹${c.udhaar || 0}</div></div>
        </div>
        <div class="card-actions">
          <button class="btn btn-primary" data-action="quickSale" data-id="${c._id}">Sell</button>
          <button class="btn btn-danger" data-action="deleteCustomer" data-id="${c._id}">Delete</button>
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
    container.innerHTML = '<div class="empty-state"><p>🎉 No pending payments!</p></div>';
    updateHeaderStats();
    return;
  }
  
  let html = '';
  dueCustomers.forEach(c => {
    html += `
      <div class="customer-card">
        <div class="card-header">
          <div class="avatar" style="background:#FEE2E2;">${getInitials(c.name)}</div>
          <div class="card-title">
            <div class="customer-name">${c.name}</div>
            <div class="customer-phone">📦 ${c.creditPackets || 0} credit packets</div>
          </div>
        </div>
        <div style="text-align:center; margin:12px 0;">
          <span style="font-size:1.8rem; font-weight:800; color:var(--danger);">₹${c.udhaar}</span>
        </div>
        <button class="btn btn-success" data-action="payUdhaar" data-id="${c._id}" style="width:100%;">Receive Payment</button>
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
    topHtml += `<div style="display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid var(--border-color);"><span><strong>#${i+1}</strong> ${c.name}</span><span style="background:var(--primary-light); padding:4px 12px; border-radius:20px;">${c.totalPackets || 0} pkts</span></div>`;
  });
  
  const container = document.getElementById('summaryContent');
  if (!container) return;
  
  container.innerHTML = `
    <div class="summary-grid">
      <div class="summary-card"><div class="big-number">${inventory.available || 0}</div><div class="label">In Stock</div></div>
      <div class="summary-card"><div class="big-number">${today.packetsSold || 0}</div><div class="label">Sold Today</div></div>
      <div class="summary-card"><div class="big-number" style="color:var(--danger);">₹${totalUdhaar}</div><div class="label">Total Udhaar</div></div>
      <div class="summary-card"><div class="big-number" style="color:var(--success);">${paidCount}</div><div class="label">Fully Paid</div></div>
    </div>
    
    <div class="view-header"><h2 class="view-title">🏆 Top Customers</h2></div>
    <div class="customer-card" style="padding:8px 16px;">${topHtml || '<p style="text-align:center;">No data</p>'}</div>
    
    <div class="view-header" style="margin-top:20px;"><h2 class="view-title">📊 Quick Stats</h2></div>
    <div class="customer-card" style="text-align:center;">
      <p>Total Customers: <strong>${customers.length}</strong></p>
      <p style="margin-top:8px;">Total Packets Sold: <strong>${customers.reduce((s,c) => s + (c.totalPackets || 0), 0)}</strong></p>
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

async function addCustomer(name, mobile) {
  if (!name.trim()) { showToast('Name required'); return false; }
  try {
    await apiCall('/customers', 'POST', { name: name.trim(), mobile: mobile.trim() });
    showToast(`${name} added`);
    await refreshUI();
    return true;
  } catch (error) {
    showToast(error.message || 'Error');
    return false;
  }
}

async function deleteCustomer(id) {
  const cust = customers.find(c => c._id === id);
  if (!cust) return;
  if (cust.udhaar > 0 && !confirm(`${cust.name} owes ₹${cust.udhaar}. Delete?`)) return;
  if (!confirm(`Delete ${cust.name}?`)) return;
  
  try {
    await apiCall(`/customers/${id}`, 'DELETE');
    showToast(`${cust.name} removed`);
    await refreshUI();
  } catch (error) {
    showToast('Error');
  }
}

async function addSale(customerId, qty, price, isUdhaar) {
  qty = parseFloat(qty);
  price = parseFloat(price);
  
  if (qty <= 0 || price < 0) { showToast('Invalid input'); return false; }
  if (qty > inventory.available) { showToast(`Only ${inventory.available} in stock`); return false; }
  
  const cust = customers.find(c => c._id === customerId);
  if (!cust) return false;
  
  const total = qty * price;
  
  try {
    inventory.available -= qty;
    await apiCall('/inventory', 'PUT', { available: inventory.available });
    
    cust.totalPackets = (cust.totalPackets || 0) + qty;
    if (isUdhaar) {
      cust.creditPackets = (cust.creditPackets || 0) + qty;
      cust.udhaar = (cust.udhaar || 0) + total;
    } else {
      cust.paidPackets = (cust.paidPackets || 0) + qty;
    }
    await apiCall(`/customers/${customerId}`, 'PUT', cust);
    
    today.packetsSold += qty;
    const todayStr = new Date().toISOString().slice(0,10);
    await apiCall('/stats/today', 'PUT', { date: todayStr, packets: today.packetsSold, credit: isUdhaar ? qty : 0, paid: isUdhaar ? 0 : qty });
    
    showToast(`${qty} packets sold`);
    await refreshUI();
    return true;
  } catch (error) {
    showToast('Error');
    return false;
  }
}

async function addPayment(customerId, amount) {
  amount = parseFloat(amount);
  const cust = customers.find(c => c._id === customerId);
  if (!cust) return false;
  if (amount <= 0) { showToast('Enter amount'); return false; }
  if (amount > cust.udhaar) { showToast(`Due: ₹${cust.udhaar}`); return false; }
  
  try {
    const ratio = amount / cust.udhaar;
    const packetsToConvert = Math.floor((cust.creditPackets || 0) * ratio);
    
    cust.udhaar -= amount;
    cust.creditPackets -= packetsToConvert;
    cust.paidPackets += packetsToConvert;
    
    await apiCall(`/customers/${customerId}`, 'PUT', cust);
    showToast(`₹${amount} received`);
    await refreshUI();
    return true;
  } catch (error) {
    showToast('Error');
    return false;
  }
}

async function addInventory(qty) {
  qty = parseInt(qty);
  if (qty <= 0) { showToast('Enter quantity'); return false; }
  
  try {
    inventory.available += qty;
    await apiCall('/inventory', 'PUT', { available: inventory.available });
    showToast(`Added ${qty} packets`);
    await refreshUI();
    return true;
  } catch (error) {
    showToast('Error');
    return false;
  }
}

function setupEventListeners() {
  document.getElementById('searchInput')?.addEventListener('input', renderCustomers);
  
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
  
  document.getElementById('addInventoryBtn')?.addEventListener('click', () => openModal('inventoryModal'));
  document.getElementById('saveInventory')?.addEventListener('click', async () => {
    const qty = document.getElementById('inventoryQty').value;
    if (await addInventory(qty)) {
      closeModal('inventoryModal');
      document.getElementById('inventoryQty').value = 10;
    }
  });
  
  document.getElementById('addCustomerBtn')?.addEventListener('click', () => openModal('customerModal'));
  document.getElementById('saveCustomer')?.addEventListener('click', async () => {
    const name = document.getElementById('custName').value;
    const mobile = document.getElementById('custMobile').value;
    if (await addCustomer(name, mobile)) {
      closeModal('customerModal');
      document.getElementById('custName').value = '';
      document.getElementById('custMobile').value = '';
    }
  });
  
  document.getElementById('fabAddSale')?.addEventListener('click', () => {
    if (customers.length === 0) { showToast('Add a customer first'); return; }
    if (inventory.available <= 0) { showToast('No stock!'); return; }
    
    const select = document.getElementById('saleCustomerSelect');
    select.innerHTML = customers.map(c => `<option value="${c._id}">${c.name}</option>`).join('');
    document.getElementById('saleQty').value = 1;
    document.getElementById('salePrice').value = 10;
    document.getElementById('saleUdhaarCheck').checked = true;
    document.getElementById('availabilityWarning').textContent = '';
    openModal('saleModal');
  });
  
  document.getElementById('saleQty')?.addEventListener('input', () => {
    const qty = parseFloat(document.getElementById('saleQty').value) || 0;
    document.getElementById('availabilityWarning').textContent = qty > inventory.available ? `Only ${inventory.available} available!` : '';
  });
  
  document.getElementById('saveSale')?.addEventListener('click', async () => {
    const custId = document.getElementById('saleCustomerSelect').value;
    const qty = document.getElementById('saleQty').value;
    const price = document.getElementById('salePrice').value;
    const isUdhaar = document.getElementById('saleUdhaarCheck').checked;
    if (await addSale(custId, qty, price, isUdhaar)) closeModal('saleModal');
  });
  
  document.getElementById('submitPayment')?.addEventListener('click', async () => {
    const custId = document.getElementById('payCustomerId').value;
    const amt = document.getElementById('payAmount').value;
    if (await addPayment(custId, amt)) closeModal('paymentModal');
  });
  
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
        document.getElementById('payDueAmount').textContent = `₹${cust.udhaar}`;
        document.getElementById('payCreditPackets').textContent = cust.creditPackets || 0;
        document.getElementById('payAmount').value = cust.udhaar;
        openModal('paymentModal');
      }
    }
  });
  
  document.querySelectorAll('.modal').forEach(m => {
    m.addEventListener('click', (e) => { if (e.target === m) closeModal(m.id); });
  });
}

window.closeModal = closeModal;
