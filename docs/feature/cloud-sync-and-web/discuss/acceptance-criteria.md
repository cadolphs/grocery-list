# Acceptance Criteria — cloud-sync-and-web

## Walking Skeleton

### AC-1: Cloud Backend Setup
```gherkin
Given the app has a cloud backend configured
When I save a staple on the mobile app
Then the staple is persisted in the cloud database
And I can retrieve it from a different client
```

### AC-2: Data Migration
```gherkin
Given I have staples, areas, and section order stored locally in AsyncStorage
When I upgrade to the cloud-enabled version of the app
Then all my existing data is migrated to the cloud
And no staples, areas, or section orders are lost
And the app continues to work normally after migration
```

### AC-3: Read-Only Web View
```gherkin
Given I have staples stored in the cloud
When I open the web management app in my browser
Then I see all my staples listed
And they are organized by area and section
And the view is optimized for desktop (not a mobile layout)
```

### AC-4: Offline-First Mobile Sync
```gherkin
Given I have staples in the cloud
When I open the mobile app with good connectivity
Then the app syncs the latest data from the cloud in the background
And I can use the app immediately without waiting for sync

Given I have staples cached locally
When I open the mobile app with no connectivity
Then I can use the app normally with cached data
And no errors are shown to me

Given I made changes while offline
When connectivity is restored
Then my changes sync to the cloud eventually
And no user action is required to trigger sync
```

## Slice 2

### AC-5: Add Staple on Web
```gherkin
Given I am on the web management app
When I add a new staple with name "Olive Oil", area "Pantry", section "Oils"
Then the staple appears in my library immediately
And it is saved to the cloud
And it appears on my mobile app after sync
```

### AC-6: Edit Staple on Web
```gherkin
Given I have a staple "Olive Oil" in section "Oils"
When I change its section to "Cooking Oils" on the web app
Then the change is reflected immediately on the web
And the change is saved to the cloud automatically (no save button)
And the updated staple appears on my mobile app after sync
```

### AC-7: Delete Staple on Web
```gherkin
Given I have a staple "Olive Oil"
When I delete it from the web app
Then it disappears from the web view immediately
And it is removed from the cloud
And it no longer appears on my mobile app after sync
```

### AC-8: Mobile Quick-Add Syncs to Cloud
```gherkin
Given I am shopping on my phone
When I quick-add "Tahini" as a new staple
Then "Tahini" is saved locally immediately
And "Tahini" syncs to the cloud when connectivity allows
And "Tahini" appears on the web app after sync
```
