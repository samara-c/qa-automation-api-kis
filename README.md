# QA Automation Take-Home Exercise (2-hour version)

## Time box: 2 hours

This is deliberately more than what most people can fully cover in 2 hours.
**That's intentional.** We are not expecting a complete, polished test suite.
We want to see how you prioritize under a real constraint, what you decide
is worth your time, and what you'd explicitly leave out.

Please **timebox yourself to 2 hours** of active work. If you don't finish,
that's fine and expected — submit what you have, plus the write-up described
below (the write-up is not optional, even if your code isn't complete).

## Using AI

**You're expected to use AI tools** (Claude, ChatGPT, Copilot, etc.) as part
of this exercise — that's how we work, and how the client we support is
moving. Use them to scaffold code, generate test data, explore edge cases,
debug, whatever speeds you up. We just want transparency on how you used
them (see the write-up below). Using AI well is a positive signal here, not
a shortcut we're trying to catch you taking.

## What this is

A mock "Order Management" REST API (`server.js`) with:
- Authentication with two roles: `admin` and `customer`
- Product catalog (list/create/update)
- Order creation, listing (with pagination and filtering), status updates,
  and cancellation
- An asynchronous notification flow (a job that becomes "done" a couple of
  seconds after you trigger it)

## Setup

```bash
npm install
npm start
```

API runs at `http://localhost:3000`.

Test credentials:
| username | password | role |
|---|---|---|
| admin | admin123 | admin |
| customer1 | cust123 | customer |
| customer2 | cust123 | customer |

`POST /api/__reset` resets all data (products, orders, notifications) to
initial state — useful for keeping tests independent.

## Endpoints (explore the behavior yourself — this is intentionally not a
full spec)

- `POST /api/login`
- `GET /api/products`, `GET /api/products/:id`
- `POST /api/products`, `PUT /api/products/:id` (admin only)
- `POST /api/orders`
- `GET /api/orders` (supports `?status=` and `?page=&limit=`)
- `GET /api/orders/:id`
- `PUT /api/orders/:id/status` (admin only)
- `DELETE /api/orders/:id` (cancel)
- `POST /api/orders/:id/notify` → returns a `jobId`
- `GET /api/notifications/:jobId`

## Your task

Within the 2-hour box:

1. **Explore the API** and form a testing strategy. You will not have time
   to cover everything with equal depth — decide what matters most and why.
2. **Write automated tests** for the areas you prioritize. Any
   language/stack you're comfortable with is fine. We use Cucumber/BDD +
   API testing internally, so scenarios in Gherkin are a plus (a sparse
   starter is in `features/orders.feature`), but this is not a hard
   requirement — pick what lets you move fastest and show your thinking
   best.
3. **Look across different kinds of risk**, not just input validation —
   for example: authorization (who can see/do what), business rules around
   orders and stock, behavior under concurrent/rapid requests, and the
   asynchronous notification flow. You won't have time to fully test all
   of these — that's the point.

## Required write-up: `SUBMISSION.md`

This matters as much as your code. Please include:

1. **What you prioritized and why.** What did you test deeply, what did you
   only skim, what did you skip entirely? What would a bug in each area
   actually cost the business/user?
2. **What you found.** Any bugs, inconsistent behavior, or design concerns,
   even ones you didn't have time to write an automated test for — a
   one-line note ("I noticed X, suspect Y, didn't have time to verify") is
   valuable and welcome.
3. **What you'd do next** with another 2, 4, or 8 hours.
4. **How you used AI** during this exercise. Be specific: what did you ask
   for, what did you keep vs. discard/rewrite, where did you double-check
   its output rather than trust it.

## Submission

- Git repo link or zip of your test code
- `SUBMISSION.md`

We'll walk through your approach together afterward — come ready to defend
your prioritization decisions, not just your code.

Good luck!
# qa-automation-api
