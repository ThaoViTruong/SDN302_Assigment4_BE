const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const { verifyUser, verifyAdmin } = require("../middleware/authenticate");

const router = express.Router();

// POST /users/register

router.post("/register", async (req, res, next) => {
    try {
        const username = (req.body?.username || "").trim();
        const password = req.body?.password || "";
        const admin = req.body?.admin;
        const allowAdminRegistration = process.env.NODE_ENV !== "production";

        if (!username || !password) {
            return res.status(400).json({
                message: "Username and password are required"
            });
        }

        if (username.length < 3) {
            return res.status(400).json({
                message: "Username must contain at least 3 characters"
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                message: "Password must contain at least 6 characters"
            });
        }

        if (typeof admin !== "undefined" && typeof admin !== "boolean") {
            return res.status(400).json({
                message: "Admin must be a boolean value"
            });
        }

        if (admin === true && !allowAdminRegistration) {
            return res.status(403).json({
                message: "Admin role cannot be assigned during registration"
            });
        }

        const existingUser = await User.findOne({ username });

        if (existingUser) {
            return res.status(409).json({
                message: "Username already exists"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            username,
            password: hashedPassword,
            admin: admin === true && allowAdminRegistration
        });

        return res.status(201).json({
            message: "Registration successful",
            user: {
                _id: user._id,
                username: user.username,
                admin: user.admin
            }
        });
    } catch (error) {
        next(error);
    }
});

// POST /users/login
router.post("/login", async (req, res, next) => {
    try {
        const username = (req.body?.username || "").trim();
        const password = req.body?.password || "";

        if (!username || !password) {
            return res.status(400).json({
                message: "Username and password are required"
            });
        }

        const user = await User.findOne({ username });

        if (!user) {
            return res.status(401).json({
                message: "Invalid username or password"
            });
        }

        const passwordMatches = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatches) {
            return res.status(401).json({
                message: "Invalid username or password"
            });
        }

        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: "2h" }
        );

        return res.json({
            message: "Login successful",
            token,
            user: {
                _id: user._id,
                username: user.username,
                admin: user.admin
            }
        });
    } catch (error) {
        next(error);
    }
});

// GET /users — Admin only
router.get("/", verifyUser, verifyAdmin, async (req, res, next) => {
    try {
        const users = await User.find()
            .select("-password")
            .lean();

        return res.json(users);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
