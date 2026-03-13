# Wheelhouse Evaluation & Performance Flow

This is the honest mirror. The screen where all the data from your strategy, theses, and trades converges to answer two questions — one from each of the final two pillars:

**Evaluation:** Am I doing it? (Am I honoring my strategy and theses?)
**Performance:** Is doing it valuable? (Are my hero metrics where I want them?)

---

## Entry Point

From the Dashboard, tap "View Performance" → lands on the Evaluation Home.

This screen can also be reached from the Strategy View ("View how the strategy is performing") or from the Ticker Thesis View ("View this ticker's performance").

---

## The Two Lenses

Evaluation and Performance are two lenses on the same data. They're not separate tabs — they're interwoven on the same screen. But they answer fundamentally different questions.

### Evaluation Lens: "Am I Doing It?"
This lens compares your actions against your words. It looks at what you said you'd do (strategy + theses) versus what you actually did (trades).

- **Strategy adherence over time:** Are your trades staying within your stated rules, or are you drifting?
  - Delta drift: are your actual deltas trending away from your strategy range?
  - DTE drift: are you trading different expirations than you planned?
  - Position sizing: are you concentrating more than your strategy allows?
  - Capital utilization: is your money working or sitting idle?

- **Thesis adherence per ticker:** Is each position honoring its thesis?
  - Are your strikes respecting your target entry/exit prices?
  - Are you sticking to the delta range you set for this specific ticker?
  - Has anything changed that should trigger your invalidation signal?

- **Deviation patterns:** You've been logging reasons for deviations along the way. Now they aggregate into patterns.
  - "You deviated on delta 6 times in the last month, citing 'premium was too good' each time. Your actual average delta is 0.31 — your strategy says 0.15-0.25. Is your strategy still accurate, or are you learning that you're more aggressive than you thought?"
  - This is not judgment. It's a mirror showing the gap between intention and behavior.

### Performance Lens: "Is It Valuable?"
This lens looks at outcomes. Not whether you followed the rules, but whether the rules are producing results.

- **Hero metrics at portfolio level:**
  - Premium collected (total, monthly trend, per-ticker breakdown)
  - Average basis reduction percentage across all positions
  - Annualized return on capital (are you on pace for your income goals?)

- **Hero metrics per ticker:**
  - Premium collected from this wheel
  - Effective cost basis and how far it's eroded
  - Annualized return on this specific position

- **Goal tracking:**
  - During onboarding, the user set income targets. Performance shows whether they're on pace.
  - "Your goal is $500/month in premium. You're averaging $420. Here's what's contributing and what's lagging."

- **Comparative insights:**
  - Which tickers are your best performers? Which are dragging?
  - Are shorter DTE trades outperforming longer ones for you?
  - Is your capital working harder in some positions than others?

---

## Screen Structure

### Evaluation Home (Portfolio-Wide View)
The landing view when you tap "View Performance" from the dashboard. Shows the big picture across your entire portfolio.

