const state = { user: null, adminUnlocked: false, data: null };

const elements = {
  pages: document.querySelectorAll('.page'),
  navButtons: document.querySelectorAll('.nav-button'),
  productList: document.getElementById('product-list'),
  cartPanel: document.getElementById('cart-panel'),
  employeeList: document.getElementById('employee-list'),
  adminPanel: document.getElementById('admin-panel'),
  adminLockPanel: document.getElementById('admin-lock-panel'),
  adminLockMessage: document.getElementById('admin-lock-message'),
  authMessage: document.getElementById('auth-message'),
  adminCodeInput: document.getElementById('admin-code-input'),
  adminUnlockButton: document.getElementById('admin-unlock-button'),
  adminProductList: document.getElementById('admin-product-list'),
  adminEmployeeList: document.getElementById('admin-employee-list'),
  changeLocationForm: document.getElementById('change-location-form'),
  userWelcome: document.getElementById('user-welcome'),
  logoutButton: document.getElementById('logout-button'),
  cartToggle: document.getElementById('cart-toggle'),
  cartBadge: document.getElementById('cart-badge'),
  cartClose: document.getElementById('cart-close'),
  cartDropdown: document.getElementById('cart-dropdown'),
  cartSummary: document.getElementById('cart-summary'),
  cartDropdownContent: document.getElementById('cart-dropdown-content'),
  adminMessage: document.getElementById('admin-message'),
  loginForm: document.getElementById('login-form'),
  loginName: document.getElementById('login-name'),
  loginEmail: document.getElementById('login-email'),
  registerForm: document.getElementById('register-form'),
  registerEmail: document.getElementById('register-email'),
  registerName: document.getElementById('register-name'),
  registerPassword: document.getElementById('register-password'),
  registerConfirmPassword: document.getElementById('register-confirm-password'),
  addProductForm: document.getElementById('add-product-form'),
  addEmployeeForm: document.getElementById('add-employee-form'),
  changeCodeForm: document.getElementById('change-code-form'),
};

function showPage(pageId) {
  elements.pages.forEach(page => page.classList.toggle('active', page.id === pageId));
  elements.navButtons.forEach(button => button.classList.toggle('active', button.dataset.target === pageId));
}

async function fetchState() {
  const response = await fetch('/api/state');
  if (!response.ok) return null;
  const data = await response.json();
  state.data = data;
  return data;
}

function saveSession(user) {
  localStorage.setItem('mercearia-user', JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem('mercearia-user');
}

async function restoreSession() {
  const saved = localStorage.getItem('mercearia-user');
  if (!saved) return;
  try {
    const user = JSON.parse(saved);
    const email = user.email || user.username;
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: user.name, email, password: user.password }),
    });
    if (!response.ok) { clearSession(); return; }
    const res = await response.json();
    const loggedEmail = res.email;
    const name = res.name || user.name || user.username || '';
    state.user = { name, email: loggedEmail, cart: res.cart || [], password: user.password };
    state.data = state.data || await fetchState();
    updateUserInfo();
    renderCart();
  } catch (err) {
    clearSession();
  }
}

function updateUserInfo() {
  if (state.user) {
    const display = state.user.name ? `${state.user.name}` : 'Conta';
    elements.userWelcome.textContent = `Olá, ${display}. Seu carrinho está salvo nesta conta.`;
    elements.logoutButton.classList.remove('hidden');
    elements.cartToggle.classList.remove('hidden');
    updateCartBadge();
  } else {
    elements.userWelcome.textContent = 'Faça login para ver o carrinho.';
    elements.logoutButton.classList.add('hidden');
    elements.cartToggle.classList.add('hidden');
    elements.cartBadge.classList.add('hidden');
    closeCartDropdown();
  }
}

