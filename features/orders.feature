Feature: Order management API

  Background:
    Given the API is in a clean state

  Scenario: Placing an order with sufficient stock
    Given I am authenticated as "customer1"
    And "Wireless Mouse" has sufficient stock
    When I place an order for 1 unit of "Wireless Mouse"
    Then the response status should be 201
    And the order status should be "pending"

  Scenario: Creating an order decreases product stock
    Given I am authenticated as "customer1"
    And "Wireless Mouse" has 10 units in stock
    When I place an order for 3 units of "Wireless Mouse"
    Then the response status should be 201
    And "Wireless Mouse" should have 7 units in stock

  Scenario: Order is rejected when stock is insufficient
    Given I am authenticated as "customer1"
    And "Wireless Mouse" has 3 units in stock
    When I place an order for 4 units of "Wireless Mouse"
    Then the response status should be 400
    And the order should not be created
    And "Wireless Mouse" should still have 3 units in stock

    # critical inventory identified in code analysis is covered by the test below - expected to fail
  Scenario: Duplicate product lines must not oversell inventory
    Given I am authenticated as "customer1"
    And "Wireless Mouse" has 3 units in stock
    When I place an order containing:
      | product        | quantity |
      | Wireless Mouse | 2        |
      | Wireless Mouse | 2        |
    Then the response status should be 400
    And the order should not be created
    And the product stock should never become negative

    # the tests below target the existing totalCount problem
    # pagination
  Scenario: Order pagination count only includes the authenticated customer's orders
    Given "customer1" has 2 orders
    And "customer2" has 3 orders
    And I am authenticated as "customer1"
    When I request the order list
    Then the response status should be 200
    And only customer1's orders should be returned
    And the total order count should be 2

   # filtering
  Scenario: Filtered order count reflects only matching customer orders
    Given I am authenticated as "customer1"
    And I have orders with different statuses
    When I request orders filtered by status "pending"
    Then only pending orders should be returned
    And the total count should equal the number of matching pending orders

  # rate limiting
   Scenario: Rate limiting is isolated between customers
    Given I am authenticated as "customer1"
    And I submit 5 order requests within the rate limit window
    When I authenticate as "customer2"
    And I submit my first valid order request
    Then the response status should not be 429

   # important because current implementation counts requests before business validation  
      Scenario: Invalid order attempts do not consume the full valid order quota
    Given I am authenticated as "customer1"
    And I submit multiple invalid order requests
    When I submit a valid order request within the rate limit window
    Then the valid order request should not be rejected solely because of the invalid attempts

    # requirement should be confirmed with product/business
  Scenario: Cancelling an order restores reserved inventory
    Given I am authenticated as "customer1"
    And "Wireless Mouse" has 10 units in stock
    And I place an order for 3 units of "Wireless Mouse"
    And the product stock becomes 7
    When I cancel the order
    Then the response status should be successful
    And "Wireless Mouse" should have 10 units in stock

    # status authorization
  Scenario: Customer cannot update order status
    Given I am authenticated as "customer1"
    And I have an existing order
    When I attempt to change the order status to "shipped"
    Then the response status should be 403

  Scenario: Admin can update a valid order status
    Given an existing customer order exists
    And I am authenticated as "admin"
    When I change the order status to "shipped"
    Then the response status should be 200
    And the order status should be "shipped"
