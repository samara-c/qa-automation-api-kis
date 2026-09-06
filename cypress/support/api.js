const USERS = {
  admin: {
    username: 'admin',
    password: 'admin123'
  },
  customer1: {
    username: 'customer1',
    password: 'cust123'
  },
  customer2: {
    username: 'customer2',
    password: 'cust123'
  }
};

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`
  };
}

function resetApi() {
  return cy.request({
    method: 'POST',
    url: '/api/__reset'
  }).then((response) => {
    expect(response.status).to.eq(200);

    return response;
  });
}

function login(user) {
  return cy.request({
    method: 'POST',
    url: '/api/login',
    body: USERS[user]
  }).then((response) => {
    expect(response.status).to.eq(200);
    expect(response.body.token).to.exist;

    return response.body.token;
  });
}

function getProduct(productId) {
  return cy.request({
    method: 'GET',
    url: `/api/products/${productId}`,
    failOnStatusCode: false
  });
}

function createOrder(token, items) {
  return cy.request({
    method: 'POST',
    url: '/api/orders',
    headers: authHeaders(token),
    body: {
      items
    },
    failOnStatusCode: false
  });
}

function getOrders(token, query = '') {
  return cy.request({
    method: 'GET',
    url: `/api/orders${query}`,
    headers: authHeaders(token),
    failOnStatusCode: false
  });
}

function getOrder(token, orderId) {
  return cy.request({
    method: 'GET',
    url: `/api/orders/${orderId}`,
    headers: authHeaders(token),
    failOnStatusCode: false
  });
}

function triggerNotification(token, orderId) {
  return cy.request({
    method: 'POST',
    url: `/api/orders/${orderId}/notify`,
    headers: authHeaders(token),
    failOnStatusCode: false
  });
}

function getNotification(token, jobId) {
  return cy.request({
    method: 'GET',
    url: `/api/notifications/${jobId}`,
    headers: authHeaders(token),
    failOnStatusCode: false
  });
}

function waitForNotification(token, jobId, attempts = 12) {
  return getNotification(token, jobId).then((response) => {
    if (response.body.status === 'done') {
      return response;
    }

    if (attempts <= 1) {
      throw new Error(
        `Notification ${jobId} did not reach "done" status`
      );
    }

    return cy.wait(250).then(() => {
      return waitForNotification(token, jobId, attempts - 1);
    });
  });
}

module.exports = {
  authHeaders,
  resetApi,
  login,
  getProduct,
  createOrder,
  getOrders,
  getOrder,
  triggerNotification,
  getNotification,
  waitForNotification
};