function updateCartBadge() {
  if (!state.user || !elements.cartBadge) return;
  const total = state.user.cart?.reduce((sum, item) => sum + item.price * item.quantity, 0) || 0;
  if (total <= 0) {
    elements.cartBadge.textContent = '0';
    elements.cartBadge.classList.add('hidden');
  } else {
    elements.cartBadge.textContent = formatCurrency(total);
    elements.cartBadge.classList.remove('hidden');
  }
}

function closeCartDropdown() {
  elements.cartDropdown.classList.add('hidden');
}

function toggleCartDropdown() {
  elements.cartDropdown.classList.toggle('hidden');
}

function renderCartDropdown() {
  const summary = elements.cartSummary;
  const content = elements.cartDropdownContent;
  summary.innerHTML = '';
  content.innerHTML = '';
  if (!state.user) {
    summary.innerHTML = '<div class="cart-summary-box"><p>Faça login para ver seu carrinho.</p></div>';
    content.innerHTML = '<div class="panel"><p>Faça login para ver seu carrinho.</p></div>';
    if (elements.cartBadge) elements.cartBadge.classList.add('hidden');
    return;
  }

  const total = state.user.cart?.reduce((sum, item) => sum + item.price * item.quantity, 0) || 0;
  summary.innerHTML = `
    <div class="cart-summary-box">
      <h4>Valor estimado</h4>
      <p><strong>${formatCurrency(total)}</strong></p>
      <p class="cart-summary-note">O valor fica fixado enquanto você vê e ajusta os itens.</p>
    </div>
  `;

  if (!state.user.cart || state.user.cart.length === 0) {
    content.innerHTML = '<div class="panel"><p>Seu carrinho está vazio.</p></div>';
    updateCartBadge();
    return;
  }

  const list = document.createElement('div');
  list.className = 'cart-items';
  state.user.cart.forEach(item => {
    const itemTotal = item.price * item.quantity;
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      <h3>${item.name}</h3>
      <p>Preço unitário: ${formatCurrency(item.price)}</p>
      <p>Total: ${formatCurrency(itemTotal)}</p>
      <div class="cart-item-controls">
        <button class="qty-button" data-action="decrease" data-id="${item.id}">-</button>
        <span>${item.quantity}</span>
        <button class="qty-button" data-action="increase" data-id="${item.id}">+</button>
        <button class="remove-button" data-id="${item.id}">Remover</button>
      </div>
    `;
    list.appendChild(card);
  });
  content.appendChild(list);
  updateCartBadge();
}

async function saveProductEdit(id, card) {
  if (!card) return;
  const name = card.querySelector('[data-field="product-name"]').value.trim();
  const price = Number(card.querySelector('[data-field="product-price"]').value);
  const quantity = Number(card.querySelector('[data-field="product-quantity"]').value);
  const promotion = card.querySelector('[data-field="product-promotion"]').value.trim();
  if (!name) {
    showAdminMessage('Nome do produto é obrigatório.');
    return;
  }
  const response = await fetch(`/api/merchandise/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, price, quantity, promotion }),
  });
  const result = await response.json();
  if (!response.ok) {
    showAdminMessage(result.error || 'Erro ao salvar mercadoria.');
    return;
  }
  await updateData();
  showAdminMessage('Mercadoria atualizada com sucesso.', 'success');
}

async function removeProduct(id) {
  const response = await fetch(`/api/merchandise/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!response.ok) {
    const result = await response.json();
    showAdminMessage(result.error || 'Erro ao remover mercadoria.');
    return;
  }
  await updateData();
  showAdminMessage('Mercadoria removida.', 'success');
}

async function saveEmployeeEdit(id, card) {
  if (!card) return;
  const name = card.querySelector('[data-field="employee-name"]').value.trim();
  const role = card.querySelector('[data-field="employee-role"]').value.trim();
  const imageUrl = card.querySelector('[data-field="employee-image"]').value.trim();
  if (!name || !role) {
    showAdminMessage('Nome e cargo do funcionário são obrigatórios.');
    return;
  }
  const response = await fetch(`/api/employee/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, role, imageUrl }),
  });
  const result = await response.json();
  if (!response.ok) {
    showAdminMessage(result.error || 'Erro ao salvar funcionário.');
    return;
  }
  await updateData();
  showAdminMessage('Funcionário atualizado com sucesso.', 'success');
}

