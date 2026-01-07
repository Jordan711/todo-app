# Development vs Production Environments Guide

**For Beginners** - Understanding how your app behaves differently in DEV and PROD

---

## What Are Environments?

**Environment = The place where your app runs**

- **Development (DEV):** Your laptop while you're building and testing
- **Production (PROD):** The real server where actual users access your app

**Think of it like:**
- **DEV** = Your kitchen where you're learning to cook and can make mistakes
- **PROD** = A restaurant kitchen serving paying customers

---

## The Magic Variable: `NODE_ENV`

Your entire app's behavior is controlled by **one setting** in the `.env` file:

```bash
NODE_ENV=development    # DEV mode
# or
NODE_ENV=production     # PROD mode
```

That's it! Change this one line, and your app behaves completely differently.

---

## How Does the App Know?

### Step 1: You Set It
In your `.env` file:
```bash
NODE_ENV=development
PORT=3000
SESSION_SECRET=abc123...
CSRF_SECRET=def456...
```

### Step 2: App Loads It
When the app starts (app.js line 1):
```javascript
require('dotenv').config();
```

This reads the `.env` file and makes variables available in `process.env`

### Step 3: Code Checks It
Anywhere in your code:
```javascript
console.log(process.env.NODE_ENV);  // Prints: "development"
console.log(process.env.PORT);       // Prints: "3000"
```

### Step 4: Code Reacts Differently
```javascript
if (process.env.NODE_ENV === 'production') {
  // Do strict security things
} else {
  // Do relaxed development things
}
```

---

## What `process.env` Is

**`process.env`** is a JavaScript object containing environment variables.

**Simple analogy:**
```javascript
// It's like a settings object:
const process.env = {
  NODE_ENV: "development",
  PORT: "3000",
  SESSION_SECRET: "abc123...",
  CSRF_SECRET: "def456..."
};

// You access it like:
process.env.NODE_ENV      // "development"
process.env.PORT          // "3000"
```

---

## Behavior Differences: DEV vs PROD

### 1. Security Headers (Helmet)

**Development Mode:**
```javascript
app.use(helmet({
  contentSecurityPolicy: false,  // Don't force HTTPS
  hsts: false                     // Don't require HTTPS
}));
```

**What this means:**
- ✅ Works with `http://localhost:3000`
- ✅ No need for SSL certificate
- ✅ No HTTPS errors
- 🔓 Less secure (but fine for local testing)

**Production Mode:**
```javascript
app.use(helmet({
  contentSecurityPolicy: {
    upgradeInsecureRequests: []   // Force all HTTP → HTTPS
  },
  hsts: {
    maxAge: 31536000              // Force HTTPS for 1 year
  }
}));
```

**What this means:**
- ⚠️ **REQUIRES** `https://your-domain.com`
- ⚠️ **REQUIRES** Valid SSL certificate
- ⚠️ Won't work with plain HTTP
- 🔒 Much more secure for real users

---

### 2. Rate Limiting

**Development Mode:**
```javascript
max: 1000,  // 1000 requests per 15 minutes
```
- ✅ Can test rapidly
- ✅ Rarely get blocked
- 🔓 Vulnerable to abuse

**Production Mode:**
```javascript
max: 100,   // 100 requests per 15 minutes
```
- 🔒 Protected from abuse
- ⚠️ Legitimate heavy users might get blocked
- ⚠️ Need to monitor if limits are too strict

---

### 3. Cookie Security

**Development Mode:**
```javascript
secure: false  // Cookies work over HTTP
```
- ✅ Works on `http://localhost`
- 🔓 Less secure

**Production Mode:**
```javascript
secure: true   // Cookies ONLY over HTTPS
```
- ⚠️ Cookies won't work without HTTPS
- 🔒 Much more secure

---

## Code Examples From Your App

### Example 1: Helmet Configuration (app.js lines 24-52)

```javascript
if (process.env.NODE_ENV === 'production') {
  // PRODUCTION MODE
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        upgradeInsecureRequests: [],  // Force HTTPS!
      },
    },
    hsts: {
      maxAge: 31536000,      // Remember to use HTTPS for 1 year
      includeSubDomains: true,
      preload: true
    },
  }));
} else {
  // DEVELOPMENT MODE
  app.use(helmet({
    contentSecurityPolicy: false,  // No CSP
    hsts: false,                    // No HSTS
  }));
}
```

**What happens:**
- `.env` has `NODE_ENV=production` → Top block runs (strict)
- `.env` has `NODE_ENV=development` → Bottom block runs (relaxed)

---

### Example 2: Rate Limiting (app.js line 58)

```javascript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 100 : 1000
  //   ^-- This is a shorthand if-statement
});
```

