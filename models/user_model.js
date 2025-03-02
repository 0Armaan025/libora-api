const mongoose = require("mongoose");
const crypto = require("crypto"); // Optional for generating UID

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        index: true, // Optional: Faster search by name
    },
    uid: {
        type: String,
        unique: true, // Ensure uniqueness
        default: () => new mongoose.Types.ObjectId().toHexString(),
    },
    password: {
        type: String,
        required: true,
    },
    profileImage: {
        type: String,
        reqiured: false,
        default: "https://cdn-icons-png.flaticon.com/128/149/149071.png",
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    followers: {
        type: [String],
        default: [],
    },
    following: {
        type: [String],
        default: [],
    },
    booksRead: {
        type: [String],
        default: [],
    },
});

// Ensure unique index on uid
userSchema.index({ uid: 1 }, { unique: true });

module.exports = mongoose.model("User", userSchema);
