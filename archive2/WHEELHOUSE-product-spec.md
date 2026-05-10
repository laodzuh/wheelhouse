# WHEELHOUSE
### Product Specification

**The Strategic Companion for Wheel Traders**
**v0.2 — March 2026**

## North Star

Wheelhouse helps wheel traders write their strategy, build ticker theses, evaluate whether their execution is honoring both, and measure they're performance through hero metrics.

Wheelhouse is **_not_** a trade tracker. It is a strategic companion. Where every other tool on the market is a ledger, Wheelhouse is the layer above the ledger. It does not compete with your brokerage. It does not try to replace Fidelity or your spreadsheet. It is the strategic intelligence layer that sits on top of both, giving you the one thing neither can provide: a clear, honest view of whether you are executing your own strategy well.

## Core Philosophy

### Not Another Ledger
Fidelity handles the ledger. Your spreadsheet handles overflow calculations. Wheelhouse side-steps the complexity of connecting lots across rolls and time by not trying to be a complete transaction history. Instead, it captures just enough trade data to power the strategy evaluation layer. Trades are not the product. Trades are evidence fed into the system so it can answer the only question that matters: are you honoring your strategy?

### Strategy Over Trades
The atomic unit of Wheelhouse is not a trade. It is a strategy. Everything in the product is organized around helping you define, refine, and evaluate your strategic approach to the wheel. A trade tracker asks what happened. Wheelhouse asks whether what happened is what you intended, and helps you get better over time.

### The Wheel is a Cycle, Not a Row
The wheel is not a series of disconnected trades. It is a continuous cycle: sell a cash-secured put, potentially get assigned, sell a covered call, potentially get called away, repeat. CSPs and CCs are not separate trades. They are two phases of the same cycle, and each phase may have many CSPs or CCs in a row before turning over to the next phase. Wheelhouse treats them that way, visually and structurally.

## The Four Pillars

Wheelhouse is built on four interconnected pillars that map to the complete lifecycle of disciplined wheel trading.

|  Pillar | Purpose | User Question being answered |  
| ------- | ------- | -----------------------------|  
| Strategy | Define your rules and approach as a wheeler | What am I doing? |  
| Ticker Thesis | Document conviction criteria for each stock you wheel | Why am I doing it now?|  
| Evaluation | Assess whether trades reflect strategy & thesis | Am I doing it? |
| Performance | Measure outcomes through hero metrics | Is doing it valuable? |


### Strategy
Your strategy is your constitution as a wheeler. It is the set of rules and principles you commit to before any individual trade. Wheelhouse helps you write this down, keep it visible, and hold yourself to it over time.
Strategy elements might include your general approach to delta selection, your preferred DTE range, your criteria for choosing which stocks to wheel, your rules around rolling, your risk management boundaries, and your capital allocation approach. The strategy is the reference point everything else is measured against.

### Ticker Thesis
Before you wheel a stock, you should know why. The ticker thesis is a structured document for each position that captures your conviction and criteria. It has three layers:

