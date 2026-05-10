# WMT — Walmart Inc.

**Sector:** Consumer Staples
**Status:** Active wheel position
**Average Cost basis:** $109.06
**Current position:** 200 shares
**Hold-through earnings:** Yes
**Last updated:** 2026-05-09

## Thesis

WMT was originally gifted to me by my dad as a test run for trying the wheel
strategy. That's the honest origin — but the position has earned its place
on its own merits.

What I appreciate now is that WMT serves as defensive ballast in a book that
takes meaningful risk on the tech/AI side. While I lean conservative on
Tech and SaaS exposure (see [sector-allocation.md](../strategy/sector-allocation.md)),
WMT is the counterweight: an iconic American brand with durable cash flows,
the kind of name that will still be a valuable enterprise twenty years from
now. This scratches my Warren Buffett shaped itch — buy quality, hold quietly.

The trade-management pattern around the position is a buy-low / sell-high
pulse. When shares qualify for long-term capital gains treatment (held ≥12
months) AND price is near 52-week highs, I'm happy to let CCs assign me out
of shares to capture profit at favorable tax treatment. When price pulls
back near a monthly low, I look to re-establish via CSPs.
This keeps the core position alive while harvesting the swings on top.

## Quantitative parameters

- **Acceptable strike range for new CSPs:** $125 and below
- **Acceptable strike range for CCs above basis:** $130 and above
- **Minimum acceptable IV rank for new layers:** 20
- **Position sizing:** 25%
- **Pulse-trade triggers:**
  - *Sell-side* (let CCs assign out / trim shares): shares are LTCG-eligible
    AND price is within 10% of the 52-week high.
  - *Buy-side* (re-establish via CSP or purchase): price is within 10% of
    the 3-month low.
  - The 10% width is the starting calibration; tighten to 5% if the rule
    feels too loose in practice, loosen further if too tight.
- **Notes:** This is a Buffett-style core position, not an active trading
  vehicle. Pulse-trading is around the edges of the holding, not the
  whole position.

## Activity

- 2026-05-09: Thesis created. (Bot-maintained going forward.)

## Watch conditions

These are loose, Buffett-style triggers — moat-erosion-class events that
would prompt me to revisit whether WMT still earns its place in the book.
The bot watches for these on my behalf and pings me when any fires; I don't
track them manually.

- **Dividend reduction.** Any cut to the quarterly dividend versus the
  prior declaration. *(Easy for the bot to track via dividend feeds.)*
- **Material acquisition announcement.** Any acquisition with deal value
  greater than $5B, or any acquisition where the rationale is unclear or
  far afield from core retail/logistics. *(Bot tracks via news scanning.)*
- **Valuation extreme.** Forward P/E sustained more than 25% above WMT's
  5-year average for 30+ consecutive trading days. *(Bot tracks via
  fundamental data; auto-adjusts as the average shifts.)*
- **Persistent margin compression.** Operating margin (or gross margin)
  declining year-over-year for three consecutive quarters. *(Bot reviews
  after each quarterly report.)*
- **Sustained competitive share loss.** WMT consistently characterized in
  major retail-industry coverage as losing share to a competitor (Amazon,
  Costco, others) over multiple quarters — not cyclical noise.
  *(Bot performs a quarterly synthesis read.)*

When any of these fires, the bot's job is to surface the trigger and ask
me to revisit the thesis — not to recommend a sell. The decision to
rotate out (or stay) remains mine.