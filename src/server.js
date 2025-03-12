// src/server.js
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const db = require('./database');
const moment = require('moment');
const multer = require('multer');
const upload = multer();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

const app = express();
const port = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Middleware
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const token = req.cookies.token;
    
    if (!token) {
        return res.redirect('/login');
    }

    try {
        const user = jwt.verify(token, JWT_SECRET);
        req.user = user;
        next();
    } catch (error) {
        res.clearCookie('token');
        return res.redirect('/login');
    }
};

// Middleware to check if user is an author
const isAuthor = (req, res, next) => {
    if (req.user && req.user.role === 'author') {
        return next();
    }
    return res.status(403).json({ error: 'Access denied. Authors only.' });
};

// Middleware to check if user is the author of a specific blog
const isBlogAuthor = async (req, res, next) => {
    try {
        const blogId = req.params.id;
        const blog = await db.getAsync('SELECT * FROM blogs WHERE id = ?', [blogId]);
        
        if (!blog) {
            return res.status(404).json({ error: 'Blog not found' });
        }
        
        if (blog.author_id !== req.user.id) {
            return res.status(403).json({ error: 'You are not authorized to modify this blog' });
        }
        
        next();
    } catch (error) {
        console.error('Error in isBlogAuthor middleware:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Middleware to check if user is the owner of a specific comment
const isCommentOwner = async (req, res, next) => {
    try {
        const commentId = req.params.id;
        const comment = await db.getAsync('SELECT * FROM comments WHERE id = ?', [commentId]);
        
        if (!comment) {
            return res.status(404).json({ error: 'Comment not found' });
        }
        
        if (comment.user_id !== req.user.id) {
            return res.status(403).json({ error: 'You are not authorized to modify this comment' });
        }
        
        next();
    } catch (error) {
        console.error('Error in isCommentOwner middleware:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Middleware to check if user is the owner of a reply
const isReplyOwner = async (req, res, next) => {
    try {
        const replyId = req.params.id;
        const reply = await db.getAsync('SELECT * FROM replies WHERE id = ?', [replyId]);
        
        if (!reply) {
            return res.status(404).json({ error: 'Reply not found' });
        }
        
        if (reply.user_id !== req.user.id) {
            return res.status(403).json({ error: 'You are not authorized to modify this reply' });
        }
        
        next();
    } catch (error) {
        console.error('Error in isReplyOwner middleware:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Routes for serving HTML pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/login.html'));
});

app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/signup.html'));
});

// These routes require authentication
app.get('/dashboard', authenticateToken, (req, res) => {
    // Only authenticated users can access dashboard
    if (!req.user) {
        return res.redirect('/login');
    }
    res.sendFile(path.join(__dirname, '../public/dashboard.html'));
});

app.get('/create-blog', authenticateToken, isAuthor, (req, res) => {
    res.sendFile(path.join(__dirname, '../public/create-blog.html'));
});

app.get('/edit-blog/:id', authenticateToken, isAuthor, (req, res) => {
    res.sendFile(path.join(__dirname, '../public/edit-blog.html'));
});

// Public route to view individual blogs
app.get('/blog/:id', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/view-blog.html'));
});

// Modified /api/user endpoint to handle unauthenticated requests properly
app.get('/api/user', (req, res) => {
    const token = req.cookies.token;
    
    if (!token) {
        // For unauthenticated users, just return 401 status without redirect
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const user = jwt.verify(token, JWT_SECRET);
        res.json({ user });
    } catch (error) {
        res.clearCookie('token');
        return res.status(401).json({ error: 'Invalid token' });
    }
});

// Keepping these as public API endpoints
app.get('/api/blogs', async (req, res) => {
    try {
        const sortBy = req.query.sort || 'date'; // 'date' or 'comments'
        
        let query = `
            SELECT 
                b.id, b.title, b.content, b.created_at, b.updated_at,
                u.username as author_name, u.id as author_id,
                (SELECT COUNT(*) FROM comments WHERE blog_id = b.id) as comment_count
            FROM blogs b
            JOIN users u ON b.author_id = u.id
        `;
        
        if (sortBy === 'date') {
            query += ' ORDER BY b.created_at DESC';
        } else if (sortBy === 'comments') {
            query += ' ORDER BY comment_count DESC';
        }
        
        const blogs = await db.getAllAsync(query, []);
        res.json({ blogs });
    } catch (error) {
        console.error('Error fetching blogs:', error);
        res.status(500).json({ error: 'Error fetching blogs' });
    }
});

app.get('/api/blogs/:id', async (req, res) => {
    try {
        const blogId = req.params.id;
        
        const blog = await db.getAsync(`
            SELECT 
                b.id, b.title, b.content, b.created_at, b.updated_at,
                u.username as author_name, u.id as author_id
            FROM blogs b
            JOIN users u ON b.author_id = u.id
            WHERE b.id = ?
        `, [blogId]);
        
        if (!blog) {
            return res.status(404).json({ error: 'Blog not found' });
        }
        
        res.json({ blog });
    } catch (error) {
        console.error('Error fetching blog:', error);
        res.status(500).json({ error: 'Error fetching blog' });
    }
});

// Auth routes
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password, role } = req.body;
        
        // Validate input
        if (!username || !email || !password || !role) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        
        if (role !== 'author' && role !== 'reader') {
            return res.status(400).json({ error: 'Invalid role' });
        }
        
        // Check if user already exists
        const existingUser = await db.getAsync(
            'SELECT * FROM users WHERE email = ? OR username = ?', 
            [email, username]
        );
        
        if (existingUser) {
            return res.status(400).json({ 
                error: 'User already exists with this email or username' 
            });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Insert user into database
        const result = await db.runAsync(
            'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
            [username, email, hashedPassword, role]
        );
        
        // Create JWT token
        const token = jwt.sign(
            { id: result.lastID, username, email, role }, 
            JWT_SECRET, 
            { expiresIn: '24h' }
        );
        
        // Set cookie and respond
        res.cookie('token', token, { 
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });
        
        res.status(201).json({ 
            message: 'User registered successfully',
            user: { id: result.lastID, username, email, role }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Server error during registration' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Validate input
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        
        // Find user
        const user = await db.getAsync('SELECT * FROM users WHERE email = ?', [email]);
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Compare password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Create JWT token
        const token = jwt.sign(
            { id: user.id, username: user.username, email: user.email, role: user.role }, 
            JWT_SECRET, 
            { expiresIn: '24h' }
        );
        
        // Set cookie and respond
        res.cookie('token', token, { 
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });
        
        res.json({ 
            message: 'Login successful',
            user: { id: user.id, username: user.username, email: user.email, role: user.role }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error during login' });
    }
});

app.post('/api/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logged out successfully' });
});