- Data fields: Strict, measurable rules. These become the guardrails Wheelhouse can evaluate against programmatically.
	- Target exit price (CC floor — the lowest you'd sell at, enforcing "sell high"),
	- Strike ceiling (CSP — the highest you'd buy at, enforcing "buy low"),
	- Max acceptable loss,
	- Delta range, and
	- DTE preferences.

- Prose: The conviction narrative. This is the human judgment layer that cannot be reduced to a number.
	- Why do you believe in this stock?
	- What is the macro thesis?
	- What would invalidate it?
This is the human judgment layer that cannot be reduced to a number.

- AI feedback loop: Powered by the Anthropic API, this layer reads both your data fields and your prose. It can:
	- Flag trades that violate your own rules.
	- Periodically review whether your thesis still holds.
	- Push back with questions when you are writing a new thesis.
	- Summarize performance in plain language.

Wheelhouse guides users toward a more complete thesis through structure. It does not tell you what to think. It asks the right questions before you start wheeling a ticker. Things like: Why do you believe in this stock? What is your target exit price? What would change your mind? How long are you willing to hold if it goes against you?
For the solo retail trader, there is no investment committee, no partner, no accountability. Wheelhouse becomes that voice.

### Evaluation
The evaluation layer answers two distinct questions:

- Am I honoring my strategy?
	- Are your trades reflecting your stated rules?
	- Are you staying disciplined on delta, cycling efficiently, keeping capital deployed?

- Is my thesis on this ticker playing out?
	- Is the stock behaving as expected?
	- Is your basis actually eroding?
	- Has something changed that invalidates the thesis?

The trades you enter are not to build a ledger. They are evidence you feed the system so it can evaluate your strategy and thesis. Wheelhouse surfaces the few data points your brokerage buries or ignores entirely, especially premium collected and effective cost basis.

### Performance
Inspired by the Whoop model: glance and know. You open Wheelhouse and before you do anything, three numbers tell you how your wheel game is going. No digging required. Each metric is also a doorway into deeper data when you have time to explore.

|  Metric | What it tells you | The Whoop Parallel |  
| ------- | ------- | -----------------------------|  
| Premium Collected | How much value you are generating, total, per-ticker, per-cycle, over time? | Strain |  
| Effective Cost Basis | What are you really in this stock for? Every premium collected pushes this number down. | Recovery |  
| Annualized Return on Capital | How hard is your money working? Is the opportunity cost worth it? | Sleep |


## Key UI Concepts

### The Wheel Visualization
This is the soul of the product and its brand identity. Every other app shows trades as rows in a table. Wheelhouse shows the wheel as an actual wheel.

The wheel visualization is a circular representation of the wheel cycle for each position. It shows the current phase (CSP or CC), a dot or marker that moves along the ring representing time-to-expiration counting down, visual transitions when a trade moves from CSP phase to assignment to CC phase to called away and back again, and visual feedback for events like rolls and early closes, each with their own distinct animation or marker on the ring. In the center of the wheel you can see the hero metrics for that specific wheel.

Each ticker has one wheel — one ring. When a user is wheeling multiple contracts on the same stock, each contract is represented as its own dot on that shared ring. The dots move independently through the cycle based on their own expiration, phase, and lifecycle. If you sell 5 CSPs on AAPL, you see 5 dots starting together. When 3 get assigned and move to CC phase while 2 expire and restart as new CSPs, the dots diverge — telling the full story of that position at a glance. Hovering over any dot reveals its contract ID and details. This keeps the dashboard clean (one wheel per ticker, not per contract), avoids the mess of partial assignment math, and makes batch entry natural — "I sold 5 CSPs on AAPL" simply creates 5 dots on the same ring.

This is not just a UI choice. It is the core metaphor that makes Wheelhouse instantly recognizable. It transforms the wheel from an abstract concept into something you can see, feel, and understand at a visceral level. This is the thing people will screenshot and share.

### Smart Nudges
Contextual tips and guidance that appear near data fields when users are entering data. Not a static help page buried in a menu, but the app whispering helpful context right at the moment of decision or review.

For example, when entering a CC strike, Wheelhouse might surface your thesis target exit price and note the gap. When selecting a delta, it might remind you of your stated strategy range. When you have had cash sitting idle, it might nudge you about deployment. The AI feedback loop powers the intelligence behind these nudges, but the UX is lightweight and non-intrusive, more like a tooltip than a dialog box.

### Progressive Education
Available learning modules that demystify and educate users at every step, designed like a video game tutorial system. Experienced wheelers can skip it entirely and get a clean power-user experience. Newer traders can learn things like what delta means, why strike selection matters, and why they should have a thesis, all in context as they use the product.

This is a significant differentiator because most wheel traders are self-taught from Reddit threads and YouTube videos. A product that teaches while you trade fills a real gap in the market.

## Core Screens (Conceptual)

These are the primary views that emerge naturally from the four pillars and the UI concepts above. Detailed wireframes and flows are a next step.

### Dashboard (Home)
The Whoop-style landing screen. Three hero metrics front and center. At a glance, you know how you are doing. Below or around the hero metrics, a summary of active positions with their wheel visualizations, any smart nudges or alerts that need attention, and quick access to enter a new trade or review a thesis.

### Strategy View
Your written strategy document. Editable, versioned over time. This is where you define your rules and Wheelhouse holds you to them. Could include both structured fields (delta range, DTE preferences) and free-form prose sections. An AI chat icon to call up Claude to discuss your strategy with as-needed.

### Ticker Thesis View
Per-stock deep dive. Shows the three-layer thesis (data fields, prose, AI feedback), the wheel visualization for that position, trade history as events on the wheel timeline, and the hero metrics scoped to this specific ticker. The AI layer can flag misalignments with strategy before you save, and can be recalled later for check-in's as-needed.

### Trade Entry
Streamlined input focused on the data Wheelhouse actually needs, not a full brokerage-level trade log. Smart nudges appear here in context. The AI layer can flag misalignments with strategy or thesis before you even save.

### Evaluation / Performance View
The strategic mirror. Shows how your execution compares to your stated strategy over time. Surfaces patterns: are you drifting on delta, are certain tickers underperforming their thesis, is your capital utilization declining? This is where the AI feedback loop does its deepest work.

## What Wheelhouse Is Not

Clarity on scope is as important as clarity on vision. The following are explicit non-goals for the product:
- Not a brokerage replacement. Wheelhouse does not execute trades, connect to brokerage APIs for automatic import, or attempt to be a complete transaction ledger.
- Not a general options tracker. This is exclusively for the wheel strategy. CSPs and CCs only. No spreads, no iron condors, no strangles. Although, we may support more types of options in the distant future once Wheelhouse is the premier strategy companion app for wheel traders first.
- Not a stock screener. Wheelhouse does not recommend which stocks to wheel. It helps you evaluate and track the ones you choose.
- Not a ledger. Trade data entry exists to feed the evaluation engine, not to replace your brokerage statements or spreadsheet.

## Technical Direction

The current codebase is a Vite + TypeScript application. When we begin to build again, we are open to starting completely fresh based on what would be best for this new, more defined direction for Wheelhouse. Key technical considerations going forward:
- Anthropic API integration: For the AI feedback loop across strategy writing, thesis review, trade evaluation, and smart nudges.
- Local-first data: Consider whether trade and thesis data should be stored locally (privacy, simplicity) or cloud-synced (multi-device access).
- Wheel visualization: Will require a canvas-based or SVG-based rendering approach for the circular wheel animation with time-decay dot movement.
- Progressive education system: Needs a flexible content framework that can be toggled on/off and does not clutter the UI for advanced users.

## The Decision Filter

Every feature decision should pass through one question:

**Does this help the user honor their strategy and thesis, or is it just ledger creep?**

If a proposed feature does not clearly serve the north star, it does not belong in Wheelhouse. This filter protects the product from becoming yet another tracker that tries to do everything and does nothing well.

## Next Steps
- Map detailed screen wireframes and user flows
- Define the ticker thesis template structure (data fields + prose prompts)
- Prototype the wheel visualization concept
- Design the smart nudge system and trigger logic
- Plan the Anthropic API integration points for the AI feedback loop
- Define the progressive education content framework
- Establish the data model for strategy, thesis, and trade evidence
