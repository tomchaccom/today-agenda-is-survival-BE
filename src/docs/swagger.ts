import swaggerJsdoc from "swagger-jsdoc";

const swaggerSpec = swaggerJsdoc({
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
        // 🔥 배포 기준 (HTTPS + 도메인)
        url: "https://qltkek.shop",
      },
    ],
  },

  // ⚠️ 중요: 배포 기준은 dist
  apis: ["dist/**/*.controller.js"],
});

export default swaggerSpec;
