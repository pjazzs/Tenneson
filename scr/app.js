const swaggerUI = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");
const express = require("express");
const dotenv = require("dotenv").config();
require("./config/env");
const mongoose = require("mongoose");
const cors = require("cors");
const readdirSync = require("fs").readdirSync;
const { errorHandler } = require("./middleware/errorHandler");
const { apiLimiter } = require("./middleware/rateLimiter");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://tenneson.vercel.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(helmet());
app.use(compression());
app.use(morgan("dev"));

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API is healthy",
    timestamp: new Date()
  });
});

app.use("/api/v1", apiLimiter);


readdirSync("routes").map((r) => {
  app.use("/api/v1", require(`./routes/${r}`));
});

app.get("/", (req, res) => {
  res.json({
    message: "TCC Student ID API is running well!!!",
  });
});

app.use(errorHandler);

app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(swaggerSpec));

module.exports = app;
