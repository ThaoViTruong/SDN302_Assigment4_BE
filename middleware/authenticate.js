const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Question = require("../models/Question");

const createHttpError = (status, message) => {
    const error = new Error(message);
    error.status = status;
    return error;
};

const getBearerToken = (authHeader) => {
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return null;
    }

    return authHeader.split(" ")[1];
};

const verifyUser = async (req, res, next) => {
    try {
        const token = getBearerToken(req.headers.authorization);

        if (!token) {
            return res.status(401).json({
                message: "Access token is required"
            });
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        const user = await User.findById(decoded.userId);

        if (!user) {
            return res.status(401).json({
                message: "User not found"
            });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({
            message: "Invalid or expired token"
        });
    }
};

const attachOptionalUser = async (req, res, next) => {
    try {
        const token = getBearerToken(req.headers.authorization);

        if (!token) {
            return next();
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);

        if (user) {
            req.user = user;
        }

        return next();
    } catch (error) {
        return next();
    }
};

const verifyAdmin = (req, res, next) => {
    if (req.user && req.user.admin === true) {
        return next();
    }

    return next(
        createHttpError(
            403,
            "You are not authorized to perform this operation!"
        )
    );
};

const verifyAuthor = async (req, res, next) => {
    try {
        const question = await Question.findById(req.params.questionId);

        if (!question) {
            return next(createHttpError(404, "Question not found"));
        }

        if (!question.author || !question.author.equals(req.user._id)) {
            return next(
                createHttpError(403, "You are not the author of this question")
            );
        }

        req.question = question;
        return next();
    } catch (error) {
        if (error.name === "CastError") {
            return next(createHttpError(404, "Question not found"));
        }

        return next(error);
    }
};

module.exports = {
    verifyUser,
    attachOptionalUser,
    verifyAdmin,
    verifyAuthor
};
