const {
  authHeaders,
  resetApi,
  login,
  createOrder,
  getProduct,
  getOrders
} = require('../support/api');

describe('Orders - Business Rules and Security', () => {

  beforeEach(() => {
    resetApi();
  });


  context('Inventory', () => {

    it('creates a valid order and decreases inventory correctly', () => {

      login('customer1').then((token) => {

        // Verify initial stock
        getProduct('p1').then((response) => {

          expect(response.status)
            .to.eq(200);

          expect(response.body.stock)
            .to.eq(10);
        });


        // Create order
        createOrder(token, [
          {
            productId: 'p1',
            quantity: 3
          }
        ]).then((response) => {

          expect(response.status)
            .to.eq(201);

          expect(response.body.ownerId)
            .to.eq('customer1');

          expect(response.body.status)
            .to.eq('pending');

          expect(response.body.total)
            .to.eq(75);

          expect(response.body.id)
            .to.be.a('string')
            .and.not.be.empty;
        });


        // Verify stock was updated
        getProduct('p1').then((response) => {

          expect(response.body.stock)
            .to.eq(7);
        });

      });

    });


    it('rejects an order when stock is insufficient and preserves inventory', () => {

      login('customer1').then((token) => {

        // p3 starts with 3 units
        getProduct('p3').then((response) => {

          expect(response.status)
            .to.eq(200);

          expect(response.body.stock)
            .to.eq(3);
        });


        // Attempt to buy more than available
        createOrder(token, [
          {
            productId: 'p3',
            quantity: 4
          }
        ]).then((response) => {

          expect(response.status)
            .to.eq(400);

          expect(response.body.error)
            .to.eq(
              'insufficient stock for USB-C Hub'
            );
        });


        // Stock must remain unchanged
        getProduct('p3').then((response) => {

          expect(response.body.stock)
            .to.eq(3);
        });


        // Failed order should not exist
        getOrders(token).then((response) => {

          expect(response.status)
            .to.eq(200);

          expect(response.body.data)
            .to.have.length(0);
        });

      });

    });


    it('prevents duplicate product lines from overselling inventory', () => {

      login('customer1').then((token) => {

        /*
         * p3 has 3 units.
         *
         * Each line requests 2.
         * Total requested = 4.
         *
         * The API must consider the combined quantity.
         */

        createOrder(token, [
          {
            productId: 'p3',
            quantity: 2
          },
          {
            productId: 'p3',
            quantity: 2
          }
        ]).then((response) => {

          expect(response.status)
            .to.eq(400);
        });


        getProduct('p3').then((response) => {

          expect(response.status)
            .to.eq(200);

          // Failed order should not affect inventory
          expect(response.body.stock)
            .to.eq(3);

          // Stock should never become negative
          expect(response.body.stock)
            .to.be.at.least(0);
        });

      });

    });

  });


  context('Authorization and data isolation', () => {

    it('prevents a customer from accessing another customer order', () => {

      login('customer1')

        .then((customer1Token) => {

          return createOrder(
            customer1Token,
            [
              {
                productId: 'p1',
                quantity: 1
              }
            ]
          );

        })

        .then((orderResponse) => {

          expect(orderResponse.status)
            .to.eq(201);

          const orderId =
            orderResponse.body.id;


          // Login as a different customer
          return login('customer2')
            .then((customer2Token) => {

              return cy.request({

                method: 'GET',

                url: `/api/orders/${orderId}`,

                headers:
                  authHeaders(customer2Token),

                failOnStatusCode: false
              });

            });

        })

        .then((response) => {

          // Either is acceptable because
          // the resource belongs to another user.
          expect([403, 404])
            .to.include(response.status);

        });

    });


    it('returns pagination metadata only for orders visible to the customer', () => {

      let customer1Token;


      // Create customer1 order
      login('customer1')

        .then((token) => {

          customer1Token = token;

          return createOrder(
            token,
            [
              {
                productId: 'p1',
                quantity: 1
              }
            ]
          );

        })

        .then((response) => {

          expect(response.status)
            .to.eq(201);

          return login('customer2');

        })


        // Create customer2 order
        .then((customer2Token) => {

          return createOrder(
            customer2Token,
            [
              {
                productId: 'p2',
                quantity: 1
              }
            ]
          );

        })


        // Retrieve customer1 order list
        .then((response) => {

          expect(response.status)
            .to.eq(201);

          return getOrders(customer1Token);

        })

        .then((response) => {

          expect(response.status)
            .to.eq(200);


          // customer1 should see only their order
          expect(response.body.data)
            .to.have.length(1);


          expect(
            response.body.data[0].ownerId
          ).to.eq('customer1');


          /*
           * totalCount should describe what
           * customer1 is allowed to see,
           * not all orders in the application.
           */
          expect(
            response.body.pagination.totalCount
          ).to.eq(1);

        });

    });

  });


  context('Rate limiting', () => {

    it('rate limits the sixth order creation request within the configured window', () => {

      login('customer1').then((token) => {

        /*
         * Current limit:
         * 5 order creation requests / 10 seconds
         */

        Cypress._.times(5, (index) => {

          createOrder(
            token,
            [
              {
                productId: 'p1',
                quantity: 1
              }
            ]
          ).then((response) => {

            expect(
              response.status,
              `request ${index + 1}`
            ).to.eq(201);

          });

        });


        // Sixth request should be rejected
        createOrder(
          token,
          [
            {
              productId: 'p1',
              quantity: 1
            }
          ]
        ).then((response) => {

          expect(response.status)
            .to.eq(429);

          expect(response.body.error)
            .to.include(
              'rate limit exceeded'
            );

        });

      });

    });

  });

});