const express = require('express');
const path = require('path');
const cors = require('cors'); 
const session = require('express-session');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const MongoDBStore = require('connect-mongodb-session')(session);

const userRoute = require("./routes/user");
const mpesaRoute = require("./routes/mpesa");
const authRoute = require("./routes/auth");
const { isAuthenticated, isNotAuthenticated } = require('./middleware/auth');

const app = express();
dotenv.config();

// Session store
const store = new MongoDBStore({
  uri: process.env.MONGODB_URL,
  collection: 'sessions'
});

store.on('error', function(error) {
  console.error('Session store error:', error);
});

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-here',
    resave: false,
    saveUninitialized: false,
    store: store,
    cookie: { 
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Make user available in views
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.message = req.session.message;
    delete req.session.message;
    next();
});

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

// Protected routes
app.get('/dashboard', isAuthenticated, (req, res) => {
    res.render('dashboard', { 
        user: req.session.user,
        message: req.session.message
    });
});

app.get('/deposit', isAuthenticated, (req, res) => {
    let result = req.session.result || null;
    res.render('deposit', {
        user: req.session.user,
        result
    });
});

app.get('/', isAuthenticated, (req, res) => {
    res.render('spin', {
        user: req.session.user
    });
});

// Public routes
app.get('/login', isNotAuthenticated, (req, res) => {
    res.render('login', { error: null });
}); 

app.get('/register', isNotAuthenticated, (req, res) => {
    res.render('register', { error: null });
});

// Logout route
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
        }
        res.redirect('/login');
    });
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`Server listening on port ${port}`));