async function removeEmployee(id) {
  const response = await fetch(`/api/employee/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!response.ok) {
    const result = await response.json();
    showAdminMessage(result.error || 'Erro ao remover funcionário.');
    return;
  }
  await updateData();
  showAdminMessage('Funcionário removido.', 'success');
}

function formatCurrency(value) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function renderProducts() {
  elements.productList.innerHTML = '';
  if (!state.data) return;
  if (state.data.merchandise.length === 0) {
    elements.productList.innerHTML = '<div class="panel"><p>Nenhuma mercadoria cadastrada ainda.</p></div>';
    return;
  }
  state.data.merchandise.forEach(item => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      <h3>${item.name}</h3>
      <p class="product-price">${formatCurrency(item.price)}</p>
      <p>Quantidade disponível: ${item.quantity}</p>
      <p>Promoção: ${item.promotion || 'Nenhuma'}</p>
      <button class="add-cart" data-id="${item.id}">Adicionar ao carrinho</button>
    `;
    elements.productList.appendChild(card);
  });
}

function renderEmployees() {
  elements.employeeList.innerHTML = '';
  if (!state.data) return;
  if (state.data.employees.length === 0) {
    elements.employeeList.innerHTML = '<div class="panel"><p>Nenhum funcionário cadastrado ainda.</p></div>';
    return;
  }
  state.data.employees.forEach(emp => {
    const card = document.createElement('div');
    card.className = 'employee-card';
    card.innerHTML = `
      <div class="employee-preview">
        <div class="employee-thumb-wrapper">
          <img src="${emp.imageUrl || 'https://via.placeholder.com/100?text=Foto'}" alt="${emp.name}" class="employee-thumb" />
        </div>
        <div>
          <h3>${emp.name}</h3>
          <p><strong>Cargo:</strong> ${emp.role}</p>
        </div>
      </div>
    `;
    elements.employeeList.appendChild(card);
  });
}

function renderCart() {
  renderCartDropdown();
}

function renderAdminLists() {
  elements.adminProductList.innerHTML = '';
  elements.adminEmployeeList.innerHTML = '';
  if (!state.data) return;
  if (state.data.merchandise.length === 0) {
    elements.adminProductList.innerHTML = '<div class="panel"><p>Nenhuma mercadoria.</p></div>';
  } else {
    state.data.merchandise.forEach(item => {
      const card = document.createElement('div');
      card.className = 'admin-list-card';
      card.innerHTML = `
        <label>Nome <input type="text" value="${item.name}" data-field="product-name" /></label>
        <label>Preço <input type="number" min="0" step="0.01" value="${item.price}" data-field="product-price" /></label>
        <label>Quantidade <input type="number" min="0" value="${item.quantity}" data-field="product-quantity" /></label>
        <label>Promoção <input type="text" value="${item.promotion || ''}" data-field="product-promotion" /></label>
        <div class="admin-card-actions">
          <button type="button" class="small-button" data-admin-action="save-product" data-id="${item.id}">Salvar</button>
          <button type="button" class="danger-button" data-admin-action="remove-product" data-id="${item.id}">Remover</button>
        </div>
      `;
      elements.adminProductList.appendChild(card);
    });
  }

  if (state.data.employees.length === 0) {
    elements.adminEmployeeList.innerHTML = '<div class="panel"><p>Nenhum funcionário.</p></div>';
  } else {
    state.data.employees.forEach(emp => {
      const card = document.createElement('div');
      card.className = 'admin-list-card';
      card.innerHTML = `
        <div class="employee-preview admin-employee-preview">
          <img src="${emp.imageUrl || 'https://via.placeholder.com/100?text=Foto'}" alt="${emp.name}" class="employee-thumb" />
          <div class="admin-employee-info">
            <label>Nome <input type="text" value="${emp.name}" data-field="employee-name" /></label>
            <label>Cargo <input type="text" value="${emp.role}" data-field="employee-role" /></label>
            <label>Foto URL <input type="text" value="${emp.imageUrl || ''}" data-field="employee-image" /></label>
          </div>
        </div>
        <div class="admin-card-actions">
          <button type="button" class="small-button" data-admin-action="save-employee" data-id="${emp.id}">Salvar</button>
          <button type="button" class="danger-button" data-admin-action="remove-employee" data-id="${emp.id}">Remover</button>
        </div>
      `;
      elements.adminEmployeeList.appendChild(card);
    });
  }
}