app.get('/api/user', authenticateToken, (req, res) => {
    res.json({ user: req.user });
});

// Blog routes
app.get('/api/blogs', async (req, res) => {
    try {
        const sortBy = req.query.sort || 'date'; // 'date' or 'comments'
        
        let query = `
            SELECT 
                b.id, b.title, b.content, b.created_at, b.updated_at,
                u.username as author_name, u.id as author_id,
                (SELECT COUNT(*) FROM comments WHERE blog_id = b.id) as comment_count
            FROM blogs b
            JOIN users u ON b.author_id = u.id
        `;
        
        if (sortBy === 'date') {
            query += ' ORDER BY b.created_at DESC';
        } else if (sortBy === 'comments') {
            query += ' ORDER BY comment_count DESC';
        }
        
        const blogs = await db.getAllAsync(query, []);
        res.json({ blogs });
    } catch (error) {
        console.error('Error fetching blogs:', error);
        res.status(500).json({ error: 'Error fetching blogs' });
    }
});

app.get('/api/blogs/:id', async (req, res) => {
    try {
        const blogId = req.params.id;
        
        const blog = await db.getAsync(`
            SELECT 
                b.id, b.title, b.content, b.created_at, b.updated_at,
                u.username as author_name, u.id as author_id
            FROM blogs b
            JOIN users u ON b.author_id = u.id
            WHERE b.id = ?
        `, [blogId]);
        
        if (!blog) {
            return res.status(404).json({ error: 'Blog not found' });
        }
        
        res.json({ blog });
    } catch (error) {
        console.error('Error fetching blog:', error);
        res.status(500).json({ error: 'Error fetching blog' });
    }
});

app.post('/api/blogs', authenticateToken, isAuthor, async (req, res) => {
    try {
        const { title, content } = req.body;
        
        if (!title || !content) {
            return res.status(400).json({ error: 'Title and content are required' });
        }
        
        const result = await db.runAsync(
            'INSERT INTO blogs (title, content, author_id) VALUES (?, ?, ?)',
            [title, content, req.user.id]
        );
        
        res.status(201).json({ 
            message: 'Blog created successfully',
            blogId: result.lastID
        });
    } catch (error) {
        console.error('Error creating blog:', error);
        res.status(500).json({ error: 'Error creating blog' });
    }
});

