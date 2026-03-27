# Jobs-to-be-Done: Four Forces Analysis — cloud-sync-and-web

## Job 1: Comfortable Staple Management

| Force | Detail |
|-------|--------|
| **Push** (current frustration) | Small screen + many taps makes staple/section management slow and error-prone. Bulk operations (adding many staples, reorganizing sections) are tedious one-by-one on mobile. |
| **Pull** (desired future) | Sit at laptop, type staple names with a real keyboard, drag sections around, manage everything in minutes instead of fumbling on the phone. |
| **Anxiety** (adoption concern) | Is it worth setting up backend infrastructure for a personal app? What if sync breaks and corrupts data? |
| **Habit** (current behavior) | Currently manages everything on the phone directly. Must shift mental model to "maintain on laptop, use at store on phone." |

## Job 2: Data Durability

| Force | Detail |
|-------|--------|
| **Push** | Data lives only on-device in AsyncStorage. Phone loss = total data loss of carefully curated staple library. |
| **Pull** | Cloud backup means data survives any device change. |
| **Anxiety** | Backend complexity, ongoing cost, privacy of grocery data in the cloud. |
| **Habit** | No backup habit today — data just lives on the phone with no safety net. |

## Job 3: Cross-Device Sync

| Force | Detail |
|-------|--------|
| **Push** | Without sync, a web UI is useless — edits made on laptop wouldn't reach the phone at the store. |
| **Pull** | Edit anywhere, see changes everywhere, seamlessly and automatically. |
| **Anxiety** | Conflict resolution if phone and web edit simultaneously. Data integrity during sync failures. |
| **Habit** | Single-device usage. No existing concept of "my data lives in the cloud." |
