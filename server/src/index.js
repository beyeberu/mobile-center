import express from 'express';
import multer from 'multer';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHmac } from 'node:crypto';
import { mkdirSync, unlinkSync } from 'node:fs';
import { basename, join } from 'node:path';
import { promisify } from 'node:util';
import { database, paths } from './db.js';

const app = express();
const port = Number(process.env.PORT) || 3001;
const scrypt = promisify(scryptCallback);
const sessionSecret = process.env.SESSION_SECRET || randomBytes(32).toString('hex');
const adminUsername = process.env.ADMIN_USERNAME || 'admin';
const statusValues = new Set(['New', 'Confirmed', 'Processing', 'Ready', 'Completed', 'Cancelled']);
const serviceIcons = new Set(['screen', 'battery', 'charging', 'camera', 'audio', 'software', 'water', 'other', 'wrench']);

if (process.env.NODE_ENV === 'production' && (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32)) {
  throw new Error('Production requires a persistent SESSION_SECRET of at least 32 characters.');
}

mkdirSync(paths.uploads, { recursive: true });
app.use(express.json({ limit: '2mb' }));
app.use('/uploads', express.static(paths.uploads, { maxAge: '7d' }));

function productView(row) {
  if (!row) return null;
  return {
    id: row.id, brand: row.brand, model: row.model, storage: row.storage, ram: row.ram,
    color: row.color, price: row.price, salePrice: row.sale_price, description: row.description,
    stock: row.stock, featured: Boolean(row.featured), isNew: Boolean(row.is_new),
    images: JSON.parse(row.images), createdAt: row.created_at,
  };
}

function serviceView(row) {
  return { id: row.id, name: row.name, description: row.description, price: row.price, icon: row.icon, enabled: Boolean(row.enabled) };
}

function orderView(row) {
  return {
    id: row.id, type: row.type, name: row.name, phone: row.phone, productId: row.product_id,
    productName: row.product_name, quantity: row.quantity, price: row.price, color: row.color,
    fulfillment: row.fulfillment, details: row.details, status: row.status, createdAt: row.created_at,
  };
}