app.put('/api/blogs/:id', authenticateToken, isAuthor, isBlogAuthor, async (req, res) => {
    try {
        const blogId = req.params.id;
        const { title, content } = req.body;
        
        if (!title || !content) {
            return res.status(400).json({ error: 'Title and content are required' });
        }
        
        await db.runAsync(
            'UPDATE blogs SET title = ?, content = ?, updated_at = datetime("now") WHERE id = ?',
            [title, content, blogId]
        );
        
        res.json({ message: 'Blog updated successfully' });
    } catch (error) {
        console.error('Error updating blog:', error);
        res.status(500).json({ error: 'Error updating blog' });
    }
});

app.delete('/api/blogs/:id', authenticateToken, isAuthor, isBlogAuthor, async (req, res) => {
    try {
        const blogId = req.params.id;
        
        await db.runAsync('DELETE FROM blogs WHERE id = ?', [blogId]);
        
        res.json({ message: 'Blog deleted successfully' });
    } catch (error) {
        console.error('Error deleting blog:', error);
        res.status(500).json({ error: 'Error deleting blog' });
    }
});

// Comment routes 
app.get('/api/blogs/:blogId/comments', async (req, res) => {
    try {
        const blogId = req.params.blogId;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        
        // Get total comments count
        const totalRow = await db.getAsync(
            'SELECT COUNT(*) as total FROM comments WHERE blog_id = ?',
            [blogId]
        );
        
        const total = totalRow.total;
        const totalPages = Math.ceil(total / limit);
        
        // First, get the comments with their basic info
        const comments = await db.getAllAsync(`
            SELECT 
                c.id, c.content, c.timestamp, c.likes, c.image, c.image_type,
                u.id as user_id, u.username
            FROM comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.blog_id = ?
            ORDER BY c.timestamp DESC
            LIMIT ? OFFSET ?
        `, [blogId, limit, offset]);
        
        // For each comment, get ALL its replies (including nested ones)
        const commentsWithReplies = await Promise.all(comments.map(async (comment) => {
            // Get all replies for this comment as a flat structure
            const allReplies = await db.getAllAsync(`
                SELECT 
                    r.id, r.content, r.timestamp, r.parent_reply_id, 
                    u.id as user_id, u.username
                FROM replies r
                JOIN users u ON r.user_id = u.id
                WHERE r.comment_id = ?
                ORDER BY r.timestamp ASC
            `, [comment.id]);
            
            // Build a nested structure of replies
            const repliesMap = new Map();
            const topLevelReplies = [];
            
            // First pass: create all reply objects with empty nested_replies arrays
            allReplies.forEach(reply => {
                repliesMap.set(reply.id, {
                    ...reply,
                    nested_replies: []
                });
            });
            
            // Second pass: build the hierarchy
            allReplies.forEach(reply => {
                const replyObj = repliesMap.get(reply.id);
                
                if (reply.parent_reply_id) {
                    // This is a nested reply - add it to its parent's nested_replies
                    const parentReply = repliesMap.get(reply.parent_reply_id);
                    if (parentReply) {
                        parentReply.nested_replies.push(replyObj);
                    } else {
                        // If parent reply wasn't found (unusual case), add it as top level
                        topLevelReplies.push(replyObj);
                    }
                } else {
                    // This is a top-level reply
                    topLevelReplies.push(replyObj);
                }
            });
            
            // Add the replies to the comment
            comment.replies = topLevelReplies;
            
            // Convert image to base64 if present
            if (comment.image) {
                comment.image = `data:${comment.image_type};base64,${comment.image.toString('base64')}`;
            }
            
            return comment;
        }));
        
        res.json({
            comments: commentsWithReplies,
            pagination: {
                page,
                limit,
                total,
                totalPages
            }
        });
    } catch (error) {
        console.error('Error fetching comments:', error);
        res.status(500).json({ error: 'Error fetching comments' });
    }
});

