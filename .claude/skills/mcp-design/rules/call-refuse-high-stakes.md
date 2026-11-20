---
title: Refuse High-Stakes Actions with a Clear Message and a Human Path
impact: MEDIUM
tags: calls, safety, human-in-the-loop
---

## Refuse High-Stakes Actions with a Clear Message and a Human Path

Some actions should not be one tool call away from an improvising caller. For
those, the tool refuses with a message that says why and offers the path a
human takes instead (the app, a confirmation flow, a smaller tool). The
refusal is itself an error that teaches (see `error-teach-next-attempt`).

**Incorrect:** a `delete_all_staples` tool that does what it says.

**Correct:**

```ts
// delete_staple({ names: [...] }) with destructiveHint: true, one staple per name,
// and an error on more than N names:
"Refusing to delete 14 staples in one call (limit 3). Delete them in the app's " +
"staples screen, or call delete_staple again with up to 3 names."
```

Reference: Luca Rossi, Refactoring, 2026 ("for high-stakes actions, you can
refuse with a clear message and offer a human-in-the-loop path").
