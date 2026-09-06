const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    specPattern: 'cypress/api/**/*.cy.js',
    supportFile: 'cypress/support/e2e.js',
    video: false,
    retries: 0
  }
});