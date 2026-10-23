const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
    text: {
        type: String,
        required: true,
        trim: true
    },

    options: {
        type: [String],
        required: true,
        validate: {
            validator(value) {
                return Array.isArray(value)
                    && value.length >= 2
                    && value.every(option => typeof option === "string" && option.trim() !== "");
            },
            message: "Question options must contain at least 2 non-empty values"
        }
    },

    keywords: {
        type: [String],
        default: []
    },

    correctAnswerIndex: {
        type: Number,
        required: true,
        validate: {
            validator(value) {
                return Number.isInteger(value)
                    && value >= 0
                    && Array.isArray(this.options)
                    && value < this.options.length;
            },
            message: "Correct answer index must match one of the provided options"
        }
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("Question", questionSchema);
