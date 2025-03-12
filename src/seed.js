// src/seed.js
const bcrypt = require('bcrypt');
const db = require('./database');

// Seed data
const AUTHORS = [
    { username: 'JohnSmith', email: 'john@example.com', password: 'password123', role: 'author' },
    { username: 'JaneDoe', email: 'jane@example.com', password: 'password123', role: 'author' },
    { username: 'SamWilson', email: 'sam@example.com', password: 'password123', role: 'author' }
];

const READERS = [
    { username: 'AliceJohnson', email: 'alice@example.com', password: 'password123', role: 'reader' },
    { username: 'BobBrown', email: 'bob@example.com', password: 'password123', role: 'reader' },
    { username: 'CarolWhite', email: 'carol@example.com', password: 'password123', role: 'reader' },
    { username: 'DavidMiller', email: 'david@example.com', password: 'password123', role: 'reader' },
    { username: 'EvaGreen', email: 'eva@example.com', password: 'password123', role: 'reader' }
];

const BLOGS = [
    // Blog data as before
    {
        title: 'Getting Started with Node.js',
        content: `
            <h2>Introduction to Node.js</h2>
            <p>Node.js is a powerful JavaScript runtime built on Chrome's V8 JavaScript engine. It allows developers to run JavaScript on the server side, creating web applications with a unified language throughout the entire stack.</p>
            
            <h3>Why Use Node.js?</h3>
            <ul>
                <li>Non-blocking I/O operations</li>
                <li>Fast execution of JavaScript code</li>
                <li>Large ecosystem of libraries via npm</li>
                <li>Great for real-time applications</li>
            </ul>
            
            <h3>Setting Up Your First Node.js Project</h3>
            <p>To get started with Node.js, first make sure you have it installed on your system. You can download it from the official website or use a version manager like nvm.</p>
            
            <p>Here's a simple example of a Hello World server in Node.js:</p>
            
            <pre>
const http = require('http');

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Hello World!');
});

server.listen(3000, () => {
  console.log('Server running at http://localhost:3000/');
});
            </pre>
            
            <p>Stay tuned for more tutorials on building with Node.js!</p>
        `,
        author_index: 0
    },
    {
        title: 'CSS Flexbox vs. Grid: When to Use Which',
        content: `
            <h2>Modern CSS Layout Techniques</h2>
            <p>CSS has evolved tremendously over the years, and two of the most powerful layout systems available to web developers today are Flexbox and Grid. Both provide efficient ways to create responsive layouts, but they excel in different scenarios.</p>
            
            <h3>Flexbox: One-Dimensional Layout</h3>
            <p>Flexbox is designed for one-dimensional layouts - either a row or a column. It's perfect for:</p>
            <ul>
                <li>Navigation menus</li>
                <li>Form controls</li>
                <li>Aligning items within a container</li>
                <li>Distributing space between items</li>
            </ul>
            
            <p>Example of a simple navigation menu with Flexbox:</p>
            <pre>
.nav {
  display: flex;
  justify-content: space-between;
}

.nav-item {
  padding: 10px;
}
            </pre>
            
            <h3>Grid: Two-Dimensional Layout</h3>
            <p>CSS Grid is designed for two-dimensional layouts - rows and columns simultaneously. It's ideal for:</p>
            <ul>
                <li>Overall page layouts</li>
                <li>Complex grid systems</li>
                <li>Card layouts with varying sizes</li>
                <li>Overlapping elements</li>
            </ul>
            
            <p>Example of a basic grid layout:</p>
            <pre>
.container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-gap: 20px;
}
            </pre>
            
            <h3>When to Use Which?</h3>
            <p>Use Flexbox when you need to align items in a single row or column. Use Grid when you need to control both dimensions simultaneously.</p>
            
            <p>The best approach is often to use Grid for the overall page layout, and Flexbox for components within those grid areas.</p>
        `,
        author_index: 1
    },
    {
        title: 'Introduction to SQLite for Web Development',
        content: `
            <h2>SQLite: The Self-Contained Database</h2>
            <p>SQLite is a powerful, lightweight database engine that's perfect for many web applications. Unlike traditional database systems that run as separate server processes, SQLite operates as a library that's integrated directly into your application.</p>
            
            <h3>Advantages of SQLite</h3>
            <ul>
                <li>Zero configuration - no server setup required</li>
                <li>Portable - entire database stored in a single file</li>
                <li>Reliable - ACID compliant with robust crash recovery</li>
                <li>Efficient - small memory footprint and fast operations</li>
                <li>Cross-platform compatibility</li>
            </ul>
            
            <h3>When to Use SQLite</h3>
            <p>SQLite is ideal for:</p>
            <ul>
                <li>Embedded applications</li>
                <li>Development and testing environments</li>
                <li>Low to medium traffic websites</li>
                <li>Applications that need local data storage</li>
                <li>Prototyping before scaling to larger databases</li>
            </ul>
            
            <h3>Basic SQLite Operations with Node.js</h3>
            <p>Using the sqlite3 package in Node.js, you can easily work with SQLite databases:</p>
            
            <pre>
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('mydb.sqlite');

// Create a table
db.run(\`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE
  )
\`);

// Insert data
db.run(
  'INSERT INTO users (username, email) VALUES (?, ?)',
  ['user1', 'user1@example.com'],
  function(err) {
    if (err) {
      console.error(err.message);
    } else {
      console.log(\`User added with ID: \${this.lastID}\`);
    }
  }
);

// Query data
db.all('SELECT * FROM users', [], (err, rows) => {
  if (err) {
    console.error(err.message);
  } else {
    rows.forEach(row => console.log(row));
  }
});

// Close the database
db.close();
            </pre>
            
            <p>SQLite is a fantastic choice for many web development projects, offering a great balance of simplicity, performance, and reliability.</p>
        `,
        author_index: 2
    },
    
];

