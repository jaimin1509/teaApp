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
let toastTimeout = null;

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

// Helper Functions - Perfect Toast Animation
function showToast(msg, duration = 2000, type = 'success') {
  const toast = document.getElementById('toast');
  
  // Clear previous timeout
  if (toastTimeout) clearTimeout(toastTimeout);
  
  // Set message and type
  toast.textContent = msg;
  toast.className = `toast-message toast-${type}`;
  
  // Force reflow
  toast.offsetHeight;
  
  // Show with animation
  toast.classList.add('show');
  
  // Hide after duration
  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
    toastTimeout = null;
  }, duration);
}

function closeModal(id) {
  const modal = document.getElementById(id);
  const content = modal.querySelector('.modal-content');
  
  content.style.transform = 'translateY(100%)';
  modal.style.opacity = '0';
  
  setTimeout(() => {
    modal.classList.remove('show');
    content.style.transform = '';
    modal.style.opacity = '';
    document.body.style.overflow = '';
  }, 250);
}

function openModal(id) {
  const modal = document.getElementById(id);
  const content = modal.querySelector('.modal-content');
  
  modal.classList.add('show');
  modal.style.opacity = '0';
  content.style.transform = 'translateY(100%)';
  
  // Force reflow
  modal.offsetHeight;
  
  modal.style.opacity = '1';
  content.style.transform = 'translateY(0)';
  
  document.body.style.overflow = 'hidden';
  
  // Focus first input
  setTimeout(() => {
    const firstInput = modal.querySelector('input, select');
    if (firstInput) firstInput.focus();
  }, 300);
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
    showToast('Please fill all fields', 2000, 'error');
    return;
  }
  
  if (phone.length !== 10) {
    showToast('Enter valid 10-digit mobile', 2000, 'error');
    return;
  }
  
  const btn = e.target.querySelector('button');
  btn.disabled = true;
  btn.innerHTML = '<span class="loading-spinner"></span> Creating...';
  
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
      showToast('✨ Account created! Welcome aboard', 2500, 'success');
      initApp();
    } else {
      showToast(data.error || 'Registration failed', 2000, 'error');
    }
  } catch (error) {
    showToast('Connection error. Try again', 2000, 'error');
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
    showToast('Enter mobile and password', 2000, 'error');
    return;
  }
  
  const btn = e.target.querySelector('button');
  btn.disabled = true;
  btn.innerHTML = '<span class="loading-spinner"></span> Logging in...';
  
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
      showToast('👋 Welcome back!', 2000, 'success');
      initApp();
    } else {
      showToast(data.error || 'Invalid credentials', 2000, 'error');
    }
  } catch (error) {
    showToast('Connection error', 2000, 'error');
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
  inventory = { available: 0 };
  today = { date: new Date().toISOString().slice(0,10), packetsSold: 0 };
  showLoginScreen();
  document.getElementById('loginPhone').value = '';
  document.getElementById('loginPassword').value = '';
  showToast('👋 Logged out successfully', 2000, 'success');
});

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
  
  animateValue('availablePackets', inventory.available || 0);
  animateValue('headerTodayPackets', today.packetsSold || 0);
  document.getElementById('headerTotalUdhaar').textContent = '₹' + totalUdhaar;
  
  const pendingCount = customers.filter(c => c.udhaar > 0).length;
  const pendingEl = document.getElementById('pendingCount');
  if (pendingEl) pendingEl.textContent = pendingCount;
  
  const d = new Date();
  document.getElementById('dateDisplay').textContent = d.toLocaleDateString('en-IN', { 
    weekday: 'short', day: '2-digit', month: 'short' 
  });
}

