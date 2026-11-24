# Grocery List

A household grocery app: walk the house to decide what is needed (the sweep), then shop for it (the trip). Single context.

## Language

### Household

**Household**:
The people who share one list. Everything in this glossary belongs to one household.
_Avoid_: User, account (those are how a household signs in, not who it is)

### Catalogue

**Library**:
Every item the household has named: its staples, plus one-offs it has bought before, remembered only so they can be suggested again.
_Avoid_: Catalogue, staple list, pantry

**Library item**:
A durable entry in the library: a name and the store section where it is found. A name belongs to exactly one library item, ignoring case and surrounding spaces, so nothing is both a staple and a one-off, and no staple sits in two house areas. Bare "item" is fine only where a library item or a trip item would both fit.
_Avoid_: Product, staple (when it may be a one-off)

**Staple**:
A library item the household buys again and again. Kept in one house area and pre-loaded onto every trip.
_Avoid_: Recurring item, regular

**One-off**:
An item wanted for this trip only. Never part of the sweep; always Needed. The library may remember it for suggestions, but never pre-loads it.
_Avoid_: Ad-hoc item, extra

**House area**:
A place in the home where staples are kept and checked during the sweep (Fridge, Pantry, Bathroom).
_Avoid_: Section (that is a store concept), room, home section

**Store section**:
One place in the store where the household stops to pick things up: a corner (Produce) or a single aisle (Aisle 4). Never a group of adjacent aisles. The household keeps the list of its store sections, and each library item is found in one of them. One store is assumed.
_Avoid_: Section without a qualifier, department, zone (Inner Aisles, Outer Aisles), store location

**Aisle**:
A store section that is one numbered row of shelves (Aisle 4). A kind of store section, not a number attached to an item or to another section.
_Avoid_: Aisle number (as a separate fact), row

**Section order**:
The order in which the household walks the store sections. The shopping list follows it; a new section goes last.
_Avoid_: Route, path, sort order

**Unplaced**:
A library item with no store section yet. Shown last on the shopping list until the household places it.
_Avoid_: Uncategorized, misc, other

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

**Home view**:
Where the sweep happens and items are added to the trip.
_Avoid_: Home mode, prep, home tab

**Checklist**:
The alphabetical view of all staples on the Home view, for setting a staple Needed without walking the areas. Ticking a staple makes it Needed; unticking makes it Not needed. A shortcut into the sweep's decisions, not a thing of its own.
_Avoid_: Staple list, library view

**Mark area done**:
Settling a house area in one step: every staple there that is still Undecided becomes Not needed. Needed staples are left alone.
_Avoid_: Complete area, skip area, close area

**Undo area**:
Reopening a house area: every Not needed staple there goes back to Undecided, however it became Not needed. Not a step back through earlier taps.
_Avoid_: Revert, undo (for a single decision)

**Area complete**:
A house area with no Undecided staples. Derived, never stored; an area with no staples is trivially complete.
_Avoid_: Area done (as a stored fact), finished area

### Trip

**Trip**:
One shopping cycle: sweep, then shop, then Finish Trip. The sweep's decisions live on the trip.
_Avoid_: Shopping list (that is a view of the trip), session, order

**Active trip**:
The one trip being swept or shopped. A household always has exactly one; finishing it begins the next. Past trips are not kept.
_Avoid_: Current trip, open trip, completed trip (as something to look at), history

**Quick add**:
Adding an item to the active trip by typing its name, from either view. Typing a staple's name makes that staple Needed instead of adding a second item.
_Avoid_: Manual add, new item

**Start over**:
Discarding the active trip and beginning a fresh one: every staple Undecided, no one-offs, nothing in cart, carryover lost.
_Avoid_: Reset sweep, clear list

**Trip item**:
One item on one trip. A staple's trip item carries its decision; every trip item can be in cart.
_Avoid_: List item, entry, line

**Shopping list**:
The view of the active trip's Needed staples and one-offs, grouped by store section. Not a thing of its own.
_Avoid_: Cart, basket (before purchase)

**Store view**:
Where the shopping list is shown, items go in the cart, and the trip is finished.
_Avoid_: Store mode, shop tab

**In cart**:
An item picked up in the store on this trip.
_Avoid_: Checked, bought (until the trip is finished), done

**Purchased**:
A trip item that was in cart when the trip was finished.
_Avoid_: Bought, checked, done

**Trip summary**:
What the household sees on finishing a trip: what was purchased and what carries over.
_Avoid_: Receipt, trip history

**Finish Trip**:
Ending the shopping cycle. Anything Needed but not in cart carries over to the next trip.
_Avoid_: Complete trip, end trip, checkout

**Carryover**:
A Needed item that was not bought and so starts the next trip still Needed.
_Avoid_: Leftover, unbought
