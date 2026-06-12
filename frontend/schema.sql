-- ============================================================
-- ENTE.PrintLabs — Cloudflare D1 Schema
-- Run: npx wrangler d1 execute enteprintlabs-db --file=schema.sql
-- For local dev: npx wrangler d1 execute enteprintlabs-db --local --file=schema.sql
-- ============================================================

-- Users
CREATE TABLE IF NOT EXISTS users (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  username    TEXT    NOT NULL UNIQUE,
  email       TEXT    NOT NULL UNIQUE,
  password    TEXT    NOT NULL,         -- bcrypt hash
  role        TEXT    NOT NULL DEFAULT 'customer', -- visitor|customer|staff|admin|super_admin
  phone       TEXT,
  address     TEXT,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT    NOT NULL,
  description TEXT    NOT NULL DEFAULT '',
  category    TEXT    NOT NULL,        -- Personalized|Engineering|Robotics|Home Decor|Gaming|Education
  image_key   TEXT,                    -- R2 object key (e.g. products/xyz.jpg)
  rate        REAL    NOT NULL DEFAULT 0.0,
  status      TEXT    NOT NULL DEFAULT 'active',
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Materials / Filament stock
CREATE TABLE IF NOT EXISTS materials (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT    NOT NULL,
  brand           TEXT    DEFAULT 'Generic',
  type            TEXT    NOT NULL,   -- PLA|PETG|ABS|TPU|Resin
  color           TEXT    NOT NULL,
  available_stock REAL    NOT NULL DEFAULT 0.0,
  reserved_stock  REAL    NOT NULL DEFAULT 0.0,
  reorder_level   REAL    NOT NULL DEFAULT 0.5
);

-- Custom print requests
CREATE TABLE IF NOT EXISTS requests (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_name          TEXT    NOT NULL,
  infill                TEXT    NOT NULL DEFAULT '20%',
  description           TEXT    NOT NULL DEFAULT '',
  dimensions            TEXT    NOT NULL DEFAULT '',
  material_preference   TEXT    NOT NULL DEFAULT '',
  color_preference      TEXT    NOT NULL DEFAULT '',
  quantity              INTEGER NOT NULL DEFAULT 1,
  required_delivery_date TEXT   NOT NULL,
  status                TEXT    NOT NULL DEFAULT 'New Request',
  shipping_carrier      TEXT,
  tracking_number       TEXT,
  created_at            TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- STL / model files attached to requests
CREATE TABLE IF NOT EXISTS request_files (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id  INTEGER NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  file_key    TEXT    NOT NULL,  -- R2 object key (e.g. requests/uuid.stl)
  file_type   TEXT    NOT NULL DEFAULT 'STL',
  volume_cm3  REAL,
  uploaded_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Quotations
CREATE TABLE IF NOT EXISTS quotations (
  id                        INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id                INTEGER NOT NULL UNIQUE REFERENCES requests(id) ON DELETE CASCADE,
  material_cost             REAL    NOT NULL DEFAULT 0,
  machine_cost              REAL    NOT NULL DEFAULT 0,
  post_processing_cost      REAL    NOT NULL DEFAULT 0,
  packaging_cost            REAL    NOT NULL DEFAULT 0,
  transportation_cost       REAL    NOT NULL DEFAULT 0,
  profit_margin             REAL    NOT NULL DEFAULT 20,
  total_price               REAL    NOT NULL DEFAULT 0,
  validity_date             TEXT    NOT NULL,
  estimated_production_hours REAL   NOT NULL DEFAULT 0,
  status                    TEXT    NOT NULL DEFAULT 'Pending',
  created_at                TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Catalog orders
CREATE TABLE IF NOT EXISTS orders (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id       INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity         INTEGER NOT NULL DEFAULT 1,
  total_price      REAL    NOT NULL,
  shipping_address TEXT    NOT NULL,
  status           TEXT    NOT NULL DEFAULT 'Pending',
  shipping_carrier TEXT,
  tracking_number  TEXT,
  created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Printers
CREATE TABLE IF NOT EXISTS printers (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT NOT NULL,
  type         TEXT NOT NULL DEFAULT 'FDM',
  status       TEXT NOT NULL DEFAULT 'Idle',
  build_volume TEXT NOT NULL DEFAULT '220 x 220 x 250 mm'
);

-- Production jobs
CREATE TABLE IF NOT EXISTS production_jobs (
  id                      INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id              INTEGER NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  printer_id              INTEGER REFERENCES printers(id) ON DELETE SET NULL,
  material_id             INTEGER REFERENCES materials(id) ON DELETE SET NULL,
  estimated_time_minutes  INTEGER NOT NULL DEFAULT 0,
  priority                TEXT    NOT NULL DEFAULT 'Medium',
  status                  TEXT    NOT NULL DEFAULT 'Scheduled',
  started_at              TEXT,
  completed_at            TEXT
);

-- Seed default admin and superadmin users
-- Passwords are set to 'admin123' hashed using bcrypt
INSERT OR IGNORE INTO users (username, email, password, role) VALUES 
('admin', 'admin@printlabs.com', '$2b$10$jFuXAmDeZ2VixZarZlow5.JuBfPg8SQKkkf1hFhh6DXvH/ZzAaXfS', 'admin'),
('superadmin', 'superadmin@printlabs.com', '$2b$10$jFuXAmDeZ2VixZarZlow5.JuBfPg8SQKkkf1hFhh6DXvH/ZzAaXfS', 'super_admin');

-- Seed default materials
INSERT OR IGNORE INTO materials (id, name, brand, type, color, available_stock, reserved_stock, reorder_level) VALUES
(1, 'PLA White Premium', 'eSUN', 'PLA', '#ffffff', 5.0, 0.0, 1.0),
(2, 'PLA Black Premium', 'eSUN', 'PLA', '#1a1a1a', 8.0, 0.0, 1.0),
(3, 'PLA Red Premium', 'eSUN', 'PLA', '#ef4444', 3.5, 0.0, 1.0),
(4, 'PLA Blue Premium', 'eSUN', 'PLA', '#3b82f6', 4.0, 0.0, 1.0),
(5, 'PETG Grey', 'Generic', 'PETG', '#6b7280', 6.0, 0.0, 1.0),
(6, 'ABS Yellow', 'Polymaker', 'ABS', '#eab308', 2.5, 0.0, 1.0);

