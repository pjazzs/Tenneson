const swaggerJsDoc = require("swagger-jsdoc");



const options = {
  definition: {
    openapi: "3.0.0",

    info: {
      title: "Student ID Generation API",
      version: "1.0.0",
      description:
        "API for generating and managing unique student IDs for the school portal.",
    },

    servers: [
      {
        url: "https://tenneson.onrender.com",
      },
    ],

    tags: [
  {
    name: "Students",
    description: "Student management endpoints",
  },
  {
    name: "Authentication",
    description: "Admin authentication endpoints",
  },
  {
    name: "Activity Logs",
    description: "Admin action tracking endpoints",
  },
],

    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },

      schemas: {
        Student: {
          type: "object",
          properties: {
            studentId: {
              type: "string",
              example: "TCC00023",
            },
            firstName: {
              type: "string",
              example: "John",
            },
            lastName: {
              type: "string",
              example: "Doe",
            },
            gender: {
              type: "string",
              example: "Male",
            },
            currentClass: {
              type: "string",
              example: "JSS1",
            },
            session: {
              type: "string",
              example: "2026/2027",
            },
          },
        },
      },
    },

    security: [
      {
        bearerAuth: [],
      },
    ],
  },

  apis: ["./routes/*.js"],
};

module.exports = swaggerJsDoc(options);