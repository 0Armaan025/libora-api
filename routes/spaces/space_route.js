const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
router.use(express.json());

const SpaceModel = require("../../models/space_model");

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
        res.status(200).json({ message: "Space route works!", status: "success" });
    } catch (error) {
        res.status(500).json({ message: error.message, status: "fail" });
    }
});

module.exports = router;