function cleanText(value, maxLength = 500) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function removeUnreferencedImages(imageUrls) {
  const referenced = new Set(database.prepare('SELECT images FROM products').all().flatMap((row) => JSON.parse(row.images)));
  for (const imageUrl of imageUrls) {
    if (typeof imageUrl !== 'string' || !imageUrl.startsWith('/uploads/') || referenced.has(imageUrl)) continue;
    const filename = basename(imageUrl);
    if (filename === imageUrl.slice('/uploads/'.length)) {
      try { unlinkSync(join(paths.uploads, filename)); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
  }
}

function signedSession(username) {
  const payload = Buffer.from(JSON.stringify({ username, expires: Date.now() + 8 * 60 * 60 * 1000 })).toString('base64url');
  const signature = createHmac('sha256', sessionSecret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function verifySession(value) {
  if (!value) return null;
  const [payload, signature] = value.split('.');
  if (!payload || !signature) return null;
  const expected = createHmac('sha256', sessionSecret).update(payload).digest();
  let actual;
  try { actual = Buffer.from(signature, 'base64url'); } catch { return null; }
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return decoded.expires > Date.now() ? decoded.username : null;
  } catch { return null; }
}

function requireAdmin(request, response, next) {
  const cookies = Object.fromEntries((request.headers.cookie || '').split(';').map((part) => {
    const separator = part.indexOf('=');
    return separator < 0 ? ['', ''] : [part.slice(0, separator).trim(), part.slice(separator + 1).trim()];
  }));
  const username = verifySession(cookies.mobile_center_session);
  if (!username) return response.status(401).json({ error: 'Please sign in to continue.' });
  request.adminUsername = username;
  next();
}

const loginAttempts = new Map();
const loginBlock = (request, response, next) => {
  const address = request.ip;
  const record = loginAttempts.get(address);
  if (record && record.blockedUntil > Date.now()) return response.status(429).json({ error: 'Too many attempts. Try again in 15 minutes.' });
  request.loginAddress = address;
  next();
};

const upload = multer({
  storage: multer.diskStorage({
    destination: (_request, _file, callback) => callback(null, paths.uploads),
    filename: (_request, file, callback) => {
      const extensions = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/avif': '.avif' };
      callback(null, `${randomBytes(12).toString('hex')}${extensions[file.mimetype]}`);
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024, files: 8 },
  fileFilter: (_request, file, callback) => callback(null, ['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.mimetype)),
});

app.get('/api/health', (_request, response) => response.json({ status: 'ok' }));
app.get('/api/products', (_request, response) => {
  response.json(database.prepare('SELECT * FROM products ORDER BY created_at DESC').all().map(productView));
});
app.get('/api/services', (_request, response) => {
  const rows = database.prepare('SELECT * FROM services WHERE enabled = 1 ORDER BY rowid').all();
  response.json(rows.map(serviceView));
});

app.post('/api/orders', (request, response) => {
  const name = cleanText(request.body.name, 100);
  const phone = cleanText(request.body.phone, 32);
  const quantity = Math.max(1, Math.min(20, Number.parseInt(request.body.quantity, 10) || 1));
  const product = database.prepare('SELECT * FROM products WHERE id = ?').get(cleanText(request.body.productId, 100));
  if (!name || !/^[+\d() .-]{7,32}$/.test(phone)) return response.status(400).json({ error: 'Enter your name and a valid phone number.' });
  if (!product || product.stock < quantity) return response.status(409).json({ error: 'This phone is no longer available in that quantity.' });
  const now = new Date().toISOString();
  const id = randomBytes(12).toString('hex');
  const placeOrder = database.transaction(() => {
    database.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(quantity, product.id);
    database.prepare(`INSERT INTO orders (id, type, name, phone, product_id, product_name, quantity, price, color, fulfillment, details, status, created_at)
      VALUES (?, 'order', ?, ?, ?, ?, ?, ?, ?, ?, '', 'New', ?)`).run(
      id, name, phone, product.id, `${product.brand} ${product.model}`, quantity,
      product.sale_price ?? product.price, cleanText(request.body.color, 60),
      request.body.fulfillment === 'Delivery' ? 'Delivery' : 'Pickup', now,
    );
  });
  placeOrder();
  response.status(201).json({ id, message: 'Order received. We will contact you shortly.' });
});

app.post('/api/repairs', (request, response) => {
  const name = cleanText(request.body.name, 100);
  const phone = cleanText(request.body.phone, 32);
  const service = database.prepare('SELECT * FROM services WHERE id = ? AND enabled = 1').get(cleanText(request.body.serviceId, 100));
  const device = cleanText(request.body.device, 120);
  const details = cleanText(request.body.details, 1000);
  if (!name || !/^[+\d() .-]{7,32}$/.test(phone) || !service || !device) {
    return response.status(400).json({ error: 'Add your name, a valid phone number, device, and repair service.' });
  }
  const id = randomBytes(12).toString('hex');
  database.prepare(`INSERT INTO orders (id, type, name, phone, product_name, quantity, price, fulfillment, details, status, created_at)
    VALUES (?, 'repair', ?, ?, ?, 1, ?, 'In store', ?, 'New', ?)`).run(
    id, name, phone, service.name, service.price || 0, `Device: ${device}. ${details}`, new Date().toISOString(),
  );
  response.status(201).json({ id, message: 'Repair request received. Our team will get in touch.' });
});

app.post('/api/admin/login', loginBlock, async (request, response) => {
  const username = cleanText(request.body.username, 80);
  const password = typeof request.body.password === 'string' ? request.body.password : '';
  const admin = database.prepare('SELECT * FROM admins WHERE username = ?').get(username);
  const candidate = await scrypt(password, admin?.salt || 'invalid-user-salt', 64);
  const valid = Boolean(admin && timingSafeEqual(candidate, Buffer.from(admin.password_hash, 'hex')));
  if (!valid) {
    const current = loginAttempts.get(request.loginAddress) || { count: 0 };
    current.count += 1;
    if (current.count >= 5) {
      current.blockedUntil = Date.now() + 15 * 60 * 1000;
      current.count = 0;
    }
    loginAttempts.set(request.loginAddress, current);
    return response.status(401).json({ error: 'Username or password is incorrect.' });
  }
  loginAttempts.delete(request.loginAddress);
  response.cookie('mobile_center_session', signedSession(username), {
    httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', maxAge: 8 * 60 * 60 * 1000, path: '/',
  });
  response.json({ username });
});

app.post('/api/admin/logout', requireAdmin, (_request, response) => {
  response.clearCookie('mobile_center_session', { httpOnly: true, sameSite: 'strict', path: '/' });
  response.status(204).end();
});
app.get('/api/admin/session', requireAdmin, (request, response) => response.json({ username: request.adminUsername }));

app.get('/api/admin/products', requireAdmin, (_request, response) => {
  response.json(database.prepare('SELECT * FROM products ORDER BY created_at DESC').all().map(productView));
});

app.post('/api/admin/uploads', requireAdmin, upload.array('images', 8), (request, response) => {
  if (!request.files?.length) return response.status(400).json({ error: 'Choose image files (JPEG, PNG, WebP, or AVIF).' });
  response.status(201).json(request.files.map((file) => `/uploads/${file.filename}`));
});

app.delete('/api/admin/uploads/:filename', requireAdmin, (request, response) => {
  const filename = basename(request.params.filename);
  if (filename !== request.params.filename) return response.status(400).json({ error: 'Invalid filename.' });
  const imageUrl = `/uploads/${filename}`;
  const isReferenced = database.prepare('SELECT images FROM products').all().some((row) => JSON.parse(row.images).includes(imageUrl));
  if (isReferenced) return response.status(409).json({ error: 'Remove this image from its phone listing before deleting it.' });
  try { unlinkSync(join(paths.uploads, filename)); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  response.status(204).end();
});

app.post('/api/admin/products', requireAdmin, (request, response) => {
  const { brand, model, storage, ram, color, description } = request.body;
  const price = Number(request.body.price);
  const stock = Number.parseInt(request.body.stock, 10);
  const salePrice = request.body.salePrice === '' || request.body.salePrice == null ? null : Number(request.body.salePrice);
  const images = Array.isArray(request.body.images) ? request.body.images.filter((image) => typeof image === 'string' && image.startsWith('/uploads/')).slice(0, 8) : [];
  if (![brand, model, storage, ram, color, description].every((value) => cleanText(value)) || !Number.isFinite(price) || price < 0 || !Number.isInteger(stock) || stock < 0 || (salePrice !== null && (!Number.isFinite(salePrice) || salePrice < 0 || salePrice > price))) {
    return response.status(400).json({ error: 'Complete the required fields with valid price and stock values.' });
  }
  const product = {
    id: randomBytes(12).toString('hex'), brand: cleanText(brand, 80), model: cleanText(model, 120),
    storage: cleanText(storage, 40), ram: cleanText(ram, 40), color: cleanText(color, 80),
    price, sale_price: salePrice, description: cleanText(description, 2000), stock,
    featured: request.body.featured ? 1 : 0, is_new: request.body.isNew ? 1 : 0,
    images: JSON.stringify(images), created_at: new Date().toISOString(),
  };
  database.prepare(`INSERT INTO products (id, brand, model, storage, ram, color, price, sale_price, description, stock, featured, is_new, images, created_at)
    VALUES (@id, @brand, @model, @storage, @ram, @color, @price, @sale_price, @description, @stock, @featured, @is_new, @images, @created_at)`).run(product);
  response.status(201).json(productView(database.prepare('SELECT * FROM products WHERE id = ?').get(product.id)));
});

app.put('/api/admin/products/:id', requireAdmin, (request, response) => {
  const existing = database.prepare('SELECT * FROM products WHERE id = ?').get(request.params.id);
  if (!existing) return response.status(404).json({ error: 'Phone not found.' });
  const body = request.body;
  const price = Number(body.price);
  const stock = Number.parseInt(body.stock, 10);
  const salePrice = body.salePrice === '' || body.salePrice == null ? null : Number(body.salePrice);
  if (![body.brand, body.model, body.storage, body.ram, body.color, body.description].every((value) => cleanText(value)) || !Number.isFinite(price) || price < 0 || !Number.isInteger(stock) || stock < 0 || (salePrice !== null && (!Number.isFinite(salePrice) || salePrice < 0 || salePrice > price))) {
    return response.status(400).json({ error: 'Complete the required fields with valid price and stock values.' });
  }
  const images = Array.isArray(body.images) ? body.images.filter((image) => typeof image === 'string' && image.startsWith('/uploads/')).slice(0, 8) : [];
  const oldImages = JSON.parse(existing.images);
  database.prepare(`UPDATE products SET brand=?, model=?, storage=?, ram=?, color=?, price=?, sale_price=?, description=?, stock=?, featured=?, is_new=?, images=? WHERE id=?`).run(
    cleanText(body.brand, 80), cleanText(body.model, 120), cleanText(body.storage, 40), cleanText(body.ram, 40), cleanText(body.color, 80),
    price, salePrice, cleanText(body.description, 2000), stock, body.featured ? 1 : 0, body.isNew ? 1 : 0, JSON.stringify(images), existing.id,
  );
  removeUnreferencedImages(oldImages.filter((image) => !images.includes(image)));
  response.json(productView(database.prepare('SELECT * FROM products WHERE id = ?').get(existing.id)));
});

app.delete('/api/admin/products/:id', requireAdmin, (request, response) => {
  const product = database.prepare('SELECT * FROM products WHERE id = ?').get(request.params.id);
  if (!product) return response.status(404).json({ error: 'Phone not found.' });
  database.prepare('DELETE FROM products WHERE id = ?').run(product.id);
  removeUnreferencedImages(JSON.parse(product.images));
  response.status(204).end();
});

app.get('/api/admin/services', requireAdmin, (_request, response) => {
  response.json(database.prepare('SELECT * FROM services ORDER BY rowid').all().map(serviceView));
});
app.post('/api/admin/services', requireAdmin, (request, response) => {
  const name = cleanText(request.body.name, 100);
  const description = cleanText(request.body.description, 1000);
  const price = request.body.price === '' || request.body.price == null ? null : Number(request.body.price);
  const icon = serviceIcons.has(request.body.icon) ? request.body.icon : 'wrench';
  if (!name || !description || (price !== null && (!Number.isFinite(price) || price < 0))) return response.status(400).json({ error: 'Enter a service name, description, and valid price.' });
  const service = { id: randomBytes(12).toString('hex'), name, description, price, icon, enabled: request.body.enabled === false ? 0 : 1 };
  database.prepare('INSERT INTO services (id, name, description, price, icon, enabled) VALUES (@id, @name, @description, @price, @icon, @enabled)').run(service);
  response.status(201).json(serviceView(database.prepare('SELECT * FROM services WHERE id = ?').get(service.id)));
});
app.put('/api/admin/services/:id', requireAdmin, (request, response) => {
  const name = cleanText(request.body.name, 100);
  const description = cleanText(request.body.description, 1000);
  const price = request.body.price === '' || request.body.price == null ? null : Number(request.body.price);
  const icon = serviceIcons.has(request.body.icon) ? request.body.icon : 'wrench';
  if (!name || !description || (price !== null && (!Number.isFinite(price) || price < 0))) return response.status(400).json({ error: 'Enter a service name, description, and valid price.' });
  const result = database.prepare('UPDATE services SET name=?, description=?, price=?, icon=?, enabled=? WHERE id=?').run(name, description, price, icon, request.body.enabled ? 1 : 0, request.params.id);
  if (!result.changes) return response.status(404).json({ error: 'Service not found.' });
  response.json(serviceView(database.prepare('SELECT * FROM services WHERE id = ?').get(request.params.id)));
});
app.delete('/api/admin/services/:id', requireAdmin, (request, response) => {
  database.prepare('DELETE FROM services WHERE id = ?').run(request.params.id);
  response.status(204).end();
});

app.get('/api/admin/orders', requireAdmin, (_request, response) => {
  response.json(database.prepare('SELECT * FROM orders ORDER BY created_at DESC').all().map(orderView));
});
app.patch('/api/admin/orders/:id', requireAdmin, (request, response) => {
  if (!statusValues.has(request.body.status)) return response.status(400).json({ error: 'Choose a valid order status.' });
  const order = database.prepare('SELECT * FROM orders WHERE id = ?').get(request.params.id);
  if (!order) return response.status(404).json({ error: 'Order not found.' });
  if (order.type === 'order' && order.product_id && order.status !== request.body.status) {
    const changeStatus = database.transaction(() => {
      if (request.body.status === 'Cancelled' && order.status !== 'Cancelled') {
        database.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(order.quantity, order.product_id);
      } else if (order.status === 'Cancelled' && request.body.status !== 'Cancelled') {
        const product = database.prepare('SELECT stock FROM products WHERE id = ?').get(order.product_id);
        if (!product || product.stock < order.quantity) return false;
        database.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(order.quantity, order.product_id);
      }
      database.prepare('UPDATE orders SET status=? WHERE id=?').run(request.body.status, order.id);
      return true;
    });
    if (!changeStatus()) return response.status(409).json({ error: 'Not enough inventory to reopen this cancelled order.' });
  } else {
    database.prepare('UPDATE orders SET status=? WHERE id=?').run(request.body.status, order.id);
  }
  response.json(orderView(database.prepare('SELECT * FROM orders WHERE id = ?').get(request.params.id)));
});

async function ensureAdmin() {
  const exists = database.prepare('SELECT username FROM admins WHERE username = ?').get(adminUsername);
  if (exists && !process.env.ADMIN_PASSWORD) return;
  const firstPassword = process.env.ADMIN_PASSWORD || randomBytes(15).toString('base64url');
  if (firstPassword.length < 12) throw new Error('ADMIN_PASSWORD must be at least 12 characters.');
  const salt = randomBytes(16).toString('hex');
  const passwordHash = await scrypt(firstPassword, salt, 64);
  if (exists) {
    database.prepare('UPDATE admins SET salt = ?, password_hash = ? WHERE username = ?').run(salt, passwordHash.toString('hex'), adminUsername);
    console.log(`Admin password updated from ADMIN_PASSWORD for ${adminUsername}.`);
  } else {
    database.prepare('INSERT INTO admins (username, salt, password_hash) VALUES (?, ?, ?)').run(adminUsername, salt, passwordHash.toString('hex'));
  }
  if (!process.env.ADMIN_PASSWORD && !exists) {
    console.log(`Initial admin login: ${adminUsername} / ${firstPassword}`);
    console.log('Save these credentials, then configure ADMIN_PASSWORD before first launch for a custom admin password.');
  }
}

const webDist = join(paths.serverRoot, '..', 'client', 'dist');
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(webDist));
  app.get(/.*/, (_request, response) => response.sendFile(join(webDist, 'index.html')));
}

ensureAdmin().then(() => {
  app.listen(port, () => console.log(`API server listening on http://localhost:${port}`));
}).catch((error) => {
  console.error('Could not initialize admin account:', error.message);
  process.exitCode = 1;
});