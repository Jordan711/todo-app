# Complete Guide: Converting Your Home Server to REST API + Flutter

**Last Updated:** February 7, 2026
**For:** Junior Developers
**Project:** Family Home Automation Server

---

## Table of Contents

1. [Understanding the Architecture](#1-understanding-the-architecture)
2. [Why This Approach](#2-why-this-approach)
3. [Key Concepts Explained](#3-key-concepts-explained)
4. [Phase 1: API Conversion](#4-phase-1-api-conversion)
5. [Phase 2: Flutter App](#5-phase-2-flutter-app)
6. [Phase 3: Smart Home Integration](#6-phase-3-smart-home-integration)
7. [Testing Your API](#7-testing-your-api)
8. [Deployment](#8-deployment)
9. [Common Problems & Solutions](#9-common-problems--solutions)
10. [Learning Resources](#10-learning-resources)

---

## 1. Understanding the Architecture

### Current Architecture (What You Have Now)

```
Browser Request
    ↓
Express Server (app.js)
    ↓
Routes (notices.js, shopping-list.js)
    ↓
Repository Layer (noticeRepository.js)
    ↓
SQLite Database
    ↓
Pug Template Rendering
    ↓
HTML Response to Browser
```

**Problem:** Everything is tightly coupled. The server generates HTML, so you can't easily build a mobile app.

### New Architecture (Where You're Going)

```
Flutter Mobile App (Client)
    ↓
HTTP Requests (JSON) / WebSocket
    ↓
Express REST API Server
    ↓
Routes (/api/v1/*)
    ↓
Middleware (Authentication, Validation)
    ↓
Repository Layer
    ↓
SQLite Database
    ↓
JSON Response back to Flutter
```

**Benefits:**
- Server only handles data (JSON), not presentation (HTML)
- Any client (Flutter, web, scripts) can connect
- Mobile app can work offline and sync later
- Easier to test and maintain

---

## 2. Why This Approach

### Why REST API?

**REST** = **RE**presentational **S**tate **T**ransfer

Think of it like this:
- Your database has **resources** (shopping items, notices, events)
- REST API provides **standardized ways** to interact with those resources
- Uses **HTTP methods** that match what you're doing:
  - `GET` = Read/Retrieve
  - `POST` = Create
  - `PUT` = Update (replace entire resource)
  - `PATCH` = Update (modify part of resource)
  - `DELETE` = Delete

**Example:**
```
GET    /api/v1/shopping        → Get all shopping items
POST   /api/v1/shopping        → Create new item
GET    /api/v1/shopping/5      → Get item with ID 5
PUT    /api/v1/shopping/5      → Update item 5
DELETE /api/v1/shopping/5      → Delete item 5
```

### Why Flutter?

- **Cross-platform**: One codebase → iOS, Android, Web
- **Fast development**: Hot reload, rich widgets
- **Native performance**: Compiles to native code
- **Great for home automation**: Real-time UI updates, offline support
- **Large community**: Lots of packages and tutorials

### Why JWT Instead of Sessions?

**Sessions (what you use now):**
```
Login → Server creates session → Stores in memory/DB → Sends cookie
Every request → Browser sends cookie → Server looks up session
```

**Problems for mobile apps:**
- Mobile apps don't handle cookies well
- Session state is stored on server (doesn't scale well)
- Hard to share authentication across multiple servers

**JWT (what you'll use):**
```
Login → Server creates signed token → Sends to client
Every request → Client sends token in header → Server verifies signature
```

**Benefits:**
- **Stateless**: Server doesn't store anything, just verifies the token
- **Mobile-friendly**: Easy to store token in app
- **Scalable**: Any server can verify the token
- **Contains user info**: Token itself has user ID, expiry, etc.

---

## 3. Key Concepts Explained

### A. HTTP Status Codes (Important!)

Your API should return appropriate status codes:

```javascript
// Success codes
200 OK              → Request succeeded (GET, PUT, PATCH)
201 Created         → New resource created (POST)
204 No Content      → Success but no data to return (DELETE)

// Client error codes
400 Bad Request     → Invalid data sent
401 Unauthorized    → Not logged in / invalid token
403 Forbidden       → Logged in but don't have permission
404 Not Found       → Resource doesn't exist
422 Unprocessable   → Validation errors

// Server error codes
500 Internal Error  → Something broke on server
503 Service Unavailable → Server is down/overloaded
```

### B. JSON Response Format

**Always return consistent JSON structure:**

```javascript
// Success response
{
  "success": true,
  "data": {
    "id": 5,
    "item": "Milk",
    "quantity": "1 gallon"
  }
}

// Error response
{
  "success": false,
  "error": {
    "message": "Item not found",
    "code": "ITEM_NOT_FOUND"
  }
}

// List response with metadata
{
  "success": true,
  "data": [...],
  "meta": {
    "total": 25,
    "page": 1,
    "perPage": 10
  }
}
```

### C. JWT Structure

A JWT looks like this:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImlhdCI6MTYxNjIzOTAyMn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

It has three parts separated by dots:
1. **Header** (algorithm used)
2. **Payload** (user data: ID, email, expiry)
3. **Signature** (proves it wasn't tampered with)

**Key point:** The signature is created with a SECRET key that only your server knows. If someone modifies the token, the signature won't match.

### D. Middleware Chain

Express processes requests through a chain:

```javascript
Client Request
    ↓
app.use(cors())              // Allow cross-origin requests
    ↓
app.use(express.json())      // Parse JSON body
    ↓
app.use(helmet())            // Security headers
    ↓
app.use(rateLimiter)         // Prevent spam
    ↓
verifyJWT                    // Check authentication (your code)
    ↓
validateRequest              // Check data format (your code)
    ↓
Route handler                // Your business logic
    ↓
Response to client
```

Each middleware can:
- Modify the request/response
- Call `next()` to continue
- End the request with `res.send()` or `res.json()`

---

## 4. Phase 1: API Conversion

### Step 1: Install New Dependencies

```bash
npm install jsonwebtoken bcryptjs cors dotenv
npm install --save-dev @types/jsonwebtoken
```

**What each does:**
- `jsonwebtoken`: Create and verify JWT tokens
- `bcryptjs`: Hash passwords securely
- `cors`: Allow Flutter app to make requests from different origin
- `dotenv`: Load environment variables from .env file

### Step 2: Create Environment Variables

Create `.env` file in project root:

```bash
# .env
NODE_ENV=development
PORT=3000

# IMPORTANT: Change this to a random string in production!
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=your-super-secret-key-change-this-in-production
JWT_EXPIRES_IN=7d

# Database
DB_PATH=./data/database.db

# CORS - your Flutter app's origin (update when you know it)
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080
```

**Add to .gitignore:**
```bash
# Add this line to .gitignore
.env
```

### Step 3: Update app.js for API Support

**Replace your current app.js with this:**

```javascript
// app.js
require('dotenv').config(); // Load .env variables

const express = require('express');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');

const app = express();

// ============================================
// MIDDLEWARE SETUP
// ============================================

// 1. Security: Helmet for HTTP headers
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false
}));

// 2. CORS: Allow Flutter app to connect
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS.split(',');

    // Allow requests with no origin (mobile apps, Postman)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies if needed
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// 3. Body parsing
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse form data

// 4. Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,
  message: { success: false, error: { message: 'Too many requests, please try again later.' } },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

// 5. Static files (for Pug admin panel if you keep it)
app.use(express.static(path.join(__dirname, 'public')));

// 6. View engine (keep for testing/admin)
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// ============================================
// ROUTES
// ============================================

// API Routes (v1)
const authRoutes = require('./routes/api/v1/auth');
const shoppingRoutes = require('./routes/api/v1/shopping');
const noticesRoutes = require('./routes/api/v1/notices');
const calendarRoutes = require('./routes/api/v1/calendar');

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/shopping', shoppingRoutes);
app.use('/api/v1/notices', noticesRoutes);
app.use('/api/v1/calendar', calendarRoutes);

// Web Routes (your existing Pug interface for testing)
const webIndexRoutes = require('./routes/web/index');
const webNoticesRoutes = require('./routes/web/notices');
const webShoppingRoutes = require('./routes/web/shopping-list');
const webCalendarRoutes = require('./routes/web/calendar');

app.use('/', webIndexRoutes);
app.use('/web/notices', webNoticesRoutes);
app.use('/web/shopping', webShoppingRoutes);
app.use('/web/calendar', webCalendarRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString()
    }
  });
});

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: 'API endpoint not found',
      code: 'NOT_FOUND'
    }
  });
});

// General error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);

  // Send JSON for API requests
  if (req.path.startsWith('/api/')) {
    res.status(err.status || 500).json({
      success: false,
      error: {
        message: process.env.NODE_ENV === 'production'
          ? 'Internal server error'
          : err.message,
        code: err.code || 'INTERNAL_ERROR'
      }
    });
  } else {
    // Send HTML for web requests
    res.status(err.status || 500).render('error', { error: err });
  }
});

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 API: http://localhost:${PORT}/api/v1`);
  console.log(`🌐 Web: http://localhost:${PORT}`);
  console.log(`🏥 Health: http://localhost:${PORT}/api/health`);
});

module.exports = app;
```

### Step 4: Create Folder Structure for API Routes

```bash
mkdir -p routes/api/v1
mkdir -p routes/web
mkdir -p middleware
mkdir -p utils
```

**Move your existing routes to web folder:**

```bash
# In Git Bash or Command Prompt:
mv routes/index.js routes/web/index.js
mv routes/notices.js routes/web/notices.js
mv routes/shopping-list.js routes/web/shopping-list.js
mv routes/calendar.js routes/web/calendar.js
```

### Step 5: Create User Model and Repository

**Create `repositories/userRepository.js`:**

```javascript
// repositories/userRepository.js
const { DatabaseSync } = require('node:database');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'database.db');
const db = new DatabaseSync(dbPath);

// Create users table if not exists
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'member',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME
  )
`);

class UserRepository {
  /**
   * Create a new user
   * @param {Object} userData - User data
   * @param {string} userData.email - User email
   * @param {string} userData.password - Hashed password
   * @param {string} userData.name - User display name
   * @returns {Object} Created user (without password)
   */
  static create({ email, password, name }) {
    try {
      const stmt = db.prepare(
        'INSERT INTO users (email, password, name) VALUES (?, ?, ?)'
      );
      const result = stmt.run(email, password, name);

      // Return created user without password
      return this.findById(result.lastInsertRowid);
    } catch (error) {
      if (error.message.includes('UNIQUE constraint failed')) {
        throw new Error('Email already exists');
      }
      throw error;
    }
  }

  /**
   * Find user by ID
   * @param {number} id - User ID
   * @returns {Object|null} User without password
   */
  static findById(id) {
    const stmt = db.prepare(
      'SELECT id, email, name, role, created_at, last_login FROM users WHERE id = ?'
    );
    return stmt.get(id) || null;
  }

  /**
   * Find user by email (includes password for authentication)
   * @param {string} email - User email
   * @returns {Object|null} User with password hash
   */
  static findByEmailWithPassword(email) {
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    return stmt.get(email) || null;
  }

  /**
   * Find user by email (without password)
   * @param {string} email - User email
   * @returns {Object|null} User without password
   */
  static findByEmail(email) {
    const stmt = db.prepare(
      'SELECT id, email, name, role, created_at, last_login FROM users WHERE email = ?'
    );
    return stmt.get(email) || null;
  }

  /**
   * Update last login timestamp
   * @param {number} id - User ID
   */
  static updateLastLogin(id) {
    const stmt = db.prepare(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?'
    );
    stmt.run(id);
  }

  /**
   * Get all users (without passwords)
   * @returns {Array} Array of users
   */
  static findAll() {
    const stmt = db.prepare(
      'SELECT id, email, name, role, created_at, last_login FROM users ORDER BY created_at DESC'
    );
    return stmt.all();
  }

  /**
   * Update user
   * @param {number} id - User ID
   * @param {Object} updates - Fields to update
   * @returns {Object|null} Updated user
   */
  static update(id, updates) {
    const allowedFields = ['name', 'email', 'role'];
    const fields = Object.keys(updates).filter(key => allowedFields.includes(key));

    if (fields.length === 0) {
      throw new Error('No valid fields to update');
    }

    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => updates[field]);
    values.push(id);

    const stmt = db.prepare(`UPDATE users SET ${setClause} WHERE id = ?`);
    stmt.run(...values);

    return this.findById(id);
  }

  /**
   * Delete user
   * @param {number} id - User ID
   * @returns {boolean} Success status
   */
  static delete(id) {
    const stmt = db.prepare('DELETE FROM users WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }
}

module.exports = UserRepository;
```

### Step 6: Create JWT Utilities

**Create `utils/jwt.js`:**

```javascript
// utils/jwt.js
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Generate JWT token for a user
 * @param {Object} user - User object with id and email
 * @returns {string} JWT token
 */
function generateToken(user) {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role || 'member'
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'family-home-server'
  });
}

/**
 * Verify and decode JWT token
 * @param {string} token - JWT token
 * @returns {Object} Decoded payload
 * @throws {Error} If token is invalid or expired
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'family-home-server'
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    }
    throw error;
  }
}

/**
 * Decode token without verification (for debugging only!)
 * @param {string} token - JWT token
 * @returns {Object} Decoded payload
 */
function decodeToken(token) {
  return jwt.decode(token);
}

module.exports = {
  generateToken,
  verifyToken,
  decodeToken
};
```

### Step 7: Create Authentication Middleware

**Create `middleware/auth.js`:**

```javascript
// middleware/auth.js
const { verifyToken } = require('../utils/jwt');
const UserRepository = require('../repositories/userRepository');

/**
 * Middleware to verify JWT token and attach user to request
 * Usage: Add this to routes that require authentication
 *
 * Example:
 *   router.get('/shopping', verifyJWT, (req, res) => {
 *     // req.user is available here
 *   });
 */
function verifyJWT(req, res, next) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'No authorization header provided',
          code: 'NO_TOKEN'
        }
      });
    }

    // Expected format: "Bearer <token>"
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid authorization header format. Expected: Bearer <token>',
          code: 'INVALID_TOKEN_FORMAT'
        }
      });
    }

    const token = parts[1];

    // Verify token
    const decoded = verifyToken(token);

    // Attach user info to request
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role
    };

    next();
  } catch (error) {
    if (error.message === 'Token expired') {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Token has expired. Please login again.',
          code: 'TOKEN_EXPIRED'
        }
      });
    }

    return res.status(401).json({
      success: false,
      error: {
        message: 'Invalid or malformed token',
        code: 'INVALID_TOKEN'
      }
    });
  }
}

/**
 * Middleware to check if user has specific role
 * @param {string[]} allowedRoles - Array of allowed roles
 * @returns {Function} Express middleware
 *
 * Example:
 *   router.delete('/users/:id', verifyJWT, requireRole(['admin']), (req, res) => {
 *     // Only admins can reach here
 *   });
 */
function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        }
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Insufficient permissions',
          code: 'FORBIDDEN'
        }
      });
    }

    next();
  };
}

/**
 * Optional authentication - adds user if token is valid, but doesn't require it
 * Useful for endpoints that work for both logged-in and anonymous users
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return next(); // No token, continue without user
  }

  try {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      const token = parts[1];
      const decoded = verifyToken(token);
      req.user = {
        id: decoded.userId,
        email: decoded.email,
        role: decoded.role
      };
    }
  } catch (error) {
    // Invalid token, but it's optional so we continue
    console.log('Optional auth failed:', error.message);
  }

  next();
}

module.exports = {
  verifyJWT,
  requireRole,
  optionalAuth
};
```

### Step 8: Create Authentication Routes

**Create `routes/api/v1/auth.js`:**

```javascript
// routes/api/v1/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const UserRepository = require('../../../repositories/userRepository');
const { generateToken } = require('../../../utils/jwt');
const { verifyJWT } = require('../../../middleware/auth');

// ============================================
// REGISTER NEW USER
// POST /api/v1/auth/register
// ============================================
router.post('/register',
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Name is required')
  ],
  async (req, res) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({
          success: false,
          error: {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: errors.array()
          }
        });
      }

      const { email, password, name } = req.body;

      // Check if user already exists
      const existingUser = UserRepository.findByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: {
            message: 'Email already registered',
            code: 'EMAIL_EXISTS'
          }
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const user = UserRepository.create({
        email,
        password: hashedPassword,
        name
      });

      // Generate token
      const token = generateToken(user);

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role
          },
          token
        }
      });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to register user',
          code: 'REGISTER_FAILED'
        }
      });
    }
  }
);

// ============================================
// LOGIN
// POST /api/v1/auth/login
// ============================================
router.post('/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({
          success: false,
          error: {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: errors.array()
          }
        });
      }

      const { email, password } = req.body;

      // Find user (with password)
      const user = UserRepository.findByEmailWithPassword(email);
      if (!user) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Invalid email or password',
            code: 'INVALID_CREDENTIALS'
          }
        });
      }

      // Check password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Invalid email or password',
            code: 'INVALID_CREDENTIALS'
          }
        });
      }

      // Update last login
      UserRepository.updateLastLogin(user.id);

      // Generate token
      const token = generateToken(user);

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role
          },
          token
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Login failed',
          code: 'LOGIN_FAILED'
        }
      });
    }
  }
);

// ============================================
// GET CURRENT USER
// GET /api/v1/auth/me
// ============================================
router.get('/me', verifyJWT, (req, res) => {
  try {
    const user = UserRepository.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'User not found',
          code: 'USER_NOT_FOUND'
        }
      });
    }

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get user info',
        code: 'GET_USER_FAILED'
      }
    });
  }
});

// ============================================
// REFRESH TOKEN (Optional - for long sessions)
// POST /api/v1/auth/refresh
// ============================================
router.post('/refresh', verifyJWT, (req, res) => {
  try {
    // Generate new token with extended expiry
    const user = UserRepository.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'User not found',
          code: 'USER_NOT_FOUND'
        }
      });
    }

    const token = generateToken(user);

    res.json({
      success: true,
      data: { token }
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to refresh token',
        code: 'REFRESH_FAILED'
      }
    });
  }
});

module.exports = router;
```

### Step 9: Convert Shopping List to API

**Create `routes/api/v1/shopping.js`:**

```javascript
// routes/api/v1/shopping.js
const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const ShoppingRepository = require('../../../repositories/shoppingRepository');
const { verifyJWT } = require('../../../middleware/auth');

// All shopping routes require authentication
router.use(verifyJWT);

// ============================================
// GET ALL SHOPPING ITEMS
// GET /api/v1/shopping
// ============================================
router.get('/', (req, res) => {
  try {
    const items = ShoppingRepository.getAllItems();

    res.json({
      success: true,
      data: {
        items,
        total: items.length
      }
    });
  } catch (error) {
    console.error('Get shopping items error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve shopping items',
        code: 'GET_ITEMS_FAILED'
      }
    });
  }
});

// ============================================
// GET SINGLE SHOPPING ITEM
// GET /api/v1/shopping/:id
// ============================================
router.get('/:id',
  [
    param('id').isInt().withMessage('ID must be an integer')
  ],
  (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({
          success: false,
          error: {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: errors.array()
          }
        });
      }

      const item = ShoppingRepository.getItemById(req.params.id);

      if (!item) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Shopping item not found',
            code: 'ITEM_NOT_FOUND'
          }
        });
      }

      res.json({
        success: true,
        data: { item }
      });
    } catch (error) {
      console.error('Get shopping item error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to retrieve item',
          code: 'GET_ITEM_FAILED'
        }
      });
    }
  }
);

// ============================================
// CREATE SHOPPING ITEM
// POST /api/v1/shopping
// ============================================
router.post('/',
  [
    body('item')
      .trim()
      .notEmpty()
      .withMessage('Item name is required')
      .isLength({ max: 100 })
      .withMessage('Item name must be less than 100 characters'),
    body('quantity')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Quantity must be less than 50 characters'),
    body('store')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Store name must be less than 100 characters')
  ],
  (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({
          success: false,
          error: {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: errors.array()
          }
        });
      }

      const { item, quantity, store } = req.body;

      const newItem = ShoppingRepository.createItem({
        item,
        quantity: quantity || '',
        store: store || ''
      });

      res.status(201).json({
        success: true,
        data: { item: newItem }
      });
    } catch (error) {
      console.error('Create shopping item error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to create item',
          code: 'CREATE_ITEM_FAILED'
        }
      });
    }
  }
);

// ============================================
// UPDATE SHOPPING ITEM
// PUT /api/v1/shopping/:id
// ============================================
router.put('/:id',
  [
    param('id').isInt(),
    body('item').trim().notEmpty().isLength({ max: 100 }),
    body('quantity').optional().trim().isLength({ max: 50 }),
    body('store').optional().trim().isLength({ max: 100 })
  ],
  (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({
          success: false,
          error: {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: errors.array()
          }
        });
      }

      const { item, quantity, store } = req.body;

      const updatedItem = ShoppingRepository.updateItem(req.params.id, {
        item,
        quantity: quantity || '',
        store: store || ''
      });

      if (!updatedItem) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Shopping item not found',
            code: 'ITEM_NOT_FOUND'
          }
        });
      }

      res.json({
        success: true,
        data: { item: updatedItem }
      });
    } catch (error) {
      console.error('Update shopping item error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to update item',
          code: 'UPDATE_ITEM_FAILED'
        }
      });
    }
  }
);

// ============================================
// TOGGLE ITEM CHECKED STATUS
// PATCH /api/v1/shopping/:id/check
// ============================================
router.patch('/:id/check',
  [
    param('id').isInt()
  ],
  (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({
          success: false,
          error: {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: errors.array()
          }
        });
      }

      const item = ShoppingRepository.toggleChecked(req.params.id);

      if (!item) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Shopping item not found',
            code: 'ITEM_NOT_FOUND'
          }
        });
      }

      res.json({
        success: true,
        data: { item }
      });
    } catch (error) {
      console.error('Toggle checked error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to toggle item status',
          code: 'TOGGLE_FAILED'
        }
      });
    }
  }
);

// ============================================
// DELETE SHOPPING ITEM
// DELETE /api/v1/shopping/:id
// ============================================
router.delete('/:id',
  [
    param('id').isInt()
  ],
  (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({
          success: false,
          error: {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: errors.array()
          }
        });
      }

      const success = ShoppingRepository.deleteItem(req.params.id);

      if (!success) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Shopping item not found',
            code: 'ITEM_NOT_FOUND'
          }
        });
      }

      res.status(204).send(); // No content on successful delete
    } catch (error) {
      console.error('Delete shopping item error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to delete item',
          code: 'DELETE_ITEM_FAILED'
        }
      });
    }
  }
);

module.exports = router;
```

### Step 10: Update Shopping Repository

**Update `repositories/shoppingRepository.js` with these helper methods:**

```javascript
// repositories/shoppingRepository.js
// Add these methods to your existing ShoppingRepository

/**
 * Get single item by ID
 */
static getItemById(id) {
  const stmt = db.prepare('SELECT * FROM shopping_list WHERE id = ?');
  return stmt.get(id) || null;
}

/**
 * Update item
 */
static updateItem(id, { item, quantity, store }) {
  const stmt = db.prepare(
    'UPDATE shopping_list SET item = ?, quantity = ?, store = ? WHERE id = ?'
  );
  const result = stmt.run(item, quantity, store, id);

  if (result.changes === 0) {
    return null;
  }

  return this.getItemById(id);
}
```

### Step 11: Create Notices API Routes

**Create `routes/api/v1/notices.js`:**

```javascript
// routes/api/v1/notices.js
const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const NoticeRepository = require('../../../repositories/noticeRepository');
const { verifyJWT } = require('../../../middleware/auth');

router.use(verifyJWT);

// GET all notices
router.get('/', (req, res) => {
  try {
    const notices = NoticeRepository.getAllNotices();
    res.json({
      success: true,
      data: {
        notices,
        total: notices.length
      }
    });
  } catch (error) {
    console.error('Get notices error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve notices',
        code: 'GET_NOTICES_FAILED'
      }
    });
  }
});

// POST create notice
router.post('/',
  [
    body('name').trim().notEmpty().isLength({ max: 100 }),
    body('message').trim().notEmpty().isLength({ max: 1000 })
  ],
  (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({
          success: false,
          error: {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: errors.array()
          }
        });
      }

      const { name, message } = req.body;
      const notice = NoticeRepository.createNotice({ name, message });

      res.status(201).json({
        success: true,
        data: { notice }
      });
    } catch (error) {
      console.error('Create notice error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to create notice',
          code: 'CREATE_NOTICE_FAILED'
        }
      });
    }
  }
);

// DELETE notice
router.delete('/:id',
  [param('id').isInt()],
  (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({
          success: false,
          error: {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: errors.array()
          }
        });
      }

      const success = NoticeRepository.deleteNotice(req.params.id);

      if (!success) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Notice not found',
            code: 'NOTICE_NOT_FOUND'
          }
        });
      }

      res.status(204).send();
    } catch (error) {
      console.error('Delete notice error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to delete notice',
          code: 'DELETE_NOTICE_FAILED'
        }
      });
    }
  }
);

module.exports = router;
```

**Add delete method to `repositories/noticeRepository.js`:**

```javascript
// Add this to noticeRepository.js
static deleteNotice(id) {
  const stmt = db.prepare('DELETE FROM notices WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}
```

### Step 12: Create Calendar Repository and API

**Create `repositories/calendarRepository.js`:**

```javascript
// repositories/calendarRepository.js
const { DatabaseSync } = require('node:database');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'database.db');
const db = new DatabaseSync(dbPath);

// Create calendar_events table
db.exec(`
  CREATE TABLE IF NOT EXISTS calendar_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    event_date DATE NOT NULL,
    notes TEXT,
    user_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);

class CalendarRepository {
  /**
   * Get all events
   */
  static getAllEvents() {
    const stmt = db.prepare(
      'SELECT * FROM calendar_events ORDER BY event_date ASC'
    );
    return stmt.all();
  }

  /**
   * Get events by date range
   */
  static getEventsByDateRange(startDate, endDate) {
    const stmt = db.prepare(
      'SELECT * FROM calendar_events WHERE event_date BETWEEN ? AND ? ORDER BY event_date ASC'
    );
    return stmt.all(startDate, endDate);
  }

  /**
   * Get upcoming events
   */
  static getUpcomingEvents(limit = 10) {
    const today = new Date().toISOString().split('T')[0];
    const stmt = db.prepare(
      'SELECT * FROM calendar_events WHERE event_date >= ? ORDER BY event_date ASC LIMIT ?'
    );
    return stmt.all(today, limit);
  }

  /**
   * Get past events
   */
  static getPastEvents(limit = 10) {
    const today = new Date().toISOString().split('T')[0];
    const stmt = db.prepare(
      'SELECT * FROM calendar_events WHERE event_date < ? ORDER BY event_date DESC LIMIT ?'
    );
    return stmt.all(today, limit);
  }

  /**
   * Get single event by ID
   */
  static getEventById(id) {
    const stmt = db.prepare('SELECT * FROM calendar_events WHERE id = ?');
    return stmt.get(id) || null;
  }

  /**
   * Create new event
   */
  static createEvent({ name, event_date, notes, user_id }) {
    const stmt = db.prepare(
      'INSERT INTO calendar_events (name, event_date, notes, user_id) VALUES (?, ?, ?, ?)'
    );
    const result = stmt.run(name, event_date, notes || null, user_id || null);
    return this.getEventById(result.lastInsertRowid);
  }

  /**
   * Update event
   */
  static updateEvent(id, { name, event_date, notes }) {
    const stmt = db.prepare(
      'UPDATE calendar_events SET name = ?, event_date = ?, notes = ? WHERE id = ?'
    );
    const result = stmt.run(name, event_date, notes || null, id);

    if (result.changes === 0) {
      return null;
    }

    return this.getEventById(id);
  }

  /**
   * Delete event
   */
  static deleteEvent(id) {
    const stmt = db.prepare('DELETE FROM calendar_events WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }
}

module.exports = CalendarRepository;
```

**Create `routes/api/v1/calendar.js`:**

```javascript
// routes/api/v1/calendar.js
const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const CalendarRepository = require('../../../repositories/calendarRepository');
const { verifyJWT } = require('../../../middleware/auth');

router.use(verifyJWT);

// GET all events or filter by date range
router.get('/',
  [
    query('startDate').optional().isISO8601().toDate(),
    query('endDate').optional().isISO8601().toDate()
  ],
  (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({
          success: false,
          error: {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: errors.array()
          }
        });
      }

      let events;
      if (req.query.startDate && req.query.endDate) {
        events = CalendarRepository.getEventsByDateRange(
          req.query.startDate,
          req.query.endDate
        );
      } else {
        events = CalendarRepository.getAllEvents();
      }

      res.json({
        success: true,
        data: {
          events,
          total: events.length
        }
      });
    } catch (error) {
      console.error('Get events error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to retrieve events',
          code: 'GET_EVENTS_FAILED'
        }
      });
    }
  }
);

// GET upcoming events
router.get('/upcoming', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const events = CalendarRepository.getUpcomingEvents(limit);

    res.json({
      success: true,
      data: {
        events,
        total: events.length
      }
    });
  } catch (error) {
    console.error('Get upcoming events error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve upcoming events',
        code: 'GET_UPCOMING_FAILED'
      }
    });
  }
});

// GET past events
router.get('/past', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const events = CalendarRepository.getPastEvents(limit);

    res.json({
      success: true,
      data: {
        events,
        total: events.length
      }
    });
  } catch (error) {
    console.error('Get past events error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve past events',
        code: 'GET_PAST_FAILED'
      }
    });
  }
});

