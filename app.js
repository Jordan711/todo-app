require('dotenv').config();
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { doubleCsrf } = require('csrf-csrf');

const indexRouter = require('./routes/index');
const noticesRouter = require('./routes/notices');
const shoppingListRouter = require('./routes/shopping-list');
const calendarRouter = require('./routes/calendar');

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// Security: Helmet with Content Security Policy
// In development, disable CSP to avoid HTTPS upgrade issues
// In production, enable full CSP with HTTPS enforcement
if (process.env.NODE_ENV === 'production') {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
  }));
} else {
  // Development: Use helmet but disable CSP and HSTS
  app.use(helmet({
    contentSecurityPolicy: false,
    hsts: false,
  }));
}

// Security: Rate limiting to prevent abuse
// More relaxed in development, strict in production
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Security: Stricter rate limiting for POST routes
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 20 : 200,
  message: 'Too many submissions from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Security: Create session identifier for CSRF (since we don't use sessions)
app.use((req, res, next) => {
  if (!req.cookies['session-id']) {
    const crypto = require('crypto');
    const sessionId = crypto.randomBytes(32).toString('hex');
    res.cookie('session-id', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
  }
  next();
});

// Security: CSRF protection
const {
  generateCsrfToken,
  doubleCsrfProtection,
} = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET || 'default-csrf-secret-change-in-production',
  getSessionIdentifier: (req) => req.cookies['session-id'] || 'anonymous',
  cookieName: 'x-csrf-token',
  cookieOptions: {
    sameSite: 'strict',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
  // Look for CSRF token in request body (form field _csrf) OR header
  getCsrfTokenFromRequest: (req) => {
    return req.body._csrf || req.headers['x-csrf-token'];
  },
});

// Make CSRF token available to all views
app.use((req, res, next) => {
  res.locals.csrfToken = generateCsrfToken(req, res);
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/notices', doubleCsrfProtection, strictLimiter, noticesRouter);
app.use('/shopping-list', doubleCsrfProtection, strictLimiter, shoppingListRouter);
app.use('/calendar', doubleCsrfProtection, strictLimiter, calendarRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // 1. Set basic locals for development debugging
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // 2. Set the response status (400, 404, or default to 500)
  const status = err.status || 500;
  res.status(status);

  // 3. SMART CHECK: Did this come from your JavaScript fetch()?
  // fetch() usually sends an 'Accept: application/json' header
  const isApiRequest = req.headers.accept?.includes('json') || req.xhr;

  if (isApiRequest) {
    // Return JSON for the Shopping Form/AJAX (regardless of status code)
    return res.json({
      error: err.message || "Internal Server Error"
    });
  } else {
    // Return a pretty HTML page for humans browsing the site
    return res.render('error');
  }
});

module.exports = app;
