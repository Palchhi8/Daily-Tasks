# Customer Support Desk: React State & Component Design

A modular, accessible React view built for a **Customer Support Desk** managing **ticket priorities**, **agent assignment**, and **real-time SLA compliance tracking**.

---

## 1. Quick Start & Setup

### Prerequisites
- Node.js (v18.x or v20.x+)
- npm (v9.x+)

### Installation & Run
```bash
# Navigate to project folder
cd customer-support-desk

# Install dependencies (React 19 & Vite)
npm install

# Start development server
npm run dev
# -> Opens http://localhost:5173

# Run automated state ownership and edge-case test suite
npm test

# Build production bundle
npm run build
```

---

## 2. Reusable Component Hierarchy

The UI is built using **5 focused, single-responsibility components**:

```
SupportDeskView (Root Container / State Owner)
 ├── StatsOverview (Aggregated KPI metric cards)
 ├── FilterToolbar (Search query, priority filter, assignee selector, urgent toggle)
 ├── StateView (Polymorphic: Loading Skeletons, Empty Inbox, Error Banner)
 └── TicketCard (Repeated item for each ticket)
      ├── PriorityBadge (Color-coded semantic badge + optional inline escalation menu)
      ├── SlaTracker (Real-time countdown, SLA progress bar, breach warning indicator)
      └── AgentAssigneeDropdown (Roster selector with engineer avatars & departments)
```

| Component | Responsibility | Props Interface |
| :--- | :--- | :--- |
| **`PriorityBadge`** | Renders high-contrast, semantic priority indicators (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`) with optional inline escalation dropdown. | `priority`, `onPriorityChange`, `interactive` |
| **`SlaTracker`** | Calculates and displays live countdown, SLA consumed percentage bar, and overdue breach duration. | `createdAt`, `slaDeadline`, `isResolved` |
| **`AgentAssigneeDropdown`** | Renders current support engineer avatar, name, and interactive team roster dropdown. | `assignedAgentId`, `onAssign` |
| **`TicketCard`** | Composes customer tier, category, title, `PriorityBadge`, `SlaTracker`, and `AgentAssigneeDropdown`. | `ticket`, `onPriorityChange`, `onAssignAgent`, `onToggleResolve` |
| **`StateView`** | Polymorphic component rendering animated Loading Skeletons, Empty State ("Inbox Zero"), and Error State (with retry CTA). | `type`, `title`, `description`, `onAction`, `actionLabel` |

---

## 3. State Ownership Architecture

A core principle of scalable React design is placing each piece of state at the lowest common ancestor while strictly avoiding duplicate state.

```
┌────────────────────────────────────────────────────────────────────────┐
│                   SupportDeskView (Container)                          │
│                                                                        │
│  [CANONICAL STATE]                                                     │
│   • tickets: Array<Ticket>          (Single source of truth)           │
│   • viewMode: 'success'|'loading'|'empty'|'error'                      │
│   • filters: { priority, assignee, onlyBreached, searchQuery }         │
│                                                                        │
│  [DERIVED STATE - via useMemo]                                         │
│   • filteredTickets: tickets filtered by query, priority, and urgency   │
│   • stats: { total, critical, breached, unassigned }                   │
└─────────────────────────────────┬──────────────────────────────────────┘
                                  │ (Props: ticket, onPriorityChange, onAssign)
                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     TicketCard (Presentational)                        │
└──────────────────┬──────────────────────────────────┬──────────────────┘
                   │                                  │
                   ▼                                  ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────┐
│       SlaTracker (Component)         │  │ AgentAssigneeDropdown (Comp) │
│                                      │  │                              │
│  [LOCALIZED ISOLATED STATE]          │  │  [LOCALIZED UI STATE]        │
│   • now: timestamp (1-sec interval)  │  │   • isOpen: boolean          │
│  *Ticking avoids re-rendering parent!*  │  *Controls dropdown popover* │
└──────────────────────────────────────┘  └──────────────────────────────┘
```

### Why State Is Structured This Way:
1. **Lifting State Up (`tickets` & `filters`):**
   - The ticket array is owned exclusively by `SupportDeskView`. When an agent escalates priority in `PriorityBadge` or reassigns an engineer in `AgentAssigneeDropdown`, the mutation bubbles up via callbacks (`handlePriorityChange`, `handleAssignAgent`).
2. **Derived State Avoids Out-of-Sync Bugs (`useMemo`):**
   - `filteredTickets` and `stats` are **never stored in `useState`**. They are computed on the fly using `useMemo`. If a ticket's priority is escalated from `LOW` to `CRITICAL`, the top KPI cards and active filters immediately update without risk of state drift.
3. **Isolating High-Frequency Timer Ticks (`SlaTracker`):**
   - Live countdown clocks require ticking every 1,000ms. If the timer lived in the root container, **the entire ticket list and all sibling cards would re-render every second**.
   - By encapsulating `const [now, setNow] = useState(Date.now())` inside `SlaTracker`, only the timer text inside that specific card updates.

---

## 4. Loading, Empty, and Error States

The top simulator bar allows one-click toggling between all operational states:

1. **Loading State (`viewMode === 'loading'`):**
   - Renders 3 pulse-animated skeleton ticket cards replicating the exact layout of real tickets to prevent Cumulative Layout Shift (CLS).
2. **Empty State (`viewMode === 'empty'` or no filter matches):**
   - Renders an informative "Inbox Zero / No Matching Tickets" view with a clear CTA to reset filters.
3. **Error State (`viewMode === 'error'`):**
   - Simulates a 503 API Gateway Timeout from the ticket microservice, displaying a high-contrast warning banner and a `🔄 Reconnect and Retry` button.

---

## 5. Demonstration of the Edge Case

### Edge Case: **Retroactive SLA Breach on Priority Escalation Mid-Flight**

#### The Scenario:
1. A customer opens a ticket (`TICK-1085`) 5 hours ago with `LOW` priority (SLA policy: 48 hours). The SLA deadline is comfortably in the future (+43 hours remaining, green bar).
2. The customer suddenly updates the ticket reporting a total production outage.
3. A support engineer escalates the priority to **`CRITICAL`** (SLA policy: 1 hour).

#### The Glitch in Naive Implementations:
- When the deadline is recalculated from the original creation time ($T_0 + 1\text{ hour}$), the deadline is suddenly **4 hours in the past**!
- Naive countdown timers display negative durations (e.g. `"-240 mins remaining"`), produce `NaN%` progress bar widths, or crash the UI.

#### Our Robust Handling:
- In `SupportDeskView.jsx` and `SlaTracker.jsx`:
  - `percentConsumed` clamps cleanly to `100%` (`Math.min(100, ...)`).
  - The tracker immediately flips to `SLA BREACHED (+4h 00m ago)` in pulsating crimson red.
  - The card receives an urgent `critical-glow` border, and the top KPI metric card immediately increments the `Critical` and `Breached` counters.
- **How to test it:** Click the **`⚡ Demonstrate Edge Case`** button in the top simulator bar!

---

## 6. Verified Screenshot

- **Screenshot File:** [support_desk_screenshot.png](file:///c:/Users/jainp/OneDrive/Desktop/Daily-Tasks/customer-support-desk/support_desk_screenshot.png)
