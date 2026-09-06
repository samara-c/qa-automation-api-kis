const {
  resetApi,
  login,
  createOrder,
  triggerNotification,
  getNotification,
  waitForNotification
} = require('../support/api');

describe(
  'Notifications - Async Processing and Authorization',
  () => {

    beforeEach(() => {
      resetApi();
    });


    it('processes a notification asynchronously from pending to done', () => {

      login('customer1')

        .then((token) => {

          return createOrder(
            token,
            [
              {
                productId: 'p1',
                quantity: 1
              }
            ]
          ).then((orderResponse) => {

            return {
              token,
              orderResponse
            };

          });

        })


        .then(({ token, orderResponse }) => {

          expect(orderResponse.status)
            .to.eq(201);


          return triggerNotification(
            token,
            orderResponse.body.id
          ).then((notifyResponse) => {

            return {
              token,
              notifyResponse
            };

          });

        })


        .then(({ token, notifyResponse }) => {

          expect(notifyResponse.status)
            .to.eq(202);


          expect(
            notifyResponse.body.jobId
          )
            .to.be.a('string')
            .and.not.be.empty;


          const jobId =
            notifyResponse.body.jobId;


          /*
           * Immediately after creation,
           * the job should still be pending.
           */
          return getNotification(
            token,
            jobId
          ).then((initialResponse) => {

            return {
              token,
              jobId,
              initialResponse
            };

          });

        })


        .then(({
          token,
          jobId,
          initialResponse
        }) => {

          expect(initialResponse.status)
            .to.eq(200);


          expect(
            initialResponse.body.status
          ).to.eq('pending');


          /*
           * Poll until the asynchronous job
           * reaches "done".
           */
          return waitForNotification(
            token,
            jobId
          );

        })


        .then((response) => {

          expect(response.status)
            .to.eq(200);


          expect(response.body.status)
            .to.eq('done');

        });

    });


    it('prevents customers from triggering notifications for another customer order', () => {

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

              return triggerNotification(
                customer2Token,
                orderId
              );

            });

        })


        .then((response) => {

          expect([403, 404])
            .to.include(response.status);


          /*
           * An unauthorized request must not
           * result in a notification job.
           */
          expect(response.body.jobId)
            .not.to.exist;

        });

    });

  }
);