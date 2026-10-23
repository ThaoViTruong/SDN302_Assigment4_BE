const mongoose = require("mongoose");

const connectDB = async () => {
    const { MONGODB_URI } = process.env;

    if (!MONGODB_URI) {
        throw new Error("Missing MONGODB_URI in environment variables");
    }

    await mongoose.connect(MONGODB_URI);

    console.log("MongoDB connected");
};

module.exports = connectDB;
