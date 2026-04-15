Feature: Publish web build to production
  As Clemens
  I want a push to main to result in a live production build
  So that I can use the latest version on any device without manual deploy

  Background:
    Given firebase.json exists at repo root with public "web/dist"
    And .firebaserc maps default project to "grocery-list-cad"
    And the GitHub repo has secret "FIREBASE_SERVICE_ACCOUNT" set
    And the workflow .github/workflows/deploy-web.yml exists

  Scenario: Happy path - green push ships to prod
    Given a clean checkout of main
    And all tests pass locally
    When I push a commit to main
    Then GitHub Actions "ci.yml" runs and passes
    And GitHub Actions "deploy-web.yml" builds /web successfully
    And "deploy-web.yml" publishes /web/dist to Firebase Hosting
    And the commit is live at https://grocery-list-cad.web.app within 5 minutes of push

  Scenario: CI failure blocks deploy
    Given a commit that fails jest tests
    When I push the commit to main
    Then ci.yml fails with red status
    And deploy-web.yml does not run (or runs only after ci.yml passes)
    And https://grocery-list-cad.web.app continues to serve the prior build

  Scenario: Build failure in deploy workflow keeps prior build live
    Given a commit where /web build fails (e.g. type error only caught by vite)
    When deploy-web.yml runs
    Then the build step fails
    And no upload to Firebase Hosting occurs
    And the prior hosting release remains active

  Scenario: Manual fallback deploy from laptop
    Given deploy-web.yml is failing due to a transient Firebase auth issue
    When I run `cd web && npm run build && firebase deploy --only hosting` locally
    Then the new build is published to https://grocery-list-cad.web.app
    And the same firebase.json / .firebaserc produce an identical deploy to CI

  Scenario: Rollback to previous release
    Given a bad commit is live in production
    When I run `firebase hosting:rollback`
    Then the previous hosting release is re-activated within 2 minutes
    And https://grocery-list-cad.web.app serves the prior build
