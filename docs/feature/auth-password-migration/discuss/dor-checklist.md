# Definition of Ready Validation: auth-password-migration

## Story: US-01 (Sign In with Email and Password)

| DoR Item | Status | Evidence/Issue |
|----------|--------|----------------|
| Problem statement clear | PASS | "Maria Santos relies on app for weekly shopping; email-link flow is breaking due to Firebase Dynamic Links deprecation" |
| User/persona identified | PASS | "Returning grocery list user with existing account (Maria Santos)" |
| 3+ domain examples | PASS | Happy path (Maria signs in), wrong password (Maria misremembers), network error (spotty Wi-Fi) |
| UAT scenarios (3-7) | PASS | 3 scenarios: successful sign in, wrong password, non-existent account |
| AC derived from UAT | PASS | 4 acceptance criteria, each traceable to a scenario |
| Right-sized | PASS | ~1 day effort, 3 scenarios, single demo-able feature |
| Technical notes | PASS | AuthService.signIn already implemented; useAuth needs signIn exposed; LoginScreen props change |
| Dependencies tracked | PASS | AuthService.signIn (implemented), Firebase email/password provider (must verify enabled) |
| Outcome KPIs defined | PASS | >= 90% first-attempt sign-in success rate, measured by Firebase Auth events |

### DoR Status: PASSED

---

## Story: US-02 (Sign Up with Email and Password)

| DoR Item | Status | Evidence/Issue |
|----------|--------|----------------|
| Problem statement clear | PASS | "Ana Kowalski is a new user; email-link flow is broken; needs straightforward sign-up" |
| User/persona identified | PASS | "New user with no existing account (Ana Kowalski)" |
| 3+ domain examples | PASS | Happy path (Ana creates account), weak password, account already exists |
| UAT scenarios (3-7) | PASS | 3 scenarios: successful sign up, weak password, email already in use |
| AC derived from UAT | PASS | 4 acceptance criteria traceable to scenarios |
| Right-sized | PASS | ~1 day effort, 3 scenarios |
| Technical notes | PASS | AuthService.signUp implemented; Firebase enforces 6-char min, app validates 8 |
| Dependencies tracked | PASS | AuthService.signUp (implemented), Firebase email/password provider |
| Outcome KPIs defined | PASS | >= 80% sign-up completion rate |

### DoR Status: PASSED

---

## Story: US-03 (Toggle Between Sign In and Sign Up)

| DoR Item | Status | Evidence/Issue |
|----------|--------|----------------|
| Problem statement clear | PASS | "Carlos Rivera sees Sign In but needs Sign Up; no obvious way to switch" |
| User/persona identified | PASS | "Any user on login screen who needs the other mode (Carlos Rivera)" |
| 3+ domain examples | PASS | New user finds Sign Up, existing user switches back, error clears on switch |
| UAT scenarios (3-7) | PASS | 3 scenarios: switch to Sign Up, switch to Sign In, error clears on switch |
| AC derived from UAT | PASS | 5 acceptance criteria |
| Right-sized | PASS | < 1 day effort, 3 scenarios |
| Technical notes | PASS | Single component with mode state; email persists across switches |
| Dependencies tracked | PASS | None -- standalone UI behavior |
| Outcome KPIs defined | PASS | 100% discoverability |

### DoR Status: PASSED

---

## Story: US-04 (Remove Email-Link Auth Flow)

| DoR Item | Status | Evidence/Issue |
|----------|--------|----------------|
| Problem statement clear | PASS | "Dead email-link code confuses devs, increases bundle, could mislead users" |
| User/persona identified | PASS | "Developer maintaining codebase; user who should never see broken UI" |
| 3+ domain examples | PASS | LoginScreen clean, App.tsx clean, useAuth hook clean |
| UAT scenarios (3-7) | PASS | 3 scenarios: no email-link UI, deep link no auth trigger, hook exposes password methods |
| AC derived from UAT | PASS | 4 acceptance criteria |
| Right-sized | PASS | ~0.5 day effort, 3 scenarios |
| Technical notes | PASS | AuthService interface retention is DESIGN wave decision; deep links may serve non-auth purposes |
| Dependencies tracked | PASS | Depends on US-01 and US-02 being complete |
| Outcome KPIs defined | PASS | 100% elimination of email-link auth attempts |

### DoR Status: PASSED

---

## Overall Feature DoR: ALL 4 STORIES PASSED
