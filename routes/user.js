const router = require("express").Router()
const User = require("../models/User");
const bcrypt = require("bcryptjs");

router.put("/", async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.app.locals.user._id,
      {
        $set: {
          balance: req.body.balance,
          gems: req.body.gems,
          spins: req.body.spins,
          totalSpins: req.body.totalSpins
        },
      },
      { new: true }
    );

    req.app.locals.user = updatedUser;
    res.status(200).json(updatedUser);
  } catch (err) {
    res.status(500).json(err);
  }
});

// Activate user route
router.put("/activate", async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.app.locals.user._id,
      {
        $set: {
          isActivated: true,
          spins: req.app.locals.user.spins + 50 // Give 50 spins on activation
        },
      },
      { new: true }
    );

    req.app.locals.user = updatedUser;
    res.status(200).json(updatedUser);
  } catch (err) {
    res.status(500).json(err);
  }
});

// Other routes remain the same...
router.delete("/:id", async (req, res) => {
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

router.get("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    const { password, ...others } = user._doc;
    res.status(200).json(others);
  } catch (err) {
    res.status(500).json(err);
  }
});

router.get("/", async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json(err);
  }
});

module.exports = router;
