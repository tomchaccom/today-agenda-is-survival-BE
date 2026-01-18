import swaggerJsdoc from "swagger-jsdoc";

export const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.3",
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

    security: [{ bearerAuth: [] }],

    servers: [
      {
        url: "http://localhost:4000",
        description: "Local server",
      },
    ],
  },

  // 🔥 핵심: controller + router 둘 다 포함
  apis: [
    "dist/**/*.controller.js",
    "dist/**/*.router.js",
  ],
});
