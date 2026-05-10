# Wheel Rules

*The discipline. Read by the bot before any meaningful trade discussion.*

## Cash-secured puts

- **DTE band:** Default is weeklies to monthlies (longer-dated is rare). Intra-week
  expirations are reserved for tickers I have high conviction on right now.
- **Delta band:** 0.15–0.30. Lower end is the conservative dial — further OTM,
  smaller credit, more cushion. Upper end is for when I'm more confident the
  strike represents a real "relative dip" entry if assigned.
- **Strike selection:** Delta is the primary filter. I also confirm against
  support levels and feel better about strikes near recent lows. Earnings
  season pulls strike selection more conservative — see
  [earnings-policy.md](earnings-policy.md).
- **Underlying quality:** Three filters before a name is in the running.
  - *Liquidity:* bid-ask spread no wider than 15% of mid, and at least
    100 contracts of open interest at the actual strike I'd sell.
  - *IV rank:* general floor of 20. Per-ticker overrides live in each
    thesis under "Minimum acceptable IV rank for new layers."
  - *Quality bar:* names I'd be comfortable holding for 12+ months at
    the strike if assigned. The 12-month bar is anchored to long-term
    capital gains tax treatment — once assigned, "hold to LTCG
    qualification" becomes a real constraint, not a preference. That
    has knock-on effects on CC selection and rolls (codified later in
    position-management or a tax-policy file).
- **Order type:** Limit order, priced at or above the mid. Never below the
  mid — I don't undercut my own credit.

## Covered calls

CCs mirror CSPs on mechanics, but disposition differs: I'm more willing to
have shares called away at a profit than to have shares put to me. That
asymmetry shows up in strike selection.

- **DTE band:** Same as CSPs — weeklies to monthlies default, intra-week
  for high-conviction setups, longer-dated rare.
- **Delta band:** Same 0.15–0.30 range as CSPs.
- **Strike selection:** Primary criterion is "exit price I'd accept on
  these shares" rather than maximizing OTM-ness.
- **Cost basis floor:** Never sell a CC below cost basis as a default.
  The only exception is emergency-recovery situations on shares that are
  deep underwater — and even then, treat it as a deliberate decision to
  lock in a loss, not a routine income trade.

## Position management

- **Profit close:** Close when 80% of the original premium has been
  captured. More aggressive than the canonical 50% rule — lets each
  trade work harder per dollar of premium collected.
- **Time close:** No rule. Profit-target-only is the exit; late-stage gamma
  surprises are accepted as a cost of running this way. Review trigger: if
  late surprises pile up over a few months, revisit and consider adding a
  soft DTE floor.
- **Roll triggers:** Roll vs. accept-the-outcome vs. close is a case-by-case
  judgment based on how I feel about the ticker and the broader macro at the
  time. The judgment sits on top of three hard guardrails:
  - *Credit only.* Never roll for net debit. If the math doesn't credit me
    something, close or accept the outcome instead of paying to extend.
  - *Thesis must be intact.* If the thesis is broken (earnings disaster,
    sector outlook flipped, something fundamental changed), close or accept
    the outcome — don't roll. Bot should prompt "want to revisit the thesis?"
    before proposing a roll.
  - *Roll caps.* Maximum 2 rolls before accepting the outcome, and total
    extended DTE may not exceed 3× the original DTE. Prevents drift into a
    completely different trade and the "endless roll into oblivion" trap.

## Sizing

Both sized as percentages of total portfolio capital so they scale with
account growth.

- **Max position size (single ticker):** 20% of total capital. Per-ticker
  thesis files may tighten this further (e.g., a thesis specifying "max 2
  contracts" can cap a smaller exposure than 20%).
- **Max portfolio CSP exposure:** 60% of total capital across all open
  CSPs at any one time.

These are ceilings, not floors. Individual CSPs can be sized well below
20%, so the number of simultaneous positions in a fully deployed book
varies with sizing. At 20% each you'd have a minimum of 3 simultaneous
CSPs to fill the 60% bucket; at 10% each you'd have 6; at 5% each, 12.
The book is only concentrated if positions are routinely sized at the
single-name ceiling. See [sector-allocation.md](sector-allocation.md)
for diversification rules across whichever shape the book takes.

## Excluded names

Categories that don't fit wheel mechanics for structural reasons. Cyclical
or macro-driven concerns live in [sector-allocation.md](sector-allocation.md)
and per-ticker theses, not here.

- **Meme stocks.** Retail-driven IV looks rich but masks tail risk; the
  thesis is sentiment-driven, so there's nothing stable to anchor to.
- **Crypto-exposed equities** (MSTR, COIN, MARA, RIOT, etc.). Price action
  dominated by crypto rather than the company's fundamentals; no thesis
  holds up.
- **BDCs (Business Development Companies).** Hidden credit-cycle leverage
  and NAV erosion that premiums often compensate for in ways that aren't
  visible on the chart.
- **Private credit-adjacent equities.** Same family as BDCs, same reason —
  credit-cycle exposure that doesn't show up cleanly in IV.
- **Leveraged ETFs.** Daily-rebalance decay makes assignment risk
  asymmetric and weird.
- **Inverse ETFs.** Same decay issue, plus you'd be wheeling a short-thesis
  instrument.
- **Active M&A / takeover situations.** Gap risk; option contracts can
  behave strangely once the deal closes.
- **Closed-end funds.** Discount/premium swings don't reward premium-
  selling — the volatility is structural noise rather than tradeable IV.
- **Cannabis stocks.** Federal regulatory overhang and banking issues
  produce idiosyncratic risk that doesn't show up in option pricing.
- **Chinese ADRs.** ADR-specific delisting and regulatory risk; option
  liquidity often poor.

## References

- See [earnings-policy.md](earnings-policy.md) for earnings-window rules.
- See [sector-allocation.md](sector-allocation.md) for diversification rules.
