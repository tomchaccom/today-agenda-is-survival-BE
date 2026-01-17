const swaggerJsdoc = require('swagger-jsdoc');

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Today Agenda Is Survival API',
      version: '1.0.0',
      description: 'API Specification',
    },
    servers: [
      {
        url: 'http://localhost:4000',
      },
    ],
  },
  apis: ['src/**/*.controller.ts'],
});

module.exports = { swaggerSpec };
