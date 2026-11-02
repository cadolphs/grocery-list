# ADR-011: Agents never touch production data or deploy by hand

Status: accepted Date: 2026-11-02

## Decision

Agents do not read, write, or delete data in the production Firebase project
(`grocery-list-cad`) through the console, the Admin SDK, the Firebase CLI, or
scripts, and never run `firebase deploy`, `firebase hosting:rollback`, or EAS
submit locally. Deploys happen only through CI on `main`.

The one exception: the control CLI may sign in **only** the dedicated test
account whose credentials the maintainer provides as `CONTROL_EMAIL` /
`CONTROL_PASSWORD`, and change only that account's own list through the app UI.
Agents never create accounts.

## Why

There is no emulator or staging project: the app talks to production Firestore.
Real users' lists are irreversible to lose, and Firestore rules deploys change
security for everyone.

## Revisit if

The project adds a Firebase emulator or a staging project; then local
verification moves there and the test-account exception goes away.
