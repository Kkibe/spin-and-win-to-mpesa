const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Register Page
router.get('/register', (req, res) => {
  if (req.session.user) {
    console.log('User already logged in during register GET, redirecting to home');
    return res.redirect('/');
  }
  res.render('register', {
    error: null
  });
});

// Register Handler
router.post('/register', async (req, res) => {
  try {
    console.log('Register POST received for email:', req.body.email);

    if (req.session.user) {
      console.log('User already logged in during register POST');
      return res.redirect('/');
    }

    const { firstName, lastName, email, phone, password, confirmPassword } = req.body;

    // Validation
    if (password !== confirmPassword) {
      console.log('Password mismatch during registration');
      return res.render('register', {
        error: 'Passwords do not match'
      });
    }

    if (password.length < 6) {
      console.log('Password too short during registration');
      return res.render('register', {
        error: 'Password must be at least 6 characters long'
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({
      $or: [{ email }, { phone }]
    });

    if (existingUser) {
      console.log('User already exists:', email);
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
    console.log('User created successfully:', user.email);

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
    
    // Set success message
    req.session.message = {
      type: 'success',
      message: 'Registration successful! Welcome to Spin & Win!'
    };

    console.log('Session user set, about to save session...');

    // Save session before redirect - ENHANCED with timeout
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.render('register', {
          error: 'Registration successful but session error occurred. Please try logging in.'
        });
      }
      
      console.log('Session saved successfully, redirecting to home');
      console.log('Session ID after save:', req.sessionID);
      res.redirect('/');
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.render('register', {
      error: 'An error occurred during registration: ' + error.message
    });
  }
});

// Login Page
router.get('/login', (req, res) => {
  if (req.session.user) {
    console.log('User already logged in during login GET, redirecting to home');
    return res.redirect('/');
  }
  res.render('login', {
    error: null
  });
});

// Login Handler
router.post('/login', async (req, res) => {
  try {
    console.log('Login POST received for email:', req.body.email);

    if (req.session.user) {
      console.log('User already logged in during login POST');
      return res.redirect('/');
    }

    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      console.log('User not found:', email);
      return res.render('login', {
        error: 'Invalid email or password'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log('Invalid password for user:', email);
      return res.render('login', {
        error: 'Invalid email or password'
      });
    }

    console.log('Login successful for user:', email);

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
    
    // Set success message
    req.session.message = {
      type: 'success',
      message: 'Login successful! Welcome back!'
    };

    console.log('Session user set, about to save session...');

    // Save session before redirect - ENHANCED with timeout
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.render('login', {
          error: 'Login successful but session error occurred. Please try again.'
        });
      }
      
      console.log('Session saved successfully, redirecting to home');
      console.log('Session ID after save:', req.sessionID);
      res.redirect('/');
    });

  } catch (error) {
    console.error('Login error:', error);
    res.render('login', {
      error: 'An error occurred during login: ' + error.message
    });
  }
});

// Logout
router.get('/logout', (req, res) => {
  const userEmail = req.session.user ? req.session.user.email : 'Unknown';
  console.log('Logout requested for user:', userEmail);
  
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
      // Even if destroy fails, clear the session
      req.session = null;
    }
    console.log('User logged out successfully:', userEmail);
    res.redirect('/login');
  });
});

// Session debug route
router.get('/debug-session', (req, res) => {
  res.json({
    sessionId: req.sessionID,
    user: req.session.user,
    cookie: req.session.cookie
  });
});

module.exports = router;