function showMessage(text, target, type = 'error') {
  target.textContent = text;
  target.classList.toggle('success', type === 'success');
  target.classList.toggle('error', type !== 'success');
  setTimeout(() => { if (target.textContent === text) target.textContent = ''; }, 5000);
}

function showAdminMessage(text, type = 'error') {
  const target = elements.adminMessage;
  if (!target) return;
  target.textContent = text;
  target.classList.toggle('success', type === 'success');
  target.classList.toggle('error', type !== 'success');
  setTimeout(() => { if (target.textContent === text) target.textContent = ''; }, 5000);
}

function renderLocation() {
  const locationText = document.getElementById('location-text');
  const locationDescription = document.getElementById('location-description');
  const serviceDescription = document.getElementById('service-description');
  if (!state.data) return;
  if (locationText) locationText.textContent = state.data.location || 'Localização não definida.';
  if (locationDescription) locationDescription.textContent = state.data.locationDescription || 'Mercearia Mauro Né fica perto do mercado municipal.';
  if (serviceDescription) serviceDescription.textContent = state.data.serviceDescription || 'Atendimento sempre com o melhor preço para você.';
}

async function updateData() {
  await fetchState();
  renderProducts();
  renderEmployees();
  renderAdminLists();
  renderLocation();
}

async function doLogin(event) {
  event.preventDefault();
  const name = elements.loginName ? elements.loginName.value.trim() : '';
  const email = elements.loginEmail.value.trim();
  const password = document.getElementById('login-password').value;
  if (!name) { showMessage('Informe seu nome.', elements.authMessage); return; }
  if (!isValidEmail(email)) { showMessage('Informe um e-mail válido.', elements.authMessage); return; }
  const response = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });
  const result = await response.json();
  if (!response.ok) {
    showMessage(result.error || 'Erro no login.', elements.authMessage);
    return;
  }
  state.user = { name: result.name || name, email: result.email, password, cart: result.cart || [] };
  saveSession(state.user);
  updateUserInfo();
  renderCart();
  showMessage('Login realizado com sucesso.', elements.authMessage, 'success');
}

