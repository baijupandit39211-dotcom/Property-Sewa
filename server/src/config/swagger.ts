import swaggerJSDoc from "swagger-jsdoc";

const PORT = Number(process.env.PORT) || 5000;

export const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Property Sewa API",
      version: "1.0.0",
      description: "API documentation for Property Sewa",
    },
    servers: [{ url: `http://localhost:${PORT}`, description: "Local server" }],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: process.env.COOKIE_NAME || "accessToken",
        },
      },
    },
    security: [{ cookieAuth: [] }],
  },
  apis: ["./src/modules/**/routes/*.ts"],
});
