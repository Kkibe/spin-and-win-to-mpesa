const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Register Page
router.get('/register', (req, res) => {
  // If user is already logged in, redirect to home
  if (req.session.user) {
    return res.redirect('/');
  }
  res.render('register', {
    error: null
  });
});

// Register Handler
router.post('/register', async (req, res) => {
  try {
    // If user is already logged in, redirect to home
    if (req.session.user) {
      return res.redirect('/');
    }

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
    const userSessionData = {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      balance: user.balance,
      gems: user.gems,
      spins: user.spins,
      isActivated: user.isActivated,
      isAdmin: user.isAdmin
    };

    req.session.user = userSessionData;

    // Save session before redirect
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.render('register', {
          error: 'Registration successful but session error occurred'
        });
      }
      res.redirect('/');
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.render('register', {
      error: 'An error occurred during registration'
    });
  }
});

// Login Page
router.get('/login', (req, res) => {
  // If user is already logged in, redirect to home
  if (req.session.user) {
    return res.redirect('/');
  }
  res.render('login', {
    error: null
  });
});

// Login Handler
router.post('/login', async (req, res) => {
  try {
    // If user is already logged in, redirect to home
    if (req.session.user) {
      return res.redirect('/');
    }

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
    const userSessionData = {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      balance: user.balance,
      gems: user.gems,
      spins: user.spins,
      isActivated: user.isActivated,
      isAdmin: user.isAdmin
    };

    req.session.user = userSessionData;

    // Save session before redirect
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.render('login', {
          error: 'Login successful but session error occurred'
        });
      }
      res.redirect('/');
    });

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