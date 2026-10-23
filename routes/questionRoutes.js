
const express = require("express");

const {
    getQuestions,
    getQuestionById,
    createQuestion,
    updateQuestion,
    deleteQuestion
} = require("../controllers/questionController");

const {
    attachOptionalUser,
    verifyUser,
    verifyAdmin
} = require("../middleware/authenticate");

const router = express.Router();

// GET: Mọi người đều có thể xem danh sách câu hỏi
router.get("/", attachOptionalUser, getQuestions);

// GET: Mọi người đều có thể xem chi tiết câu hỏi
router.get("/:questionId", attachOptionalUser, getQuestionById);

// POST: Phải đăng nhập mới được tạo câu hỏi
router.post("/", verifyUser, verifyAdmin, createQuestion);

// PUT: Phải đăng nhập và là tác giả của câu hỏi
router.put("/:questionId", verifyUser, verifyAdmin, updateQuestion);

// DELETE: Phải đăng nhập và là tác giả của câu hỏi
router.delete("/:questionId", verifyUser, verifyAdmin, deleteQuestion);

module.exports = router;
