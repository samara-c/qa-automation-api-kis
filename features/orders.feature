# Starter file — restructure or replace as you see fit. This is just here
# so you're not starting from a completely blank page. It intentionally
# does NOT cover the whole system.

Feature: Order management API

  Background:
    Given I am authenticated as "customer1"

  Scenario: Placing an order with sufficient stock
    When I place an order for 1 unit of "Wireless Mouse"
    Then the response status should be 201
    And the order status should be "pending"

  # This starter only scaffolds the happy path for order creation.
  # Everything else (auth, roles, other endpoints, edge cases,
  # concurrency, async notifications, pagination, rate limiting) is
  # yours to design and prioritize within the time box.