async function doRegister(event) {
  event.preventDefault();
  const email = elements.registerEmail.value.trim();
  const name = elements.registerName ? elements.registerName.value.trim() : '';
  const password = elements.registerPassword.value;
  const confirmPassword = elements.registerConfirmPassword.value;
  if (!name) {
    showMessage('Informe seu nome.', elements.authMessage);
    return;
  }
  if (!isValidEmail(email)) {
    showMessage('Informe um e-mail válido.', elements.authMessage);
    return;
  }
  if (password.length < 6) {
    showMessage('Senha deve ter ao menos 6 caracteres.', elements.authMessage);
    return;
  }
  if (password !== confirmPassword) {
    showMessage('As senhas não conferem.', elements.authMessage);
    return;
  }
  const response = await fetch('/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });
  const result = await response.json();
  if (!response.ok) {
    showMessage(result.error || 'Erro no cadastro.', elements.authMessage);
    return;
  }
  state.user = { name: result.name || name, email: result.email, password, cart: result.cart || [] };
  saveSession(state.user);
  updateUserInfo();
  renderCart();
  showMessage('Conta criada com sucesso.', elements.authMessage, 'success');
}

async function unlockAdmin(event) {
  event.preventDefault();
  const code = elements.adminCodeInput.value.trim();
  const response = await fetch('/api/admin-unlock', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  if (!response.ok) {
    const result = await response.json();
    showMessage(result.error || 'Código incorreto.', elements.adminLockMessage);
    return;
  }
  state.adminUnlocked = true;
  elements.adminPanel.classList.remove('hidden');
  elements.adminLockPanel.classList.add('hidden');
  showMessage('Acesso admin liberado.', elements.adminLockMessage);
}

async function addProduct(event) {
  event.preventDefault();
  const name = document.getElementById('product-name').value.trim();
  const price = Number(document.getElementById('product-price').value);
  const quantity = Number(document.getElementById('product-quantity').value);
  const promotion = document.getElementById('product-promotion').value.trim();
  const response = await fetch('/api/merchandise', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, price, quantity, promotion }),
  });
  if (!response.ok) {
    const result = await response.json();
    showAdminMessage(result.error || 'Erro ao adicionar mercadoria.');
    return;
  }
  await updateData();
  event.target.reset();
}

async function addEmployee(event) {
  event.preventDefault();
  const name = document.getElementById('employee-name').value.trim();
  const role = document.getElementById('employee-role').value.trim();
  const imageUrl = document.getElementById('employee-image')?.value.trim() || '';
  const response = await fetch('/api/employee', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, role, imageUrl }),
  });
  if (!response.ok) {
    const result = await response.json();
    showAdminMessage(result.error || 'Erro ao adicionar funcionário.');
    return;
  }
  await updateData();
  event.target.reset();
}

async function changeCode(event) {
  event.preventDefault();
  const code = document.getElementById('new-admin-code').value.trim();
  const response = await fetch('/api/admin-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  if (!response.ok) {
    const result = await response.json();
    showAdminMessage(result.error || 'Erro ao atualizar código.');
    return;
  }
  showAdminMessage('Código administrativo atualizado.', 'success');
  event.target.reset();
}

async function changeLocation(event) {
  event.preventDefault();
  const location = document.getElementById('new-location').value.trim();
  const description = document.getElementById('location-description-input')?.value.trim();
  const serviceDescription = document.getElementById('service-description-input')?.value.trim();
  const response = await fetch('/api/location', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ location, locationDescription: description, serviceDescription }),
  });
  if (!response.ok) {
    const result = await response.json();
    showAdminMessage(result.error || 'Erro ao atualizar localização.');
    return;
  }
  await updateData();
  showAdminMessage('Localização atualizada com sucesso.', 'success');
  event.target.reset();
}

