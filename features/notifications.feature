Feature: Order notification API

  Background:
    Given the API is in a clean state

# targets missing ownership validation in POST /api/orders/:id/notify
 Scenario: Customer cannot create a notification for another customer's order
    Given "customer1" has an existing order
    And I am authenticated as "customer2"
    When I request a notification for customer1's order
    Then the response status should be 403 or 404
    And no notification job should be created   

# targets the incorrect use of fixed sleep instead of polling
Scenario: Notification job completes asynchronously
    Given I am authenticated as "customer1"
    And I have an existing order
    When I request a notification for the order
    Then the response status should be 202
    And a job ID should be returned
    And the notification status should initially be "pending"
    And the notification should eventually reach status "done"

# targets notification data isolation
Scenario: Customer cannot access another customer's notification job
    Given "customer1" has created a notification job
    And the notification job ID is saved
    When I authenticate as "customer2"
    And I request the saved notification job
    Then the response status should be 403 or 404
    And customer1's notification data should not be exposed