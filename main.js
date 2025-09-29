const express = require('express');
const path = require('path');
const cors = require('cors'); 
const session = require('express-session');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

const userRoute = require("./routes/user");
const mpesaRoute = require("./routes/mpesa");
const authRoute = require("./routes/auth");

const app = express();
dotenv.config();

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-super-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, // Set to true if using HTTPS
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        httpOnly: false, // Allow JavaScript access
        sameSite: 'none' // Required for cross-origin
    }
}));

// Add CORS configuration for cross-origin requests
app.use(cors({
    origin: ['https://spin-to-win.onrender.com', 'https://spin-and-win-to-mpesa-api-1089664169997.europe-west1.run.app'],
    credentials: true, // Important for cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}));

// Debug middleware - only for non-static files and important routes
app.use((req, res, next) => {
  // Skip static files and only log important routes
  if (req.url.startsWith('/css/') || 
      req.url.startsWith('/js/') || 
      req.url.startsWith('/images/') ||
      req.url.endsWith('.css') || 
      req.url.endsWith('.js') ||
      req.url.endsWith('.jpg') ||
      req.url.endsWith('.png')) {
    return next();
  }
  
  console.log('=== SESSION DEBUG ===');
  console.log('URL:', req.url);
  console.log('Method:', req.method);
  console.log('Session ID:', req.sessionID);
  console.log('Session User:', req.session.user);
  console.log('=====================');
  next();
});

// Make user available in views - FIXED VERSION
app.use((req, res, next) => {
    // Properly handle undefined session user
    res.locals.user = req.session.user || null;
    next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));

// Database connection
mongoose.connect(process.env.MONGODB_URL).then(() => {
    console.log('MongoDB connected');
}).catch((error) => {
    console.error('MongoDB connection error:', error);
});

// Routes
app.use("/auth", authRoute);
app.use("/users", userRoute);
app.use("/mpesa", mpesaRoute);

// Authentication middleware
const requireAuth = (req, res, next) => {
    if (!req.session.user) {
        console.log('Auth required - redirecting to login');
        return res.redirect('/login');
    }
    next();
};

// Protected routes
app.get('/dashboard', requireAuth, (req, res) => {
    console.log('Rendering dashboard for user:', req.session.user.email);
    // Get message from session and pass it to the view
    const message = req.session.message || null;
    res.render('dashboard', { 
        user: req.session.user,
        message: message // Explicitly pass message
    });
});

app.get('/deposit', requireAuth, (req, res) => {
    let result = req.session.result || null;
    console.log('Rendering deposit for user:', req.session.user.email);
    // Clear result from session after using it
    const message = req.session.message || null;
    if (req.session.result) {
        delete req.session.result;
    }
    res.render('deposit', {
        user: req.session.user,
        result,
        message: message
    });
});

app.get('/', requireAuth, (req, res) => {
    console.log('Rendering spin page for user:', req.session.user.email);
    const message = req.session.message || null;
    res.render('spin', {
        user: req.session.user,
        message: message
    });
});

// Public routes with redirect if already authenticated
app.get('/login', (req, res) => {
    if (req.session.user) {
        console.log('User already logged in, redirecting to home');
        return res.redirect('/');
    }
    console.log('Rendering login page');
    res.render('login', { error: null });
}); 

app.get('/register', (req, res) => {
    if (req.session.user) {
        console.log('User already logged in, redirecting to home');
        return res.redirect('/');
    }
    console.log('Rendering register page');
    res.render('register', { error: null });
});

// Logout route
app.get('/logout', (req, res) => {
    const userEmail = req.session.user ? req.session.user.email : 'Unknown';
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
        }
        console.log('User logged out:', userEmail);
        res.redirect('/login');
    });
});

// Test route to verify authentication is working
app.get('/test-auth', requireAuth, (req, res) => {
    res.json({
        message: 'You are authenticated!',
        user: req.session.user
    });
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
    console.log('Available routes:');
    console.log('  GET  /login');
    console.log('  GET  /register');
    console.log('  POST /auth/login');
    console.log('  POST /auth/register');
    console.log('  GET  / (protected)');
    console.log('  GET  /dashboard (protected)');
    console.log('  GET  /test-auth (protected)');
});
