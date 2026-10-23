const mongoose = require("mongoose");

const Question = require("../models/Question");
const Quiz = require("../models/Quiz");

const isValidId = (value) => mongoose.isValidObjectId(value);

const normalizeQuestionPayload = (payload, currentQuestion = null) => {
    const text = typeof payload.text === "undefined"
        ? currentQuestion?.text
        : payload.text;

    const options = typeof payload.options === "undefined"
        ? currentQuestion?.options
        : payload.options;

    const keywords = typeof payload.keywords === "undefined"
        ? currentQuestion?.keywords || []
        : payload.keywords;

    const correctAnswerIndex = typeof payload.correctAnswerIndex === "undefined"
        ? currentQuestion?.correctAnswerIndex
        : payload.correctAnswerIndex;

    return {
        text,
        options,
        keywords,
        correctAnswerIndex
    };
};

const validateQuestionPayload = (payload) => {
    if (typeof payload.text !== "string" || payload.text.trim() === "") {
        return "Question text is required";
    }

    if (!Array.isArray(payload.options) || payload.options.length < 2) {
        return "Question options must contain at least 2 values";
    }

    if (payload.options.some(option => typeof option !== "string" || option.trim() === "")) {
        return "Question options must not be empty";
    }

    if (!Number.isInteger(payload.correctAnswerIndex)) {
        return "Correct answer index must be an integer";
    }

    if (payload.correctAnswerIndex < 0 || payload.correctAnswerIndex >= payload.options.length) {
        return "Correct answer index must match one of the options";
    }

    if (typeof payload.keywords !== "undefined" && !Array.isArray(payload.keywords)) {
        return "Keywords must be an array";
    }

    return null;
};

const sanitizeQuestion = (question, includeAnswer = false) => {
    const questionObject = question.toObject ? question.toObject() : question;

    const sanitizedQuestion = {
        _id: questionObject._id,
        text: questionObject.text,
        options: questionObject.options,
        keywords: questionObject.keywords || [],
        author: questionObject.author
    };

    if (includeAnswer) {
        sanitizedQuestion.correctAnswerIndex = questionObject.correctAnswerIndex;
    }

    return sanitizedQuestion;
};

const canSeeAnswer = (req, question) => {
    if (!req.user) {
        return false;
    }

    if (req.user.admin === true) {
        return true;
    }

    const authorId = question.author?._id || question.author;
    return Boolean(authorId && authorId.equals && authorId.equals(req.user._id));
};

// GET /questions
const getQuestions = async (req, res, next) => {
    try {
        const questions = await Question.find()
            .populate("author", "username admin");

        const data = questions.map(question =>
            sanitizeQuestion(question, canSeeAnswer(req, question))
        );

        return res.json(data);
    } catch (error) {
        return next(error);
    }
};

// GET /questions/:questionId
const getQuestionById = async (req, res, next) => {
    try {
        if (!isValidId(req.params.questionId)) {
            return res.status(400).json({
                message: "Invalid question id"
            });
        }

        const question = await Question.findById(req.params.questionId)
            .populate("author", "username admin");

        if (!question) {
            return res.status(404).json({
                message: "Question not found"
            });
        }

        return res.json(
            sanitizeQuestion(question, canSeeAnswer(req, question))
        );
    } catch (error) {
        return next(error);
    }
};

// POST /questions
const createQuestion = async (req, res, next) => {
    try {
        const { author, ...questionData } = req.body;
        const normalizedPayload = normalizeQuestionPayload(questionData);
        const validationMessage = validateQuestionPayload(normalizedPayload);

        if (validationMessage) {
            return res.status(400).json({
                message: validationMessage
            });
        }

        const question = await Question.create({
            ...normalizedPayload,
            text: normalizedPayload.text.trim(),
            options: normalizedPayload.options.map(option => option.trim()),
            keywords: normalizedPayload.keywords || [],
            author: req.user._id
        });

        return res.status(201).json(sanitizeQuestion(question, true));
    } catch (error) {
        return next(error);
    }
};

// PUT /questions/:questionId
const updateQuestion = async (req, res, next) => {
    try {
        if (!isValidId(req.params.questionId)) {
            return res.status(400).json({
                message: "Invalid question id"
            });
        }

        const question = await Question.findById(req.params.questionId);

        if (!question) {
            return res.status(404).json({
                message: "Question not found"
            });
        }

        const { author, ...updates } = req.body;
        const normalizedPayload = normalizeQuestionPayload(updates, question);
        const validationMessage = validateQuestionPayload(normalizedPayload);

        if (validationMessage) {
            return res.status(400).json({
                message: validationMessage
            });
        }

        question.set({
            ...normalizedPayload,
            text: normalizedPayload.text.trim(),
            options: normalizedPayload.options.map(option => option.trim())
        });

        await question.save();

        return res.json(sanitizeQuestion(question, true));
    } catch (error) {
        return next(error);
    }
};

// DELETE /questions/:questionId
const deleteQuestion = async (req, res, next) => {
    try {
        if (!isValidId(req.params.questionId)) {
            return res.status(400).json({
                message: "Invalid question id"
            });
        }

        const question = await Question.findById(req.params.questionId);

        if (!question) {
            return res.status(404).json({
                message: "Question not found"
            });
        }

        await Quiz.updateMany(
            { questions: question._id },
            { $pull: { questions: question._id } }
        );

        await question.deleteOne();

        return res.json({
            message: "Question deleted successfully"
        });
    } catch (error) {
        return next(error);
    }
};

module.exports = {
    getQuestions,
    getQuestionById,
    createQuestion,
    updateQuestion,
    deleteQuestion
};
