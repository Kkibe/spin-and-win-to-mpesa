const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { isNotAuthenticated } = require('../middleware/auth');

// Register Page
router.get('/register', isNotAuthenticated, (req, res) => {
  res.render('register', { 
    error: null 
  });
});

// Register Handler
router.post('/register', isNotAuthenticated, async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password, confirmPassword } = req.body;

    // Validation
    if (password !== confirmPassword) {
      return res.render('register', {
        error: 'Passwords do not match'
      });
    }

    if (password.length < 6) {
      return res.render('register', {
        error: 'Password must be at least 6 characters long'
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({
      $or: [{ email }, { phone }]
    });

    if (existingUser) {
      return res.render('register', {
        error: 'User with this email or phone number already exists'
      });
    }

    // Create new user
    const user = new User({ 
      firstName, 
      lastName, 
      email, 
      phone, 
      password,
      balance: 0,
      gems: 0,
      spins: 10,
      isActivated: false
    });
    await user.save();

    // Store user in session (without password)
    const { password: _, ...userWithoutPassword } = user._doc;
    req.session.user = userWithoutPassword;

    req.session.message = {
      type: "success",
      message: "Registration successful!"
    }

    res.redirect('/');
  } catch (error) {
    console.error('Registration error:', error);
    res.render('register', {
      error: 'An error occurred during registration'
    });
  }
});

// Login Page
router.get('/login', isNotAuthenticated, (req, res) => {
  res.render('login', { 
    error: null 
  });
});

// Login Handler
router.post('/login', isNotAuthenticated, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.render('login', {
        error: 'Invalid email or password'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.render('login', {
        error: 'Invalid email or password'
      });
    }

    // Store user in session (without password)
    const { password: _, ...userWithoutPassword } = user._doc;
    req.session.user = userWithoutPassword;

    req.session.message = {
      type: "success",
      message: "Login successful!"
    }

    res.redirect('/');
  } catch (error) {
    console.error('Login error:', error);
    res.render('login', {
      error: 'An error occurred during login'
    });
  }
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/login');
  });
});

module.exports = router;
