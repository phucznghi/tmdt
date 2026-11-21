PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS users (
 id INTEGER PRIMARY KEY, email TEXT NOT NULL UNIQUE COLLATE NOCASE, name TEXT NOT NULL,
 password TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'customer' CHECK(role IN ('customer','admin')),
 phone TEXT NOT NULL DEFAULT '', address TEXT NOT NULL DEFAULT '', active INTEGER NOT NULL DEFAULT 1,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS sessions (
 token TEXT PRIMARY KEY, csrf TEXT NOT NULL, user_id INTEGER REFERENCES users(id), expires INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS products (
 id INTEGER PRIMARY KEY, name TEXT NOT NULL, price INTEGER NOT NULL CHECK(price>=0),
 active INTEGER NOT NULL DEFAULT 1, metadata TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS variants (
 id INTEGER PRIMARY KEY, product_id INTEGER NOT NULL REFERENCES products(id), color TEXT NOT NULL,
 size TEXT NOT NULL, hex TEXT NOT NULL, img TEXT NOT NULL, stock INTEGER NOT NULL CHECK(stock>=0),
 active INTEGER NOT NULL DEFAULT 1, UNIQUE(product_id,color,size)
);
CREATE TABLE IF NOT EXISTS carts (
 owner TEXT NOT NULL, variant_id INTEGER NOT NULL REFERENCES variants(id), qty INTEGER NOT NULL CHECK(qty BETWEEN 1 AND 99),
 PRIMARY KEY(owner,variant_id)
);
CREATE TABLE IF NOT EXISTS cart_meta (owner TEXT PRIMARY KEY, promo TEXT NOT NULL DEFAULT '');
CREATE TABLE IF NOT EXISTS orders (
 id TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), request_key TEXT NOT NULL,
 receiver TEXT NOT NULL, phone TEXT NOT NULL, address TEXT NOT NULL,
 subtotal INTEGER NOT NULL, shipping INTEGER NOT NULL, discount INTEGER NOT NULL, total INTEGER NOT NULL,
 method TEXT NOT NULL CHECK(method IN ('cod','bank_transfer')),
 payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK(payment_status IN ('unpaid','paid','refund_pending','refunded')),
 status TEXT NOT NULL DEFAULT 'pending', carrier TEXT NOT NULL DEFAULT '', tracking TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL, UNIQUE(user_id,request_key)
);
CREATE TABLE IF NOT EXISTS order_items (
 id INTEGER PRIMARY KEY, order_id TEXT NOT NULL REFERENCES orders(id), variant_id INTEGER NOT NULL REFERENCES variants(id),
 name TEXT NOT NULL, color TEXT NOT NULL, size TEXT NOT NULL, img TEXT NOT NULL,
 price INTEGER NOT NULL, qty INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS order_history (
 id INTEGER PRIMARY KEY, order_id TEXT NOT NULL REFERENCES orders(id), status TEXT NOT NULL,
 note TEXT NOT NULL, actor INTEGER NOT NULL REFERENCES users(id), created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS payment_events (
 id INTEGER PRIMARY KEY, order_id TEXT NOT NULL REFERENCES orders(id), status TEXT NOT NULL,
 reference TEXT NOT NULL, actor INTEGER NOT NULL REFERENCES users(id), created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS subscribers (email TEXT PRIMARY KEY COLLATE NOCASE);
CREATE TABLE IF NOT EXISTS audit (
 id INTEGER PRIMARY KEY, actor INTEGER NOT NULL REFERENCES users(id), action TEXT NOT NULL,
 target TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS orders_customer ON orders(user_id,created_at);
CREATE INDEX IF NOT EXISTS history_order ON order_history(order_id,id);
