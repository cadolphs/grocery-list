# ADR-003: Email Link (Passwordless) Authentication

## Status

Accepted (revised from initial anonymous auth proposal)

## Context

Firestore requires authentication to scope data access. The app needs the same user identity across mobile and web devices to share data. Anonymous auth was considered but creates separate UIDs per device, making cross-device sync impossible without account linking complexity.

## Decision

Use **Firebase Email Link (Passwordless) Authentication**. User enters their email, receives a magic link, clicks to sign in. Same email on both devices = same UID = same data.

## Alternatives Considered

### Anonymous auth
- **Pro**: Invisible, no login UI
- **Con**: Separate UID per device. Cross-device data sharing requires complex account linking.
- **Rejected because**: The core feature requires cross-device sync. Anonymous auth makes this needlessly complex.

### Google sign-in
- **Pro**: One-click sign-in, robust identity
- **Con**: Requires OAuth consent screen setup, Google-specific dependency
- **Rejected because**: More setup complexity. Email link is sufficient and provider-agnostic.

### No auth (public Firestore)
- **Rejected because**: Data must not be publicly accessible.

## Rationale

1. **Cross-device identity** — Same email = same UID on mobile and web
2. **No password** — Passwordless reduces friction. Click a link to sign in.
3. **Minimal UI** — Just an email input field and "check your email" message
4. **Account recovery** — Email-based identity survives app reinstalls and device changes
5. **Sharing upgrade path** — When sharing is needed, can add a second email with Firestore security rules
6. **Data durability** — Identity is recoverable, so cloud data is never orphaned

## Consequences

- **Login UI required**: Both mobile and web need a simple sign-in screen (email input + confirmation)
- **Email dependency**: User needs access to email to sign in on a new device
- **One-time per device**: After initial sign-in, Firebase persists the auth state. User only signs in once per device.
- **Walking skeleton scope**: Email link auth is part of the walking skeleton, not deferred
