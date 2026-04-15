@real-io @expo-web-unify
Feature: Migrate web hosting from the /web Vite SPA to the Expo web export
  As Clemens
  I want firebase.json, deploy-web.yml, and the repo layout to reflect Expo web as the source
  So that a push to main publishes the real RN UI and no parallel /web codebase remains

  Background:
    Given the repository root

  # US-01 — swap deploy target

  @walking_skeleton @us-01
  Scenario: firebase.json points hosting output at the repo-root dist
    When I read firebase.json
    Then hosting.public is "dist"

  @us-01
  Scenario: firebase.json SPA rewrite is preserved
    When I read firebase.json
    Then hosting.rewrites contains a rule mapping source "**" to destination "/index.html"

  @us-01
  Scenario: .firebaserc default project is unchanged
    When I read .firebaserc
    Then projects.default is "grocery-list-cad"

  @walking_skeleton @us-01
  Scenario: deploy-web.yml runs `expo export` at repo root
    When I read .github/workflows/deploy-web.yml
    Then one step runs a command containing "expo export" with platform web
    And that step does NOT set working-directory to "web"
    And that step appears before the Firebase Hosting deploy step

  @us-01
  Scenario: deploy-web.yml no longer builds from /web
    When I read .github/workflows/deploy-web.yml
    Then no step has working-directory "web"
    And no step runs "npm ci" in the /web directory
    And no step runs "npm run build" in the /web directory

  @us-01
  Scenario: deploy-web.yml still gated by CI success
    When I read .github/workflows/deploy-web.yml
    Then on.workflow_run.workflows contains "CI"
    And on.workflow_run.branches contains "main"
    And the deploy job runs only when workflow_run.conclusion is "success"

  @us-01
  Scenario: deploy step still authenticates via FIREBASE_SERVICE_ACCOUNT
    When I read .github/workflows/deploy-web.yml
    Then one step uses FirebaseExtended/action-hosting-deploy
    And its firebaseServiceAccount references secrets.FIREBASE_SERVICE_ACCOUNT
    And its projectId is "grocery-list-cad"
    And its channelId is "live"

  # US-02 — delete /web

  @walking_skeleton @us-02
  Scenario: The /web directory is absent
    When I inspect the repository
    Then /web does not exist

  @us-02
  Scenario: No production code references the deleted /web/* paths
    When I grep across production source (excluding docs/ and node_modules/)
    Then no file references "web/src"
    And no file references "web/package"
    And no file references "web/dist"
