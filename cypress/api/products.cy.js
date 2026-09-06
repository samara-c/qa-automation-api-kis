const {
  authHeaders,
  resetApi,
  login
} = require('../support/api');

describe('Products - Authorization', () => {

  beforeEach(() => {
    resetApi();
  });

  it('prevents customers from creating products', () => {

    login('customer1').then((token) => {

      cy.request({
        method: 'POST',
        url: '/api/products',

        headers: authHeaders(token),

        body: {
          name: 'Unauthorized Product',
          price: 25,
          stock: 10
        },

        failOnStatusCode: false
      }).then((response) => {

        expect(response.status)
          .to.eq(403);

        expect(response.body.error)
          .to.eq('forbidden: admin only');
      });

      // Verify the forbidden operation had no side effect
      cy.request('/api/products')
        .then((response) => {

          expect(response.status)
            .to.eq(200);

          const productNames =
            response.body.map(
              (product) => product.name
            );

          expect(productNames)
            .not.to.include('Unauthorized Product');
        });
    });
  });

});