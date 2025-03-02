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

router.get("/get", async (req, res) => {
    try {
        await connectToDB();
        const spaces = await SpaceModel.find({ people: { $exists: true, $not: { $size: 0 } } });
        res.status(200).json({ spaces, status: "success" });
    } catch (error) {
        res.status(500).json({ message: error.message, status: "fail" });
    }
});
router.get("/get-all", async (req, res) => {
    try {
        await connectToDB();
        const spaces = await SpaceModel.find();
        res.status(200).json({ spaces, status: "success" });
    } catch (error) {
        res.status(500).json({ message: error.message, status: "fail" });
    }
});

router.post("/create", async (req, res) => {
    const { name, person, code } = req.body;
    if (!name || !person || !code) {
        return res.status(400).json({ message: "Name, person, and code are required" });
    }

    try {
        await connectToDB();
        const existingSpace = await SpaceModel.findOne({ name });

        if (existingSpace) return res.status(500).json({ message: "Please choose a different space name" });
        const space = await new SpaceModel({ name, people: [person], code }).save();
        res.status(200).json({ message: "Space created successfully!", status: 200, space });
    } catch (error) {
        res.status(500).json({ message: error.message, status: "fail" });
    }
});

router.post("/join", async (req, res) => {
    const { person, code } = req.body;
    if (!person || !code) {
        return res.status(400).json({ message: "Code and person are required" });
    }

    try {
        await connectToDB();
        const space = await SpaceModel.findOne({ code }, { "messages._id": 0 });
        if (!space) {
            return res.status(404).json({ message: "Space not found" });
        }

        if (space.people.includes(person)) {
            return res.status(400).json({ message: "Person already in space" });
        }

        space.people.push(person);
        await space.save();
        res.status(200).json({ message: "Person added to space successfully!", status: 200, space });
    } catch (error) {
        res.status(500).json({ message: error.message, status: "fail" });
    }
});

router.post("/leave", async (req, res) => {
    const { person, code } = req.body;
    if (!person || !code) {
        return res.status(400).json({ message: "Code and person are required" });
    }

    try {
        await connectToDB();
        const space = await SpaceModel.findOne({ code });
        if (!space) {
            return res.status(404).json({ message: "Space not found" });
        }

        if (!space.people.includes(person)) {
            return res.status(400).json({ message: "Person not in space" });
        }

        space.people = space.people.filter((p) => p !== person);
        await space.save();
        if (space.people.length === 0) {
            await SpaceModel.deleteOne({ code });
            return res.status(200).json({ message: "Space deleted as no people are left", status: 200 });
        }
        res.status(200).json({ message: "Person removed from space successfully!", status: 200, space });
    } catch (error) {
        res.status(500).json({ message: error.message, status: "fail" });
    }
});

router.get("/get-people", async (req, res) => {
    const { code } = req.body;

    if (!code) {
        return res.status(400).json({ message: "Code is required" });
    }

    try {
        await connectToDB();
        const space = await SpaceModel.findOne({ code });
        if (!space) {
            return res.status(404).json({ message: "Space not found" });
        }
        return res.status(200).json({ message: "People fetched successfully", status: 200, people: space.people });
    } catch (error) {
        return res.status(500).json({ message: error.message, status: "fail" });
    }
});

router.post("/send-message", async (req, res) => {
    const { code, user, message } = req.body;
    if (!code || !user || !message) {
        return res.status(400).json({ message: "Code, person, and message are required" });
    }

    try {
        await connectToDB();
        const space = await SpaceModel.findOne({ code });
        if (!space) {
            return res.status(404).json({ message: "Space not found" });
        }

        if (!space.people.includes(user)) {
            return res.status(400).json({ message: "Person not in space" });
        }

        if (!space.messages) {
            space.messages = [];
        }

        space.messages.push({ user, message, timestamp: new Date() });
        await space.save();
        res.status(200).json({ message: "Message sent successfully!", status: 200, spaceMessage: space.messages });
    } catch (error) {
        res.status(500).json({ message: error.message, status: "fail" });
    }
});

router.get("/get-messages", async (req, res) => {
    const { code } = req.body;

    if (!code) {
        return res.status(400).json({ message: "Code is required" });
    }

    try {
        await connectToDB();
        const space = await SpaceModel.findOne({ code });
        if (!space) {
            return res.status(404).json({ message: "Space not found" });
        }

        return res.status(200).json({ message: "Messages fetched successfully", status: 200, messages: space.messages });
    } catch (error) {
        return res.status(500).json({ message: error.message, status: "fail" });
    }
});

module.exports = router;