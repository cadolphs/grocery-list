@walking_skeleton @real-io @web-prod-deploy
Feature: Walking skeleton - repo is ready to publish the web app
  As Clemens
  I want firebase hosting config and the deploy workflow committed to the repo
  So that a fresh checkout can deploy to production via CI or a single firebase command

  Background:
    Given the repository root

  # US-01 -- hosting config

  @us-01
  Scenario: firebase.json declares the web build output as the hosting public dir
    When I read firebase.json from the repository root
    Then hosting.public is "web/dist"

  @us-01
  Scenario: firebase.json declares a SPA rewrite for client-side routes
    When I read firebase.json from the repository root
    Then hosting.rewrites contains a rule mapping source "**" to destination "/index.html"

  @us-01
  Scenario: .firebaserc maps the default project to grocery-list-cad
    When I read .firebaserc from the repository root
    Then projects.default is "grocery-list-cad"

  # US-02 -- deploy workflow

  @us-02
  Scenario: the deploy workflow chains off the CI workflow
    When I read .github/workflows/deploy-web.yml
    Then it declares on.workflow_run.workflows containing "CI"

  @us-02
  Scenario: the deploy workflow only runs after CI succeeds on main
    When I read .github/workflows/deploy-web.yml
    Then on.workflow_run.branches contains "main"
    And the deploy job runs only when workflow_run.conclusion is "success"

  @us-02
  Scenario: the deploy workflow pins checkout to the CI-validated commit
    When I read .github/workflows/deploy-web.yml
    Then the checkout step uses the workflow_run.head_sha as ref

  @us-02 @us-03
  Scenario: the deploy step authenticates via the FIREBASE_SERVICE_ACCOUNT secret
    When I read .github/workflows/deploy-web.yml
    Then the deploy step references secrets.FIREBASE_SERVICE_ACCOUNT
    And the deploy step targets project "grocery-list-cad"
    And the deploy step targets channel "live"

  @us-02
  Scenario: the deploy workflow builds the web bundle before deploying
    When I read .github/workflows/deploy-web.yml
    Then one step runs "npm ci" with working-directory "web"
    And one step runs "npm run build" with working-directory "web"
    And these steps appear before the Firebase Hosting deploy step

  @us-02
  Scenario: in-flight deploys are not cancelled on rapid pushes
    When I read .github/workflows/deploy-web.yml
    Then concurrency.group is "deploy-web"
    And concurrency.cancel-in-progress is false

  @us-02
  Scenario: the existing CI workflow is untouched
    When I read .github/workflows/ci.yml
    Then its jobs list is exactly ["commit-stage"]
    And it declares triggers on push to main and pull_request to main