function animateValue(elementId, value) {
  const el = document.getElementById(elementId);
  if (!el) return;
  
  const current = parseInt(el.textContent) || 0;
  if (current === value) {
    el.textContent = value;
    return;
  }
  
  const duration = 400;
  const step = (value - current) / (duration / 16);
  let currentValue = current;
  
  const animate = () => {
    currentValue += step;
    if ((step > 0 && currentValue >= value) || (step < 0 && currentValue <= value)) {
      el.textContent = value;
    } else {
      el.textContent = Math.round(currentValue);
      requestAnimationFrame(animate);
    }
  };
  
  requestAnimationFrame(animate);
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
  filtered.forEach((c, index) => {
    html += `
      <div class="customer-card" style="animation: fadeInUp 0.3s ease-out ${index * 0.03}s both;">
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
  dueCustomers.forEach((c, index) => {
    html += `
      <div class="customer-card" style="animation: fadeInUp 0.3s ease-out ${index * 0.03}s both;">
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
  const totalPaidPackets = customers.reduce((s, c) => s + (c.paidPackets || 0), 0);
  const top5 = [...customers].filter(c => c.totalPackets > 0).sort((a, b) => (b.totalPackets || 0) - (a.totalPackets || 0)).slice(0, 5);
  
  let topHtml = '';
  if (top5.length > 0) {
    top5.forEach((c, i) => {
      topHtml += `<div style="display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid var(--border-color);"><span><strong>#${i+1}</strong> ${c.name}</span><span style="background:var(--primary-light); padding:4px 12px; border-radius:20px;">${c.totalPackets || 0} pkts</span></div>`;
    });
  } else {
    topHtml = '<p style="text-align:center; color:var(--text-muted);">No sales yet</p>';
  }
  
  const container = document.getElementById('summaryContent');
  if (!container) return;
  
  container.innerHTML = `
    <div class="summary-grid">
      <div class="summary-card" style="animation: fadeInUp 0.3s ease-out 0s both;"><div class="big-number">${inventory.available || 0}</div><div class="label">In Stock</div></div>
      <div class="summary-card" style="animation: fadeInUp 0.3s ease-out 0.05s both;"><div class="big-number">${today.packetsSold || 0}</div><div class="label">Sold Today</div></div>
      <div class="summary-card" style="animation: fadeInUp 0.3s ease-out 0.1s both;"><div class="big-number" style="color:var(--danger);">₹${totalUdhaar}</div><div class="label">Total Udhaar</div></div>
      <div class="summary-card" style="animation: fadeInUp 0.3s ease-out 0.15s both;"><div class="big-number" style="color:var(--success);">${totalPaidPackets}</div><div class="label">Total Paid Packets</div></div>
    </div>
    
    <div class="view-header"><h2 class="view-title">🏆 Top Customers</h2></div>
    <div class="customer-card" style="padding:8px 16px; animation: fadeInUp 0.3s ease-out 0.2s both;">${topHtml}</div>
    
    <div class="view-header" style="margin-top:20px;"><h2 class="view-title">📊 Quick Stats</h2></div>
    <div class="customer-card" style="text-align:center; animation: fadeInUp 0.3s ease-out 0.25s both;">
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
  if (!name.trim()) { 
    showToast('Please enter customer name', 2000, 'error'); 
    return false; 
  }
  
  showToast('Adding customer...', 1000, 'info');
  
  try {
    await apiCall('/customers', 'POST', { name: name.trim(), mobile: mobile.trim() });
    showToast(`✨ ${name} added successfully!`, 2000, 'success');
    await refreshUI();
    return true;
  } catch (error) {
    showToast(error.message || 'Error adding customer', 2000, 'error');
    return false;
  }
}

async function deleteCustomer(id) {
  const cust = customers.find(c => c._id === id);
  if (!cust) return;
  if (cust.udhaar > 0 && !confirm(`${cust.name} owes ₹${cust.udhaar}. Delete anyway?`)) return;
  if (!confirm(`Delete ${cust.name}?`)) return;
  
  showToast('Deleting...', 1000, 'info');
  
  try {
    await apiCall(`/customers/${id}`, 'DELETE');
    showToast(`🗑️ ${cust.name} removed`, 2000, 'success');
    await refreshUI();
  } catch (error) {
    showToast('Error deleting customer', 2000, 'error');
  }
}

async function addSale(customerId, qty, price, isUdhaar) {
  qty = parseFloat(qty);
  price = parseFloat(price);
  
  if (qty <= 0 || price < 0) { 
    showToast('Invalid quantity or price', 2000, 'error'); 
    return false; 
  }
  if (qty > inventory.available) { 
    showToast(`Only ${inventory.available} packets in stock`, 2000, 'error'); 
    return false; 
  }
  
  const cust = customers.find(c => c._id === customerId);
  if (!cust) return false;
  
  showToast('Processing sale...', 1000, 'info');
  
  try {
    inventory.available -= qty;
    await apiCall('/inventory', 'PUT', { available: inventory.available });
    
    cust.totalPackets = (cust.totalPackets || 0) + qty;
    if (isUdhaar) {
      cust.creditPackets = (cust.creditPackets || 0) + qty;
      cust.udhaar = (cust.udhaar || 0) + (qty * price);
    } else {
      cust.paidPackets = (cust.paidPackets || 0) + qty;
    }
    await apiCall(`/customers/${customerId}`, 'PUT', cust);
    
    today.packetsSold += qty;
    const todayStr = new Date().toISOString().slice(0,10);
    await apiCall('/stats/today', 'PUT', { 
      date: todayStr, 
      packets: today.packetsSold, 
      credit: isUdhaar ? qty : 0, 
      paid: isUdhaar ? 0 : qty 
    });
    
    showToast(`✅ ${qty} packets sold to ${cust.name}`, 2000, 'success');
    await refreshUI();
    return true;
  } catch (error) {
    showToast('Error processing sale', 2000, 'error');
    return false;
  }
}

async function addPayment(customerId, amount) {
  amount = parseFloat(amount);
  const cust = customers.find(c => c._id === customerId);
  if (!cust) return false;
  if (amount <= 0) { 
    showToast('Enter valid amount', 2000, 'error'); 
    return false; 
  }
  if (amount > cust.udhaar) { 
    showToast(`Due amount is only ₹${cust.udhaar}`, 2000, 'error'); 
    return false; 
  }
  
  showToast('Processing payment...', 1000, 'info');
  
  try {
    const ratio = amount / cust.udhaar;
    const packetsToConvert = Math.floor((cust.creditPackets || 0) * ratio);
    
    cust.udhaar -= amount;
    cust.creditPackets -= packetsToConvert;
    cust.paidPackets += packetsToConvert;
    
    await apiCall(`/customers/${customerId}`, 'PUT', cust);
    showToast(`💵 ₹${amount} received from ${cust.name}`, 2000, 'success');
    await refreshUI();
    return true;
  } catch (error) {
    showToast('Error processing payment', 2000, 'error');
    return false;
  }
}

async function addInventory(qty) {
  qty = parseInt(qty);
  if (qty <= 0) { 
    showToast('Enter valid quantity', 2000, 'error'); 
    return false; 
  }
  
  showToast('Adding stock...', 1000, 'info');
  
  try {
    inventory.available += qty;
    await apiCall('/inventory', 'PUT', { available: inventory.available });
    showToast(`📦 Added ${qty} packets to inventory`, 2000, 'success');
    await refreshUI();
    return true;
  } catch (error) {
    showToast('Error adding inventory', 2000, 'error');
    return false;
  }
}

function setupEventListeners() {
  document.getElementById('searchInput')?.addEventListener('input', renderCustomers);
  
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      item.classList.add('active');
      const tab = item.dataset.tab;
      
      const views = document.querySelectorAll('.view');
      views.forEach(v => {
        v.style.opacity = '0';
        setTimeout(() => v.classList.remove('active'), 150);
      });
      
      setTimeout(() => {
        const activeView = document.getElementById(`view-${tab}`);
        activeView.classList.add('active');
        activeView.style.opacity = '0';
        requestAnimationFrame(() => {
          activeView.style.transition = 'opacity 0.25s ease-out';
          activeView.style.opacity = '1';
        });
      }, 150);
      
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
    if (customers.length === 0) { 
      showToast('Add a customer first', 2000, 'error'); 
      return; 
    }
    if (inventory.available <= 0) { 
      showToast('No stock! Add inventory first', 2000, 'error'); 
      return; 
    }
    
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
    const warning = document.getElementById('availabilityWarning');
    if (qty > inventory.available) {
      warning.textContent = `Only ${inventory.available} available!`;
    } else {
      warning.textContent = '';
    }
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
    
    btn.style.transform = 'scale(0.96)';
    setTimeout(() => btn.style.transform = '', 120);
    
    const action = btn.dataset.action;
    const id = btn.dataset.id;
    
    if (action === 'quickSale') {
      const cust = customers.find(c => c._id === id);
      if (cust) {
        if (inventory.available <= 0) { 
          showToast('No stock! Add inventory first', 2000, 'error'); 
          return; 
        }
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
    m.addEventListener('click', (e) => { 
      if (e.target === m) closeModal(m.id);
    });
  });
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal.show').forEach(m => closeModal(m.id));
    }
  });
}

// Inject animations
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @keyframes slideIn {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }
  
  .loading-spinner {
    width: 18px;
    height: 18px;
    border: 2px solid rgba(255,255,255,0.3);
    border-radius: 50%;
    border-top-color: white;
    display: inline-block;
    animation: spin 0.7s linear infinite;
    margin-right: 8px;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  .view {
    transition: opacity 0.25s ease-out;
  }
  
  .modal {
    transition: opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .modal-content {
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  
  .btn {
    transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1) !important;
  }
  
  .toast-message {
    position: fixed;
    bottom: 100px;
    left: 20px;
    right: 20px;
    max-width: 420px;
    margin: 0 auto;
    padding: 16px 22px;
    border-radius: 60px;
    text-align: center;
    font-weight: 600;
    font-size: 0.95rem;
    z-index: 1000;
    opacity: 0;
    transform: translateY(30px);
    transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
    pointer-events: none;
    box-shadow: 0 10px 30px rgba(0,0,0,0.15);
    backdrop-filter: blur(10px);
  }
  
  .toast-message.show {
    opacity: 1;
    transform: translateY(0);
  }
  
  .toast-success {
    background: #16A34A;
    color: white;
  }
  
  .toast-error {
    background: #DC2626;
    color: white;
  }
  
  .toast-info {
    background: #EA580C;
    color: white;
  }
`;
document.head.appendChild(style);

window.closeModal = closeModal;
