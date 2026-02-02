# OPD Token Management System

## Technical Documentation

---

## Technology Stack

**TypeScript, Node.js with Express.js, PostgreSQL with Prisma ORM**

### Why this stack?

The problem is fundamentally event-driven and stateful. TypeScript provides explicit modeling of slot capacity, token priority, and state transitions, reducing bugs in dynamic reallocation scenarios. Express keeps the API minimal and focused. PostgreSQL with Prisma enforces consistency through ACID transactions—critical when handling concurrent cancellations, emergency insertions, and reallocations. This stack prioritizes correctness and clear invariants over framework complexity.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Applications                     │
│          (Mobile App, Web Portal, OPD Desk Terminal)        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   REST API Layer (Express)                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│  │  Doctor  │  │   Slot   │  │  Token   │                   │
│  │  Routes  │  │  Routes  │  │  Routes  │                   │
│  └──────────┘  └──────────┘  └──────────┘                   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Allocation Engine (Business Logic)             │
│  ┌────────────────────────────────────────────────────┐     │
│  │  • Priority-based allocation                       │     │
│  │  • Capacity constraint enforcement                 │     │
│  │  • Emergency displacement                          │     │
│  │  • Automatic reallocation                          │     │
│  │  • Idempotency handling                            │     │
│  └────────────────────────────────────────────────────┘     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Prisma ORM (Data Access Layer)                 │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                 PostgreSQL Database                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │ Doctors  │  │  Slots   │  │  Tokens  │  │ AuditLog │     │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘     │
└─────────────────────────────────────────────────────────────┘
```


## Core Design Principles

1. **Hard capacity limits are never violated.** The system rearranges patients instead of squeezing in extras.
    
2. **Time is divided into fixed blocks.** 9-10 AM slots, not exact minutes (9:17 AM) for easier capacity management.
    
3. **Token represents a claim, not a confirmed appointment.** If the slot is full, you wait. If space opens, you're promoted.
    
4. **Priority order is predictable:** Emergency → Paid → Follow-up → Online → Walk-in. Configurable caps prevent abuse.
    
5. **Decisions are made one slot at a time.** Only rearrange the affected slot or nearby slots, never reorganize the entire day.
    
6. **Every change is tracked** through audit logs for compliance and debugging.
    
7. **Emergencies can displace lower-priority patients within limits.** No insertions into slots about to start or already running (causes operational chaos).
    
8. **All changes are atomic.** Either everything succeeds or nothing changes—no broken intermediate states.
    
9. **The API is just a messenger.** Decision logic lives in the allocation engine, not the API layer, keeping consistency centralized.
    
10. **Failures are handled automatically.** Server crashes or duplicate requests result in clean recovery.
    
11. **Multiple simultaneous emergencies are handled** by displacing the necessary number of lower-priority patients while respecting maximum capacity.
    
12. **Emergency cutoff time:** Cannot insert into slots already running or about to end. Policy is configurable.
    
13. **No-shows are handled locally first.** Promote waiting patients in the same slot before looking elsewhere.
    
14. **Token ≠ scheduled.** Example: 20 walk-ins, 3 slots → all 20 get tokens, only 3 assigned. Remaining 17 wait.
    
15. **Delays reduce capacity, don't break the schedule.** If the doctor is late, see fewer patients or speed up—don't reschedule everyone.
    
16. **Low-priority patients might wait long.** This is intentional. Caps prevent abuse.
    
17. **Duplicate requests are handled safely** through idempotency. Double-clicking creates only one booking.
    
18. **Daily reset:** Waiting patients are removed at day close. They must rebook the next day. This prevents infinite queue growth and makes capacity problems visible.
    

---

## Priority System

Five priority levels, from highest to lowest:

1. **EMERGENCY:** Life-threatening cases. Always wins displacement decisions.
    
2. **PAID:** Premium patients. Beats normal flow due to contractual commitment.
    
3. **FOLLOW-UP:** Continuity of care affects medical outcomes.
    
4. **ONLINE:** Standard advance bookings through the online system.
    
5. **WALK-IN:** No reservation. Served when capacity remains.
    

### Priority vs. Source: Key Distinction

**Priority** and **Source** are independent concepts:

- **Source:** Where the token was created (ONLINE booking system vs. WALK-IN registration desk)
- **Priority:** Medical/business urgency level assigned to the patient

**Example:** A patient who walks into the hospital desk and pays for premium service would have `Source=WALK-IN` and `Priority=PAID`. This is a walk-in patient who gets elevated priority due to payment.

---

## Design Trade-offs

### 1. PostgreSQL Transactions vs. In-Memory Store

**Decision:** PostgreSQL with ACID transactions

**Rationale:** Consistency matters more than raw speed. When multiple people cancel, book emergencies, and walk in simultaneously, slot capacity must never be exceeded. PostgreSQL transactions guarantee this atomically. Redis or in-memory solutions would require building this complex logic manually with higher risk of race conditions.

**Cost:** Database locks add latency under high concurrency (50-100ms vs. 5-10ms for in-memory).

**Reality Check:** A typical OPD has 10-20 doctors and 200-300 patients per day. The system easily handles 50-100 concurrent requests—far more than a single registration desk generates.

**Trade-off Accepted:** Slightly slower response times for guaranteed correctness and zero overbooking.

---

### 2. Strict Priority vs. Fairness

**Priority Order:** Emergency → Paid → Follow-up → Online → Walk-in

**Risk:** Walk-ins could wait indefinitely if higher-priority patients keep arriving (starvation problem).

**Mitigation:** Hospitals can set configurable caps (e.g., max 3 paid patients per slot) to reserve capacity for regular patients. Future enhancement: aging strategy where long-waiting patients receive priority boosts.

**Trade-off Accepted:** Clinical urgency and revenue prioritized over perfect fairness, with configurable caps to prevent abuse. This matches real hospital operations.

---

### 3. Slot-Level vs. Continuous Time Scheduling

**Approach:** Fixed slots (9-10 AM, 10-11 AM) instead of exact times (9:17 AM, 10:23 AM)

**Why:** Simpler logic with no partial overlaps or fractional capacity calculations. Matches how hospitals already operate their OPDs.

**Downside:** Cannot compress appointments if the doctor finishes consultations early.

**Trade-off Accepted:** Lose fine-grained flexibility, gain predictability and significantly simpler allocation code.

---

### 4. Automatic vs. Manual Reallocation

**Approach:** When someone cancels or no-shows, waiting patients are automatically promoted.

**Why:** Maximizes capacity utilization. Patients are seen faster, reducing overall wait times.

**Downside:** Could confuse staff or patients if not properly trained. A waiting list patient might suddenly be called.

**Trade-off Accepted:** Automate for efficiency while requiring operational training. Manual queue management wastes valuable capacity.

---

### 5. Emergency Displacement vs. Refusal

**Approach:** Emergencies displace lower-priority patients instead of being refused entry.

**Why:** Ensures urgent cases are always seen. Displaced patients are rescheduled to later slots or moved to waiting, not canceled entirely.

**Alternative Rejected:** Refusing emergencies when slots are full defeats the entire purpose of having an emergency category.

**Trade-off Accepted:** Prioritize life-threatening cases over convenience. This aligns with medical ethics and hospital responsibilities.

---

### 6. Idempotency Implementation

**Approach:** Database unique constraint on `idempotencyKey` field with indexed lookup

**Why:** Prevents duplicate bookings from double-clicks or network retries. Database-based approach survives server restarts and works across multiple instances. ~5-10ms lookup cost via indexed query.

**Cost:** Adds minor database overhead and requires frontend to generate and send unique keys.

**Alternative Rejected:** In-memory maps lose state on restart. Allowing duplicates risks ghost bookings and double-charging patients.

**Trade-off Accepted:** Production-grade solution that adds minor complexity to prevent data corruption and user frustration. Standard practice in payment systems.

---

### 7. Daily Reconciliation vs. Multi-Day Persistence

**Approach:** All waiting tokens expire at end of day.

**Why:** Keeps the system clean. Prevents patients booked on Monday from still waiting on Friday.

**Downside:** Patients must manually rebook the next day if they weren't served.

**Reality:** Matches hospital operations—each day is a fresh start. If patients consistently never get seen, that's a capacity planning problem that should be visible, not hidden in an infinite queue.

**Trade-off Accepted:** Enforce daily resets to maintain system hygiene and make capacity problems visible to management.

---

### 8. Pessimistic Locking vs. Optimistic Concurrency

**Approach:** Database transactions with row-level locks. If two requests try booking the last spot, one waits for the other to finish.

**Why:** Under high load, optimistic concurrency causes excessive retries and user frustration. Pessimistic locking guarantees first-come-first-served.

**Performance Cost:** Minimal for realistic OPD traffic patterns.

**Trade-off Accepted:** Use pessimistic locking because correctness and user experience beat raw speed in this domain.

---

### 9. Monolith vs. Microservices

**Approach:** Single service with one database.

**Why:** Ensures all operations happen in one transaction. For a single hospital, microservices overhead (network calls, distributed transactions, eventual consistency) isn't worth the complexity.

**When to Change:** Nationwide hospital chain with millions of patients—then consider splitting services.

**Trade-off Accepted:** Keep it monolithic for simplicity and strong consistency. Scales easily for single hospital load. Core allocation logic is modular enough to extract later if needed.

---

### 10. Human-Readable DisplayIDs vs. Simple UUIDs

**Approach:** Generate human-readable displayIDs (e.g., `AKG001`, `T-AKG001-20260205-001`, `S-AKG001-20260205-001`) instead of using raw UUIDs.

**Why:** Dramatically improves operational efficiency. Staff can communicate "Token AKG001-003" over the phone or on displays instead of reading "880e8400-e29b-41d4-a716-446655440020." Reduces errors in verbal communication, simplifies troubleshooting, and makes printed tickets more professional.

**Implementation Complexity:**

- Doctor IDs: Extract initials from name (3 letters) + sequential number (001, 002...). Handles edge cases: titles removal (Dr., Prof.), duplicate names, single-word names, middle initials.
- Token/Slot IDs: Composite format with doctor prefix, date, and sequence number for easy visual grouping.
- Requires 2 additional database queries per entity creation to check for existing prefixes and calculate next sequence number.

**Performance Cost:** ~10-20ms additional latency per creation (database queries for prefix lookup and sequence number). Negligible for OPD scale but measurable.

**Alternative Rejected:** Using UUIDs directly is simpler (zero logic, instant generation) but creates terrible user experience. Hospital staff would need to use copy-paste for every reference, increasing operational friction and error rates.

**Trade-off Accepted:** Accept minor implementation complexity and marginal performance cost for massive gains in usability, operational efficiency, and professional appearance. DisplayIDs reduce cognitive load for staff and improve patient experience.

---

## Emergency Handling Mechanism

Emergencies aren't special-cased—they're simply the highest priority in normal allocation. When an emergency arrives, the system creates a high-priority token and looks for available space. If room exists, immediate scheduling occurs. If the slot is full, the system displaces lower-priority patients to future slots or the waiting list.

**Slot maximum capacity is never exceeded**—the system just changes the order, not the total count. This is an atomic operation: even if multiple emergencies arrive simultaneously or the system crashes mid-process, data stays consistent.

### Displacement and Cascading Reallocation

When an emergency displaces a patient, the system implements intelligent cascading reallocation:

1. Patient's status changes to `WAITING` and slot assignment is removed
2. System immediately attempts reallocation to the next available slot
3. If successful, patient is seamlessly moved to a later slot
4. If unsuccessful, patient remains in the waiting queue for future opportunities

This cascading approach minimizes disruption to displaced patients by automatically finding them alternative slots rather than simply placing them in an indefinite waiting state.

---

## Walk-in Prioritization for Imminent Slots

**Threshold:** When a slot starts within **1 hour** or is currently running

**Primary Strategy:** Prioritize walk-in patients first for reallocation. These patients are already physically present at the hospital, making them ideal candidates for filling last-minute openings.

**Fallback Strategy:** If no walk-in patients are waiting, the system falls back to promoting online bookings instead. The system won't leave a slot empty just because no walk-ins are available.

**Rationale:** Maximizes utilization while being pragmatic. Walk-ins are preferred for imminent slots but not required. This prevents slots from going unused due to an arbitrary restriction.

---

## Token State Transitions

Token states represent the lifecycle of a patient's visit. Understanding valid transitions is critical for maintaining data integrity.

|Current State|Allowed Transitions|
|---|---|
|WAITING|ALLOCATED, CANCELLED|
|ALLOCATED|COMPLETED, NO_SHOW, CANCELLED, WAITING|
|COMPLETED|(terminal state)|
|NO_SHOW|(terminal state)|
|CANCELLED|(terminal state)|

### ALLOCATED → WAITING Transition

This transition occurs during emergency displacement. When an emergency patient needs a slot, a lower-priority allocated patient is moved back to `WAITING` status, their slot assignment is removed, and the system immediately attempts to reallocate them to another available slot.

---

## Failure Handling and Recovery

The system assumes failure is inevitable: duplicate requests, crashes mid-operation, concurrent slot booking attempts. Every state change is wrapped in a database transaction. Either the operation completes successfully or no change occurs—there are no half-finished states. The database serves as the single source of truth and maintains consistency under concurrent load and failures.

### Failure Scenarios

- **Double-click:** System detects the duplicate idempotency key and ignores the request, returning the result from the original operation.
    
- **Crash during processing:** Database transaction is automatically rolled back. The system shows the last complete, correct state. Recovery is clean with no manual intervention required.
    
- **Network timeout:** Client retries with the same idempotency key. Server recognizes the key and returns the original result without duplicating the operation.
    

---

## Edge Cases and System Behavior

### 1. Multiple Simultaneous Emergencies in Same Slot

**Scenario:** A slot with 10/10 capacity receives two emergency arrivals within 2 minutes.

**Handling:** Both emergencies are accommodated immediately by displacing the two lowest-priority patients (typically walk-ins) to later slots. The slot still has exactly 10 patients—just different patients. Capacity is never exceeded.

**Assumption:** Online booking refers to patients who book online and then come physically to the hospital (not telemedicine). Walk-ins have the lowest priority for displacement.

---

### 2. Emergency Arrival Near Slot End

**Scenario:** Emergency patient arrives at 10:55 AM when the 10-11 AM slot is ending.

**Handling:** Normal allocation logic runs. Depending on hospital policy: squeeze into current slot if the case is quick, or auto-schedule for the next slot start (11:00 AM). Hard capacity is never broken.

**Note:** This is a configurable hospital policy decision.

---

### 3. Mass No-Show Event

**Scenario:** Five patients no-show in the 10-11 AM slot. The next slot (11-12 AM) is full. Walk-in patients are waiting.

**Handling:** Tokens are released immediately, freeing capacity. The system promotes waiting patients into the same slot (10-11 AM) first before considering later slots.

**Key Distinction:** No-shows are detected when the slot is running (delayed detection), not in advance like cancellations. Priority is given to filling the current slot to maximize immediate utilization.

---

### 4. Concurrent Cancellations (Race Condition)

**Scenario:** Patient A cancels and reallocation starts. Patient B cancels before A's reallocation finishes. Both processes might try assigning the same freed slot to different patients.

**Handling:** Database transactions serialize operations. The first succeeds and updates the slot. The second sees the updated state (slot now filled) and finds a different slot or keeps the patient waiting.

**Result:** Zero risk of double-booking despite simultaneous cancellations.

---

### 5. Walk-in Patient Flood

**Scenario:** Twenty walk-in patients arrive at 10:05 AM. The current slot (10-11 AM) has 3 spots remaining.

**Handling:** All 20 patients receive tokens. Only 3 are assigned to the 10-11 AM slot. The remaining 17 enter `WAITING` status. As cancellations or no-shows occur, or as later slots open, waiting patients are promoted according to priority.

**Key Insight:** Token creation is separate from slot assignment. This architecture handles demand spikes without making false promises to patients.

---

### 6. Doctor Delay Spillover

**Scenario:** Doctor scheduled for 10-11 AM arrives at 10:30 AM, causing spillover into the 11-12 AM slot.

**Management Options:**

- Reduce consultation time per patient
- Reduce capacity for the next slot
- Stop accepting new bookings for the affected slot

**What the system does NOT do:** Reschedule already-allocated patients. This would break consistency and create operational confusion. Delays are managed operationally, not by rearranging the schedule.

---

### 7. Paid Priority Domination

**Scenario:** Paid patients monopolize all slots, preventing regular patients from being served.

**Handling:** Configurable cap (e.g., maximum 3 paid patients per slot) reserves capacity for regular patients. Without a cap, pure priority ordering could lead to paid patients filling all available slots.

**Business Decision:** Hospital management must balance revenue generation with fairness and public access obligations.

---

### 8. Duplicate Requests and Mid-Operation Crashes

**Scenario 1:** Network timeout causes the patient to click "Book" again.

**Scenario 2:** Server crashes after database write but before sending the response. Client retries the request.

**Handling:** Every request includes an idempotency key. The server checks if the key has already been processed. If yes, return the previous result. If no, process normally and store the key with the result.

**Result:** Retries don't create ghost bookings or cause double-charges to patients.

---

### 9. End-of-Day Reconciliation

**Scenario:** Tokens in `WAITING` status exist at day's end.

**Handling:** All waiting tokens are automatically terminated. Patients must rebook for the next day.

**Purpose:**

- Prevents state leakage (Monday booking still waiting on Friday)
- Makes capacity problems visible to management (high daily termination rate indicates need for more doctors or hours)

**Assumption:** Each day operates independently, matching standard hospital operations. Consistent demand exceeding capacity is an operational planning issue, not something the booking system should mask with infinite queues.

---

### 10. Cancellation After Slot End

**Scenario:** Patient cancels at 11:30 AM for a 10-11 AM slot that has already ended.

**Handling:** System detects that the slot has passed and skips reallocation entirely. There's no point in filling a slot that's already completed.

**Optimization:** This check prevents wasted database queries and computational overhead for impossible reallocations.

---