app.post('/api/blogs/:blogId/comments', authenticateToken, upload.single('image'), async (req, res) => {
    try {
        const { content } = req.body;
        const blogId = req.params.blogId;
        
        if (!content) {
            return res.status(400).json({ error: 'Content is required' });
        }
        
        let imageData = null;
        let imageType = null;
        
        if (req.file) {
            imageData = req.file.buffer;
            imageType = req.file.mimetype;
        }
        
        const result = await db.runAsync(
            'INSERT INTO comments (blog_id, user_id, content, image, image_type) VALUES (?, ?, ?, ?, ?)',
            [blogId, req.user.id, content, imageData, imageType]
        );
        
        const comment = await db.getAsync(`
            SELECT c.id, c.content, c.timestamp, c.likes, c.image, c.image_type, u.username, c.user_id
            FROM comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.id = ?
        `, [result.lastID]);
        
        if (comment.image) {
            comment.image = `data:${comment.image_type};base64,${comment.image.toString('base64')}`;
        }
        
        res.status(201).json(comment);
    } catch (error) {
        console.error('Error creating comment:', error);
        res.status(500).json({ error: 'Error creating comment' });
    }
});

app.put('/api/comments/:id', authenticateToken, async (req, res) => {
    try {
        const { content } = req.body;
        const commentId = req.params.id;
        
        if (!content) {
            return res.status(400).json({ error: 'Content is required' });
        }
        
        // Get the comment to check ownership
        const comment = await db.getAsync('SELECT * FROM comments WHERE id = ?', [commentId]);
        
        if (!comment) {
            return res.status(404).json({ error: 'Comment not found' });
        }
        
        // Check if user is the owner
        if (comment.user_id !== req.user.id) {
            return res.status(403).json({ error: 'You are not authorized to edit this comment' });
        }
        
        await db.runAsync(
            'UPDATE comments SET content = ? WHERE id = ?',
            [content, commentId]
        );
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating comment:', error);
        res.status(500).json({ error: 'Error updating comment' });
    }
});

app.delete('/api/comments/:id', authenticateToken, async (req, res) => {
    try {
        const commentId = req.params.id;
        
        // Get the comment to check ownership
        const comment = await db.getAsync('SELECT * FROM comments WHERE id = ?', [commentId]);
        
        if (!comment) {
            return res.status(404).json({ error: 'Comment not found' });
        }
        
        // Check if user is the owner
        if (comment.user_id !== req.user.id) {
            return res.status(403).json({ error: 'You are not authorized to delete this comment' });
        }
        
        await db.runAsync('DELETE FROM comments WHERE id = ?', [commentId]);
        
        // Delete related replies
        await db.runAsync('DELETE FROM replies WHERE comment_id = ?', [commentId]);
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting comment:', error);
        res.status(500).json({ error: 'Error deleting comment' });
    }
});

app.get('/api/comments/:id', async (req, res) => {
    try {
        const commentId = req.params.id;
        
        // First get the comment
        const comment = await db.getAsync(`
            SELECT 
                c.id, c.content, c.timestamp, c.likes, c.image, c.image_type,
                u.id as user_id, u.username
            FROM comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.id = ?
        `, [commentId]);
        
        if (!comment) {
            return res.status(404).json({ error: 'Comment not found' });
        }
        
        // Now get ALL replies for this comment (as a flat structure)
        const allReplies = await db.getAllAsync(`
            SELECT 
                r.id, r.content, r.timestamp, r.parent_reply_id, 
                u.id as user_id, u.username
            FROM replies r
            JOIN users u ON r.user_id = u.id
            WHERE r.comment_id = ?
            ORDER BY r.timestamp ASC
        `, [commentId]);
        
        // Build a nested structure of replies
        const repliesMap = new Map();
        const topLevelReplies = [];
        
        // First pass: create all reply objects with empty nested_replies arrays
        allReplies.forEach(reply => {
            repliesMap.set(reply.id, {
                ...reply,
                nested_replies: []
            });
        });
        
        // Second pass: build the hierarchy
        allReplies.forEach(reply => {
            const replyObj = repliesMap.get(reply.id);
            
            if (reply.parent_reply_id) {
                // This is a nested reply - add it to its parent's nested_replies
                const parentReply = repliesMap.get(reply.parent_reply_id);
                if (parentReply) {
                    parentReply.nested_replies.push(replyObj);
                } else {
                    // If parent reply wasn't found (unusual case), add it as top level
                    topLevelReplies.push(replyObj);
                }
            } else {
                // This is a top-level reply
                topLevelReplies.push(replyObj);
            }
        });
        
        // Add the replies to the comment
        comment.replies = topLevelReplies;
        
        // Convert image to base64 if present
        if (comment.image) {
            comment.image = `data:${comment.image_type};base64,${comment.image.toString('base64')}`;
        }
        
        res.json({ comment });
    } catch (error) {
        console.error('Error fetching comment:', error);
        res.status(500).json({ error: 'Error fetching comment' });
    }
});


