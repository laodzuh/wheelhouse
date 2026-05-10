# Earnings Policy

*Rules for trading around quarterly earnings. Earnings is a binary IV-crush
event that doesn't reward premium-selling, so the policy is "stay out of
the blast radius."*

## Pre-earnings buffer

- **14 days.** No new CSPs or CCs opened on a name within 14 calendar
  days of its scheduled earnings announcement. The buffer applies from
  the announcement date the company has on the calendar; if the company
  pre-announces or moves the date inside the window, the buffer applies
  to the new date.

## Holding through earnings

- **Default: close before the announcement.** Earnings is a binary
  IV-crush event that doesn't reward premium-selling. If a position's
  expiration falls after the earnings date, close it before the print.
- **Exception: per-thesis hold-through flag.** Each ticker's thesis file
  carries a `hold-through earnings: yes / no` field, defaulting to `no`.
  Holding through earnings is only permitted on names where the flag is
  explicitly flipped to `yes` as part of the written thesis. This keeps
  "I love this stock" a deliberate, pre-committed decision rather than
  an in-the-moment override.

## Post-earnings re-entry

- **4 calendar days.** No new positions on the name until at least 4
  days have passed since the announcement. Allows the IV crush to
  settle and avoids the immediate post-earnings whipsaw.

## Strike-selection effect (cross-reference)

During earnings season, [wheel-rules.md](wheel-rules.md) calls for
strike selection to lean conservative. The buffer above is the hard
rule; the conservative-strike posture during earnings season is the
soft overlay.

## References

- See [wheel-rules.md](wheel-rules.md) for position-level rules.
- See [sector-allocation.md](sector-allocation.md) for the macro view.