// POST create event
router.post('/',
  [
    body('name').trim().notEmpty().isLength({ max: 200 }),
    body('event_date').isISO8601().toDate(),
    body('notes').optional().trim().isLength({ max: 1000 })
  ],
  (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({
          success: false,
          error: {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: errors.array()
          }
        });
      }

      const { name, event_date, notes } = req.body;

      const event = CalendarRepository.createEvent({
        name,
        event_date,
        notes,
        user_id: req.user.id
      });

      res.status(201).json({
        success: true,
        data: { event }
      });
    } catch (error) {
      console.error('Create event error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to create event',
          code: 'CREATE_EVENT_FAILED'
        }
      });
    }
  }
);

// PUT update event
router.put('/:id',
  [
    param('id').isInt(),
    body('name').trim().notEmpty().isLength({ max: 200 }),
    body('event_date').isISO8601().toDate(),
    body('notes').optional().trim().isLength({ max: 1000 })
  ],
  (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({
          success: false,
          error: {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: errors.array()
          }
        });
      }

      const { name, event_date, notes } = req.body;

      const event = CalendarRepository.updateEvent(req.params.id, {
        name,
        event_date,
        notes
      });

      if (!event) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Event not found',
            code: 'EVENT_NOT_FOUND'
          }
        });
      }

      res.json({
        success: true,
        data: { event }
      });
    } catch (error) {
      console.error('Update event error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to update event',
          code: 'UPDATE_EVENT_FAILED'
        }
      });
    }
  }
);

