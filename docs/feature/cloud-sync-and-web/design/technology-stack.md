# Technology Stack — cloud-sync-and-web

## Mobile App (Existing + Extensions)

| Layer | Technology | Version | Rationale |
|-------|-----------|---------|-----------|
| Framework | Expo SDK | 54 | Existing |
| Runtime | React Native | 0.81 | Existing |
| Language | TypeScript (strict) | — | Existing |
| UI | React 19 | 19.1.0 | Existing |
| Cloud DB | Firebase Firestore | ^12.8.0 | Already in package.json. Native offline persistence. Free tier. |
| Auth | Firebase Email Link Auth | ^12.8.0 | Passwordless email sign-in. Same email = same UID across devices. |
| Local storage | AsyncStorage | ^2.2.0 | Existing, kept for migration flag and fallback |

**New dependencies**: None — Firebase SDK already installed.

## Web App (New)

| Layer | Technology | Version | Rationale |
|-------|-----------|---------|-----------|
| Framework | React | 19.x | Same as mobile — shared mental model |
| Build tool | Vite | latest | Fast, lightweight, zero-config for React |
| Language | TypeScript (strict) | — | Consistency with mobile |
| Cloud DB | Firebase Firestore | ^12.8.0 | Same backend as mobile |
| Auth | Firebase Email Link Auth | ^12.8.0 | Same email link auth as mobile |
| Hosting | Firebase Hosting | — | Free, CDN, auto-SSL, same project as Firestore |
| CSS | Plain CSS or CSS Modules | — | Desktop-only, no need for RN styling |

**New dependencies**: `vite`, `@vitejs/plugin-react` (dev only).

## Infrastructure

| Service | Provider | Tier | Cost |
|---------|----------|------|------|
| Cloud Firestore | Firebase (Google) | Spark (free) | $0 |
| Firebase Auth | Firebase (Google) | Free | $0 |
| Firebase Hosting | Firebase (Google) | Spark (free) | $0 |

**Free tier limits (Spark plan)**:
- Firestore: 1 GiB storage, 50K reads/day, 20K writes/day, 20K deletes/day
- Auth: Unlimited email link auth
- Hosting: 10 GiB storage, 360 MB/day transfer

For a single-user grocery app, these limits are orders of magnitude beyond need.

## Firestore Security Rules

### Production (email link auth)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/data/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Users can only access their own data. Email link auth provides a stable UID derived from the email address.

### Development (for local testing)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/data/{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

Allows any authenticated user (including anonymous) to read/write any user's data. **Never deploy to production.**
