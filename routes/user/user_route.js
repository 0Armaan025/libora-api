const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

router.get("/", async (req, res) => {
    const MONGODB_URI = process.env.MONGODB_URI;

    try {
        await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log("Connected to the database");

        return res.status(200).json({ message: "User route works!", status: "success" });
    } catch (error) {
        console.error("Could not connect to the database:", error.message);
        return res.status(500).json({ message: "Database connection failed", status: `fail: ${error.message}` });
    }
});

module.exports = router;