// DELETE event
router.delete('/:id',
  [param('id').isInt()],
  (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({
          success: false,
          error: {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: errors.array()
          }
        });
      }

      const success = CalendarRepository.deleteEvent(req.params.id);

      if (!success) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Event not found',
            code: 'EVENT_NOT_FOUND'
          }
        });
      }

      res.status(204).send();
    } catch (error) {
      console.error('Delete event error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to delete event',
          code: 'DELETE_EVENT_FAILED'
        }
      });
    }
  }
);

module.exports = router;
```

---

## 5. Phase 2: Flutter App

### Flutter Project Setup

**Prerequisites:**
1. Install Flutter SDK: https://docs.flutter.dev/get-started/install
2. Install Android Studio or VS Code with Flutter extension
3. Set up Android emulator or iOS simulator

**Create new Flutter project:**

```bash
# In a different directory (NOT in your Express app)
flutter create family_home_app
cd family_home_app
```

### Project Structure

```
family_home_app/
├── lib/
│   ├── main.dart                 # App entry point
│   ├── config/
│   │   └── api_config.dart       # API URLs and constants
│   ├── models/
│   │   ├── user.dart
│   │   ├── shopping_item.dart
│   │   ├── notice.dart
│   │   └── calendar_event.dart
│   ├── services/
│   │   ├── api_service.dart      # HTTP client wrapper
│   │   ├── auth_service.dart     # Login/register/token management
│   │   ├── shopping_service.dart
│   │   ├── notice_service.dart
│   │   └── calendar_service.dart
│   ├── providers/
│   │   ├── auth_provider.dart    # State management for auth
│   │   ├── shopping_provider.dart
│   │   ├── notice_provider.dart
│   │   └── calendar_provider.dart
│   ├── screens/
│   │   ├── auth/
│   │   │   ├── login_screen.dart
│   │   │   └── register_screen.dart
│   │   ├── home/
│   │   │   └── home_screen.dart
│   │   ├── shopping/
│   │   │   ├── shopping_list_screen.dart
│   │   │   └── add_shopping_item_screen.dart
│   │   ├── notices/
│   │   │   ├── notices_screen.dart
│   │   │   └── add_notice_screen.dart
│   │   └── calendar/
│   │       ├── calendar_screen.dart
│   │       └── add_event_screen.dart
│   └── widgets/
│       ├── custom_button.dart
│       ├── loading_indicator.dart
│       └── error_message.dart
└── pubspec.yaml
```

### Required Flutter Packages

**Update `pubspec.yaml`:**

```yaml
dependencies:
  flutter:
    sdk: flutter

  # HTTP & API
  dio: ^5.4.0                      # HTTP client

  # State Management
  flutter_riverpod: ^2.4.9         # State management

  # Storage
  flutter_secure_storage: ^9.0.0   # Secure token storage
  shared_preferences: ^2.2.2       # App preferences

  # UI
  google_fonts: ^6.1.0             # Custom fonts
  intl: ^0.19.0                    # Date formatting

  # Navigation
  go_router: ^13.0.0               # Navigation

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.0
```

**Install packages:**

```bash
flutter pub get
```

### API Configuration

**Create `lib/config/api_config.dart`:**

```dart
// lib/config/api_config.dart
class ApiConfig {
  // IMPORTANT: Replace with your server's IP address
  // If testing on Android emulator, use 10.0.2.2 (points to host machine's localhost)
  // If testing on real device, use your computer's IP address (e.g., 192.168.1.100)
  static const String baseUrl = 'http://10.0.2.2:3000/api/v1';

