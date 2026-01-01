// apps/api/src/swagger.js
const swaggerJSDoc = require("swagger-jsdoc");

const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "Property Sewa API Documentation",
    version: "1.0.0",
    description: "Express API docs (cookie-based auth)",
  },
  servers: [
    {
      url: process.env.SWAGGER_SERVER_URL || "http://localhost:5000",
      description: "Server",
    },
  ],
  components: {
    securitySchemes: {
      cookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: process.env.COOKIE_NAME || "accessToken",
      },
    },
  },
};

const options = {
  swaggerDefinition,
  apis: ["./src/**/*.js"], // ✅ reads all your JSDoc openapi blocks
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;