// Reply routes 
app.post('/api/comments/:commentId/replies', authenticateToken, async (req, res) => {
    try {
        const { content } = req.body;
        const commentId = req.params.commentId;
        
        if (!content) {
            return res.status(400).json({ error: 'Content is required' });
        }
        
        const result = await db.runAsync(
            'INSERT INTO replies (comment_id, user_id, content) VALUES (?, ?, ?)',
            [commentId, req.user.id, content]
        );
        
        const reply = await db.getAsync(`
            SELECT r.id, r.comment_id, r.content, r.timestamp, u.username, r.user_id
            FROM replies r
            JOIN users u ON r.user_id = u.id
            WHERE r.id = ?
        `, [result.lastID]);
        
        res.status(201).json(reply);
    } catch (error) {
        console.error('Error creating reply:', error);
        res.status(500).json({ error: 'Error creating reply' });
    }
});

app.post('/api/replies/:replyId/replies', authenticateToken, async (req, res) => {
    try {
        const { content } = req.body;
        const parentReplyId = req.params.replyId;
        
        if (!content) {
            return res.status(400).json({ error: 'Content is required' });
        }
        
        const parentReply = await db.getAsync(
            'SELECT comment_id FROM replies WHERE id = ?',
            [parentReplyId]
        );
        
        if (!parentReply) {
            return res.status(404).json({ error: 'Parent reply not found' });
        }
        
        const commentId = parentReply.comment_id;
        
        const result = await db.runAsync(
            'INSERT INTO replies (comment_id, parent_reply_id, user_id, content) VALUES (?, ?, ?, ?)',
            [commentId, parentReplyId, req.user.id, content]
        );
        
        const reply = await db.getAsync(`
            SELECT r.id, r.comment_id, r.parent_reply_id, r.content, r.timestamp, u.username, r.user_id
            FROM replies r
            JOIN users u ON r.user_id = u.id
            WHERE r.id = ?
        `, [result.lastID]);
        
        res.status(201).json(reply);
    } catch (error) {
        console.error('Error creating nested reply:', error);
        res.status(500).json({ error: 'Error creating nested reply' });
    }
});

app.put('/api/replies/:id', authenticateToken, async (req, res) => {
    try {
        const { content } = req.body;
        const replyId = req.params.id;
        
        if (!content) {
            return res.status(400).json({ error: 'Content is required' });
        }
        
        // Get the reply to check ownership
        const reply = await db.getAsync('SELECT * FROM replies WHERE id = ?', [replyId]);
        
        if (!reply) {
            return res.status(404).json({ error: 'Reply not found' });
        }
        
        // Check if user is the owner
        if (reply.user_id !== req.user.id) {
            return res.status(403).json({ error: 'You are not authorized to edit this reply' });
        }
        
        await db.runAsync(
            'UPDATE replies SET content = ? WHERE id = ?',
            [content, replyId]
        );
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating reply:', error);
        res.status(500).json({ error: 'Error updating reply' });
    }
});

app.delete('/api/replies/:id', authenticateToken, async (req, res) => {
    try {
        const replyId = req.params.id;
        
        // Get the reply to check ownership
        const reply = await db.getAsync('SELECT * FROM replies WHERE id = ?', [replyId]);
        
        if (!reply) {
            return res.status(404).json({ error: 'Reply not found' });
        }
        
        // Check if user is the owner
        if (reply.user_id !== req.user.id) {
            return res.status(403).json({ error: 'You are not authorized to delete this reply' });
        }
        
        await db.runAsync('DELETE FROM replies WHERE id = ?', [replyId]);
        
        // Delete nested replies
        await db.runAsync('DELETE FROM replies WHERE parent_reply_id = ?', [replyId]);
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting reply:', error);
        res.status(500).json({ error: 'Error deleting reply' });
    }
});

// Like comments
app.put('/api/comments/:id/like', async (req, res) => {
    try {
        const commentId = req.params.id;
        
        await db.runAsync(
            'UPDATE comments SET likes = likes + 1 WHERE id = ?',
            [commentId]
        );
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error liking comment:', error);
        res.status(500).json({ error: 'Error liking comment' });
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});