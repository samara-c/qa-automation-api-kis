const {
  resetApi
} = require('../support/api');

describe('Authentication', () => {

  beforeEach(() => {
    resetApi();
  });

  it('rejects access to protected order endpoints without authentication', () => {

    cy.request({
      method: 'GET',
      url: '/api/orders',
      failOnStatusCode: false
    }).then((response) => {

      expect(response.status).to.eq(401);

      expect(response.body.error)
        .to.eq('unauthorized');
    });
  });

});