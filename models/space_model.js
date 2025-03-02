const mongoose = require("mongoose");

const spaceSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    code: {
        type: String,
        required: true,
    },
    people: {
        type: [String],
        required: true,

    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    messages: {
        type: [
            {
                user: String,
                message: String,
                createdAt: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],
        default: [],
    }
});

module.exports = mongoose.model("Space", spaceSchema);