
const path = require("path");
const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "SDN302 Assignment 4 API",
      version: "1.0.0",
      description: "API documentation for the backend",
    },
    servers: [
      {
        url: "https://sdn302-assigment4-be.onrender.com",
        description: "Production server",
      },
      {
        url: "http://localhost:3000",
        description: "Local server",
      },
    ],
  },
  apis: [
    path.join(__dirname, "../routes/*.js"),
    path.join(__dirname, "../src/routes/*.js"),
  ],
};

module.exports = swaggerJsdoc(options);
