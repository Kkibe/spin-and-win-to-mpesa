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

// TRUST PROXY - CRITICAL FOR GOOGLE CLOUD RUN
app.set('trust proxy', 1);

// FIXED Session configuration for Google Cloud Run
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-super-secret-key-change-in-production',
    resave: true, // CHANGED: true for cloud environments
    saveUninitialized: false,
    cookie: { 
        secure: true, // CHANGED: true for HTTPS in production
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        httpOnly: true, // CHANGED: true for security
        sameSite: 'none' // Required for cross-origin
    }
}));

// FIXED CORS configuration - ONLY ONCE and proper settings
app.use(cors({
    origin: ['https://spin-to-win.onrender.com', 'https://spin-and-win-to-mpesa-api-1089664169997.europe-west1.run.app'],
    credentials: true, // Important for cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With']
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
  console.log('Secure:', req.secure); // ADDED: Check if HTTPS
  console.log('=====================');
  next();
});

// Make user available in views
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.message = req.session.message || null;
    
    // Clear message after using it
    if (req.session.message) {
        delete req.session.message;
    }
    
    next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// REMOVED: app.use(cors()); // DUPLICATE - causes issues

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));

// Database connection
mongoose.connect(process.env.MONGODB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
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
    res.render('dashboard', { 
        user: req.session.user,
        message: res.locals.message
    });
});

app.get('/deposit', requireAuth, (req, res) => {
    let result = req.session.result || null;
    console.log('Rendering deposit for user:', req.session.user.email);
    
    // Clear result from session after using it
    if (req.session.result) {
        delete req.session.result;
    }
    
    res.render('deposit', {
        user: req.session.user,
        result: result,
        message: res.locals.message
    });
});

/*app.get('/', requireAuth, (req, res) => {
    console.log('Rendering spin page for user:', req.session.user.email);
    res.render('spin', {
        user: req.session.user,
        message: res.locals.message
    });
});*/

// In your main.js - Update the spin route to always fetch fresh data
app.get('/', requireAuth, async (req, res) => {
    try {
        // ALWAYS get fresh user data from database, not just session
        const currentUser = await User.findById(req.session.user._id);
        
        if (!currentUser) {
            req.session.destroy();
            return res.redirect('/login');
        }

        // Update session with fresh data
        req.session.user.balance = currentUser.balance;
        req.session.user.gems = currentUser.gems;
        req.session.user.spins = currentUser.spins;
        req.session.user.totalSpins = currentUser.totalSpins;

        console.log('Rendering spin page with fresh data - Spins:', currentUser.spins);
        
        res.render('spin', {
            user: req.session.user,
            message: res.locals.message
        });
    } catch (error) {
        console.error('Error loading spin page:', error);
        res.redirect('/login');
    }
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
        user: req.session.user,
        sessionId: req.sessionID
    });
});

// Health check for Cloud Run
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        session: req.sessionID ? 'active' : 'none',
        user: req.session.user ? 'logged_in' : 'anonymous'
    });
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
    console.log('Environment:', process.env.NODE_ENV || 'development');
    console.log('Available routes:');
    console.log('  GET  /login');
    console.log('  GET  /register');
    console.log('  POST /auth/login');
    console.log('  POST /auth/register');
    console.log('  GET  / (protected)');
    console.log('  GET  /dashboard (protected)');
    console.log('  GET  /test-auth (protected)');
    console.log('  GET  /health (health check)');
});
