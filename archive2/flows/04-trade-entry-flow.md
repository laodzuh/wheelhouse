# Wheelhouse Trade Entry Flow

Trade entry is the moment where strategy meets reality. It is not a data entry chore — it is a deliberate pause to reconnect with your strategy and thesis. Every field is an opportunity for awareness, and smart nudges transform the experience from logging a trade into a strategic check-in.

**"Auto-import gives you data. Manual entry gives you awareness."**

---

## Entry Point

There is one way to enter a trade: **through the Ticker Thesis View, by tapping a dot.**

- From the Dashboard, tap a wheel → lands on the Ticker Thesis View → tap a dot (idle or active) → Trade Entry opens.
- Three taps from home to logging a trade. Each tap is meaningful: choose the stock, see your thesis and wheel state, choose the contract.
- There are no shortcuts, no "Log a Trade" button on the dashboard, no alternate paths. This is intentional. Every trade passes through the thesis view, which means every time you act, you see your conviction, your rules, and your hero metrics for that stock. The thesis is never out of sight when you're making a decision.
- The app is designed to be so easy to navigate that no one ever feels like they needed a shortcut in the first place.

---

## Flow Steps

### 1. Select Dot (Contract)
- If entering from the dashboard, the user first picks a ticker, then sees the wheel and taps a dot.
- If entering from the ticker thesis view, the dot is already selected.
- **Idle dots** (sitting to the side) come in two states, visually distinct:
  - **Idle with cash** — ready to deploy a new CSP. Dot appears as outlined/empty.
  - **Idle with shares** — owns 100 shares, ready to sell a new CC. Dot appears as filled/solid.
  - When first created during thesis setup, dots default to idle-cash. A user who already owns shares can set them to idle-shares (which prompts for share purchase price to set starting cost basis).
- **Active dots** (on the ring) show their current phase and the valid next actions based on where they are in the cycle.
- The idle sideline doubles as a capital allocation snapshot — at a glance you see how many contracts are in cash versus shares.
- Each dot displays its label on hover/tap: strike + expiry (e.g., "AAPL $180 3/28") so the user always knows which contract they're acting on.

### 2. Trade Type
- Based on the dot's current state, Wheelhouse presents the valid trade types:
  - **Idle-cash dot:** New CSP (deploying capital to sell a put)
  - **Idle-shares dot:** New CC (selling a call against shares you own)
  - **CSP phase dot:**
    - Moves along the ring based on the expiry date.
    - Assigned (dot moves to idle-shares — you now own shares)
    - Expired (dot moves to idle-cash — premium collected, capital freed)
    - Rolled (dot stays on ring in CSP phase, label updates to new contract)
    - Closed (dot moves to idle-cash — contract bought back)
  - **CC phase dot:**
    - Moves along the ring based on the expiry date.
    - Called away (dot moves to idle-cash — shares sold, back to cash)
    - Expired (dot moves to idle-shares — premium collected, still holding shares)
    - Rolled (dot stays on ring in CC phase, label updates to new contract)
    - Closed (dot moves to idle-shares — contract bought back, still holding shares)
- Only valid actions for the dot's current state are shown. No confusion about what's possible.

### 3. Trade Details
- The data fields Wheelhouse needs to power evaluation. Not a full brokerage trade log — just enough to feed the strategy layer.
- **Core fields (always required):**
  - **Strike price** — What strike did you trade at?
  - **Premium collected (or paid)** — How much did you receive? (For early closes and rolls, this might be a debit — premium paid to close.)
  - **Expiration date** — When does this contract expire? (DTE auto-calculated from this.)
  - **Delta at time of entry** — What was the delta when you placed the trade? This is a manual entry and a moment of reflection.
- **Contextual fields (depend on trade type):**
  - **Share purchase price** (for CC-start only) — What did you buy the shares for? Sets the starting cost basis when entering the wheel from the CC side.
  - **Assignment price** (for assignments) — What price were you assigned at?
  - **Call-away price** (for called away) — What price were your shares called away at?
  - **Close price** (for early closes) — What did you pay to close the position?
  - **Roll details** (for rolls) — The old contract details are preserved, new contract details entered. Wheelhouse can show the net credit/debit of the roll.
- **Auto-calculated (not entered by user):**
  - DTE (from expiration date)
  - Premium impact on effective cost basis
  - Running total of premium collected for this ticker

### 4. Smart Nudges (Live Feedback)
- As the user fills in each field, smart nudges appear in context. These are not pop-ups or modals — they're subtle, inline tips anchored to the field being edited.
- **On strike price:**
  - For CSPs: "Your target entry price for this ticker is $175. This strike is $192." (Is the user buying low enough?)
  - For CCs: "Your target exit price is $210. This strike is $195." (Is the user selling high enough?)
