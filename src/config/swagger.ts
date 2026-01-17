import swaggerJsdoc from "swagger-jsdoc";

export const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Today Agenda Is Survival API",
      version: "1.0.0",
      description: "API Specification",
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    servers: [
      {
        url: "https://qltkek.shop",
      },
    ],
  },

  // ⚠️ 빌드 후 기준 (dist)
  apis: ["dist/**/*.controller.js"],
});
