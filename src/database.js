// src/database.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

const dbPath = path.join(__dirname, '..', 'blog_system.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('Connected to SQLite database at:', dbPath);
        db.run('PRAGMA foreign_keys = ON', (err) => {
            if (err) {
                console.error('Error enabling foreign keys:', err);
            } else {
                createTables();
            }
        });
    }
});

function createTables() {
    // Users table with role distinction
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            role TEXT NOT NULL CHECK (role IN ('author', 'reader')),
            created_at TEXT DEFAULT (datetime('now'))
        )
    `, (err) => {
        if (err) {
            console.error('Error creating users table:', err);
        } else {
            // Adding a default admin user
            db.get('SELECT * FROM users WHERE email = ?', ['admin@example.com'], (err, user) => {
                if (!user) {
                    bcrypt.hash('admin123', 10, (err, hash) => {
                        db.run(
                            'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
                            ['Admin', 'admin@example.com', hash, 'author']
                        );
                    });
                }
            });
        }
    });
    
    // Blogs table
    db.run(`
        CREATE TABLE IF NOT EXISTS blogs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            author_id INTEGER NOT NULL,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `, (err) => {
        if (err) {
            console.error('Error creating blogs table:', err);
        }
    });
    
    // Modified comments table to link to blogs and users
    db.run(`
        CREATE TABLE IF NOT EXISTS comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            blog_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            timestamp TEXT DEFAULT (datetime('now')),
            likes INTEGER DEFAULT 0,
            image BLOB,
            image_type TEXT,
            FOREIGN KEY (blog_id) REFERENCES blogs(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `, (err) => {
        if (err) {
            console.error('Error creating comments table:', err);
        } else {
            db.run('CREATE INDEX IF NOT EXISTS idx_comments_timestamp ON comments(timestamp DESC)');
        }
    });

    // Replies table (modified to reference user_id instead of username)
    db.run(`
        CREATE TABLE IF NOT EXISTS replies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            comment_id INTEGER,
            parent_reply_id INTEGER,
            user_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            timestamp TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
            FOREIGN KEY (parent_reply_id) REFERENCES replies(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `, (err) => {
        if (err) {
            console.error('Error creating replies table:', err);
        }
    });
}

// Promise-based wrapper functions
db.getAllAsync = function(query, params) {
    return new Promise((resolve, reject) => {
        this.all(query, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

db.getAsync = function(query, params) {
    return new Promise((resolve, reject) => {
        this.get(query, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

db.runAsync = function(query, params) {
    return new Promise((resolve, reject) => {
        this.run(query, params, function(err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
};

module.exports = db;