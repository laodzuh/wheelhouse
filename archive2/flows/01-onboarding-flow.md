# Wheelhouse Onboarding Flow

The onboarding is a conversational experience — not a form. It feels like talking to a knowledgeable friend who's getting to know you as a trader. Behind the scenes, every answer is being translated into technical strategy parameters.

---

## Flow Steps

### 1. Welcome Screen
- Warm, simple intro. "Welcome to Wheelhouse."
- Brief one-liner about what this is: your strategic companion for the wheel.
- Single CTA: "Get Started"

### 2. Who Are You
- Name (what should we call you?)
- Experience level — but asked naturally:
  - "Have you run the wheel before, or are you just getting started?"
  - Options feel like conversation, not a dropdown: "I'm brand new" / "I've done a few trades" / "I've been wheeling for a while"
- **Behind the scenes:** Sets experience level flag, which controls progressive education depth throughout the app.

### 3. Why Are You Here
- What brought you to Wheelhouse? (multi-select or conversational)
  - Generate consistent income
  - Learn the wheel strategy
  - Get more disciplined about my trading
  - Track my performance better
  - Build real conviction in my stock picks
  - Accumulate shares at better prices
- **Behind the scenes:** Shapes which features get highlighted, what nudges feel relevant, and the tone of AI feedback.

### 4. Income Targets
- "Do you have an income goal from wheeling?"
  - Monthly target / Annual target / "Not really, just want to grow"
- "How important is hitting that number versus growing your skills?"
  - Scale from income-focused to growth-focused
- **Behind the scenes:** Feeds into evaluation metrics — Wheelhouse can later tell you if you're on pace for your stated goals.

### 5. Your Trading Life
- "Where do you trade?" (Fidelity, Schwab, TD, etc.)
  - Helps Wheelhouse understand what the user already sees in their brokerage vs. what's missing
- "Roughly how much capital are you working with for wheeling?"
  - Optional, framed gently: "This helps us give you relevant context — you can skip this."
  - Ranges, not exact numbers: Under $10k / $10-50k / $50-100k / $100k+
- **Behind the scenes:** Capital range affects which stocks are realistic to wheel (you need 100 shares or cash-secured puts). Informs smart nudges about position sizing.

### 6. Risk & Comfort
Strategy-level temperament questions only. No per-ticker or options-jargon questions here.

- "When the market drops and your positions are red, what's your instinct?"
  - "Stay the course — I trust my picks and keep collecting premium" → patient, high conviction
  - "Depends on why it's dropping — I want to understand before I react" → thesis-driven (great signal)
  - "I get uncomfortable and want to cut losses quickly" → tighter risk tolerance, lower max-loss thresholds

- "What matters more to you — generating regular income from premium, or building long-term positions in stocks you believe in?"
  - "Income first" → premium-focused strategy, may favor higher delta for more premium
  - "Building positions" → accumulation-focused, may favor assignment as a feature not a bug
  - "Both equally" → balanced approach

- "How much of your wheeling capital would you be comfortable tying up in a single stock?"
  - "No more than 10-15%" → diversified, conservative sizing
  - "Up to 25-30% if I really believe in it" → moderate concentration
  - "I go big on my best ideas" → concentrated, high-conviction

- **Behind the scenes:** Translates to delta range tendency, max loss thresholds, position sizing rules, and overall risk profile. The specific "how do you feel about getting assigned on THIS stock" question lives in the ticker thesis flow, not here.

### 7. Time & Patience
Captures DTE and activity level through personality, not jargon.

- "How hands-on do you want to be with your trading?"
  - "I want to check in and make moves every week" → weekly activity, short DTE
  - "Every couple of weeks feels right" → moderate frequency
  - "I'd rather set things up and check in monthly" → monthly cadence, longer DTE

- "What feels better to you — seeing frequent small wins come in regularly, or being patient for bigger payoffs less often?"
  - Frequent small wins → short DTE preference, faster cycles
  - Patient for bigger payoffs → longer DTE preference, slower cycles
  - Mix of both → flexible DTE

- **Behind the scenes:** The two answers triangulate the same parameter (DTE preference) from different angles — activity level and patience style. Together they give high-confidence translation. Someone who says "weekly check-ins" AND "frequent small wins" is clearly a short-DTE trader. Someone who says "monthly" AND "patient for bigger payoffs" is clearly long-DTE.

### 8. Stock Picking
- "What draws you to a stock you'd want to wheel?"
  - Conversational, open-ended feel
  - Could offer prompts: "I like stocks that..." with options like:
    - Pay dividends
    - Are in industries I understand
    - Have strong fundamentals
    - Are ones I'd want to own long-term anyway
    - Have good premium / are more volatile
- **Behind the scenes:** Starts building the user's stock selection criteria for their strategy. Also informs what the thesis template emphasizes for this user.

### 9. Strategy Reveal (The Magic Moment)
- "Based on everything you've told me, here's your first strategy draft."
- The screen shows their answers TRANSLATED into a real strategy document:
  - Delta target range
  - DTE preferences
  - Risk tolerance parameters
  - Position sizing rules
  - Stock selection criteria
  - Income goals
- Each element has a tooltip explaining what it means, the scale of options, and the tradeoffs (e.g., "Short DTE means faster premium collection but more active management. Long DTE means bigger premiums per trade but slower cycles.")
- This is the progressive education moment — they see their plain-language answers reflected as trading parameters and start connecting the dots.

### 10. Name & Review
- **Name your strategy.** A text field at the top. Make it yours. "The Slow Grind," "Weekly Income Machine," whatever speaks to you.
  - This is a small v1 feature that unlocks a powerful long-term path: strategy libraries, strategy comparison, multi-strategy deployment across accounts. Architecture should support multiple named strategies from the start, even though v1 only has one.
- User can either:
  - **"Looks good"** → Save and go to dashboard
  - **"Let me tweak"** → Opens the Strategy Editor where they can adjust parameters, learn more via tooltips, and refine
- Either way, they now have a named v1 strategy. It's not perfect. It doesn't need to be. It's a starting point that Wheelhouse will help them refine over time.

### 11. Dashboard (First Landing)
- Hero metrics visible (will be zeroes — that's okay, they're placeholders showing what will come alive)
- Clean empty state. No half-populated positions or incomplete data.
- Warm invitation to take the next natural step: "You've got a strategy. Now let's put it to work — add your first ticker thesis."
- Strategy is accessible and visible — reminder that it exists and is yours to evolve

---

## Design Principles for This Flow

1. **Conversational, not transactional.** Every screen should feel like a question a friend would ask, not a form field to fill.
2. **No jargon in questions.** Jargon appears only in the strategy output, paired with education via tooltips.
3. **Every answer does double duty.** Profile info AND strategy scaffolding, never wasted questions.
4. **Triangulate, don't ask directly.** Ask two personality-level questions that converge on the same technical parameter (e.g., activity level + patience style → DTE preference). Higher confidence, better UX.
5. **Progressive disclosure.** Beginners see more explanation. Experienced traders move fast.
6. **The reveal is the reward.** Seeing your casual answers transformed into a named strategy document is the "aha" moment that hooks the user.
7. **Nothing is permanent.** Emphasize that everything can be changed later. Lower the stakes of every answer.
8. **Per-ticker questions belong in the ticker thesis flow.** Onboarding captures strategy-level temperament only.
