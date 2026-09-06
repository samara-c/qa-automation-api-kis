# QA Automation API - Submission

## Overview

I approached this exercise as a risk-based API testing task rather than trying to automate every endpoint equally.

Before writing the automated tests, I first explored and validated the available API endpoints manually using **Postman**. This helped me understand the request/response behavior, authentication model, roles, payloads, and the main business flows before deciding what was worth automating.

The API exposes authentication/role behavior, order and inventory rules, pagination, rate limiting, and asynchronous notifications, so I prioritized scenarios where a defect could cause data exposure, overselling, incorrect customer data, or failed order processing.

**Active time spent:** approximately **2 hours**, excluding repository setup, pauses, and breaks, in line with the requested time box.

## Technology Used

- **JavaScript / Node.js**
- **Postman** for initial manual API exploration and endpoint validation
- **Cypress 16.0.0** for executable API automation
- **Gherkin `.feature` files** for BDD-style test design/documentation
- **Express 4.19.2** application under test
- **ChatGPT — GPT-5.6 Sol** as the AI assistant used during the exercise

The Gherkin files describe the intended business scenarios, while the Cypress specs execute the selected high-risk scenarios directly with `cy.request()`.

I intentionally did not add a Cucumber-to-Cypress execution layer because it would add framework setup and duplication without increasing risk coverage within the time box.

---

## Test Strategy and Prioritization

I prioritized four main risk categories.

### 1. Order Authorization and Customer Isolation — Critical

Orders contain customer-specific data. A broken object-level authorization rule could allow one customer to access another customer's order.

Business/user impact:

- Exposure of another customer's order details
- Privacy/security incident
- Loss of trust
- Possible compliance impact

### 2. Inventory and Order Business Rules — Critical

Inventory integrity is a core responsibility of an order-management system.

Incorrect validation can result in overselling or inconsistent stock.

Business/user impact:

- Selling unavailable inventory
- Fulfillment failures
- Customer cancellations/refunds
- Incorrect inventory reporting

### 3. Notifications and Asynchronous Processing — High

The asynchronous notification flow needs to return a job immediately and eventually reach a completed state.

The automation should validate the actual state transition rather than relying on a fixed wait.

Business/user impact:

- Notifications never being delivered
- Incorrect job state
- Unauthorized triggering of notifications

### 4. Pagination, RBAC, and Rate Limiting — High

I covered representative cases for role restrictions, pagination/customer isolation, and rapid order creation.

Business/user impact:

- Leakage of cross-customer metadata
- Unauthorized catalog modification
- API instability or abuse under rapid requests

---

## Automated Scope

The executable suite contains **10 risk-based tests** across four Cypress spec files.

Current execution result:

- **10 total tests**
- **6 passing**
- **4 failing**

The four failures expose application defects rather than test-infrastructure failures.

---

## Test Mapping: Test Design / Gherkin → Cypress Automation

| # | Area | Previously Mapped / Gherkin Scenario | Cypress Automated Test | Spec |
|---|---|---|---|---|
| 1 | Authentication | Access a protected endpoint without authentication | `rejects access to protected order endpoints without authentication` | `authentication.cy.js` |
| 2 | Products | Customer cannot create products | `prevents customers from creating products` | `products.cy.js` |
| 3 | Orders | Placing an order with sufficient stock / stock is decremented | `creates a valid order and decreases inventory correctly` | `orders.cy.js` |
| 4 | Orders | Order is rejected when stock is insufficient | `rejects an order when stock is insufficient and preserves inventory` | `orders.cy.js` |
| 5 | Orders | Duplicate product lines must not oversell inventory | `prevents duplicate product lines from overselling inventory` | `orders.cy.js` |
| 6 | Orders | Customer cannot access another customer's order | `prevents a customer from accessing another customer order` | `orders.cy.js` |
| 7 | Orders | Pagination count only includes the authenticated customer's visible orders | `returns pagination metadata only for orders visible to the customer` | `orders.cy.js` |
| 8 | Orders | Order creation is rate limited after five rapid requests | `rate limits the sixth order creation request within the configured window` | `orders.cy.js` |
| 9 | Notifications | Notification job completes asynchronously | `processes a notification asynchronously from pending to done` | `notifications.cy.js` |
| 10 | Notifications | Customer cannot create a notification for another customer's order | `prevents customers from triggering notifications for another customer order` | `notifications.cy.js` |

