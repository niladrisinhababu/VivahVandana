import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database("vivah.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT UNIQUE,
    password TEXT,
    role TEXT DEFAULT 'USER'
  );

  CREATE TABLE IF NOT EXISTS vendors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    business_name TEXT,
    description TEXT,
    location TEXT,
    price REAL,
    contact_number TEXT,
    email TEXT,
    image_url TEXT,
    category TEXT,
    status TEXT DEFAULT 'PENDING',
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vendor_id INTEGER,
    category TEXT,
    title TEXT,
    description TEXT,
    price REAL,
    image_url TEXT,
    FOREIGN KEY(vendor_id) REFERENCES vendors(id)
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    service_id INTEGER,
    booking_date TEXT,
    status TEXT DEFAULT 'PENDING',
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(service_id) REFERENCES services(id)
  );
`);

// Ensure new columns exist in vendors table (Migration)
try { db.exec("ALTER TABLE vendors ADD COLUMN price REAL"); } catch (e) {}
try { db.exec("ALTER TABLE vendors ADD COLUMN contact_number TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE vendors ADD COLUMN email TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE vendors ADD COLUMN image_url TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE vendors ADD COLUMN category TEXT"); } catch (e) {}

// Seed initial data
const adminExists = db.prepare("SELECT id FROM users WHERE email = ?").get("admin@vivah.com");
if (!adminExists) {
  db.prepare("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)").run("Admin", "admin@vivah.com", "admin123", "ADMIN");
}

const vendorOneExists = db.prepare("SELECT id FROM users WHERE email = ?").get("vendor@vivah.com");
if (!vendorOneExists) {
  db.prepare("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)").run("Vendor One", "vendor@vivah.com", "vendor123", "VENDOR");
  
  db.prepare("INSERT INTO vendors (user_id, business_name, description, location, price, category, image_url, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(
    2, 
    "Royal Pandals", 
    "Best wedding tents in Delhi. We provide luxury setups for all types of events.", 
    "Delhi", 
    45000, 
    "PANDAL", 
    "https://picsum.photos/seed/pandal/800/600", 
    "APPROVED"
  );
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // API Routes
  app.post("/api/auth/signup", (req, res) => {
    const { name, email, password } = req.body;
    try {
      const result = db.prepare("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)").run(name, email, password, 'USER');
      const user = db.prepare("SELECT id, name, email, role FROM users WHERE id = ?").get(result.lastInsertRowid);
      res.json(user);
    } catch (err) {
      res.status(400).json({ error: "Email already exists" });
    }
  });

  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare("SELECT id, name, email, role FROM users WHERE email = ? AND password = ?").get(email, password);
    if (user) {
      res.json(user);
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  app.get("/api/services", (req, res) => {
    const services = db.prepare(`
      SELECT 
        v.id as id,
        v.id as vendor_id,
        v.category,
        v.business_name as title,
        v.description,
        v.price,
        v.image_url,
        v.business_name,
        v.location
      FROM vendors v 
      WHERE v.status = 'APPROVED'
    `).all();
    res.json(services);
  });

  app.get("/api/services/:id", (req, res) => {
    const service = db.prepare(`
      SELECT 
        v.id as id,
        v.id as vendor_id,
        v.category,
        v.business_name as title,
        v.description,
        v.price,
        v.image_url,
        v.business_name,
        v.location,
        v.description as vendor_desc
      FROM vendors v 
      WHERE v.id = ?
    `).get(req.params.id);
    res.json(service);
  });

  app.post("/api/bookings", (req, res) => {
    const { user_id, service_id, booking_date } = req.body;
    const result = db.prepare("INSERT INTO bookings (user_id, service_id, booking_date) VALUES (?, ?, ?)").run(user_id, service_id, booking_date);
    res.json({ id: result.lastInsertRowid, status: 'PENDING' });
  });

  app.get("/api/admin/vendors/pending", (req, res) => {
    const vendors = db.prepare("SELECT * FROM vendors WHERE status = 'PENDING'").all();
    res.json(vendors);
  });

  app.post("/api/admin/vendors/:id/approve", (req, res) => {
    db.prepare("UPDATE vendors SET status = 'APPROVED' WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.post("/api/vendor/register", (req, res) => {
    const { user_id, business_name, description, location, price, contact_number, email, image_url, category } = req.body;
    const result = db.prepare("INSERT INTO vendors (user_id, business_name, description, location, price, contact_number, email, image_url, category) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run(user_id, business_name, description, location, price, contact_number, email, image_url, category);
    res.json({ id: result.lastInsertRowid, status: 'PENDING' });
  });

  app.get("/api/vendor/profile/:userId", (req, res) => {
    const vendor = db.prepare("SELECT * FROM vendors WHERE user_id = ?").get(req.params.userId);
    if (vendor) {
      res.json(vendor);
    } else {
      res.status(404).json({ error: "Profile not found" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist/index.html"));
    });
  }

  const PORT = process.env.PORT || 3000;
  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
