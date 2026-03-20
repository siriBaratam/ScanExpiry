-- ScanExpiry Database Schema + Sample Data
-- Run this in psql or pgAdmin after creating the database
-- ============ TABLES ============
-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'customer',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
-- Products Table
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    expiry_date DATE NOT NULL,
    purchase_date DATE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
-- Scans Table (OCR results)
CREATE TABLE IF NOT EXISTS scans (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    scan_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    ocr_text TEXT
);
-- Alerts Table
CREATE TABLE IF NOT EXISTS alerts (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    alert_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    status TEXT DEFAULT 'pending'
);
-- Reports Table
CREATE TABLE IF NOT EXISTS reports (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    wastage_metric NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
-- ============ SAMPLE DATA ============
-- Insert sample user (password: "password123" hashed with bcrypt)
INSERT INTO users (name, email, password_hash, role)
VALUES (
        'John Doe',
        'john@example.com',
        '$2b$10$YourHashedPasswordHere',
        'customer'
    ),
    (
        'Admin User',
        'admin@example.com',
        '$2b$10$YourHashedPasswordHere',
        'admin'
    );
-- Insert sample products
INSERT INTO products (
        name,
        category,
        expiry_date,
        purchase_date,
        user_id
    )
VALUES (
        'Milk',
        'Dairy',
        CURRENT_DATE + INTERVAL '3 days',
        CURRENT_DATE - INTERVAL '1 day',
        1
    ),
    (
        'Cheese',
        'Dairy',
        CURRENT_DATE + INTERVAL '15 days',
        CURRENT_DATE - INTERVAL '5 days',
        1
    ),
    (
        'Chicken Breast',
        'Meat',
        CURRENT_DATE + INTERVAL '2 days',
        CURRENT_DATE,
        1
    ),
    (
        'Carrots',
        'Vegetables',
        CURRENT_DATE + INTERVAL '20 days',
        CURRENT_DATE - INTERVAL '3 days',
        1
    ),
    (
        'Bread',
        'Bakery',
        CURRENT_DATE + INTERVAL '4 days',
        CURRENT_DATE - INTERVAL '2 days',
        1
    );
-- Insert sample alerts
INSERT INTO alerts (product_id, user_id, status)
VALUES (1, 1, 'pending'),
    (3, 1, 'pending'),
    (2, 1, 'viewed');
-- Insert sample reports
INSERT INTO reports (user_id, wastage_metric)
VALUES (1, 342.50),
    (1, 125.00);
-- ============ VERIFY ============
-- Check all tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public';
-- Check users
SELECT *
FROM users;
-- Check products
SELECT *
FROM products;