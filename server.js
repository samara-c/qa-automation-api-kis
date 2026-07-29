/**
 * Mock "Order Management" API — QA Take-Home Exercise (2h version)
 *
 * Run with: npm install && npm start
 * Server runs on http://localhost:3000
 */
const express = require('express');
const { randomUUID } = require('crypto');

const app = express();
app.use(express.json());

// ---- Seed data ----
const users = {
  admin: { password: 'admin123', role: 'admin' },
  customer1: { password: 'cust123', role: 'customer' },
  customer2: { password: 'cust123', role: 'customer' },
};

let products = [
  { id: 'p1', name: 'Wireless Mouse', price: 25.0, stock: 10 },
  { id: 'p2', name: 'Mechanical Keyboard', price: 80.0, stock: 5 },
  { id: 'p3', name: 'USB-C Hub', price: 35.0, stock: 3 },
];

let orders = [];
let notifications = {}; // jobId -> { status, message }
let sessions = {}; // token -> username

let requestLog = []; // for rate limiting

const ORDER_STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

// ---- Auth ----
app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  const user = users[username];
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'invalid credentials' });
  }
  const token = randomUUID();
  sessions[token] = username;
  res.status(200).json({ token, role: user.role });
});

function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.replace('Bearer ', '');
  const username = sessions[token];
  if (!username) return res.status(401).json({ error: 'unauthorized' });
  req.user = { username, role: users[username].role };
  next();
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'forbidden: admin only' });
  }
  next();
}

// ---- Products ----
app.get('/api/products', (req, res) => {
  res.status(200).json(products);
});

app.get('/api/products/:id', (req, res) => {
  const product = products.find(p => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'product not found' });
  res.status(200).json(product);
});

app.post('/api/products', auth, requireAdmin, (req, res) => {
  const { name, price, stock } = req.body || {};
  if (!name || typeof price !== 'number' || typeof stock !== 'number') {
    return res.status(400).json({ error: 'name, price (number), stock (number) are required' });
  }
  const product = { id: randomUUID(), name, price, stock };
  products.push(product);
  res.status(201).json(product);
});

app.put('/api/products/:id', auth, requireAdmin, (req, res) => {
  const product = products.find(p => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'product not found' });
  const { name, price, stock } = req.body || {};
  if (name !== undefined) product.name = name;
  if (price !== undefined) product.price = price;
  if (stock !== undefined) product.stock = stock;
  res.status(200).json(product);
});

// ---- Orders ----
app.post('/api/orders', auth, (req, res) => {
  // simple global rate limit: max 5 order-creation requests per 10s window
  const now = Date.now();
  requestLog = requestLog.filter(t => now - t < 10000);
  if (requestLog.length >= 5) {
    return res.status(429).json({ error: 'rate limit exceeded, try again later' });
  }
  requestLog.push(now);

  if (req.user.role !== 'customer') {
    return res.status(403).json({ error: 'only customers can place orders' });
  }

  const { items } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'items must be a non-empty array' });
  }

  const resolvedItems = [];
  for (const item of items) {
    const product = products.find(p => p.id === item.productId);
    if (!product) {
      return res.status(400).json({ error: `product ${item.productId} not found` });
    }
    if (typeof item.quantity !== 'number' || item.quantity <= 0) {
      return res.status(400).json({ error: 'quantity must be a positive number' });
    }
    if (item.quantity > product.stock) {
      return res.status(400).json({ error: `insufficient stock for ${product.name}` });
    }
    resolvedItems.push({ product, quantity: item.quantity });
  }

  // decrement stock
  for (const { product, quantity } of resolvedItems) {
    product.stock -= quantity;
  }

  const order = {
    id: randomUUID(),
    ownerId: req.user.username,
    items: resolvedItems.map(({ product, quantity }) => ({
      productId: product.id,
      name: product.name,
      quantity,
      unitPrice: product.price,
    })),
    total: resolvedItems.reduce((sum, { product, quantity }) => sum + product.price * quantity, 0),
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  orders.push(order);
  res.status(201).json(order);
});

app.get('/api/orders', auth, (req, res) => {
  const { status, page = '1', limit = '10' } = req.query;
  let visible = req.user.role === 'admin' ? orders : orders.filter(o => o.ownerId === req.user.username);

  let filtered = status ? visible.filter(o => o.status === status) : visible;

  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 10;
  const start = (pageNum - 1) * limitNum;
  const pageItems = filtered.slice(start, start + limitNum);

  res.status(200).json({
    data: pageItems,
    pagination: {
      page: pageNum,
      limit: limitNum,
      totalCount: orders.length,
    },
  });
});

app.get('/api/orders/:id', auth, (req, res) => {
  const order = orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'order not found' });
  res.status(200).json(order);
});

app.put('/api/orders/:id/status', auth, requireAdmin, (req, res) => {
  const order = orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'order not found' });
  const { status } = req.body || {};
  if (!ORDER_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of ${ORDER_STATUSES.join(', ')}` });
  }
  order.status = status;
  res.status(200).json(order);
});

app.delete('/api/orders/:id', auth, (req, res) => {
  const order = orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'order not found' });
  if (req.user.role !== 'admin' && order.ownerId !== req.user.username) {
    return res.status(403).json({ error: 'forbidden' });
  }
  order.status = 'cancelled';
  res.status(200).json(order);
});

// ---- Async notifications (simulated eventual consistency) ----
app.post('/api/orders/:id/notify', auth, (req, res) => {
  const order = orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'order not found' });

  const jobId = randomUUID();
  notifications[jobId] = { status: 'pending' };

  setTimeout(() => {
    notifications[jobId] = {
      status: 'done',
      message: `Notification sent for order ${order.id}`,
    };
  }, 2000);

  res.status(202).json({ jobId, statusUrl: `/api/notifications/${jobId}` });
});

app.get('/api/notifications/:jobId', auth, (req, res) => {
  const job = notifications[req.params.jobId];
  if (!job) return res.status(404).json({ error: 'job not found' });
  res.status(200).json(job);
});

// ---- Test helper ----
app.post('/api/__reset', (req, res) => {
  products = [
    { id: 'p1', name: 'Wireless Mouse', price: 25.0, stock: 10 },
    { id: 'p2', name: 'Mechanical Keyboard', price: 80.0, stock: 5 },
    { id: 'p3', name: 'USB-C Hub', price: 35.0, stock: 3 },
  ];
  orders = [];
  notifications = {};
  requestLog = [];
  res.status(200).json({ reset: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Mock Order Management API running on port ${PORT}`));

module.exports = app;