---

# Findings

## Critical — Duplicate Product Lines Can Oversell Inventory

**Automated test:**  
`prevents duplicate product lines from overselling inventory`

Setup:

- `USB-C Hub` stock = 3
- The order contains the same product twice
- Each order line requests quantity 2
- Combined requested quantity = 4

Expected:

- Request rejected with `400`
- No order created
- Stock remains 3
- Inventory never becomes negative

Actual:

- Each line is validated independently against the original stock
- The request is accepted
- The combined quantity exceeds available stock
- Inventory can become `-1`

Impact:

- Overselling
- Invalid inventory
- Fulfillment failures
- Incorrect stock information

Priority: **Critical**

---

## Critical — Broken Object-Level Authorization on Order Retrieval

**Automated test:**  
`prevents a customer from accessing another customer order`

Expected:

- `customer2` receives `403` or `404` when requesting an order owned by `customer1`

Actual:

- The API returns the order
- `GET /api/orders/:id` checks authentication but does not validate ownership

Impact:

- Cross-customer data exposure
- Security/privacy risk
- Broken object-level authorization

Priority: **Critical**

---

## High — Pagination Metadata Exposes Global Order Count

**Automated test:**  
`returns pagination metadata only for orders visible to the customer`

Expected:

- A customer sees only their own orders
- `pagination.totalCount` reflects the same customer-visible dataset

Actual:

- Returned `data` is correctly restricted by customer
- `totalCount` is calculated using all orders in the application

Impact:

- Incorrect pagination behavior
- Cross-customer information leakage

Priority: **High**

---

## Critical — Customer Can Trigger Notifications for Another Customer's Order

**Automated test:**  
`prevents customers from triggering notifications for another customer order`

Expected:

- `403` or `404`
- No notification job created

Actual:

- Any authenticated user can trigger a notification when the order ID exists

Impact:

- Broken object-level authorization
- Unauthorized actions against another customer's order
- Potential notification abuse

Priority: **Critical**

---

# Behaviors Confirmed by Passing Automation

The following prioritized behaviors passed in the current run:

- Protected order endpoints reject unauthenticated access
- Customers cannot create admin-only products
- A valid order is created with `pending` status
- Successful order creation decrements inventory correctly
- Insufficient-stock orders are rejected without modifying inventory
- The sixth rapid order-creation request is rate limited
- Notification jobs transition asynchronously from `pending` to `done`

For the asynchronous notification test, I used bounded polling rather than a fixed multi-second sleep.

This makes the test wait for the actual business condition while still failing within a defined timeout.

---

# Additional Findings / Design Concerns Not Fully Automated

Because of the time box, I documented several additional risks rather than expanding the suite with many lower-value cases.

## Product Validation

Product creation checks basic types but does not reject negative price or stock values.

Product update performs even less validation and can accept invalid types or negative values.

Potential impact:

- Corrupted product/catalog data
- Invalid downstream order totals
- Invalid inventory

---

## Cancellation and Inventory

Cancelling an order changes its status to `cancelled`, but does not restore stock.

I did **not** classify this as a confirmed defect because the specification does not explicitly define whether cancellation should return inventory.

I would clarify the intended inventory semantics with Product before enforcing this expectation.

---

## Order Status Lifecycle

The API validates that a status belongs to the allowed list, but it does not enforce a transition model.

Potential examples:

- `delivered → pending`
- `cancelled → shipped`
- `pending → delivered`

This is a business-rule concern requiring clarification rather than a confirmed defect from the provided specification.

---

## Notification Job Access

`GET /api/notifications/:jobId` requires authentication but does not associate the notification job with an owner.

I would add a test confirming that one customer cannot retrieve another customer's notification job.

---

## Global Rate Limiter

The rate limiter is global rather than customer-scoped.

This means one user's traffic can consume the shared quota.

Requests are also added to the rate-limit log before role/body validation.

I automated the explicit boundary behavior:

`6th rapid request → 429`

I would clarify whether the global behavior is intentional before defining per-user isolation as a hard requirement.

