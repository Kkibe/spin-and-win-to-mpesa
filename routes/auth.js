const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = require("express").Router();
const User = require("../models/User");
const SESSION_DURATION = 12 * 60 * 60; // 12 hours in seconds

// Logout route
router.get('/logout', (req, res) => {
    delete req.app.locals.user;
    /*req.session.destroy(() => {
        res.redirect('/login');
    });*/
    const referer = req.get('Referer'); // Get the previous page URL from the header
    if (referer) {
        return res.redirect(referer); // Redirect to the previous page
    } else {
        return res.redirect('/login'); // Fallback if no referer is present
    }
});

//REGISTER
router.post("/register", async (req, res) => {
    try {
        // Check if user already exists
        const existingUser = await User.findOne({ email: req.body.email});
        if (existingUser) {
            return res.render('register', { error: 'Email is already registered.' });
        }
        const salt = await bcrypt.genSalt(10);
        // Hash the password
        const hashedPassword = await bcrypt.hash(req.body.password, salt);
        // Save the user in the database
        const newUser = new User({
            phone: req.body.phone,
            email: req.body.email,
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            password: hashedPassword,
        });
        const user = await newUser.save();

        const accessToken = jwt.sign({ 
            id: user._id, idAdmin: user.isAdmin,
        }, process.env.JWT_SECRET, {expiresIn: SESSION_DURATION});//{ expiresIn: process.env.SESSION_DURATION || "1h" }
        /**/
        const { password, ...others } = user._doc;
        currentUser = {...others, accessToken}


        if(user !== null) {
            req.session.message = {
                type: "success",
                message: "User added successfully"
            }
            req.app.locals.user = currentUser;

            return res.redirect('/dashboard');

        } else {
            res.render('register', {message: err.message, type: 'danger'});
        } 
    } catch (err) {
        res.render('register', {message: err.message, type: 'danger'});
    }
});


  //LOGIN
  router.post("/login", async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email});
        if (!user) {
            return res.render('login', {message: "User not found!", type: 'danger'});
        }
    
        const validated = await bcrypt.compare(req.body.password, user.password);
        if (!validated) {
            return res.render('login', {message: "Invalid email or password", type: 'danger'});
        }

        const accessToken = jwt.sign({
            id: user._id, idAdmin: user.isAdmin,
        }, process.env.JWT_SECRET, {expiresIn: SESSION_DURATION});//{ expiresIn: process.env.SESSION_DURATION || "1h" }
        /**/
        const { password, ...others } = user._doc;
        
        req.session.message = {
            type: "success",
            message: "User added successfully"
        }
        currentUser = {...others, accessToken}
        req.app.locals.user = currentUser;
        return res.redirect('/');
    } catch (err) {
        res.render('login', {message: err.message, type: 'danger'});
    }
});
module.exports = router;