  // API endpoints
  static const String login = '/auth/login';
  static const String register = '/auth/register';
  static const String me = '/auth/me';
  static const String refresh = '/auth/refresh';

  static const String shopping = '/shopping';
  static const String notices = '/notices';
  static const String calendar = '/calendar';

  // Timeout durations
  static const Duration connectTimeout = Duration(seconds: 10);
  static const Duration receiveTimeout = Duration(seconds: 10);
}
```

**Finding your computer's IP address:**

Windows (Command Prompt):
```bash
ipconfig
# Look for "IPv4 Address" under your active network adapter
```

Mac/Linux:
```bash
ifconfig
# Look for "inet" address
```

### Models

**Create `lib/models/user.dart`:**

```dart
// lib/models/user.dart
class User {
  final int id;
  final String email;
  final String name;
  final String role;

  User({
    required this.id,
    required this.email,
    required this.name,
    required this.role,
  });

  // Convert JSON to User object
  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'],
      email: json['email'],
      name: json['name'],
      role: json['role'] ?? 'member',
    );
  }

  // Convert User object to JSON
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'name': name,
      'role': role,
    };
  }
}
```

**Create `lib/models/shopping_item.dart`:**

```dart
// lib/models/shopping_item.dart
class ShoppingItem {
  final int id;
  final String item;
  final String quantity;
  final String store;
  final bool checked;
  final String createdAt;

