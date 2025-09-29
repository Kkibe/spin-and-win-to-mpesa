const mongoose = require("mongoose");
const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: false,
    },
    password: {
      type: String,
      required: true,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    isActivated: {
      type: Boolean,
      default: false,
    },
    balance: {
      type: Number,
      default: 0.00,
    },
    gems: {
      type: Number,
      default: 0,
    },
    spins: {
      type: Number,
      default: 10, // Give users 10 free spins to start
    },
    totalSpins: {
      type: Number,
      default: 0,
    }
  },
  {timestamps: true}
);
module.exports = mongoose.model("User", UserSchema);