---

## Authentication Parser

The authorization middleware extracts the token by replacing the `Bearer ` text rather than strictly validating the authentication scheme.

This is lower priority than the object-authorization and inventory risks.

---

# What I Skimmed or Skipped

## Skimmed

- Product create/update validation
- Order status transitions
- Cancellation semantics
- Notification-job ownership
- Pagination/filter edge cases beyond the customer-isolation case

## Intentionally Skipped Within the Time Box

- Exhaustive invalid-payload permutations
- Full CRUD coverage for every endpoint
- All status-transition combinations
- True concurrent order requests / race-condition testing
- Load/performance testing
- Token expiration/logout behavior
- Comprehensive pagination boundary testing
- Contract/schema validation for every response

I preferred ten high-value tests over a larger suite of shallow CRUD checks.

---

# Cypress vs. Playwright Decision

I evaluated both Cypress and Playwright for the executable API suite.

| Consideration | Cypress | Playwright |
|---|---|---|
| API request syntax | Very direct with `cy.request()` | Strong API support with request contexts |
| Setup for this exercise | Minimal | Also lightweight |
| Readability for a small API suite | Very straightforward | Very good |
| Async polling | Simple helper/polling implementation | `expect.poll()` is particularly elegant |
| UI + API expansion | Good | Excellent |
| Browser context isolation | Good | Stronger built-in model |
| Parallel execution | Available | Particularly strong |
| Fit for this API-only 2-hour exercise | **Selected** | Considered but not selected |

I selected **Cypress** because the challenge is API-focused and `cy.request()` keeps the implementation concise.

It allowed me to spend more of the time box on:

- Test strategy
- Risk analysis
- Defect discovery
- Business-rule validation

rather than framework plumbing.

This is not a general conclusion that Cypress is better than Playwright.

For a broader UI + API framework, complex browser isolation, or heavier parallel execution, Playwright would also be a strong choice.

---

# Why Gherkin + Cypress Without Executable Cucumber Steps

The repository includes Gherkin feature files because the exercise mentions BDD/Cucumber and because the scenarios are useful as a readable test-design layer.

I kept execution separate:

- `features/*.feature` → business-readable scenarios and test design
- `cypress/api/*.cy.js` → executable API automation
- `cypress/support/api.js` → reusable API request helpers

I chose not to wire `.feature` files into Cypress using a Cucumber preprocessor.

Within a two-hour exercise, that additional integration would increase setup and maintenance cost without improving the selected risk coverage.

---

# What I Would Do Next

## With Another 2 Hours

I would:

1. Add authorization coverage for `GET /api/notifications/:jobId`
2. Automate negative/invalid product price and stock validation
3. Add filtered pagination assertions for `?status=`
4. Add customer-vs-admin status-update authorization coverage
5. Verify cancellation behavior after clarifying expected stock restoration

---

## With Another 4 Hours

In addition to the above:

1. Add a true concurrent-order scenario against limited stock
2. Expand rate-limit tests
3. Add order-status transition coverage
4. Add boundary tests for quantities and pagination parameters
5. Add response-schema / contract assertions
6. Improve reporting for known defects and CI-friendly output

---

## With Another 8 Hours

I would evolve the suite toward a maintainable regression framework:

1. Add CI execution
2. Add parallel-safe test-data/state management
3. Add API contract/schema validation
4. Add broader security-negative coverage
5. Add performance/load checks
6. Add data-driven test matrices
7. Add reporting/artifacts suitable for CI
8. Reassess whether executable Cucumber integration adds enough value for the team's workflow

---

# AI Usage

I used **ChatGPT (GPT-5.6 Sol)** throughout the exercise as an accelerator, as encouraged by the challenge.

## What I Used AI For

- Reviewing the API implementation
- Identifying high-risk areas
- Brainstorming authorization, inventory, pagination, rate-limit, and async edge cases
- Prioritizing scenarios under the time constraint
- Drafting and refining Gherkin scenarios
- Comparing Cypress and Playwright
- Scaffolding the Cypress API test structure
- Improving test readability
- Helping distinguish confirmed defects from behavior requiring product clarification
- Reviewing the final test strategy and documentation structure

