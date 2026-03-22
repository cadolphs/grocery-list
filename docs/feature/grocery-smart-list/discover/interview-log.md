# Interview Log: Grocery Smart List

**Feature ID**: grocery-smart-list
**Date**: 2026-03-17
**Interview type**: Deep self-interview (Mom Test adapted for personal project)
**Participant**: Primary household grocery planner (builder)
**Corroborating user**: Wife (shared household member)

---

## Interview Transcript

### Q1: Walk me through the last time you realized you were running low on staples at home.

**Response**:
- Has a Notion database organized by house area (bathroom, garage, kitchen cabinets)
- Follows a bi-weekly shopping cadence
- Uses a physical whiteboard for ad-hoc items as they run low throughout the two weeks
- Consolidation from whiteboard to Notion is annoying -- the whiteboard is unsorted/ad-hoc while Notion is alphabetic or sectioned, and the mismatch makes consolidation tedious
- Notion cannot distinguish staples (recurring) from one-offs (temporary)
- Adding/removing items in Notion is painful

**Insights extracted**:
- PP1: Prep friction -- consolidation takes ~20 min
- PP2: No staple vs one-off distinction
- PP3: Adding items is painful
- Dual capture surfaces (whiteboard + Notion) = friction

### Q2: Follow-up probes on consolidation, workarounds, and missed items

**Q2.1: Tell me more about the consolidation pain.**

**Response**: The whiteboard is unsorted and ad-hoc -- items go wherever there's space. Notion is alphabetic or organized by section. The format mismatch makes transcription tedious. You have to scan the whiteboard randomly and find the right place in Notion for each item.

**Insights extracted**:
- Format mismatch between capture (unstructured) and consumption (structured) is the core consolidation pain

**Q2.2: What workarounds have you tried for staples vs one-offs?**

**Response**: No workaround -- just suffers through it. Occasionally manually deletes one-off items after shopping. Also wants to store per-item store location (aisle number, section like deli/dairy) but finds it hard to manage in Notion.

**Insights extracted**:
- PP2 confirmed: zero satisfaction with current state
- PP4: Per-item store metadata is a desired but unmet need
- "Just suffers" = no alternatives tried = high pain tolerance suggests high importance

**Q2.3: Do items fall through the cracks?**

**Response**: Items don't really fall through the cracks. The pain is process friction, not missed items.

**Insights extracted**:
- The problem is efficiency/experience, not correctness
- This shifts the value proposition from "never forget items" to "reduce planning dread"

### Q3: Walk me through your last shopping trip from leaving the house.

**Response**: Opens Notion on a view grouped by section and aisle in store-walk order. Uses that view to efficiently move through the store. Challenges: store has unreliable Wi-Fi, checking off items in Notion sometimes fails, reloading the list takes a long time.

**Insights extracted**:
- PP5: Offline reliability is critical for in-store use
- User already thinks in terms of store-walk order (validates OPP3)
- The store view already exists in Notion -- the problem is reliability and maintenance, not concept

### Q4: How long does prep take? Anyone else involved?

**Response**: Wife also adds items to the whiteboard. Prep takes 20 minutes.

**Insights extracted**:
- PP6: Multi-user input is a real need
- PP1 quantified: 20 min per trip = ~40 min/month = ~8 hours/year on consolidation alone
- Wife's involvement confirms the whiteboard as shared input surface

### Q5: Other apps or methods you've tried?

**Response**: Tried Workflowy for its quick checking-off capability, but found it awkward to set up. It doesn't support the dual-view need: one view for list prep (home sweep) and another view for store traversal (by aisle).

**Insights extracted**:
- Workflowy tried and abandoned -- demonstrates active solution-seeking
- Dual-view need explicitly articulated by user (not suggested by interviewer)
- Key insight: the problem is not "list apps are bad" but "no app supports two views of the same data"

### Q6: If this were magically frictionless, what would change?

**Response**: "I'd have less dread around planning the trip."

**Insights extracted**:
- Strong emotional signal: "dread"
- The cumulative friction creates negative anticipation for a routine task
- Emotional framing suggests high motivation to adopt a solution that reduces friction

---

## Evidence Quality Assessment

| Criterion | Assessment |
|---|---|
| Past behavior referenced | YES -- all responses describe actual current process |
| Specific examples given | YES -- Notion, whiteboard, Workflowy, store Wi-Fi |
| Future intent avoided | YES -- only Q6 touches hypothetical, and response is grounded in emotion, not feature requests |
| Commitment signal | STRONGEST -- building the app |
| Compliments absent | YES -- no "that sounds great" responses; all grounded in pain |
| Alternatives explored | YES -- Notion (current), Workflowy (abandoned), whiteboard (ongoing) |

## Corroborating Evidence

**Wife (second household user)**:
- Adds items to shared whiteboard (confirms PP6: multi-user input)
- Validates that the capture surface must be low-friction (whiteboard wins over Notion for quick adds)
- Does not do the consolidation step (confirms PP1 falls on primary planner)

## Summary of Pain Points by Source

| Pain Point | Self-Interview | Wife Corroboration | Alternative Evidence |
|---|---|---|---|
| PP1: Prep friction | Direct (20 min) | Indirect (adds to whiteboard) | -- |
| PP2: No staples/one-offs | Direct ("suffers") | -- | -- |
| PP3: Adding items painful | Direct | Indirect (uses whiteboard instead) | Workflowy tried |
| PP4: Store metadata | Direct | -- | Notion views exist |
| PP5: Offline reliability | Direct (store Wi-Fi) | -- | -- |
| PP6: Multi-user input | Direct | Direct (adds items) | -- |
