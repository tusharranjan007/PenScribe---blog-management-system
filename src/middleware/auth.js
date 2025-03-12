// src/middleware/auth.js
const jwt = require('jsonwebtoken');
const db = require('../database');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Middleware to check if user is authenticated
const authenticateToken = (req, res, next) => {
    const token = req.cookies.token;
    
    if (!token) {
        // If it's an API request, return 401 status without redirect
        if (req.path.startsWith('/api/')) {
            return res.status(401).json({ error: 'Not authenticated' });
        }
        
        // For non-API routes that require authentication, redirect to login
        // Skip redirect for public pages like homepage, blog viewing
        if (req.path !== '/' && !req.path.startsWith('/blog/')) {
            return res.redirect('/login');
        }
    }

    // If token exists, verify it
    if (token) {
        try {
            const user = jwt.verify(token, JWT_SECRET);
            req.user = user;
        } catch (error) {
            res.clearCookie('token');
            
            // If it's an API request, return 401 status
            if (req.path.startsWith('/api/')) {
                return res.status(401).json({ error: 'Invalid token' });
            }
            
            // For non-API routes, redirect to login
            if (req.path !== '/' && !req.path.startsWith('/blog/')) {
                return res.redirect('/login');
            }
        }
    }
    
    // Always proceed for public routes, even without authentication
    next();
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

module.exports = {
    authenticateToken,
    isAuthor,
    isBlogAuthor,
    isCommentOwner
};