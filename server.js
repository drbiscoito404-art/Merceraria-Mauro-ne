const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();
const dataPath = path.join(__dirname, "data.json");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function loadData() {
  try {
    return JSON.parse(fs.readFileSync(dataPath, "utf8"));
  } catch (error) {
    return {
      adminCode: "123456",
      location: "Rua Principal, 123 - Centro",
      merchandise: [],
      employees: [],
      users: [
        { username: "admin", email: "admin@mercearia.com", password: "admin", cart: [] }
      ]
    };
  }
}

function saveData(data) {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), "utf8");
}

app.get("/api/state", (req, res) => {
  res.json(loadData());
});

app.post("/api/login", (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: "Nome, e-mail e senha obrigatórios." });
  const data = loadData();
  const user = data.users.find(u => (u.email === email || u.username === email) && u.password === password);
  if (!user) return res.status(401).json({ error: "E-mail ou senha inválidos" });
  if (user.name && user.name !== name) return res.status(401).json({ error: "Nome não confere com a conta." });
  res.json({ name: user.name || user.username || '', email: user.email || user.username, cart: user.cart || [] });
});

app.post("/api/register", (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: "Nome, e-mail e senha obrigatórios." });
  const data = loadData();
  if (data.users.some(u => u.email === email || u.username === email)) return res.status(409).json({ error: "Conta já existe." });
  const newUser = { username: email, name, email, password, cart: [] };
  data.users.push(newUser);
  saveData(data);
  res.json({ name: newUser.name, email: newUser.email, cart: newUser.cart });
});

app.post("/api/merchandise", (req, res) => {
  const { name, price, quantity, promotion } = req.body;
  if (!name) return res.status(400).json({ error: "Nome é obrigatório." });
  const data = loadData();
  const item = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name,
    price: Number(price) || 0,
    quantity: Number(quantity) || 0,
    promotion: promotion || ""
  };
  data.merchandise.push(item);
  saveData(data);
  res.json(item);
});

app.put("/api/merchandise/:id", (req, res) => {
  const id = req.params.id;
  const { name, price, quantity, promotion } = req.body;
  if (!name) return res.status(400).json({ error: "Nome é obrigatório." });
  const data = loadData();
  const item = data.merchandise.find(entry => entry.id === id);
  if (!item) return res.status(404).json({ error: "Produto não encontrado." });
  item.name = name;
  item.price = Number(price) || 0;
  item.quantity = Number(quantity) || 0;
  item.promotion = promotion || "";
  saveData(data);
  res.json(item);
});

app.delete("/api/merchandise/:id", (req, res) => {
  const id = req.params.id;
  const data = loadData();
  data.merchandise = data.merchandise.filter(item => item.id !== id);
  saveData(data);
  res.json({ success: true });
});

app.post("/api/employee", (req, res) => {
  const { name, role } = req.body;
  if (!name || !role) return res.status(400).json({ error: "Nome e cargo são obrigatórios." });
  const data = loadData();
  const employee = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name,
    role
    , imageUrl: req.body.imageUrl || ""
  };
  data.employees.push(employee);
  saveData(data);
  res.json(employee);
});

app.put("/api/employee/:id", (req, res) => {
  const id = req.params.id;
  const { name, role, imageUrl } = req.body;
  if (!name || !role) return res.status(400).json({ error: "Nome e cargo são obrigatórios." });
  const data = loadData();
  const employee = data.employees.find(emp => emp.id === id);
  if (!employee) return res.status(404).json({ error: "Funcionário não encontrado." });
  employee.name = name;
  employee.role = role;
  employee.imageUrl = imageUrl || employee.imageUrl || "";
  saveData(data);
  res.json(employee);
});

app.delete("/api/employee/:id", (req, res) => {
  const id = req.params.id;
  const data = loadData();
  data.employees = data.employees.filter(emp => emp.id !== id);
  saveData(data);
  res.json({ success: true });
});

app.post("/api/admin-code", (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: "Código válido é obrigatório." });
  const data = loadData();
  data.adminCode = code;
  saveData(data);
  res.json({ success: true });
});

app.post("/api/location", (req, res) => {
  const { location, locationDescription, serviceDescription } = req.body;
  if (!location) return res.status(400).json({ error: "Localização é obrigatória." });
  const data = loadData();
  data.location = location;
  if (locationDescription !== undefined) data.locationDescription = locationDescription;
  if (serviceDescription !== undefined) data.serviceDescription = serviceDescription;
  saveData(data);
  res.json({ success: true });
});

app.post("/api/admin-unlock", (req, res) => {
  const { code } = req.body;
  const data = loadData();
  if (code !== data.adminCode) return res.status(403).json({ error: "Código administrativo incorreto." });
  res.json({ success: true });
});

app.post("/api/cart/:email/add", (req, res) => {
  const email = req.params.email;
  const { id, quantity } = req.body;
  const data = loadData();
  const user = data.users.find(u => u.email === email || u.username === email);
  const item = data.merchandise.find(entry => entry.id === id);
  if (!user || !item) return res.status(404).json({ error: "Usuário ou produto não encontrado." });
  const qty = Number(quantity) || 1;
  const existing = user.cart.find(entry => entry.id === id);
  const currentQty = existing ? existing.quantity : 0;
  if (currentQty + qty > item.quantity) {
    return res.status(400).json({ error: `Quantidade máxima disponível: ${item.quantity}.` });
  }
  if (existing) {
    existing.quantity += qty;
  } else {
    user.cart.push({ id: item.id, name: item.name, price: item.price, quantity: qty });
  }
  saveData(data);
  res.json({ cart: user.cart });
});

app.post("/api/cart/:email/remove", (req, res) => {
  const email = req.params.email;
  const { id, quantity } = req.body;
  const data = loadData();
  const user = data.users.find(u => u.email === email || u.username === email);
  if (!user) return res.status(404).json({ error: "Usuário não encontrado." });
  const qty = Number(quantity) || 0;
  if (qty > 0) {
    const existing = user.cart.find(item => item.id === id);
    if (!existing) return res.status(404).json({ error: "Item não encontrado no carrinho." });
    existing.quantity -= qty;
    if (existing.quantity <= 0) {
      user.cart = user.cart.filter(item => item.id !== id);
    }
  } else {
    user.cart = user.cart.filter(item => item.id !== id);
  }
  saveData(data);
  res.json({ cart: user.cart });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(3000, () => {
  console.log('Servidor iniciado em http://localhost:3000');
});
