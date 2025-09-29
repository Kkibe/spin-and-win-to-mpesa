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
        secure: false,
        maxAge: 24 * 60 * 60 * 1000,
        httpOnly: true
    }
}));

// Debug middleware - only for non-static files
app.use((req, res, next) => {
  if (req.url.startsWith('/css/') ||
      req.url.startsWith('/js/') ||
      req.url.startsWith('/images/') ||
      req.url.endsWith('.css') ||
      req.url.endsWith('.js') ||
      req.url.endsWith('.jpg') ||
      req.url.endsWith('.png')) {
    return next();
  }
  next();
});

// Make user and message available in views - FIXED VERSION
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.message = req.session.message || null; // Ensure message is always defined

    // Clear the session message after setting it to locals
    if (req.session.message) {
        delete req.session.message;
    }

    next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));

// Database connection
mongoose.connect(process.env.MONGODB_URL).then(() => {

}).catch((error) => {

});

// Routes
app.use("/auth", authRoute);
app.use("/users", userRoute);
app.use("/mpesa", mpesaRoute);

// Authentication middleware
const requireAuth = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    next();
};

// Protected routes - FIXED: Pass message explicitly
app.get('/dashboard', requireAuth, (req, res) => {
    // Get message from session and pass it to the view
    const message = req.session.message || null;

    res.render('dashboard', {
        user: req.session.user,
        message: message // Explicitly pass message
    });
});

app.get('/deposit', requireAuth, (req, res) => {
    let result = req.session.result || null;
    // Clear result from session after using it
    const message = req.session.message || null;
    if (req.session.result) {
        delete req.session.result;
    }

    res.render('deposit', {
        user: req.session.user,
        result: result,
        message: message
    });
});

app.get('/', requireAuth, (req, res) => {
    const message = req.session.message || null;

    res.render('spin', {
        user: req.session.user,
        message: message
    });
});

// Public routes with redirect if already authenticated
app.get('/login', (req, res) => {
    if (req.session.user) {
        return res.redirect('/');
    }
    res.render('login', { error: null });
});

app.get('/register', (req, res) => {
    if (req.session.user) {
        return res.redirect('/');
    }
    res.render('register', { error: null });
});

// Logout route
app.get('/logout', (req, res) => {
    const userEmail = req.session.user ? req.session.user.email : 'Unknown';
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
        }
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
app.listen(port, () => {});