// Function to create tables before seeding
function createTables() {
    return new Promise((resolve, reject) => {
        // Users table
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
                return reject(err);
            }
            
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
                    return reject(err);
                }
                
                // Comments table
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
                        return reject(err);
                    }
                    
                    // Create index on comments
                    db.run('CREATE INDEX IF NOT EXISTS idx_comments_timestamp ON comments(timestamp DESC)', (err) => {
                        if (err) {
                            console.error('Error creating comments index:', err);
                            return reject(err);
                        }
                        
                        // Replies table
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
                                return reject(err);
                            }
                            
                            resolve();
                        });
                    });
                });
            });
        });
    });
}

async function safeDeleteFromTable(tableName) {
    try {
        await db.runAsync(`DELETE FROM ${tableName}`);
        console.log(`Cleared ${tableName} table`);
    } catch (error) {
        console.log(`No ${tableName} table to clear or error clearing it: ${error.message}`);
    }
}

async function seedDatabase() {
    let dbConnection = null;
    
    try {
        console.log('Creating tables...');
        await createTables();
        console.log('Tables created successfully.');
        
        // Clear existing data in reverse order of dependencies
        console.log('Clearing existing data...');
        await safeDeleteFromTable('replies');
        await safeDeleteFromTable('comments');
        await safeDeleteFromTable('blogs');
        await safeDeleteFromTable('users');
        
        console.log('Cleared existing data');
        
        // Insert authors
        const authorIds = [];
        for (const author of AUTHORS) {
            const hashedPassword = await bcrypt.hash(author.password, 10);
            const result = await db.runAsync(
                'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
                [author.username, author.email, hashedPassword, author.role]
            );
            authorIds.push(result.lastID);
            console.log(`Created author: ${author.username}`);
        }
        
        // Insert readers
        const readerIds = [];
        for (const reader of READERS) {
            const hashedPassword = await bcrypt.hash(reader.password, 10);
            const result = await db.runAsync(
                'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
                [reader.username, reader.email, hashedPassword, reader.role]
            );
            readerIds.push(result.lastID);
            console.log(`Created reader: ${reader.username}`);
        }
        
        // Insert blogs
        const blogIds = [];
        for (const blog of BLOGS) {
            const result = await db.runAsync(
                'INSERT INTO blogs (title, content, author_id) VALUES (?, ?, ?)',
                [blog.title, blog.content, authorIds[blog.author_index]]
            );
            blogIds.push(result.lastID);
            console.log(`Created blog: ${blog.title}`);
        }
        
        // Add comments to blogs
        const comments = [
            "Great article! This really helped me understand the concept better.",
            "Thanks for writing this. I've been looking for a clear explanation on this topic.",
            "I have a question about one part of this article. Can you elaborate more on the third point?",
            "Very informative! I'll definitely be sharing this with my colleagues.",
            "I found this really helpful for a project I'm working on. Thanks for the detailed explanation.",
            "This is exactly what I needed to understand. Well written!",
            "I'd love to see a follow-up article that goes into more depth on this topic.",
            "Have you considered covering related topics in future articles?",
            "The examples you provided really helped clarify the concepts.",
            "I've been using a slightly different approach but your method looks more efficient. I'll give it a try!"
        ];
        
        const commentIds = [];
        
        // Each reader comments on each blog
        for (let i = 0; i < readerIds.length; i++) {
            for (let j = 0; j < blogIds.length; j++) {
                const commentText = comments[Math.floor(Math.random() * comments.length)];
                const result = await db.runAsync(
                    'INSERT INTO comments (blog_id, user_id, content) VALUES (?, ?, ?)',
                    [blogIds[j], readerIds[i], commentText]
                );
                commentIds.push(result.lastID);
                console.log(`Added comment to blog ${j+1} by reader ${i+1}`);
            }
        }
        
        // Add some replies to comments
        const replies = [
            "I agree with your point completely.",
            "Thanks for your feedback!",
            "Good question, I'll try to address that in a future update.",
            "I'm glad you found it helpful!",
            "Let me know if you need any clarification on other points.",
            "That's an interesting perspective, thanks for sharing!"
        ];
        
        // Authors reply to some comments
        for (let i = 0; i < commentIds.length; i += 3) { // Reply to every third comment
            const blogId = await db.getAsync('SELECT blog_id FROM comments WHERE id = ?', [commentIds[i]]);
            const blog = await db.getAsync('SELECT author_id FROM blogs WHERE id = ?', [blogId.blog_id]);
            
            const replyText = replies[Math.floor(Math.random() * replies.length)];
            await db.runAsync(
                'INSERT INTO replies (comment_id, user_id, content) VALUES (?, ?, ?)',
                [commentIds[i], blog.author_id, replyText]
            );
            console.log(`Added author reply to comment ${i+1}`);
        }
        
        // Readers reply to some comments
        for (let i = 1; i < commentIds.length; i += 4) { // Reply to every fourth comment
            const readerId = readerIds[Math.floor(Math.random() * readerIds.length)];
            const replyText = replies[Math.floor(Math.random() * replies.length)];
            
            await db.runAsync(
                'INSERT INTO replies (comment_id, user_id, content) VALUES (?, ?, ?)',
                [commentIds[i], readerId, replyText]
            );
            console.log(`Added reader reply to comment ${i+1}`);
        }
        
        console.log('Database seeded successfully!');
        console.log('\nTest Users:');
        console.log('===========');
        console.log('Authors:');
        AUTHORS.forEach(author => {
            console.log(`- ${author.username} (${author.email}) | Password: ${author.password}`);
        });
        console.log('\nReaders:');
        READERS.forEach(reader => {
            console.log(`- ${reader.username} (${reader.email}) | Password: ${reader.password}`);
        });
        
    } catch (error) {
        console.error('Error seeding database:', error);
    }
}

// Run the seed function
seedDatabase().then(() => {
    console.log('Seeding process completed');
    // Close database connection when done
    setTimeout(() => {
        db.close((err) => {
            if (err) {
                console.error('Error closing database:', err);
            } else {
                console.log('Database connection closed');
            }
            process.exit(0);
        });
    }, 1000); // Small delay to ensure all operations complete
}).catch(err => {
    console.error('Fatal error during seeding:', err);
    process.exit(1);
});