# Queue Cure '26 — Thought Process Sheet

## 1. Core Design Decision: Single Source of Truth

The backend holds one in-memory object representing the entire queue state (`queue`, `currentToken`, `avgConsultationTime`, `tokenCounter`, `queueOpen`, `queuePauseReason`, `queuePauseDelay`). Every client — Receptionist screen or Waiting Room screen — is a passive subscriber. They never compute or store queue state independently; they just render whatever the server last broadcast.

This was the key decision that makes "live sync across both screens without refresh" trivial: there's nothing to keep in sync, because there's only ever one copy of the truth. The server emits `state-update` to **every connected socket** after any mutation, so both screens update in the same broadcast at the same moment.

## 2. Concurrency Handling

Node.js runs JavaScript on a single thread with an event loop. Each Socket.IO event handler (`add-patient`, `call-next`, etc.) runs to completion before the next queued event is processed — there is no true parallel execution of two handlers touching `queue` at the same time. This rules out the classic race condition where two requests both read `tokenCounter`, both increment it locally, and write back the same value.

Concretely:
- Two receptionists clicking "Add Patient" at the same instant still get serialized by the event loop. `tokenCounter++` happens atomically from JavaScript's perspective — no two patients can receive the same token number.
- Two simultaneous "Call Next" clicks: the first to be processed shifts the queue and broadcasts; the second sees the already-updated `queue` array (since handlers run sequentially) and shifts the next patient in line, not the same one twice.

**Where this breaks down:** if this app scaled beyond a single Node process (e.g. multiple server instances behind a load balancer), in-memory state would no longer be shared, and the single-threaded guarantee would no longer hold. For this hackathon's scope (one process, one in-memory store), that's an explicit, documented trade-off rather than an oversight — the fix would be moving state into a shared store (Redis, a database) with proper locking/transactions before scaling horizontally.

## 3. Edge Cases Considered

| Edge Case | Handling |
|---|---|
| Calling next when queue is empty | `call-next` only acts `if (queue.length > 0)` — silently no-ops rather than crashing or pushing bad state |
| Calling next while paused/closed | Rejected server-side with a `queue-error` event back to that socket, so the UI can show a clear message instead of silently failing |
| Adding a patient while queue is closed | Same pattern — rejected with `queue-error`, queue state is never mutated |
| New client joins mid-session | On `connection`, the server immediately emits the current full state to that socket only — so a Waiting Room screen opened halfway through the day sees the real current queue, not an empty one |
| Browser refresh | Same mechanism as above — refreshing just re-triggers the initial state sync, so no state is lost from the client's point of view |
| Receptionist sets an invalid avg time (blank, text, negative) | `parseInt(minutes) || 5` falls back to a safe default rather than propagating `NaN` into wait-time math |
| "Clinic closed" pause | Treated differently from "doctor late" / "lunch break" — closing resets `queue`, `currentToken`, and `tokenCounter` to start the next day clean, rather than carrying over stale tokens |
| Server restart | Acknowledged limitation: in-memory state resets to empty. For a hackathon prototype this is an accepted scope cut; production would persist state to a database |
| Duplicate / blank patient name | Falls back to `Patient {tokenCounter}` if no name is given, so the queue never shows a blank row |

## 4. Wait Time: Computed, Not Hardcoded

Estimated wait time is never a fixed number. It's derived live from two real inputs:

```
estimated_wait_for_patient = (patient's position in queue) × avgConsultationTime
```

Because `avgConsultationTime` is itself adjustable by the receptionist in real time (`set-avg-time`), and position in queue shifts every time someone is added or called, the estimate recalculates on every `state-update` — it reflects the actual current state of the queue, not a number set once and forgotten. If a doctor pauses for a delay (`doctor-late`, `lunch-break`), `queuePauseDelay` is added on top, so the displayed estimate reflects real operational disruptions instead of pretending the clinic is running on schedule.

## 5. Making the Receptionist Screen Fast & Mistake-Proof

- Every action is a single click (`Add Patient`, `Call Next`) — no multi-step modals for the common path.
- Destructive or state-changing actions that don't make sense in the current mode (e.g. calling next while paused) are blocked server-side and surfaced as an explicit error rather than just doing nothing with no feedback.
- The pause reasons (`doctor-late`, `lunch-break`, `clinic-closed`) are explicit named states rather than a generic "paused" toggle — this avoids the receptionist forgetting why the queue was paused or for how long.
- State is always server-confirmed: the UI doesn't optimistically assume an action succeeded before the server broadcasts the new state, which avoids the receptionist seeing a "ghost" UI state that doesn't match what the patient screen shows.

## 6. What I'd Improve With More Time

- Persist queue state to a lightweight database (e.g. SQLite or Redis) so a server restart doesn't wipe an in-progress day.
- Add authentication on the Receptionist view so only authorized staff can mutate the queue (currently anyone with the URL could).
- Add a small reconnection/offline indicator on both screens so staff know if they've silently lost their socket connection.
