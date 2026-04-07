# Outcome KPIs: auth-password-migration

## Feature: Auth Password Migration

### Objective

All users can reliably authenticate using email and password, eliminating dependency on deprecated Firebase Dynamic Links.

### Outcome KPIs

| # | Who | Does What | By How Much | Baseline | Measured By | Type |
|---|-----|-----------|-------------|----------|-------------|------|
| 1 | All users | Successfully sign in on first attempt | >= 90% success rate | Unknown (email-link flow is breaking) | Firebase Auth analytics | Leading |
| 2 | New users | Complete sign-up without abandoning | >= 80% completion rate | N/A (new flow) | Firebase Auth create-user events | Leading |
| 3 | Users encountering errors | Recover and successfully authenticate | >= 70% error recovery rate | N/A | Auth retry success after error | Leading |
| 4 | All users | Experience zero auth failures from deprecated email links | 100% (no email-link auth attempts) | 100% of auth uses email-link (will break) | Absence of sendSignInLinkToEmail calls | Lagging |

### Metric Hierarchy

- **North Star**: Login success rate (KPI #1) -- if users cannot sign in, nothing else matters
- **Leading Indicators**: Sign-up completion rate, error recovery rate
- **Guardrail Metrics**: App crash rate must not increase; auth latency must remain under 3 seconds

### Measurement Plan

| KPI | Data Source | Collection Method | Frequency | Owner |
|-----|------------|-------------------|-----------|-------|
| Login success rate | Firebase Auth | Auth state change events | Weekly | Product |
| Sign-up completion rate | Firebase Auth | createUser success/failure events | Weekly | Product |
| Error recovery rate | App analytics | Retry-after-error sequences | Weekly | Product |
| Email-link elimination | Codebase audit | No sendSignInLinkToEmail calls remain | Once (at delivery) | Engineering |

### Hypothesis

We believe that replacing email-link authentication with email/password authentication for all grocery list users will achieve uninterrupted access to the app. We will know this is true when all users sign in successfully at a rate of 90% or higher on first attempt, and zero authentication attempts use the deprecated email-link flow.