async function handleRootClicks(event) {
  const addButton = event.target.closest('.add-cart');
  if (addButton) {
    if (!state.user) {
      showMessage('Faça login para adicionar ao carrinho.', elements.adminLockMessage);
      return;
    }
    const id = addButton.dataset.id;
    const item = state.data?.merchandise.find(entry => entry.id === id);
    if (!item) {
      showMessage('Produto não encontrado.', elements.adminLockMessage);
      return;
    }
    const existing = state.user.cart.find(entry => entry.id === id);
    const currentQty = existing ? existing.quantity : 0;
    if (currentQty + 1 > item.quantity) {
      showMessage('Quantidade máxima disponível atingida.', elements.adminLockMessage);
      return;
    }
    const addResponse = await fetch(`/api/cart/${encodeURIComponent(state.user.email)}/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, quantity: 1 }),
    });
    const addResult = await addResponse.json();
    if (!addResponse.ok) {
      showMessage(addResult.error || 'Erro ao adicionar ao carrinho.', elements.adminLockMessage);
      return;
    }
    const data = await fetchState();
    state.user.cart = data.users.find(user => user.email === state.user.email || user.username === state.user.email)?.cart || [];
    saveSession(state.user);
    renderCart();
  }

  const cartQtyButton = event.target.closest('.qty-button');
  if (cartQtyButton && cartQtyButton.dataset.id) {
    if (!state.user) return;
    const id = cartQtyButton.dataset.id;
    const action = cartQtyButton.dataset.action;
    const item = state.data?.merchandise.find(entry => entry.id === id);
    if (!item) {
      showMessage('Produto não encontrado.', elements.adminLockMessage);
      return;
    }
    const existing = state.user.cart.find(entry => entry.id === id);
    const currentQty = existing ? existing.quantity : 0;
    if (action === 'increase') {
      if (currentQty + 1 > item.quantity) {
        showMessage('Quantidade máxima disponível atingida.', elements.adminLockMessage);
        return;
      }
      const response = await fetch(`/api/cart/${encodeURIComponent(state.user.email)}/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, quantity: 1 }),
      });
      const result = await response.json();
      if (!response.ok) {
        showMessage(result.error || 'Erro ao atualizar o carrinho.', elements.adminLockMessage);
        return;
      }
    } else if (action === 'decrease') {
      await fetch(`/api/cart/${encodeURIComponent(state.user.email)}/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, quantity: 1 }),
      });
    }
    const data = await fetchState();
    state.user.cart = data.users.find(user => user.email === state.user.email || user.username === state.user.email)?.cart || [];
    saveSession(state.user);
    renderCart();
    return;
  }

  const removeButton = event.target.closest('.remove-button');
  if (removeButton && removeButton.dataset.id) {
    if (!state.user) return;
    const id = removeButton.dataset.id;
    await fetch(`/api/cart/${encodeURIComponent(state.user.email)}/remove`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    const data = await fetchState();
    state.user.cart = data.users.find(user => user.email === state.user.email || user.username === state.user.email)?.cart || [];
    saveSession(state.user);
    renderCart();
  }

  const adminActionButton = event.target.closest('button[data-admin-action]');
  if (adminActionButton) {
    const action = adminActionButton.dataset.adminAction;
    const id = adminActionButton.dataset.id;
    if (action === 'save-product') {
      await saveProductEdit(id, adminActionButton.closest('.admin-list-card'));
    } else if (action === 'remove-product') {
      await removeProduct(id);
    } else if (action === 'save-employee') {
      await saveEmployeeEdit(id, adminActionButton.closest('.admin-list-card'));
    } else if (action === 'remove-employee') {
      await removeEmployee(id);
    }
    return;
  }
}

async function logout() {
  state.user = null;
  clearSession();
  updateUserInfo();
  renderCart();
}

async function init() {
  elements.navButtons.forEach(button => button.addEventListener('click', () => showPage(button.dataset.target)));
  elements.loginForm.addEventListener('submit', doLogin);
  elements.registerForm.addEventListener('submit', doRegister);
  elements.adminUnlockButton.addEventListener('click', unlockAdmin);
  elements.cartToggle.addEventListener('click', toggleCartDropdown);
  elements.cartClose.addEventListener('click', closeCartDropdown);
  document.addEventListener('click', event => {
    if (!elements.cartDropdown.contains(event.target) && !elements.cartToggle.contains(event.target)) {
      closeCartDropdown();
    }
  });
  elements.addProductForm.addEventListener('submit', addProduct);
  elements.addEmployeeForm.addEventListener('submit', addEmployee);
  elements.changeCodeForm.addEventListener('submit', changeCode);
  elements.changeLocationForm.addEventListener('submit', changeLocation);
  elements.logoutButton.addEventListener('click', logout);
  document.body.addEventListener('click', handleRootClicks);
  await fetchState();
  await restoreSession();
  updateUserInfo();
  renderProducts();
  renderEmployees();
  renderCart();
  renderAdminLists();
  renderLocation();
}

init();
