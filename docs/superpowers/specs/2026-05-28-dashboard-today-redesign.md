# Dashboard Today Page Redesign

**Date:** 2026-05-28
**Scope:** Redesign the Today view (`components/vibeops/dashboard/today.tsx`) to be the definitive first-load experience — morning brief overlay, sparkline stats, AI activity feed, and a plain-language priority queue.

---

## Goals

1. When a user opens the dashboard they immediately know: **what the AI did** and **what they need to do right now**
2. Stats feel alive — trending, not just static numbers
3. Language is plain — no jargon, no ambiguous status labels
4. Actions are inline — approve, send, review without navigating away

---

## Layout

```
┌────────────────────────────────────────────────────────┐
│  MORNING BRIEF OVERLAY (white bg, black text)          │
│  "Good morning, Alex. Here's your day."                │
│  [● Review PeakFit] [● Aster Legal reply] [● New lead] │
│                                          [Dismiss]      │
└────────────────────────────────────────────────────────┘

[Handled 12 ↑] [Ready to send 5] [Active leads 8 ↑] [Response rate 94%] [Avg reply 2h ↓]

┌──────────────────────────┬──────────────────────────┐
│  AI Activity (60%)       │  Your Queue (40%)        │
│  Tabs: All/Sent/Pending  │  2 decisions needed      │
│                          │  3 replies ready to send │
│  channel icon + client   │  1 person to reach out   │
│  + summary + time        │  2 coming up             │
│  + expand inline         │                          │
└──────────────────────────┴──────────────────────────┘
```

---

## Section 1 — Morning Brief Overlay

**Behaviour:**
- Renders as a full-screen overlay on top of the dashboard on first load of the day
- White background, black text — clean, high contrast
- Dismissed state stored in `localStorage` with a date key (`vibeops_brief_dismissed_YYYY-MM-DD`) — reappears each new day
- Clicking a chip scrolls to and highlights the corresponding item in the queue below after dismissal
- Clicking "Dismiss" or pressing Escape closes the overlay

**Layout:**
- Centered card, max-width `560px`, rounded-2xl, shadow-2xl
- Top: greeting line — `"Good morning, [firstName]."` (time-aware: morning/afternoon/evening)
- Middle: one AI-written summary sentence describing the day in plain English
- Bottom: up to 3 action chips in primary color, each showing `client name · what to do`
- Bottom-right: `"Get started →"` button (dismisses + scrolls to queue)

**Chip content (derived from queue data):**
1. First "Your call needed" item (if any)
2. First "Ready to send" item (if any)
3. First "Reach out today" item (if any)

---

## Section 2 — Sparkline Stats Row

5 stat cards in a horizontal row, each containing:
- **Big bold number** (foreground color)
- **Label** (muted, small)
- **7-point sparkline** — pure SVG path, no chart library, uses the last 7 days of mock data
- **Trend indicator** — arrow icon + percentage change vs last week, color-coded (green = good, red = bad, muted = flat)

**Stats:**
| Stat | Good direction | Color when good |
|------|---------------|-----------------|
| Conversations handled | Up | Emerald |
| Replies ready to send | Down (cleared) | Amber when >0 |
| Active leads | Up | Primary |
| Response rate | Up | Emerald |
| Avg reply time | Down (faster) | Emerald |

---

## Section 3 — AI Activity Feed (left, 60%)

**Header:** "AI Activity" + filter tabs: `All` · `Sent` · `Pending` · `Flagged`

**Each row:**
- Channel icon (Gmail SVG, WhatsApp SVG, etc.) in a rounded icon box
- Client name (bold) + summary of what AI did (muted)
- Time (right-aligned, muted)
- Status chip (plain language — see below)

**Status chip labels:**
| Old | New |
|-----|-----|
| Handled | Sent |
| Draft ready | Pending approval |
| Flagged | Needs your call |

**Expanded state (click row):**
- Inline preview block showing the client's original message + AI's draft
- For "Pending approval": `Approve & Send` (primary) + `Edit` (outline) buttons
- For "Needs your call": `Review` (primary) + `Ignore` (ghost) buttons

---

## Section 4 — Your Queue (right, 40%)

**Header:** "Your queue" + total count badge

**Groups (in order, plain-language headers):**

### 🔴 Decisions needed
- Red left border on each card
- Header chip: `"2 decisions needed"`
- Each item: client name + one-line description of what the AI stopped on + `Review` button
- Meaning: AI held a reply and needs a human to decide

### 🟡 Ready to send
- Amber left border
- Header chip: `"3 replies ready to send"`
- Each item: client name + subject line + `Send` button + `Edit` link
- Meaning: AI drafted a reply, waiting for one-tap approval

### 🔵 Reach out today
- Blue left border
- Header chip: `"1 person to reach out today"`
- Each item: client name + why (e.g. "Proposal sent 3 days ago — no reply") + `Draft reply` button

### ⚪ Coming up
- Muted border, visually quiet
- Header chip: `"2 coming up this week"`
- Each item: client name + due date + action
- No action button — informational only

**Empty state:** When queue is clear: `"Nothing needs attention — AI has it covered ✓"` in muted text with a small checkmark icon.

---

## Data

All data is mock for now. The structure is designed so that real data from InsForge can replace it later without component changes — the component accepts props, mock data lives in the same file as constants.

---

## Files

| File | Change |
|------|--------|
| `components/vibeops/dashboard/today.tsx` | Full rewrite — morning brief overlay + sparkline stats + activity feed + queue |

No other files need to change. The overlay, stats, feed, and queue are all self-contained within `today.tsx`.

---

## Out of scope

- Real AI-generated brief text (uses static template string for now)
- Real sparkline data from InsForge (uses hardcoded 7-point arrays)
- Actual send/approve actions wired to Gmail API (buttons are UI-only)
