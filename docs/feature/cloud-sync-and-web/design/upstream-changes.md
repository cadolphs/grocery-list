# Upstream Changes — cloud-sync-and-web

## Changes from DESIGN that affect DISCUSS artifacts

### U1: Authentication requires login UI

**Original assumption** (requirements.md, NFR-4):
> "Basic authentication required" — implied invisible/minimal auth

**New reality**:
Email link auth requires a sign-in screen on both mobile and web apps. User enters email, receives magic link, clicks to sign in. One-time per device.

**Impact on user stories**:
- Walking skeleton should include a new story: **US-0: Email Link Sign-In** — "As a user, I want to sign in with my email so that my data is the same on all my devices"
- AC for US-0: Given I open the app for the first time / When I enter my email and click the sign-in link / Then I am authenticated and my data loads from the cloud

**Severity**: Minor addition, not a scope change. The sign-in is one-time per device.

### U2: Walking skeleton scope expanded

**Original scope** (story-map.md):
> Walking Skeleton = cloud backend + read-only web view + offline-first mobile loading

**Updated scope**:
Walking Skeleton = **email link auth** + cloud backend + **data migration** + read-only web view + offline-first mobile loading

Auth is a prerequisite — Firestore security rules require authentication before any data can be read or written.

### U3: New acceptance criteria needed

The following ACs should be added to acceptance-criteria.md:

**AC-0: Email Link Sign-In (both platforms)**
```gherkin
Given I open the app (mobile or web) for the first time
When I enter my email address and submit
Then I receive a sign-in link via email
And when I click the link I am authenticated
And I see my staple library (or empty library if first time)

Given I am signed in on my phone
When I sign in on the web app with the same email
Then I see the same staple data on both devices
```

**AC-9: Auth Recovery After Reinstall**
```gherkin
Given I was previously signed in and had staples in the cloud
When I reinstall the app and open it
Then I see the email sign-in screen
And when I sign in with the same email
Then all my previous staples are restored from the cloud
```
