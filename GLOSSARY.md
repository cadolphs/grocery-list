# Grocery List

A household grocery app: walk the house to decide what is needed (the sweep), then shop for it (the trip). Single context.

## Language

### Catalogue

**Staple**:
An item the household buys again and again. Lives in the library and is pre-loaded onto every trip.
_Avoid_: Recurring item, regular

**One-off**:
An item wanted for this trip only. Never part of the sweep; always Needed.
_Avoid_: Ad-hoc item, extra

**House area**:
A place in the home where staples are kept and checked during the sweep (Fridge, Pantry, Bathroom).
_Avoid_: Section (that is a store concept), room, home section

**Store section**:
A region of the store where items are found (Produce, Dairy), optionally with an aisle number.
_Avoid_: Section without a qualifier, department

### Sweep

**Sweep**:
The walk through the house, area by area, that decides which staples are needed for the trip. It has no end ceremony; it is complete when no staple is Undecided.
_Avoid_: Check, inventory, audit

**Decision**:
A staple's sweep status on the current trip: Undecided, Needed, or Not needed. Every staple starts Undecided; decisions flip freely in any direction.
_Avoid_: Needed flag, skip state

**Undecided**:
The staple has not yet been looked at in this sweep. The default for every staple at the start of a trip.
_Avoid_: Unchecked, pending, unknown

**Needed**:
The staple should be bought on this trip. The shopping list is exactly the Needed staples plus the one-offs.
_Avoid_: Checked, selected, on list

**Not needed**:
The staple was looked at and there is enough; it stays off this trip.
_Avoid_: Skipped, unchecked, removed

**Area complete**:
A house area with no Undecided staples. Derived, never stored; an area with no staples is trivially complete.
_Avoid_: Area done (as a stored fact), finished area

### Trip

**Trip**:
One shopping cycle: sweep, then shop, then Finish Trip. The sweep's decisions live on the trip.
_Avoid_: Shopping list (that is a view of the trip), session, order

**Shopping list**:
The view of the active trip's Needed staples and one-offs, grouped by store section. Not a thing of its own.
_Avoid_: Cart, basket (before purchase)

**In cart**:
An item picked up in the store on this trip.
_Avoid_: Checked, bought (until the trip is finished), done

**Finish Trip**:
Ending the shopping cycle. Anything Needed but not in cart carries over to the next trip.
_Avoid_: Complete trip, end trip, checkout

**Carryover**:
A Needed item that was not bought and so starts the next trip still Needed.
_Avoid_: Leftover, unbought
