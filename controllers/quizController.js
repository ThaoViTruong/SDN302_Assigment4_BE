const mongoose = require("mongoose");

const Quiz = require("../models/Quiz");
const Question = require("../models/Question");

const isValidId = (value) => mongoose.isValidObjectId(value);

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

const sanitizeQuiz = (quiz, includeQuestions = false, includeAnswers = false) => {
    const quizObject = quiz.toObject ? quiz.toObject() : quiz;

    const sanitizedQuiz = {
        _id: quizObject._id,
        title: quizObject.title,
        description: quizObject.description,
        questionCount: Array.isArray(quizObject.questions) ? quizObject.questions.length : 0
    };

    if (includeQuestions) {
        sanitizedQuiz.questions = (quizObject.questions || []).map(question =>
            sanitizeQuestion(question, includeAnswers)
        );
    }

    return sanitizedQuiz;
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

const buildQuestionCreatePayload = (payload, authorId) => ({
    ...payload,
    text: payload.text.trim(),
    options: payload.options.map(option => option.trim()),
    keywords: payload.keywords || [],
    author: authorId
});

const validateQuizPayload = async (payload) => {
    if (typeof payload.title !== "string" || payload.title.trim() === "") {
        return "Quiz title is required";
    }

    if (typeof payload.description !== "string" || payload.description.trim() === "") {
        return "Quiz description is required";
    }

    if (typeof payload.questions === "undefined") {
        return null;
    }

    if (!Array.isArray(payload.questions)) {
        return "Quiz questions must be an array";
    }

    if (payload.questions.some(questionId => !isValidId(questionId))) {
        return "Quiz questions must contain valid question ids";
    }

    const existingCount = await Question.countDocuments({
        _id: { $in: payload.questions }
    });

    if (existingCount !== payload.questions.length) {
        return "One or more questions do not exist";
    }

    return null;
};

const getQuizDocument = async (quizId, withQuestions = false) => {
    if (!isValidId(quizId)) {
        return null;
    }

    const query = Quiz.findById(quizId);

    if (withQuestions) {
        query.populate("questions");
    }

    return query;
};

// GET /quizzes
const getQuizzes = async (req, res, next) => {
    try {
        const quizzes = await Quiz.find();

        return res.json(quizzes.map(quiz => sanitizeQuiz(quiz)));
    } catch (error) {
        return next(error);
    }
};

// GET /quizzes/:quizId
const getQuizById = async (req, res, next) => {
    try {
        if (!isValidId(req.params.quizId)) {
            return res.status(400).json({
                message: "Invalid quiz id"
            });
        }

        const quiz = await getQuizDocument(req.params.quizId, true);

        if (!quiz) {
            return res.status(404).json({
                message: "Quiz not found"
            });
        }

        return res.json(sanitizeQuiz(quiz, true));
    } catch (error) {
        return next(error);
    }
};

// POST /quizzes
const createQuiz = async (req, res, next) => {
    try {
        const payload = {
            title: req.body?.title,
            description: req.body?.description,
            questions: req.body?.questions || []
        };

        const validationMessage = await validateQuizPayload(payload);

        if (validationMessage) {
            return res.status(400).json({
                message: validationMessage
            });
        }

        const quiz = await Quiz.create({
            title: payload.title.trim(),
            description: payload.description.trim(),
            questions: payload.questions
        });

        return res.status(201).json(sanitizeQuiz(quiz));
    } catch (error) {
        return next(error);
    }
};

// PUT /quizzes/:quizId
const updateQuiz = async (req, res, next) => {
    try {
        if (!isValidId(req.params.quizId)) {
            return res.status(400).json({
                message: "Invalid quiz id"
            });
        }

        const quiz = await Quiz.findById(req.params.quizId);

        if (!quiz) {
            return res.status(404).json({
                message: "Quiz not found"
            });
        }

        const payload = {
            title: typeof req.body?.title === "undefined" ? quiz.title : req.body.title,
            description: typeof req.body?.description === "undefined" ? quiz.description : req.body.description,
            questions: typeof req.body?.questions === "undefined" ? quiz.questions : req.body.questions
        };

        const validationMessage = await validateQuizPayload(payload);

        if (validationMessage) {
            return res.status(400).json({
                message: validationMessage
            });
        }

        quiz.set({
            title: payload.title.trim(),
            description: payload.description.trim(),
            questions: payload.questions
        });

        await quiz.save();

        return res.json(sanitizeQuiz(quiz));
    } catch (error) {
        return next(error);
    }
};

// DELETE /quizzes/:quizId
const deleteQuiz = async (req, res, next) => {
    try {
        if (!isValidId(req.params.quizId)) {
            return res.status(400).json({
                message: "Invalid quiz id"
            });
        }

        const quiz = await Quiz.findById(req.params.quizId);

        if (!quiz) {
            return res.status(404).json({
                message: "Quiz not found"
            });
        }

        await quiz.deleteOne();

        return res.json({
            message: "Quiz deleted successfully"
        });
    } catch (error) {
        return next(error);
    }
};

// GET /quizzes/:quizId/populate
const populateCapitalQuestions = async (req, res, next) => {
    try {
        if (!isValidId(req.params.quizId)) {
            return res.status(400).json({
                message: "Invalid quiz id"
            });
        }

        const quiz = await Quiz.findById(req.params.quizId)
            .populate({
                path: "questions",
                match: {
                    text: {
                        $regex: "capital",
                        $options: "i"
                    }
                }
            });

        if (!quiz) {
            return res.status(404).json({
                message: "Quiz not found"
            });
        }

        return res.json(sanitizeQuiz(quiz, true));
    } catch (error) {
        return next(error);
    }
};

// POST /quizzes/:quizId/questions
const addQuestionsToQuiz = async (req, res, next) => {
    try {
        if (!isValidId(req.params.quizId)) {
            return res.status(400).json({
                message: "Invalid quiz id"
            });
        }

        const quiz = await Quiz.findById(req.params.quizId);

        if (!quiz) {
            return res.status(404).json({
                message: "Quiz not found"
            });
        }

        const payload = req.body;
        const isBulkCreate = Array.isArray(payload);

        if (isBulkCreate && payload.length === 0) {
            return res.status(400).json({
                message: "Request body must contain at least one question"
            });
        }

        if (!isBulkCreate && (!payload || typeof payload !== "object")) {
            return res.status(400).json({
                message: "Request body must contain a question object or an array of questions"
            });
        }

        const rawQuestions = isBulkCreate ? payload : [payload];
        const questionsToCreate = [];

        for (const item of rawQuestions) {
            const { author, ...questionData } = item;
            const validationMessage = validateQuestionPayload(questionData);

            if (validationMessage) {
                return res.status(400).json({
                    message: validationMessage
                });
            }

            questionsToCreate.push(buildQuestionCreatePayload(questionData, req.user._id));
        }

        const questions = isBulkCreate
            ? await Question.insertMany(questionsToCreate)
            : [await Question.create(questionsToCreate[0])];

        quiz.questions.push(...questions.map(question => question._id));
        await quiz.save();

        return res.status(201).json({
            message: isBulkCreate
                ? "Questions added to quiz successfully"
                : "Question added to quiz successfully",
            questions: questions.map(question => sanitizeQuestion(question, true)),
            quiz: sanitizeQuiz(quiz)
        });
    } catch (error) {
        return next(error);
    }
};

// POST /quizzes/:quizId/questions/:questionId
const attachExistingQuestionToQuiz = async (req, res, next) => {
    try {
        const { quizId, questionId } = req.params;

        if (!isValidId(quizId)) {
            return res.status(400).json({
                message: "Invalid quiz id"
            });
        }

        if (!isValidId(questionId)) {
            return res.status(400).json({
                message: "Invalid question id"
            });
        }

        const [quiz, question] = await Promise.all([
            Quiz.findById(quizId),
            Question.findById(questionId)
        ]);

        if (!quiz) {
            return res.status(404).json({
                message: "Quiz not found"
            });
        }

        if (!question) {
            return res.status(404).json({
                message: "Question not found"
            });
        }

        const alreadyAttached = quiz.questions.some(
            existingQuestionId => existingQuestionId.toString() === questionId
        );

        if (alreadyAttached) {
            return res.status(409).json({
                message: "Question is already attached to this quiz"
            });
        }

        quiz.questions.push(question._id);
        await quiz.save();

        const updatedQuiz = await Quiz.findById(quizId).populate("questions");

        return res.json({
            message: "Question attached to quiz successfully",
            quiz: sanitizeQuiz(updatedQuiz, true, true)
        });
    } catch (error) {
        return next(error);
    }
};

// DELETE /quizzes/:quizId/questions/:questionId
const detachQuestionFromQuiz = async (req, res, next) => {
    try {
        const { quizId, questionId } = req.params;

        if (!isValidId(quizId)) {
            return res.status(400).json({
                message: "Invalid quiz id"
            });
        }

        if (!isValidId(questionId)) {
            return res.status(400).json({
                message: "Invalid question id"
            });
        }

        const quiz = await Quiz.findById(quizId);

        if (!quiz) {
            return res.status(404).json({
                message: "Quiz not found"
            });
        }

        const questionExistsInQuiz = quiz.questions.some(
            existingQuestionId => existingQuestionId.toString() === questionId
        );

        if (!questionExistsInQuiz) {
            return res.status(404).json({
                message: "Question is not attached to this quiz"
            });
        }

        quiz.questions = quiz.questions.filter(
            existingQuestionId => existingQuestionId.toString() !== questionId
        );

        await quiz.save();

        const updatedQuiz = await Quiz.findById(quizId).populate("questions");

        return res.json({
            message: "Question detached from quiz successfully",
            quiz: sanitizeQuiz(updatedQuiz, true, true)
        });
    } catch (error) {
        return next(error);
    }
};

// POST /quizzes/:quizId/submit
const submitQuiz = async (req, res, next) => {
    try {
        if (!isValidId(req.params.quizId)) {
            return res.status(400).json({
                message: "Invalid quiz id"
            });
        }

        const answers = req.body?.answers;

        if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
            return res.status(400).json({
                message: "Answers must be provided as an object"
            });
        }

        const quiz = await Quiz.findById(req.params.quizId).populate("questions");

        if (!quiz) {
            return res.status(404).json({
                message: "Quiz not found"
            });
        }

        if (quiz.questions.length === 0) {
            return res.status(400).json({
                message: "This quiz does not contain any questions"
            });
        }

        let score = 0;

        const results = quiz.questions.map(question => {
            const selectedAnswer = answers[String(question._id)];
            const isCorrect = selectedAnswer === question.correctAnswerIndex;

            if (isCorrect) {
                score += 1;
            }

            return {
                questionId: question._id,
                selectedAnswer: Number.isInteger(selectedAnswer) ? selectedAnswer : null,
                correctAnswerIndex: question.correctAnswerIndex,
                isCorrect
            };
        });

        return res.json({
            message: "Quiz submitted successfully",
            result: {
                quizId: quiz._id,
                score,
                totalQuestions: quiz.questions.length,
                percentage: Math.round((score / quiz.questions.length) * 100),
                results
            }
        });
    } catch (error) {
        return next(error);
    }
};

module.exports = {
    getQuizzes,
    getQuizById,
    createQuiz,
    updateQuiz,
    deleteQuiz,
    populateCapitalQuestions,
    addQuestionsToQuiz,
    attachExistingQuestionToQuiz,
    detachQuestionFromQuiz,
    submitQuiz
};
