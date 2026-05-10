# Wheelhouse Core Navigation Flow

How the main screens of Wheelhouse connect once you're past onboarding. The five primary screens and how a user naturally moves between them.

---

## The Five Screens

### 1. Dashboard (Home)
The hub. Everything radiates from here.

- **What you see:** Three hero metrics front and center (Premium Collected, Effective Cost Basis, Annualized Return on Capital). Below that, your active wheels — each one showing the wheel visualization for that position with its current phase and time-to-expiry dot.
- **What you can do:**
  - Tap any wheel → goes to that Ticker Thesis view (and from there, tap a dot to enter a trade)
  - "View Strategy" → goes to your Strategy
  - "View Performance" → goes to the Evaluation screen
  - "Add New Ticker" → goes to the guided New Thesis creation flow
- **No shortcuts.** There is no "Log a Trade" button on the dashboard. The path to trade entry always flows through the ticker thesis view. This is intentional — every trade passes through your thesis so you never act without seeing your conviction, your rules, and your wheel state. The app is designed to be so easy to navigate that shortcuts are unnecessary.
- **Smart nudges live here too.** If cash has been idle, if a thesis needs review, if a position is nearing expiry — the dashboard surfaces it without you having to dig.

### 2. Strategy
Your constitution as a wheeler. The rules you set during onboarding (or refined since).

- **What you see:** Your named strategy with all its parameters — delta range, DTE preferences, risk profile, position sizing rules, stock selection criteria, income goals. Each parameter has a tooltip explaining the scale and tradeoffs.
- **What you can do:**
  - Edit any parameter (with the tooltip/education right there)
  - View how the strategy is performing → goes to Evaluation
  - Back to Dashboard
- **Key principle:** This screen is always one tap away. Your strategy should never feel buried or forgotten. It's the reference point for everything.

### 3. Ticker Thesis (Per-Stock Deep Dive)
The most content-rich screen. Everything about your relationship with one stock.

- **What you see:**
  - The wheel visualization for this position — large, detailed, showing the full cycle history
  - The three-layer thesis: data fields (target exit, strike floor, delta range for this ticker, etc.), prose (your conviction narrative), AI feedback (insights, flags, questions)
  - Hero metrics scoped to this ticker (premium collected from this stock, effective basis on this position, annualized return on this wheel)
  - Trade history shown as events on the wheel timeline, not rows in a table
- **What you can do:**
  - Tap a dot (idle or active) → goes to Trade Entry for that contract, pre-filled with this ticker. This is the only way to enter a trade — through the thesis view, through a dot.
  - Check strategy alignment → goes to Strategy (to compare your thesis choices against your stated rules)
  - View this ticker's performance → goes to Evaluation filtered to this position
  - Edit the thesis (data fields, prose)
  - Add a new contract → creates a new idle dot on the sideline
  - Remove an idle contract → removes a dot from the sideline (only idle dots can be removed — active dots must complete their current contract first)
- **This is where the per-ticker questions live.** How do you feel about owning 100 shares of THIS stock? What's your assignment comfort for THIS position? These questions moved out of onboarding and into thesis creation, right where they belong.

### 4. Trade Entry
Streamlined input. Not a brokerage-level trade log — just enough data to feed the evaluation engine.

- **What you see:** A clean form focused on what Wheelhouse needs: ticker, trade type (CSP or CC), strike, premium collected, expiration date, and maybe a couple of optional fields.
- **What happens:**
  - Smart nudges appear in context as you enter data. "Your thesis target for this stock is $150 — this CC strike is $115. Intentional?" or "This delta is outside your stated strategy range."
  - Strategy-aligned ticker flagging: if the stock's option chain doesn't match your strategy (e.g., no weekly expirations when you prefer weekly), it flags this.
- **Where you go after:**
  - Trade saved → goes to the Ticker Thesis view for that stock (so you can see how the wheel visualization updated)
  - Back → returns to Dashboard
- **Key principle:** Trade entry is a moment of awareness, not just data input. The act of manually entering a trade is an opportunity to reconnect with your strategy and thesis. Smart nudges transform each field into a micro check-in — surfacing your own rules and targets right when you need them most. You're not just logging what happened. You're pausing to ask whether what happened is what you intended.

### 5. Evaluation (Strategic Mirror)
The big-picture performance view. Not just numbers — a narrative.

- **What you see:**
  - Overall strategy performance: are your trades reflecting your stated rules over time?
  - Patterns and trends: delta drift, thesis hit rates, capital utilization, cycle efficiency
  - AI-powered insights: "You've been going more aggressive on delta the last month" or "Three of your positions have stalled basis erosion — might be time to review those theses"
  - Per-ticker performance summaries with the ability to drill into any one
- **What you can do:**
  - Drill into a specific ticker → goes to Ticker Thesis
  - Review your strategy → goes to Strategy (to see if the strategy itself needs updating based on what you're learning)
  - Back to Dashboard
- **Key principle:** This screen is the honest mirror. It doesn't just show you numbers — it shows you the gap between who you said you'd be as a trader and who you're actually being. That's the whole product.

---

## Navigation Principles

1. **Dashboard is always home.** Every screen has a path back to the dashboard. It's the hub, not a waypoint.

2. **Everything connects to everything.** Strategy, thesis, trades, and evaluation aren't siloed sections — they're perspectives on the same thing. You should be able to flow between them naturally based on what question you're asking.

3. **Context carries forward.** When you go from a ticker thesis to trade entry, the ticker is pre-filled. When you go from evaluation to a thesis, you're already filtered to that stock. No re-navigating, no lost context.

4. **Smart nudges are everywhere, not just one screen.** They appear on the dashboard (alerts), in trade entry (warnings), on thesis views (reviews), and in evaluation (insights). The AI feedback loop touches every screen. They are visualized subtly through a unique icon so that they're easily found and used but also easily ignored if the user is not interested. It shouldn't feel like they are being bombarded with pop-ups. The Claude * is a good example of an icon for this.

5. **The wheel visualization is the anchor.** On the dashboard it's a summary. On the ticker thesis it's the hero. On trade entry it updates in real-time. It's the consistent visual language that ties the whole app together.

6. **Depth is always optional.** A user who just wants to glance at hero metrics and log a trade can do that in 30 seconds. A user who wants to deep-dive into thesis evaluation and strategy refinement can spend an hour. Same app, different depths.
