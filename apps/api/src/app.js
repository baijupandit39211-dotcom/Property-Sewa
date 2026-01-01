//apps/api/src/utils/app.js
const express = require("express");
const cookieParser = require("cookie-parser");
const swaggerUi = require("swagger-ui-express");
const cors = require("cors");

const swaggerSpec = require("./swagger");
const userRoutes = require("./modules/users/user.routes");
const authRoutes = require("./modules/auth/auth.routes");

const app = express();

// ======================
// Global Middleware
// ======================
app.use(express.json());
app.use(cookieParser());

// ======================
// CORS (for Next.js on 3000/3001)
// ======================
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  process.env.CORS_ORIGIN,
].filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(null, false);
    },
    credentials: true,
  }),
);

// ======================
// Swagger Docs
// ======================
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ======================
// Routes
// ======================
app.use("/users", userRoutes);
app.use("/auth", authRoutes);

// ======================
// Default Route
// ======================
app.get("/", (req, res) => {
  res.send("API is running");
});

module.exports = app;
