Feature: Product management API

  Background:
    Given the API is in a clean state

  Scenario: Admin creates a valid product
    Given I am authenticated as "admin"
    When I create a product with:
      | name        | price | stock |
      | Test Mouse  | 25.00 | 10    |
    Then the response status should be 201
    And the product should be created successfully

  Scenario: Customer cannot create products
    Given I am authenticated as "customer1"
    When I create a product with:
      | name        | price | stock |
      | Test Mouse  | 25.00 | 10    |
    Then the response status should be 403

  Scenario: Customer cannot update products
    Given I am authenticated as "customer1"
    And an existing product is available
    When I attempt to update the product price to 30.00
    Then the response status should be 403

# Data integrity validation
  Scenario: Product creation rejects invalid inventory values
    Given I am authenticated as "admin"
    When I create a product with:
      | name         | price  | stock |
      | Invalid Item | -10.00 | -5    |
    Then the response status should be 400
    And the product should not be created

  Scenario: Product update rejects invalid inventory values
    Given I am authenticated as "admin"
    And an existing product is available
    When I update the product with:
      | price   | stock |
      | invalid | -999  |
    Then the response status should be 400
    And the product should remain unchanged