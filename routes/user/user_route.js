const express = require("express");
const mongoose = require("mongoose");
const User = require("../../models/user_model");

const router = express.Router();
router.use(express.json());

const connectToDB = async () => {
    if (mongoose.connection.readyState !== 1) {
        try {
            await mongoose.connect(process.env.MONGODB_URI, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
            });
        } catch (error) {
            throw new Error("Database connection failed: " + error.message);
        }
    }
};

router.get("/", async (req, res) => {
    try {
        await connectToDB();
        res.status(200).json({ message: "User route works!", status: "success" });
    } catch (error) {
        res.status(500).json({ message: error.message, status: "fail" });
    }
});

router.post("/register", async (req, res) => {
    try {
        await connectToDB();
        const { name, pass , profileImage } = req.body;

        if (!name || !pass || !profileImage) return res.status(400).json({ message: "Name , pass and profileImage are required" });

        if (await User.findOne({ name })) return res.status(400).json({ message: "User already exists" });

        const user = await new User({ name, password: pass , profileImage}).save();
        res.status(200).json({ message: "User created successfully!", status: 200, user });
    } catch (e) {
        res.status(500).json({ message: "Some error occurred, please contact Armaan", status: 500, error: e.message });
    }
});

router.post("/login", async (req, res) => {
    try {
        await connectToDB();
        const { name, pass } = req.body;

        if (!name || !pass) return res.status(400).json({ message: "Name and password are required" });

        const existingUser = await User.findOne({ name });
        if (!existingUser || pass !== existingUser.password) {
            return res.status(400).json({ message: "Invalid username or password" });
        }

        res.status(200).json({ message: "Login successful", status: 200, user: existingUser });
    } catch (e) {
        res.status(500).json({ message: "Some error occurred, please contact Armaan", status: 500, error: e.message });
    }
});

router.patch("/update-user", async (req, res) => {
    try {
        await connectToDB();
        const { name , updates } = req.body;

        if (!name || !updates || typeof updates !== "object") {
            return res.status(400).json({ message: "UID and valid updates are required" });
        }

        const updatedUser = await User.findOneAndUpdate(
            { name },
            { $set: updates },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({ message: "User updated successfully", user: updatedUser });
    } catch (error) {
        res.status(500).json({ message: "Error updating user", error: error.message });
    }
});

router.get("/get-user", async (req, res) => {
    try {
        await connectToDB();
        const { name } = req.query;

        if (!name) return res.status(400).json({ message: "Name is required" });

        const user = await User.findOne({ name });

        if (!user) return res.status(404).json({ message: "User not found" });
        return res.status(200).json({ user });
    }
    catch (e) {

        return res.status(500).json({ message: "Some error occurred, please contact armaan", error: e.message })
    }
});

router.get("/search-users", async (req, res) => {
    try {
        await connectToDB();
        const { query } = req.query;

        if (!query) return res.status(400).json({ message: "Search query is required" });

        const users = await User.find({ name: { $regex: query, $options: "i" } });

        if (users.length === 0) return res.status(404).json({ message: "No users found" });

        res.status(200).json({ users });
    } catch (error) {
        res.status(500).json({ message: "Error searching users", error: error.message });
    }
});

module.exports = router;
