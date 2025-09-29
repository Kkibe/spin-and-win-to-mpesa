const express = require('express');
const path = require('path');
const cors = require('cors'); 
const session = require('express-session');
const dotenv = require('dotenv');
const port = process.env.PORT || 8080;
const { default: mongoose } = require('mongoose');

const userRoute = require("./routes/user");
const mpesaRoute = require("./routes/mpesa");

const app = express();
dotenv.config();

// Add these middlewares before your routes
app.use(express.json()); // Parses JSON bodies
app.use(express.urlencoded({ extended: true })); // Parses URL-encoded bodies
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-here',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Middleware to make user available in views per session
app.use((req, res, next) => {
    res.locals.user = req.session.user || null; // Use session user
    res.locals.message = req.session.message;
    delete req.session.message;
    next();
});

app.use(cors());
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use("", require("./routes/auth"));

mongoose.connect(process.env.MONGODB_URL).then(() => {
    console.log('MongoDB connected');
}).catch((error) => {
    console.error('MongoDB connection error:', error);
});

// Authentication middleware
const requireAuth = (req, res, next) => {
    if (!req.session.user) { // Check session instead of app.locals
        return res.redirect('/login');
    }
    next();
};

// Protected routes - use session user
app.get('/dashboard', requireAuth, (req, res) => {
    res.render('index', { 
        user: req.session.user, // Use session user
        message: {
            message: "Logged In",
            type: "success"
        }
    });
});

app.get('/deposit', requireAuth, (req, res) => {
    let result = req.session.result || null;
    res.render('deposit', {
        user: req.session.user, // Use session user
        result
    });
});

app.get('/', requireAuth, (req, res) => {
    res.render('spin', {
        user: req.session.user // Use session user
    });
});

// Public routes - check session instead of app.locals
app.get('/login', (req, res) => {
    if (req.session.user) { // Check session instead of app.locals
        return res.redirect('/');
    }
    res.render('login');
}); 

app.get('/register', (req, res) => {
    if (req.session.user) { // Check session instead of app.locals
        return res.redirect('/');
    }
    res.render('register');
});

app.use("/users", userRoute);
app.use("/mpesa", mpesaRoute);

// Logout route
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
        }
        res.redirect('/login');
    });
});

// Start server
app.listen(port, () => console.log(`Server listening on port ${port}`));