  ShoppingItem({
    required this.id,
    required this.item,
    this.quantity = '',
    this.store = '',
    this.checked = false,
    required this.createdAt,
  });

  factory ShoppingItem.fromJson(Map<String, dynamic> json) {
    return ShoppingItem(
      id: json['id'],
      item: json['item'],
      quantity: json['quantity'] ?? '',
      store: json['store'] ?? '',
      checked: json['checked'] == 1 || json['checked'] == true,
      createdAt: json['created_at'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'item': item,
      'quantity': quantity,
      'store': store,
    };
  }

  // Create a copy with some fields updated
  ShoppingItem copyWith({
    int? id,
    String? item,
    String? quantity,
    String? store,
    bool? checked,
    String? createdAt,
  }) {
    return ShoppingItem(
      id: id ?? this.id,
      item: item ?? this.item,
      quantity: quantity ?? this.quantity,
      store: store ?? this.store,
      checked: checked ?? this.checked,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}
```

**Create `lib/models/calendar_event.dart`:**

```dart
// lib/models/calendar_event.dart
class CalendarEvent {
  final int id;
  final String name;
  final DateTime eventDate;
  final String? notes;
  final String createdAt;

  CalendarEvent({
    required this.id,
    required this.name,
    required this.eventDate,
    this.notes,
    required this.createdAt,
  });

  factory CalendarEvent.fromJson(Map<String, dynamic> json) {
    return CalendarEvent(
      id: json['id'],
      name: json['name'],
      eventDate: DateTime.parse(json['event_date']),
      notes: json['notes'],
      createdAt: json['created_at'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'event_date': eventDate.toIso8601String(),
      'notes': notes,
    };
  }
}
```

### API Service (HTTP Client)

**Create `lib/services/api_service.dart`:**

```dart
// lib/services/api_service.dart
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../config/api_config.dart';

class ApiService {
  late Dio _dio;
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  ApiService() {
    _dio = Dio(BaseOptions(
      baseUrl: ApiConfig.baseUrl,
      connectTimeout: ApiConfig.connectTimeout,
      receiveTimeout: ApiConfig.receiveTimeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ));

    // Add interceptor to automatically add JWT token to requests
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        // Get token from secure storage
        final token = await _storage.read(key: 'jwt_token');
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
      onError: (error, handler) async {
        // Handle 401 errors (token expired)
        if (error.response?.statusCode == 401) {
          // Token expired or invalid
          await _storage.delete(key: 'jwt_token');
          // You could trigger a logout event here
        }
        return handler.next(error);
      },
    ));

    // Add logging interceptor (only in debug mode)
    _dio.interceptors.add(LogInterceptor(
      requestBody: true,
      responseBody: true,
      error: true,
    ));
  }

  // Generic GET request
  Future<Response> get(String path, {Map<String, dynamic>? queryParameters}) async {
    try {
      return await _dio.get(path, queryParameters: queryParameters);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  // Generic POST request
  Future<Response> post(String path, {dynamic data}) async {
    try {
      return await _dio.post(path, data: data);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  // Generic PUT request
  Future<Response> put(String path, {dynamic data}) async {
    try {
      return await _dio.put(path, data: data);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  // Generic PATCH request
  Future<Response> patch(String path, {dynamic data}) async {
    try {
      return await _dio.patch(path, data: data);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  // Generic DELETE request
  Future<Response> delete(String path) async {
    try {
      return await _dio.delete(path);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  // Save JWT token to secure storage
  Future<void> saveToken(String token) async {
    await _storage.write(key: 'jwt_token', value: token);
  }

  // Get JWT token from secure storage
  Future<String?> getToken() async {
    return await _storage.read(key: 'jwt_token');
  }

  // Delete JWT token
  Future<void> deleteToken() async {
    await _storage.delete(key: 'jwt_token');
  }

  // Error handler
  String _handleError(DioException error) {
    String errorMessage = 'An error occurred';

    if (error.type == DioExceptionType.connectionTimeout ||
        error.type == DioExceptionType.receiveTimeout) {
      errorMessage = 'Connection timeout. Please check your internet connection.';
    } else if (error.type == DioExceptionType.badResponse) {
      // Server responded with an error
      final response = error.response;
      if (response != null && response.data != null) {
        if (response.data is Map && response.data['error'] != null) {
          errorMessage = response.data['error']['message'] ?? errorMessage;
        }
      }
    } else if (error.type == DioExceptionType.cancel) {
      errorMessage = 'Request cancelled';
    } else {
      errorMessage = 'Connection failed. Please check your internet connection.';
    }

    return errorMessage;
  }
}
```

### Authentication Service

**Create `lib/services/auth_service.dart`:**

```dart
// lib/services/auth_service.dart
import 'package:dio/dio.dart';
import 'api_service.dart';
import '../models/user.dart';
import '../config/api_config.dart';

class AuthService {
  final ApiService _apiService = ApiService();

  /// Register new user
  Future<Map<String, dynamic>> register({
    required String email,
    required String password,
    required String name,
  }) async {
    final response = await _apiService.post(
      ApiConfig.register,
      data: {
        'email': email,
        'password': password,
        'name': name,
      },
    );

    if (response.data['success']) {
      final data = response.data['data'];
      final user = User.fromJson(data['user']);
      final token = data['token'];

      // Save token
      await _apiService.saveToken(token);

      return {'user': user, 'token': token};
    } else {
      throw Exception(response.data['error']['message']);
    }
  }

  /// Login user
  Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  }) async {
    final response = await _apiService.post(
      ApiConfig.login,
      data: {
        'email': email,
        'password': password,
      },
    );

    if (response.data['success']) {
      final data = response.data['data'];
      final user = User.fromJson(data['user']);
      final token = data['token'];

      // Save token
      await _apiService.saveToken(token);

      return {'user': user, 'token': token};
    } else {
      throw Exception(response.data['error']['message']);
    }
  }

  /// Get current user
  Future<User> getCurrentUser() async {
    final response = await _apiService.get(ApiConfig.me);

    if (response.data['success']) {
      return User.fromJson(response.data['data']['user']);
    } else {
      throw Exception(response.data['error']['message']);
    }
  }

  /// Logout
  Future<void> logout() async {
    await _apiService.deleteToken();
  }

  /// Check if user is logged in
  Future<bool> isLoggedIn() async {
    final token = await _apiService.getToken();
    return token != null;
  }
}
```

### Shopping Service

**Create `lib/services/shopping_service.dart`:**

```dart
// lib/services/shopping_service.dart
import 'api_service.dart';
import '../models/shopping_item.dart';
import '../config/api_config.dart';

class ShoppingService {
  final ApiService _apiService = ApiService();

  /// Get all shopping items
  Future<List<ShoppingItem>> getAllItems() async {
    final response = await _apiService.get(ApiConfig.shopping);

    if (response.data['success']) {
      final items = (response.data['data']['items'] as List)
          .map((json) => ShoppingItem.fromJson(json))
          .toList();
      return items;
    } else {
      throw Exception(response.data['error']['message']);
    }
  }

  /// Create shopping item
  Future<ShoppingItem> createItem({
    required String item,
    String? quantity,
    String? store,
  }) async {
    final response = await _apiService.post(
      ApiConfig.shopping,
      data: {
        'item': item,
        'quantity': quantity ?? '',
        'store': store ?? '',
      },
    );

    if (response.data['success']) {
      return ShoppingItem.fromJson(response.data['data']['item']);
    } else {
      throw Exception(response.data['error']['message']);
    }
  }

  /// Update shopping item
  Future<ShoppingItem> updateItem({
    required int id,
    required String item,
    String? quantity,
    String? store,
  }) async {
    final response = await _apiService.put(
      '${ApiConfig.shopping}/$id',
      data: {
        'item': item,
        'quantity': quantity ?? '',
        'store': store ?? '',
      },
    );

    if (response.data['success']) {
      return ShoppingItem.fromJson(response.data['data']['item']);
    } else {
      throw Exception(response.data['error']['message']);
    }
  }

  /// Toggle item checked status
  Future<ShoppingItem> toggleChecked(int id) async {
    final response = await _apiService.patch('${ApiConfig.shopping}/$id/check');

    if (response.data['success']) {
      return ShoppingItem.fromJson(response.data['data']['item']);
    } else {
      throw Exception(response.data['error']['message']);
    }
  }

  /// Delete shopping item
  Future<void> deleteItem(int id) async {
    await _apiService.delete('${ApiConfig.shopping}/$id');
  }
}
```

### Basic Main App Structure

**Update `lib/main.dart`:**

```dart
// lib/main.dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'screens/auth/login_screen.dart';

void main() {
  runApp(
    const ProviderScope(
      child: MyApp(),
    ),
  );
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Family Home Server',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue),
        useMaterial3: true,
      ),
      home: const LoginScreen(),
      debugShowCheckedModeBanner: false,
    );
  }
}
```

**Create `lib/screens/auth/login_screen.dart`:**

```dart
// lib/screens/auth/login_screen.dart
import 'package:flutter/material.dart';
import '../../services/auth_service.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _authService = AuthService();

  bool _isLoading = false;
  String? _errorMessage;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      await _authService.login(
        email: _emailController.text.trim(),
        password: _passwordController.text,
      );

      // Navigate to home screen
      if (mounted) {
        // TODO: Navigate to home screen
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Login successful!')),
        );
      }
    } catch (e) {
      setState(() {
        _errorMessage = e.toString().replaceAll('Exception: ', '');
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24.0),
            child: Form(
              key: _formKey,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Logo or title
                  const Icon(
                    Icons.home,
                    size: 80,
                    color: Colors.blue,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Family Home Server',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.headlineMedium,
                  ),
                  const SizedBox(height: 48),

                  // Error message
                  if (_errorMessage != null)
                    Container(
                      padding: const EdgeInsets.all(12),
                      margin: const EdgeInsets.only(bottom: 16),
                      decoration: BoxDecoration(
                        color: Colors.red.shade100,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        _errorMessage!,
                        style: TextStyle(color: Colors.red.shade900),
                      ),
                    ),

                  // Email field
                  TextFormField(
                    controller: _emailController,
                    keyboardType: TextInputType.emailAddress,
                    decoration: const InputDecoration(
                      labelText: 'Email',
                      border: OutlineInputBorder(),
                      prefixIcon: Icon(Icons.email),
                    ),
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Please enter your email';
                      }
                      if (!value.contains('@')) {
                        return 'Please enter a valid email';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),

                  // Password field
                  TextFormField(
                    controller: _passwordController,
                    obscureText: true,
                    decoration: const InputDecoration(
                      labelText: 'Password',
                      border: OutlineInputBorder(),
                      prefixIcon: Icon(Icons.lock),
                    ),
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Please enter your password';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 24),

                  // Login button
                  ElevatedButton(
                    onPressed: _isLoading ? null : _login,
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.all(16),
                    ),
                    child: _isLoading
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Text('Login', style: TextStyle(fontSize: 16)),
                  ),
                  const SizedBox(height: 16),

                  // Register link
                  TextButton(
                    onPressed: () {
                      // TODO: Navigate to register screen
                    },
                    child: const Text('Don\'t have an account? Register'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
```

---

## 6. Phase 3: Smart Home Integration

### MQTT Setup (For Smart Devices)

**Install MQTT broker on your server:**

```bash
# On Windows (using Chocolatey)
choco install mosquitto

# Or download from: https://mosquitto.org/download/
```

**Install MQTT package in Node.js:**

```bash
npm install mqtt
```

**Create device integration service:**

```javascript
// services/mqttService.js
const mqtt = require('mqtt');

class MQTTService {
  constructor() {
    this.client = null;
    this.subscribers = new Map();
  }

  connect(brokerUrl = 'mqtt://localhost:1883') {
    this.client = mqtt.connect(brokerUrl);

    this.client.on('connect', () => {
      console.log('✅ Connected to MQTT broker');
    });

    this.client.on('message', (topic, message) => {
      const callbacks = this.subscribers.get(topic) || [];
      callbacks.forEach(callback => callback(message.toString()));
    });

    this.client.on('error', (error) => {
      console.error('❌ MQTT Error:', error);
    });
  }

  // Publish to a topic (e.g., turn on light)
  publish(topic, message) {
    if (this.client && this.client.connected) {
      this.client.publish(topic, message);
    } else {
      throw new Error('MQTT client not connected');
    }
  }

  // Subscribe to a topic (e.g., listen for sensor updates)
  subscribe(topic, callback) {
    if (!this.subscribers.has(topic)) {
      this.subscribers.set(topic, []);
      this.client.subscribe(topic);
    }
    this.subscribers.get(topic).push(callback);
  }

  // Unsubscribe from a topic
  unsubscribe(topic) {
    this.client.unsubscribe(topic);
    this.subscribers.delete(topic);
  }
}

module.exports = new MQTTService();
```

**Example device control endpoint:**

```javascript
// routes/api/v1/devices.js
const express = require('express');
const router = express.Router();
const mqttService = require('../../../services/mqttService');
const { verifyJWT } = require('../../../middleware/auth');

router.use(verifyJWT);

// Turn light on/off
router.post('/light/:id/control', (req, res) => {
  const { id } = req.params;
  const { state } = req.body; // 'on' or 'off'

  try {
    // Publish to MQTT topic
    mqttService.publish(`home/light/${id}`, state);

    res.json({
      success: true,
      data: {
        message: `Light ${id} turned ${state}`
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to control device',
        code: 'DEVICE_CONTROL_FAILED'
      }
    });
  }
});

module.exports = router;
```

---

## 7. Testing Your API

### Using Postman or Thunder Client

**Test Authentication:**

1. **Register a user:**
   ```
   POST http://localhost:3000/api/v1/auth/register
   Body (JSON):
   {
     "email": "test@example.com",
     "password": "password123",
     "name": "Test User"
   }
   ```

2. **Login:**
   ```
   POST http://localhost:3000/api/v1/auth/login
   Body (JSON):
   {
     "email": "test@example.com",
     "password": "password123"
   }

   Response will include a token - copy it!
   ```

3. **Test authenticated endpoint:**
   ```
   GET http://localhost:3000/api/v1/shopping
   Headers:
   Authorization: Bearer YOUR_TOKEN_HERE
   ```

### Using curl (Command Line)

```bash
# Register
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'

# Login and save token
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Use token (replace YOUR_TOKEN with actual token)
curl -X GET http://localhost:3000/api/v1/shopping \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 8. Deployment

### Deploying the Express API

**For local home server (Raspberry Pi or old PC):**

1. **Install Node.js** on your server
2. **Clone your project:**
   ```bash
   git clone your-repo-url
   cd your-project
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   # Create .env file with production values
   NODE_ENV=production
   PORT=3000
   JWT_SECRET=your-long-random-secret-here
   ```

4. **Use PM2 to keep server running:**
   ```bash
   npm install -g pm2
   pm2 start app.js --name family-server
   pm2 startup  # Make it start on boot
   pm2 save
   ```

5. **Set up port forwarding on your router** (if accessing from outside your home):
   - Forward port 3000 to your server's local IP
   - Consider using HTTPS (Let's Encrypt, Cloudflare Tunnel)

### Deploying Flutter App

**For testing:**
```bash
# Run on connected device
flutter run

# Build APK for Android
flutter build apk

# Build for iOS (requires Mac)
flutter build ios
```

---

## 9. Common Problems & Solutions

### Problem: "CORS Error" when Flutter connects to API

**Solution:**
Check your `.env` file has the correct `ALLOWED_ORIGINS`. For development:
```
ALLOWED_ORIGINS=http://localhost:3000,http://10.0.2.2:3000,http://192.168.1.100:3000
```

### Problem: "Network Error" or "Connection Refused" in Flutter

**Solution:**
1. Check `lib/config/api_config.dart` has correct baseUrl
2. Android emulator: use `http://10.0.2.2:3000`
3. Real device: use your computer's actual IP (e.g., `http://192.168.1.100:3000`)
4. Make sure firewall allows connections on port 3000

### Problem: "Token Expired" errors

**Solution:**
- Token expiry is set in `.env` as `JWT_EXPIRES_IN`
- Implement token refresh logic or increase expiry time
- For development, set to `JWT_EXPIRES_IN=30d`

### Problem: Flutter app won't connect to server on real device

**Solution:**
1. Ensure phone and computer are on same WiFi network
2. Check firewall isn't blocking port 3000
3. Use your computer's LAN IP, not localhost
4. Test API is accessible: open `http://YOUR_IP:3000/api/health` in phone browser

### Problem: Database locked errors

**Solution:**
SQLite doesn't handle concurrent writes well. Either:
1. Use WAL mode: `db.exec('PRAGMA journal_mode=WAL')`
2. Or switch to PostgreSQL for production

---

## 10. Learning Resources

### REST API Concepts
- [REST API Tutorial](https://restfulapi.net/)
- [HTTP Status Codes](https://httpstatuses.com/)
- [MDN: HTTP Methods](https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods)

### JWT Authentication
- [JWT.io Introduction](https://jwt.io/introduction)
- [JWT Best Practices](https://blog.logrocket.com/jwt-authentication-best-practices/)

### Express.js
- [Express.js Official Docs](https://expressjs.com/)
- [Express.js Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)

### Flutter
- [Flutter Official Docs](https://docs.flutter.dev/)
- [Flutter Cookbook](https://docs.flutter.dev/cookbook)
- [Riverpod Documentation](https://riverpod.dev/)
- [Dio HTTP Client](https://pub.dev/packages/dio)

### MQTT & Home Automation
- [MQTT Essentials](https://www.hivemq.com/mqtt-essentials/)
- [Zigbee2MQTT](https://www.zigbee2mqtt.io/)
- [Home Assistant Integration](https://www.home-assistant.io/integrations/)

### Videos (YouTube)
- "REST API Crash Course" by Traversy Media
- "Flutter & REST API Integration" by The Net Ninja
- "JWT Authentication Explained" by Web Dev Simplified

---

## Next Steps Checklist

- [ ] Set up `.env` file with secrets
- [ ] Install new npm packages
- [ ] Update `app.js` with CORS and API routes
- [ ] Create user repository and JWT utilities
- [ ] Create authentication middleware
- [ ] Convert shopping list to API endpoints
- [ ] Test API with Postman/curl
- [ ] Create Flutter project
- [ ] Set up Flutter dependencies
- [ ] Create models and services in Flutter
- [ ] Build login screen and test authentication
- [ ] Build shopping list screen
- [ ] Implement WebSocket for real-time updates
- [ ] Add smart device integration (MQTT)
- [ ] Deploy to home server
- [ ] Set up SSL/HTTPS
- [ ] Configure port forwarding

---

**Remember:** Start small! Get authentication working first, then add one feature at a time. Test each piece thoroughly before moving to the next.

Good luck with your home automation server!
