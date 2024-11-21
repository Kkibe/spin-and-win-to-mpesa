const express = require('express');
const path = require('path');
const cors = require('cors'); 
const session = require('express-session');
const dotenv = require('dotenv');
const { default: mongoose } = require('mongoose');

const userRoute = require("./routes/user");
const mpesaRoute = require("./routes/mpesa");

const app = express();
dotenv.config();

// Add these middlewares before your routes
app.use(express.json()); // Parses JSON bodies
app.use(express.urlencoded({ extended: true })); // Parses URL-encoded bodies
app.use(session({
    secret: 'secretKey',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: true } // In production, set this to true with HTTPS
}));

// Middleware to make user globally available in views
app.use((req, res, next) => {
    //res.locals.user = req.session.user || null; // Set user to null if not logged in
    res.locals.message = req.session.message
    delete req.session.message
    next();
});

app.use(cors());
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use("", require("./routes/auth"))

mongoose  
    .connect(process.env.MONGODB_URL).then(() => {}).catch((error) => {});

app.get('/dashboard', (req, res) => {
    const user = app.locals.user;
    if (!user) {
        return res.redirect('/login');
    }

    res.render('index', { 
        user,
        message: {
            message: "Logged In",
            type: "success"
        }
    });
});

// Use routes
app.get('/login', (req, res) => {
    const user = app.locals.user;
    if (user) {
        const referer = req.get('Referer'); // Get the previous page URL from the header
        if (referer) {
            return res.redirect(referer); // Redirect to the previous page
        } else {
            return res.redirect('/'); // Fallback if no referer is present
        }
    }
    res.render('login');
}); 

app.get('/register', (req, res) => {
    const user = app.locals.user;
    if (user) {
        const referer = req.get('Referer'); // Get the previous page URL from the header
        if (referer) {
            return res.redirect(referer); // Redirect to the previous page
        } else {
            return res.redirect('/dashboard'); // Fallback if no referer is present
        }
    }
    res.render('register');
});

app.get('/deposit', (req, res) => {
    const user = app.locals.user;
    let result =  app.locals.result || null;
    if (!user) {
        return res.redirect('/login');
    }

    res.render('deposit', {user, result});
});

// Dashboard route
app.get('/', (req, res) => {
    const user = app.locals.user;
    if (!user) {
        return res.redirect('/login');
    }
    res.render('spin', {user});
});

app.use("/users", userRoute);
app.use("/mpesa", mpesaRoute);

// Start server
app.listen(5000, (req, res) => console.log("listening on http://localhost:5000"));