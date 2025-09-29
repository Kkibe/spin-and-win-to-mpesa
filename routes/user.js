const router = require("express").Router()
const User = require("../models/User");
const { isAuthenticated } = require('../middleware/auth');

// Update user data
router.put("/", isAuthenticated, async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.session.user._id,
      {
        $set: {
          balance: req.body.balance,
          gems: req.body.gems,
          spins: req.body.spins,
          totalSpins: req.body.totalSpins || req.session.user.totalSpins
        },
      },
      { new: true }
    );

    // Update session user data
    req.session.user.balance = updatedUser.balance;
    req.session.user.gems = updatedUser.gems;
    req.session.user.spins = updatedUser.spins;
    req.session.user.totalSpins = updatedUser.totalSpins;

    res.status(200).json(updatedUser);
  } catch (err) {
    res.status(500).json(err);
  }
});

// Activate user route
router.put("/activate", isAuthenticated, async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.session.user._id,
      {
        $set: {
          isActivated: true,
          spins: (req.session.user.spins || 0) + 50 // Give 50 spins on activation
        },
      },
      { new: true }
    );

    // Update session user data
    req.session.user.isActivated = updatedUser.isActivated;
    req.session.user.spins = updatedUser.spins;

    res.status(200).json(updatedUser);
  } catch (err) {
    res.status(500).json(err);
  }
});

// Other user routes...
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

router.get("/:id", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    const { password, ...others } = user._doc;
    res.status(200).json(others);
  } catch (err) {
    res.status(500).json(err);
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
