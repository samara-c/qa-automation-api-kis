
Feature: Authentication and authorization

  Scenario: Login with valid customer credentials
    When I login as "customer1"
    Then the response status should be 200
    And a valid authentication token should be returned

  Scenario: Login with invalid credentials
    When I login with invalid credentials
    Then the response status should be 401

  Scenario: Access a protected endpoint without authentication
    When I request the product list without authentication
    Then the response status should be 401

  Scenario: Customer cannot perform admin-only operations
    Given I am authenticated as "customer1"
    When I attempt to create a product
    Then the response status should be 403

    