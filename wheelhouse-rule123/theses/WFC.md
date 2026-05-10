# WFC — Wells Fargo & Company

**Sector:** Financials (money-center bank)
**Status:** Active wheel position
**Cost basis:** TBD
**Current position:** 0 functional shares (1 share held as Fidelity UI
workaround; see Notes), 1 open CSP
**Hold-through earnings:** yes
**Last updated:** 2026-05-09

## Thesis

WFC is a Buffett-style position: a major US money-center bank offering
core financial services to a captive customer base, the kind of
institution that will still be around and meaningfully relevant for as
long as I can reasonably imagine. I'm not a Wells Fargo customer myself,
so this isn't a Lynch-style "I use it" thesis — the conviction sits
purely on durability and core-service moat.

Among the major national banks, WFC is the one I picked because the
entry-point setup looked best: cleaner technical and sentiment picture
than the peers. That entry-timing piece is a current view, not the
durable thesis — the thesis is "WFC is a durable institution worth
wheeling"; the timing-to-act-now lives in trade rationale.

## Quantitative parameters

- **Acceptable strike range for new CSPs:** $76
- **Acceptable strike range for CCs above basis:** $80
- **Minimum acceptable IV rank for new layers:** 20
- **Position sizing:** 20%
- **Notes:** I hold 1 share of WFC purely as a Fidelity UI workaround
  (Fidelity makes it hard to see the underlying stock price on a CSP
  unless you also hold shares). The 1 share doesn't represent a
  position; it's a tracking aid. Don't count it toward sizing or
  rebalancing.


## Activity

- 2026-05-09: Thesis created. (Bot-maintained going forward; specific
  decisions go in DECISIONS.md.)

## Watch conditions

The bot watches for these on my behalf and pings me when any fires; I
don't track them manually. These are bank-specific risk vectors that I
don't fully understand the mechanics of myself — the bot's job is to
spot the noise on my behalf.

- **Credit-quality deterioration.** Spikes in WFC's charge-off rate
  (loans written off as uncollectible) or default rate (loans going
  non-current and likely to default). Credit quality is the single
  biggest risk vector for any bank — when bad-loan rates ramp fast,
  earnings get hit through provisions for credit losses, and persistent
  spikes signal underwriting problems. *(Bot tracks both metrics from
  quarterly filings.)*
- **Net interest margin compression.** Banks earn the spread between
  what they pay depositors and what they charge borrowers — that spread
  is "net interest margin," or NIM. WFC is heavily deposit-funded, so
  NIM is the core profit engine. Sustained NIM compression means the
  business is earning less per dollar of activity. *(Bot tracks NIM
  from quarterly reports.)*
- **Regulatory or scandal risk.** WFC carries a real history here — the
  2016 fake-accounts scandal, the asset cap that wasn't lifted until
  2025. A fresh major regulatory action, consent decree, or
  scandal-grade news event would meaningfully shake the institutional
  thesis. *(Bot tracks via news scanning and SEC filings.)*
- **Deposit-base attrition.** For a deposit-funded bank, losing
  deposits at scale is real trouble — it forces the bank to fund loans
  via more expensive wholesale capital, compressing margins and
  potentially shrinking the loan book. *(Bot tracks deposit balances
  quarter-over-quarter from filings.)*

When any fires, the bot's job is to surface the trigger and prompt a
thesis review — not to recommend a sell. The decision stays mine.
