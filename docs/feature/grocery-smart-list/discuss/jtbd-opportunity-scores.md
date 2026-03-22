# JTBD Opportunity Scores: Grocery Smart List

**Feature ID**: grocery-smart-list
**Phase**: DISCUSS -- Phase 1 (JTBD Analysis)
**Date**: 2026-03-17

---

## Scoring Method

- **Importance**: Estimated % rating outcome 4+ on 5-point scale (based on interview evidence)
- **Satisfaction**: Estimated % rating current satisfaction 4+ on 5-point scale (based on current workaround)
- **Score**: Importance + max(0, Importance - Satisfaction)
- **Data source**: Single deep self-interview + corroboration (personal project adaptation)
- **Confidence**: Medium (team estimate from single user who is also the builder)

---

## Outcome Statements and Scores

| # | Outcome Statement | Imp. (%) | Sat. (%) | Score | Priority |
|---|-------------------|----------|----------|-------|----------|
| O1 | Minimize the time to consolidate items from all sources into a complete shopping list | 95 | 15 | 17.5 | Extremely Underserved |
| O2 | Minimize the likelihood of forgetting an item that was on the whiteboard | 85 | 50 | 12.0 | Underserved |
| O3 | Minimize the time to record a needed item during a home sweep | 90 | 30 | 15.0 | Extremely Underserved |
| O4 | Minimize the effort to distinguish staple items from one-off purchases | 90 | 5 | 17.5 | Extremely Underserved |
| O5 | Minimize the time to find the next item on the list while in-store | 80 | 55 | 10.5 | Appropriately Served |
| O6 | Minimize the likelihood of losing check-off state while shopping | 95 | 20 | 17.0 | Extremely Underserved |
| O7 | Minimize the effort to maintain aisle/section metadata per item | 75 | 30 | 11.3 | Appropriately Served |
| O8 | Minimize the time to switch between home-view and store-view | 85 | 10 | 16.0 | Extremely Underserved |
| O9 | Minimize the likelihood of unbought items being lost between trips | 80 | 40 | 12.0 | Underserved |
| O10 | Minimize the time to add a batch of whiteboard items into the app | 90 | 10 | 16.0 | Extremely Underserved |

---

## Top Opportunities (Score >= 12)

| Rank | Outcome | Score | Story Link |
|------|---------|-------|------------|
| 1 | O1: Minimize consolidation time | 17.5 | JS1, JS2 (Home Sweep, Whiteboard Consolidation) |
| 2 | O4: Staple vs one-off distinction | 17.5 | JS3 (Staple Item Management) |
| 3 | O6: Reliable in-store check-off | 17.0 | JS5 (In-Store Check-Off) |
| 4 | O8: Dual-view switch | 16.0 | JS4 (Store Navigation) |
| 5 | O10: Batch whiteboard entry | 16.0 | JS2 (Whiteboard Consolidation) |
| 6 | O3: Quick item capture during sweep | 15.0 | JS1 (Home Sweep Capture) |
| 7 | O2: Nothing missed from whiteboard | 12.0 | JS2 (Whiteboard Consolidation) |
| 8 | O9: Unbought items carry over | 12.0 | JS6 (Trip Completion) |

---

## Appropriately Served Areas (Score 10-12)

| Outcome | Score | Note |
|---------|-------|------|
| O5: Find next item in-store | 10.5 | Notion's grouped view partially works; incremental improvement |
| O7: Maintain aisle metadata | 11.3 | Partially maintained in Notion; set-once-per-staple approach will improve |

---

## Overserved Areas (Score < 10)

None identified. All outcomes are underserved or appropriately served.

---

## Prioritization Implications

1. **Consolidation elimination** (O1, O10) and **staple management** (O4) are tied for highest opportunity. These drive the walking skeleton.
2. **Offline check-off reliability** (O6) is the highest-scoring in-store outcome. Non-negotiable for store-view.
3. **Dual-view switch** (O8) is the core differentiator and scores extremely high because nothing in the current toolset supports it.
4. **Trip carryover** (O9) is underserved but lower-priority -- can be Release 2.
5. No overserved areas -- every outcome needs improvement. No simplification candidates.

---

## Data Quality Notes

- Source: Deep self-interview (builder is primary user) + wife as corroborating user
- Sample size: 1 primary, 1 secondary
- Confidence: Medium -- scores are directional rankings, not absolute. Appropriate for personal project with builder-as-user.
- Revalidation: Re-score after 2 weeks of use to check if satisfaction shifts match expectations.
