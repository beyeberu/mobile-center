import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const serverRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
mkdirSync(join(serverRoot, 'data'), { recursive: true });

export const database = new Database(join(serverRoot, 'data', 'mobile-center.sqlite'));
database.pragma('journal_mode = WAL');
database.pragma('foreign_keys = ON');

database.exec(`
  CREATE TABLE IF NOT EXISTS admins (
    username TEXT PRIMARY KEY,
    salt TEXT NOT NULL,
    password_hash TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    storage TEXT NOT NULL,
    ram TEXT NOT NULL,
    color TEXT NOT NULL,
    price REAL NOT NULL,
    sale_price REAL,
    description TEXT NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    featured INTEGER NOT NULL DEFAULT 0,
    is_new INTEGER NOT NULL DEFAULT 0,
    images TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS services (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    price REAL,
    icon TEXT NOT NULL DEFAULT 'wrench',
    enabled INTEGER NOT NULL DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL DEFAULT 'order',
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    product_id TEXT,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    price REAL NOT NULL DEFAULT 0,
    color TEXT NOT NULL DEFAULT '',
    fulfillment TEXT NOT NULL DEFAULT 'Pickup',
    details TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'New',
    created_at TEXT NOT NULL,
    FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE SET NULL
  );
`);

const orderColumns = database.prepare('PRAGMA table_info(orders)').all();
if (!orderColumns.some((column) => column.name === 'type')) {
  database.exec("ALTER TABLE orders ADD COLUMN type TEXT NOT NULL DEFAULT 'order'");
}
const serviceColumns = database.prepare('PRAGMA table_info(services)').all();
if (!serviceColumns.some((column) => column.name === 'icon')) {
  database.exec("ALTER TABLE services ADD COLUMN icon TEXT NOT NULL DEFAULT 'wrench'");
}
const legacyServiceIcons = { screen: 'screen', battery: 'battery', charging: 'charging', camera: 'camera', audio: 'audio', software: 'software', water: 'water', other: 'other' };
for (const [serviceId, icon] of Object.entries(legacyServiceIcons)) {
  database.prepare("UPDATE services SET icon = ? WHERE id = ? AND icon = 'wrench'").run(icon, serviceId);
}

const productCount = database.prepare('SELECT COUNT(*) AS count FROM products').get().count;
if (productCount === 0) {
  const addProduct = database.prepare(`
    INSERT INTO products (id, brand, model, storage, ram, color, price, sale_price, description, stock, featured, is_new, images, created_at)
    VALUES (@id, @brand, @model, @storage, @ram, @color, @price, @sale_price, @description, @stock, @featured, @is_new, @images, @created_at)
  `);
  const seededProducts = [
    ['Apple', 'iPhone 16 Pro', '256GB', '8GB', 'Natural Titanium', 1099, 999, 'A18 Pro performance meets a stunning titanium design and an advanced pro camera system.', 8, 1, 1, 'photo-1592899677977-9c10ca588bbd'],
    ['Samsung', 'Galaxy S25 Ultra', '256GB', '12GB', 'Titanium Gray', 1199, null, 'A brilliant display, versatile cameras, and Galaxy AI in a refined titanium body.', 5, 1, 1, 'photo-1511707171634-5f897ff02aa9'],
    ['Google', 'Pixel 9 Pro', '128GB', '16GB', 'Obsidian', 899, 829, 'Google Tensor power with thoughtful AI features and a camera ready for every moment.', 4, 1, 0, 'photo-1598327105666-5b89351aff97'],
    ['Apple', 'iPhone 15', '128GB', '6GB', 'Blue', 699, null, 'A reliable everyday iPhone with a bright display, capable cameras, and USB-C.', 0, 0, 0, 'photo-1512499617640-c74ae3a79d37'],
    ['Samsung', 'Galaxy Z Flip6', '256GB', '12GB', 'Mint', 999, 899, 'Pocket-sized when folded, expansive when open, with a clever FlexWindow.', 3, 0, 1, 'photo-1605236453806-6ff36851218e'],
    ['OnePlus', 'OnePlus 13', '256GB', '12GB', 'Midnight Ocean', 849, null, 'Fast, fluid, and built for long days with a vibrant display and all-day battery.', 6, 0, 1, 'photo-1598327105666-5b89351aff97'],
  ];
  const insertSeed = database.transaction(() => {
    for (const [brand, model, storage, ram, color, price, salePrice, description, stock, featured, isNew, image] of seededProducts) {
      addProduct.run({
        id: `phone-${model.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}`,
        brand, model, storage, ram, color, price, sale_price: salePrice,
        description, stock, featured, is_new: isNew,
        images: JSON.stringify([`https://images.unsplash.com/${image}?auto=format&fit=crop&w=1000&q=85`]),
        created_at: new Date().toISOString(),
      });
    }
  });
  insertSeed();
}

const serviceCount = database.prepare('SELECT COUNT(*) AS count FROM services').get().count;
if (serviceCount === 0) {
  const addService = database.prepare('INSERT INTO services (id, name, description, price, icon, enabled) VALUES (?, ?, ?, ?, ?, 1)');
  const seededServices = [
    ['screen', 'Screen replacement', 'Cracked or unresponsive display? We fit quality-tested screens with care.', 89, 'screen'],
    ['battery', 'Battery replacement', 'Bring back all-day power with a fresh battery and careful installation.', 59, 'battery'],
    ['charging', 'Charging port repair', 'Reliable charging and data transfer, restored by our repair team.', 49, 'charging'],
    ['camera', 'Camera repair', 'Get sharp photos back with camera diagnostics and replacement.', 69, 'camera'],
    ['audio', 'Speaker & microphone', 'Clear calls and crisp audio, checked from top to bottom.', 45, 'audio'],
    ['software', 'Software support', 'Updates, setup, data transfers, and help with software issues.', null, 'software'],
    ['water', 'Water damage', 'A careful inspection and recovery assessment for liquid-damaged devices.', null, 'water'],
    ['other', 'Something else?', 'Tell us what is going on and our technicians will take a look.', null, 'other'],
  ];
  for (const [id, name, description, price, icon] of seededServices) addService.run(id, name, description, price, icon);
}

export const paths = { serverRoot, uploads: join(serverRoot, 'uploads') };