**Breaking it down (equivalent code):**
```javascript
let maxRequests;

if (process.env.NODE_ENV === 'production') {
  maxRequests = 100;    // PROD: Strict limit
} else {
  maxRequests = 1000;   // DEV: Relaxed limit
}

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: maxRequests
});
```

**What happens:**
- Production: Limit is 100 requests
- Development: Limit is 1000 requests

---

### Example 3: POST Rate Limiting (app.js line 68)

```javascript
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 20 : 200
});
```

**What happens:**
- Production: 20 form submissions per 15 minutes
- Development: 200 form submissions per 15 minutes

---

## How to Switch Environments

### Development (Your Laptop)

Edit `.env`:
```bash
NODE_ENV=development
PORT=3000
SESSION_SECRET=<your-dev-secret>
CSRF_SECRET=<your-dev-secret>
```

**Access app at:** `http://localhost:3000`

---

### Production (Live Server)

Edit `.env`:
```bash
NODE_ENV=production
PORT=3000
SESSION_SECRET=<your-production-secret>  # DIFFERENT from dev!
CSRF_SECRET=<your-production-secret>      # DIFFERENT from dev!
```

**Access app at:** `https://yourdomain.com`

⚠️ **IMPORTANT:** Production secrets must be different from development secrets!

---

## Visual Summary

```
┌─────────────────────────────────────────────┐
│            .env file                        │
│                                             │
│  NODE_ENV=development  (or production)      │ ← YOU CONTROL THIS
│                                             │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────┐
│  Code checks: process.env.NODE_ENV           │
│                                              │
│  if (process.env.NODE_ENV === 'production') │
│    // strict behavior                        │
│  else                                        │
│    // relaxed behavior                       │
└──────────────────┬───────────────────────────┘
                   │
          ┌────────┴─────────┐
          ▼                  ▼
    ┌──────────┐      ┌──────────┐
    │   DEV    │      │   PROD   │
    │ (Relaxed)│      │ (Strict) │
    └──────────┘      └──────────┘
    • HTTP OK        • HTTPS Required
    • High limits    • Low limits
    • Easy testing   • Secure for users
```

---

## Common Beginner Questions

### Q: Can I test production mode on my laptop?

**A:** Not easily. Production mode requires HTTPS, which requires:
- A domain name
- An SSL certificate
- A reverse proxy (like nginx)

**Recommendation:** Use development mode locally, production mode only on your live server.

### Q: What if I forget to change NODE_ENV?

**Bad Scenario 1:** Development mode on production server
- ❌ Less secure (no HTTPS enforcement)
- ❌ High rate limits (vulnerable to abuse)
- ❌ Not recommended!

**Bad Scenario 2:** Production mode on laptop
- ❌ App won't work (requires HTTPS)
- ❌ You'll get SSL errors
- ❌ Cookies won't work

### Q: Do I need different secrets for dev and prod?

**A:** YES! Very important:
- Development: One set of secrets
- Production: Completely different secrets

**Why?**
- If dev secrets leak (e.g., committed to GitHub), production is still safe
- Good security practice: isolate environments

### Q: How do I know which mode I'm in?

**Check your `.env` file:**
```bash
cat .env | grep NODE_ENV
```

**Or add temporary logging:**
```javascript
console.log('Running in:', process.env.NODE_ENV);
```

---

## Quick Reference Table

| Feature | Development | Production |
|---------|------------|------------|
| **Access URL** | `http://localhost:3000` | `https://yourdomain.com` |
| **SSL Required** | ❌ No | ✅ Yes (CRITICAL) |
| **CSP** | Disabled | Enabled (forces HTTPS) |
| **HSTS** | Disabled | Enabled (forces HTTPS) |
| **Rate Limit (General)** | 1000 / 15min | 100 / 15min |
| **Rate Limit (POST)** | 200 / 15min | 20 / 15min |
| **Secure Cookies** | No | Yes (HTTPS only) |
| **Good For** | Testing, debugging | Real users |
| **Security Level** | 🔓 Relaxed | 🔒 Strict |

---

## Summary

**The Big Picture:**
1. You set `NODE_ENV` in `.env` file
2. Code checks `process.env.NODE_ENV` with if-statements
3. Different code runs based on the value
4. Development = relaxed, Production = strict

**Remember:**
- Development: `http://` works, high limits, easy testing
- Production: `https://` required, low limits, very secure

**The switch:** Just change one line in `.env` and restart the server!

---

## Need More Help?

See also:
- `SECURITY_IMPLEMENTATION.md` - Full security details
- `PRODUCTION_CHECKLIST.md` - Steps for going live (if exists)
- `.env.example` - Template for environment variables