- **What you see:**
  - Hero metrics at the top (same three as the dashboard, but here they're surrounded by context and trends)
  - Strategy adherence summary: a simple health indicator showing how well your recent trades align with your strategy. Not a score — more like "5 of your last 8 trades were within strategy parameters" or a visual trend showing drift over time.
  - Thesis health overview: a per-ticker summary showing which positions are on-thesis and which might need attention.
  - AI insights section: narrative observations surfaced by Claude. These are the deeper pattern recognitions — things you might not notice from individual trades.
  - Income goal progress (if the user set targets during onboarding).

- **What you can do:**
  - Drill into any ticker → Ticker Evaluation view
  - Review or edit strategy → Strategy View
  - Open AI chat → discuss patterns, get narrative feedback, ask questions

### Ticker Evaluation (Per-Stock Deep Dive)
Reached by drilling into a specific ticker from the portfolio view, or by tapping "View this ticker's performance" from a Ticker Thesis View.

- **What you see:**
  - Hero metrics scoped to this ticker
  - Thesis adherence: how well your trades on this stock match the thesis you wrote. Are you hitting your target entry/exit prices? Staying within your per-ticker delta range?
  - Trade history visualized on the wheel timeline — not just what happened, but how each trade related to your thesis at the time.
  - Deviation history: every time you deviated from strategy or thesis on this ticker, with the reasons you entered. Patterns emerge here.
  - AI feedback specific to this position: "Your basis has stalled for 6 weeks. Your thesis said you'd reconsider if basis erosion stopped. Is it time to revisit?"

- **What you can do:**
  - Jump to the full Ticker Thesis View for complete context
  - Back to portfolio view

### AI Insights (On-Demand Chat)
Available from anywhere in the evaluation screen via the AI chat icon. This is where the Anthropic API integration does its deepest work.

- **What the AI can do:**
  - Summarize your performance in plain language — not just numbers but narrative.
  - Surface patterns across your entire portfolio that you might not see from individual trades.
  - Reference your deviations and the reasons you gave — "You keep citing 'high IV environment' as a reason for aggressive delta. Here's how those trades actually performed versus your on-strategy trades."
  - Prompt thesis reviews: "You wrote your AAPL thesis 4 months ago. A lot has changed. Want to revisit it?"
  - Answer questions: "How am I doing compared to my goal?" or "Which ticker should I pay attention to?"
- **What the AI never does:**
  - Recommend specific trades, stocks, or strategies.
  - Tell you what to do. It reflects, questions, and surfaces — it doesn't direct.
  - Grade you or score your performance. It's a mirror, not a teacher.

---

## Cadence: Weekly Reviews & Quarterly Retrospectives

Wheelhouse encourages two evaluation rhythms. These aren't optional features — they're the recommended practice baked into the product's structure.

### Weekly Review
- The default view when you open the evaluation screen.
- Scoped to the current week.
- Quick, focused: How did this week go? Am I staying on strategy? Any nudges or deviations to address?
- How much money did I make this week?
- How much did my avg. effective cost basis change this week?
- Designed for a 5-10 minute check-in.

### Quarterly Retrospective
- A dedicated deeper view, clearly accessible from the evaluation screen.
- Scoped to the last 3 months.
- The deep reflection: How has my strategy held up? Are my theses still valid? What patterns have emerged in my deviations? Have I grown as a trader?
- This is where the AI feedback loop does its heaviest lifting — summarizing trends, surfacing patterns, prompting thesis reviews, and asking the hard questions.
- How much did I make this quarter?
- How much did my avg. effective cost basis change this quarter?
- What is my annual forecast?
- Designed for a 30+ minute session.

Wheelhouse is not just a tool you use when you trade. It's a practice. Weekly reviews and quarterly retros are habits that make you a better trader, and the product is structured to encourage them.

---

## When Does the User Come Here?

The evaluation screen serves different purposes depending on when the user visits:

- **Quick glance (30 seconds):** Hero metrics on the dashboard already cover this. But if you tap into evaluation, the weekly view gives you a fast read on strategy adherence.
- **Weekly review (5-10 minutes):** The primary use case. Look at this week's trades, check deviation patterns, see if any theses need attention. Build the habit.
- **Quarterly retrospective (30+ minutes):** The deep session. Open the AI chat, discuss patterns, review theses, consider strategy adjustments. This is where real growth happens — the session where you zoom out and see who you're becoming as a trader.

---

## The Feedback Loop

The evaluation screen is not a dead end. It drives action.

- See that your delta is drifting? → Navigate to Strategy View to either adjust your range or recommit to discipline.
- See that a thesis is underperforming? → Navigate to Ticker Thesis View to revisit your conviction or adjust your data fields.
- See that you're behind on income goals? → Review which tickers are lagging and whether your capital is deployed efficiently.
- See a pattern in your deviations? → Maybe the deviation is the real strategy and your written strategy needs updating to match reality.

That last point is important. The evaluation layer doesn't assume the written strategy is always right. Sometimes the mirror shows you that you've organically evolved beyond your stated rules — and the right move is to update the strategy to match who you've become as a trader, not to force yourself back into old parameters.

---

## Design Principles for This Flow

1. **Two lenses, one screen.** Evaluation (am I doing it?) and Performance (is it valuable?) are interwoven, not separate. A user shouldn't have to choose which question to ask — they see both answers together.

2. **Narrative over numbers.** Raw data is available, but the primary experience is narrative. AI insights tell you the story of your trading in plain language. Numbers support the story — they don't replace it.

3. **The mirror doesn't judge.** Evaluation shows the gap between intention and action. It doesn't label it good or bad. A deviation might be growth. Sticking to a bad strategy isn't discipline — it's stubbornness. The mirror shows you the truth; you decide what it means.

4. **Patterns matter more than individual trades.** One deviation means nothing. Twelve deviations with the same reason is a signal. The evaluation layer is optimized for pattern recognition over time, not trade-by-trade grading.

5. **Drive action, not guilt.** Every insight should have a natural next step — a thesis to revisit, a strategy parameter to adjust, a position to pay attention to. The evaluation screen is a launchpad, not a report card.

6. **Depth is always optional.** A 30-second glance and a 30-minute deep dive use the same screen. The hero metrics are always visible. The AI insights are always available. How deep you go is up to you.
