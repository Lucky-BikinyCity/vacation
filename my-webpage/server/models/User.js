const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  history: [{ contentId: mongoose.Schema.Types.ObjectId }],
  favorites: [{ contentId: mongoose.Schema.Types.ObjectId }],
});

const User = mongoose.model("User", userSchema);

module.exports = User;
