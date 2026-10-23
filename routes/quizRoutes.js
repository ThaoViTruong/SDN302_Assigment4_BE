
const express = require("express");

const {
    getQuizzes,
    getQuizById,
    createQuiz,
    updateQuiz,
    deleteQuiz,
    populateCapitalQuestions,
    addQuestionToQuiz,
    addManyQuestionsToQuiz,
    attachExistingQuestionToQuiz,
    detachQuestionFromQuiz,
    submitQuiz
} = require("../controllers/quizController");

const {
    verifyUser,
    verifyAdmin
} = require("../middleware/authenticate");

const router = express.Router();

// GET: Mọi người đều có thể xem danh sách Quiz
router.get("/", verifyUser, getQuizzes);

// GET: Mọi người đều có thể xem Quiz đã populate câu hỏi
router.get("/:quizId/populate", verifyUser, populateCapitalQuestions);

// GET: Mọi người đều có thể xem chi tiết Quiz
router.get("/:quizId", verifyUser, getQuizById);

// POST: Người dùng đã đăng nhập có thể nộp bài quiz
router.post("/:quizId/submit", verifyUser, submitQuiz);

// POST: Chỉ Admin được tạo Quiz
router.post("/", verifyUser, verifyAdmin, createQuiz);

// POST: Chỉ Admin được thêm một câu hỏi vào Quiz
router.post(
    "/:quizId/question",
    verifyUser,
    verifyAdmin,
    addQuestionToQuiz
);

// POST: Chỉ Admin được thêm nhiều câu hỏi vào Quiz
router.post(
    "/:quizId/questions",
    verifyUser,
    verifyAdmin,
    addManyQuestionsToQuiz
);

// POST: Chỉ Admin được gắn một câu hỏi có sẵn vào Quiz
router.post(
    "/:quizId/questions/:questionId",
    verifyUser,
    verifyAdmin,
    attachExistingQuestionToQuiz
);

// DELETE: Chỉ Admin được gỡ một câu hỏi khỏi Quiz
router.delete(
    "/:quizId/questions/:questionId",
    verifyUser,
    verifyAdmin,
    detachQuestionFromQuiz
);

// PUT: Chỉ Admin được cập nhật Quiz
router.put("/:quizId", verifyUser, verifyAdmin, updateQuiz);

// DELETE: Chỉ Admin được xóa Quiz
router.delete("/:quizId", verifyUser, verifyAdmin, deleteQuiz);

module.exports = router;