---

## What I Kept

I retained the ideas that survived validation against the actual implementation, including:

- Broken object-level authorization tests
- Duplicate-product inventory/overselling scenario
- Pagination/customer-isolation scenario
- Async notification polling
- The 10-test risk-based scope
- Cypress helper-based API structure
- Separation between Gherkin test design and Cypress execution

---

## What I Changed, Discarded, or Challenged

I did not accept AI output blindly.

Examples:

### Protected endpoint selection

An early suggestion used:

`GET /api/products`

as a protected endpoint.

After checking the implementation, I confirmed product GET endpoints are public.

I changed the test to:

`GET /api/orders`

which is actually protected.

### Cancellation stock restoration

I considered testing cancellation as automatically restoring stock.

However, the specification does not explicitly define that rule.

I moved it to a business/design question instead of treating it as a confirmed defect.

### Rate-limit isolation

I initially considered a cross-customer rate-limit test as a required expectation.

Because the implementation explicitly describes the limiter as global and the specification does not define the intended scope, I kept the clear boundary test:

`6th rapid request → 429`

and documented global sharing as a concern requiring clarification.

### Cypress vs. Playwright

I compared both frameworks rather than using the first framework suggestion.

Cypress was selected because it was the simpler fit for this API-only, time-boxed exercise.

### Cucumber Integration

I kept Gherkin for test design but did not add a Cucumber/Cypress preprocessor because it would introduce unnecessary integration overhead for the available time.

---

## How I Validated AI Output

I validated suggestions by:

- Reading the actual `server.js`
- Running the API locally
- Testing endpoints manually using **Postman**
- Comparing expected and actual API responses
- Running the Cypress automation suite
- Verifying state changes such as inventory updates
- Keeping failing tests when they represented genuine application defects

The final test run of:

- **6 passing**
- **4 failing**

was useful confirmation that the framework and core flows were working while the risk-focused tests exposed application issues.

---

# Running the Tests

Install dependencies:

```bash
npm install

```

The application should run at:

http://localhost:3000

In a second terminal, run the Cypress suite:

```bash
npx cypress run
````

# Final Notes

The goal of this submission was not to maximize endpoint coverage, but to focus on the areas with the highest business and security impact within the available time box.

I prioritized:

- Authorization and customer data isolation
- Inventory integrity and order business rules
- Asynchronous notification behavior
- Pagination correctness
- Rate limiting
- Role-based access control

The most important issues identified were:

1. **Cross-customer order access**
   - A customer can retrieve another customer's order when the order ID is known.
   - This represents a broken object-level authorization risk.

2. **Inventory overselling through duplicate product lines**
   - The same product can appear multiple times in an order and each line is validated independently.
   - This can result in inventory becoming negative.

3. **Cross-customer notification authorization**
   - A customer can trigger a notification for an order owned by another customer.

4. **Pagination metadata leakage**
   - Order data is filtered by customer, but `totalCount` reflects orders outside the authenticated customer's visible dataset.

The final automated suite contains **10 prioritized Cypress API tests**, with the current execution result:

- **6 passing**
- **4 failing**

The failing tests were intentionally kept because they expose application defects rather than automation issues.

Before implementing the automated suite, I manually explored and validated the available endpoints using **Postman**. This helped confirm the API behavior and informed the final automation priorities.

Gherkin feature files were kept as a readable BDD/test-design layer, while Cypress was used as the executable automation framework.

I chose **Cypress** over Playwright for this exercise because `cy.request()` provided a simple and readable approach for an API-only, time-boxed challenge. Playwright was also considered and would be a strong option for a broader UI + API framework.

AI was used as an accelerator for analysis, prioritization, test design, framework comparison, and implementation support. Suggestions were validated against the actual source code and API behavior before being included.

Given additional time, I would next expand coverage around:

- Notification job ownership
- Product input validation
- Status transition rules
- Cancellation and stock restoration semantics
- Cross-user rate-limit behavior
- Concurrent order creation
- API schema/contract validation
- CI execution and reporting

Overall, I intentionally favored a smaller set of high-value tests over broad CRUD coverage, with the objective of demonstrating risk-based QA thinking, defect discovery, and maintainable API automation.