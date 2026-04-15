@real-io @web-prod-deploy
Feature: Deploy runbook is discoverable and complete
  As Clemens (future-me)
  I want a single page that says where prod is, how it deploys, and how to roll back
  So that I can operate the deploy after a long gap without reverse-engineering the workflow

  # US-04 -- deploy docs

  @us-04
  Scenario: docs/deploy.md declares the production URL
    When I read docs/deploy.md
    Then it mentions "https://grocery-list-cad.web.app"

  @us-04
  Scenario: docs/deploy.md declares the deploy trigger
    When I read docs/deploy.md
    Then it mentions "push to main"
    And it references "deploy-web.yml"

  @us-04
  Scenario: docs/deploy.md declares the rollback command
    When I read docs/deploy.md
    Then it mentions "firebase hosting:rollback"

  @us-04
  Scenario: docs/deploy.md declares the manual fallback command
    When I read docs/deploy.md
    Then it mentions "firebase deploy --only hosting"
    And it mentions "npm run build"

  @us-04 @us-03
  Scenario: docs/deploy.md documents the service-account rotation procedure
    When I read docs/deploy.md
    Then it mentions "FIREBASE_SERVICE_ACCOUNT"
    And it describes how to revoke and replace the service account key

  @us-04
  Scenario: README links to deploy docs
    When I read README.md
    Then it contains a "Deployment" section heading
    And it contains a link to docs/deploy.md
