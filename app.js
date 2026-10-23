
const express = require("express");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");

const swaggerSpec = require("./config/swagger");
const quizRoutes = require("./routes/quizRoutes");
const questionRoutes = require("./routes/questionRoutes");
const userRoutes = require("./routes/userRoutes"); 

const app = express();

const productionOrigins = [
    "https://sdn-302-assigment4-fe.vercel.app"
];

const defaultOrigins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
];

const configuredOrigins = (process.env.CLIENT_ORIGIN || process.env.CORS_ORIGIN || "")
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean);

const allowedOrigins = [...new Set([
    ...defaultOrigins,
    ...productionOrigins,
    ...configuredOrigins
])];

const isAllowedVercelPreviewOrigin = origin => {
    try {
        const { protocol, hostname } = new URL(origin);

        if (protocol !== "https:") {
            return false;
        }

        return /^sdn-302-assigment4(?:-[a-z0-9-]+)?-thaovitruongs-projects\.vercel\.app$/i.test(
            hostname
        );
    } catch {
        return false;
    }
};

const corsOptions = {
    origin(origin, callback) {
        if (
            !origin ||
            allowedOrigins.includes(origin) ||
            isAllowedVercelPreviewOrigin(origin)
        ) {
            return callback(null, true);
        }

        return callback(new Error("Origin is not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
};

// Middleware
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(express.json());

// Routes
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get("/api-docs.json", (req, res) => {
    res.json(swaggerSpec);
});
app.use("/users", userRoutes); 
app.use("/quizzes", quizRoutes);
app.use("/questions", questionRoutes);

// Home page
app.get("/", (req, res) => {
    res.json({
        message: "Assignment 4 quiz API is running"
    });
});

// Return JSON for unknown API routes instead of Express HTML.
app.use((req, res) => {
    res.status(404).json({
        message: "Route not found"
    });
});

app.use((error, req, res, next) => {
    const statusCode = error.status || error.statusCode || 500;

    if (statusCode >= 500) {
        console.error(error);
    }

    if (res.headersSent) {
        return next(error);
    }

    res.status(statusCode).json({
        message: error.message || "Internal server error"
    });
});

module.exports = app;
