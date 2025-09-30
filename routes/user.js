const router = require("express").Router()
const User = require("../models/User");
const { isAuthenticated } = require('../middleware/auth');

// Update user data - ENHANCED VERSION
/*router.put("/", isAuthenticated, async (req, res) => {
  try {
    console.log('Updating user data for:', req.session.user._id);
    console.log('Update data:', req.body);

    // Validate input
    if (typeof req.body.balance !== 'number' || 
        typeof req.body.gems !== 'number' || 
        typeof req.body.spins !== 'number') {
      return res.status(400).json({ 
        error: "Invalid data types for balance, gems, or spins" 
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.session.user._id,
      {
        $set: {
          balance: req.body.balance,
          gems: req.body.gems,
          spins: req.body.spins,
          totalSpins: req.body.totalSpins || (req.session.user.totalSpins || 0) + 1
        },
      },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Update session user data - CRITICAL
    req.session.user.balance = updatedUser.balance;
    req.session.user.gems = updatedUser.gems;
    req.session.user.spins = updatedUser.spins;
    req.session.user.totalSpins = updatedUser.totalSpins;

    // Save session to ensure persistence
    req.session.save((err) => {
      if (err) {
        console.error('Session save error during user update:', err);
        return res.status(500).json({ error: "Session update failed" });
      }
      
      console.log('User and session updated successfully');
      res.status(200).json({
        message: "User data updated successfully",
        user: updatedUser
      });
    });

  } catch (err) {
    console.error('User update error:', err);
    res.status(500).json({ 
      error: "Failed to update user data",
      details: err.message 
    });
  }
});*/

// Update user data - FIXED VERSION
router.put("/", isAuthenticated, async (req, res) => {
  try {
    console.log('Updating user data for:', req.session.user._id);
    console.log('Update data:', req.body);

    // Prevent negative spins
    const updatedSpins = Math.max(0, req.body.spins);
    const updatedBalance = Math.max(0, req.body.balance);
    const updatedGems = Math.max(0, req.body.gems);

    const updateData = {
      balance: updatedBalance,
      gems: updatedGems,
      spins: updatedSpins,
      $inc: { totalSpins: 1 } // Always increment total spins
    };

    const updatedUser = await User.findByIdAndUpdate(
      req.session.user._id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // CRITICAL: Update session with ACTUAL database values
    req.session.user.balance = updatedUser.balance;
    req.session.user.gems = updatedUser.gems;
    req.session.user.spins = updatedUser.spins;
    req.session.user.totalSpins = updatedUser.totalSpins;

    // Save session
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ error: "Session update failed" });
      }
      
      console.log('User updated - Spins remaining:', updatedUser.spins);
      res.status(200).json({
        message: "User data updated successfully",
        user: updatedUser,
        spinsRemaining: updatedUser.spins
      });
    });

  } catch (err) {
    console.error('User update error:', err);
    res.status(500).json({ 
      error: "Failed to update user data",
      details: err.message 
    });
  }
});

// Enhanced activate user route
router.put("/activate", isAuthenticated, async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.session.user._id,
      {
        $set: {
          isActivated: true,
          spins: (req.session.user.spins || 0) + 50
        },
      },
      { new: true }
    );

    // Update session
    req.session.user.isActivated = updatedUser.isActivated;
    req.session.user.spins = updatedUser.spins;

    req.session.save((err) => {
      if (err) {
        console.error('Session save error during activation:', err);
        return res.status(500).json({ error: "Session update failed" });
      }
      
      res.status(200).json({
        message: "Account activated successfully",
        user: updatedUser
      });
    });

  } catch (err) {
    console.error('Activation error:', err);
    res.status(500).json({ 
      error: "Failed to activate account",
      details: err.message 
    });
  }
});

// Get current user data
router.get("/me", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.user._id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    const { password, ...userData } = user._doc;
    res.status(200).json(userData);
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: "Failed to get user data" });
  }
});

// Other routes remain the same...
router.delete("/:id", isAuthenticated, async (req, res) => {
  if (req.body.userId === req.params.id) {
    try {
      const user = await User.findById(req.params.id);
      try {
        await User.findByIdAndDelete(req.params.id);
        res.status(200).json("User has been deleted...");
      } catch (err) {
        res.status(500).json(err);
      }
    } catch (err) {
      res.status(404).json("User not found!");
    }
  } else {
    res.status(401).json("You can delete only your account!");
  }
});

/*router.get("/:id", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    const { password, ...others } = user._doc;
    res.status(200).json(others);
  } catch (err) {
    res.status(500).json(err);
  }
});*/
// Get current user data
router.get("/me", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.user._id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    const { password, ...userData } = user._doc;
    res.status(200).json(userData);
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: "Failed to get user data" });
  }
});
router.get("/", isAuthenticated, async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json(err);
  }
});

module.exports = router;
