# User Stories — cloud-sync-and-web

## Walking Skeleton Stories

### US-1: Cloud Backend Setup
**As a** grocery list user
**I want** my staple library stored in the cloud
**So that** my data survives device loss and is accessible from multiple devices

**Job trace**: Job 2 (Data Durability), Job 3 (Cross-Device Sync)

**Acceptance criteria**: See acceptance-criteria.md AC-1

---

### US-2: Data Migration to Cloud
**As a** grocery list user
**I want** my existing staples, areas, and section order migrated to the cloud
**So that** I don't lose my curated data when switching to cloud storage

**Job trace**: Job 2 (Data Durability)

**Acceptance criteria**: See acceptance-criteria.md AC-2

---

### US-3: Read-Only Web View
**As a** grocery list user
**I want** to view my staple library on a web page
**So that** I can see my staples on a big screen

**Job trace**: Job 1 (Comfortable Staple Management) — partial

**Acceptance criteria**: See acceptance-criteria.md AC-3

---

### US-4: Offline-First Mobile Sync
**As a** grocery list user
**I want** my mobile app to cache cloud data locally and sync gradually
**So that** I can shop at the store even with spotty wifi

**Job trace**: Job 3 (Cross-Device Sync)

**Acceptance criteria**: See acceptance-criteria.md AC-4

---

## Slice 2 Stories

### US-5: Add Staple on Web
**As a** grocery list user
**I want** to add new staples from the web app using my keyboard
**So that** I can build my staple library comfortably

**Job trace**: Job 1 (Comfortable Staple Management)

**Acceptance criteria**: See acceptance-criteria.md AC-5

---

### US-6: Edit Staple on Web
**As a** grocery list user
**I want** to edit a staple's name, area, or section on the web
**So that** I can correct or reorganize my library easily

**Job trace**: Job 1 (Comfortable Staple Management)

**Acceptance criteria**: See acceptance-criteria.md AC-6

---

### US-7: Delete Staple on Web
**As a** grocery list user
**I want** to delete staples from the web app
**So that** I can remove items I no longer buy

**Job trace**: Job 1 (Comfortable Staple Management)

**Acceptance criteria**: See acceptance-criteria.md AC-7

---

### US-8: Mobile Quick-Add Syncs to Cloud
**As a** grocery list user
**I want** staples I quick-add on my phone to sync to the cloud
**So that** they appear on the web app next time I check

**Job trace**: Job 3 (Cross-Device Sync)

**Acceptance criteria**: See acceptance-criteria.md AC-8

---

## Slice 3 Stories (Future)

### US-9: Reorder Sections on Web
### US-10: Manage Areas on Web
### US-11: Bulk Staple Operations

_(To be detailed when Slice 3 is prioritized)_