- **On delta:**
  - "Your strategy default is 0.15-0.25. This ticker's thesis allows 0.20-0.30. You entered 0.35." (Drift detection in real-time.)
- **On premium:**
  - "This brings your total premium collected on AAPL to $1,240. Your effective cost basis drops to $168.60." (Instant feedback on the hero metric impact.)
- **On expiration:**
  - "Your strategy prefers weekly DTE. This contract is 45 DTE." (Alignment check.)
- Nudges reference the user's own words and rules — strategy parameters, thesis data fields, and prose. They never advise. They reflect.

### 5. Deviation Acknowledgment
- If any field triggers a misalignment with the user's strategy or ticker thesis, and the user proceeds without adjusting, Wheelhouse asks for a brief reason before saving.
- Same pattern as the thesis creation flow — "You're deviating from your stated rules. That's okay. Why?"
- The reason is stored with the trade and becomes available for:
  - Future retrospection on the evaluation screen
  - AI check-ins ("You deviated on delta for the last 3 AAPL trades, each time citing 'premium was too good.' Is your delta range for this ticker still accurate, or should you update it?")
  - Pattern detection over time (are deviations random or systematic?)
- If no deviations are detected, this step is skipped entirely. No unnecessary friction.

### 6. Save Trade
- Trade is saved and the wheel visualization updates immediately:
  - **Idle-cash dot → new CSP:** The dot slides from the side onto the ring, beginning its journey in the CSP phase.
  - **Idle-shares dot → new CC:** The dot slides from the side onto the ring, beginning its journey in the CC phase.
  - **CSP assigned:** The dot moves off the ring to idle-shares (you now own 100 shares, ready to sell a CC).
  - **CSP expired:** The dot moves off the ring to idle-cash (premium collected, capital freed, ready for a new CSP).
  - **CSP closed:** The dot moves off the ring to idle-cash (contract bought back, capital freed).
  - **CC called away:** The dot moves off the ring to idle-cash (shares sold, back to cash, ready for a new CSP).
  - **CC expired:** The dot moves off the ring to idle-shares (premium collected, still holding shares, ready for a new CC).
  - **CC closed:** The dot moves off the ring to idle-shares (contract bought back, still holding shares).
  - **Roll (CSP or CC):** The dot stays on the ring in the same phase but repositions based on the new contract's expiry. Rolling out further slides the dot back along the arc — you can see you just bought more time. Label updates to reflect the new strike and expiry.
- Hero metrics update in real-time: premium collected, effective cost basis, annualized return.
- User lands on the Ticker Thesis View with the updated wheel. They can see the impact of their trade immediately.

---

## Special Case: Rolls

Rolls deserve extra attention because they're the most complex trade type in the wheel and where most trackers get messy.

A roll is really two trades in one: closing the current contract and opening a new one. Wheelhouse handles this as a single entry rather than making the user log two separate trades.

- User selects "Roll" as the trade type.
- Wheelhouse shows the current contract details (the one being closed) for reference.
- User enters the new contract details (new strike, new expiry, new premium).
- Wheelhouse auto-calculates the net credit or debit of the roll.
- The dot stays in the same phase but repositions on the ring based on the new expiry. If you rolled out further in time, the dot visibly slides back along the arc — showing you just extended the contract. The label updates to the new strike and expiry.
- Both the old and new contract details are preserved in the trade history, linked as a roll event.

---

## Design Principles for This Flow

1. **Every field is a moment of awareness.** Manual entry is not friction — it's the product working. The pause to type a delta is the pause to think about the delta.

2. **Smart nudges reflect, never advise.** They surface the user's own words, rules, and targets. "Your strategy says..." not "You should..."

3. **Deviations are captured, not blocked.** The user always has the final say. But if they're going off-script, they articulate why. This builds a retrospection trail that makes the evaluation layer smarter over time.

4. **The dot interaction is the interface.** Tapping a dot on the wheel is how you enter a trade. The dots are the contract management system. No menus, no dropdowns, no abstract IDs. See a dot, tap it, act on it.

5. **Valid actions only.** The trade type options shown are always based on the dot's current state. You can't accidentally log a CC on a contract that's in CSP phase. The system guides without constraining.

6. **Immediate visual feedback.** When you save, the wheel updates. The dot moves. The hero metrics change. You see the impact of your trade in the context of your whole position, not as an isolated line item.

7. **Rolls are first-class citizens.** Rolling is one of the most common actions in wheel trading and one of the hardest to track. Wheelhouse treats it as a single event, not two separate trades, and preserves the full history.
