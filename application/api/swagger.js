// land-registry/application/api/swagger.js
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Land Registry API',
      version: '1.0.0',
      description: 'API pour la gestion des titres fonciers sur Hyperledger Fabric',
      contact: {
        name: 'Support API',
        email: 'support@landregistry.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Serveur local'
      }
    ],
    components: {
      securitySchemes: {
        userId: {
          type: 'apiKey',
          in: 'header',
          name: 'user-id',
          description: 'ID de l\'utilisateur pour l\'authentification'
        }
      }
    },
    security: [
      {
        userId: []
      }
    ]
  },
  apis: ['./api/routes/*.js', './api/server.js'], // Chemins des fichiers à scanner
};

const specs = swaggerJsdoc(options);

module.exports = {
  serve: swaggerUi.serve,
  setup: swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Land Registry API Documentation'
  })
};