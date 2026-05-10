# Wheelhouse Dot Lifecycle — State Machine

A dot (contract) is always in exactly one of four states. Events move it between states. This is the complete reference for every possible state and transition in the wheel lifecycle.

---

## The Four States

| State | Visual | Location | Meaning |
|-------|--------|----------|---------|
| **Idle-Cash** | Outlined / empty dot | Sideline | Capital ready. Can sell a CSP. |
| **Idle-Shares** | Filled / solid dot | Sideline | Holding 100 shares. Can sell a CC. |
| **CSP Active** | Dot on ring, CSP zone | On the ring | Put contract is live. Dot moves with time-to-expiry. |
| **CC Active** | Dot on ring, CC zone | On the ring | Call contract is live. Dot moves with time-to-expiry. |

---

## All Transitions

### Lifecycle Events (Outside the Trading State Machine)
| Event | Target State | What Happens |
|-------|-------------|--------------|
| Dot created (cash) | Idle-Cash | New dot appears on the sideline. Happens during thesis setup or when user adds a contract later. |
| Dot created (shares) | Idle-Shares | New dot appears on sideline. User enters share purchase price for cost basis. |
| Dot removed | *(removed)* | Dot disappears from sideline. Only idle dots can be removed. Active dots must complete their current contract first. |

### From Idle-Cash
| Event | Target State | What Happens |
|-------|-------------|--------------|
| Sell new CSP | CSP Active | Dot slides from sideline onto the ring. Journey begins. |

### From Idle-Shares
| Event | Target State | What Happens |
|-------|-------------|--------------|
| Sell new CC | CC Active | Dot slides from sideline onto the ring. Journey begins. |

### From CSP Active
| Event | Target State | What Happens |
|-------|-------------|--------------|
| Assigned | Idle-Shares | Dot moves off ring to sideline. You now own 100 shares. Ready to sell a CC. |
| Expired | Idle-Cash | Dot moves off ring to sideline. Premium collected, capital freed. Ready for a new CSP. |
| Closed | Idle-Cash | Dot moves off ring to sideline. Put bought back, capital freed. |
| Rolled | CSP Active (updated) | Dot stays on ring. Label updates to new strike + expiry. Old contract preserved in history. |

### From CC Active
| Event | Target State | What Happens |
|-------|-------------|--------------|
| Called Away | Idle-Cash | Dot moves off ring to sideline. Shares sold, back to cash. Ready for a new CSP. |
| Expired | Idle-Shares | Dot moves off ring to sideline. Premium collected, still holding shares. Ready for a new CC. |
| Closed | Idle-Shares | Dot moves off ring to sideline. Call bought back, still holding shares. |
| Rolled | CC Active (updated) | Dot stays on ring. Label updates to new strike + expiry. Old contract preserved in history. |

---

## Key Properties

1. **A dot is always in exactly one state.** No ambiguity, no in-between.

2. **Only valid transitions are possible.** You can't sell a CC from Idle-Cash. You can't get assigned from CC Active. The UI only shows actions that make sense for the dot's current state.

3. **Rolls are self-transitions.** The dot stays in the same phase (CSP or CC) but repositions on the ring based on the new contract's expiry. Since the dot's position represents time-to-expiry, rolling out further slides the dot back along the arc — you can visually see that you just bought more time. The label also updates to reflect the new strike and expiry.

4. **Every transition that leaves the ring goes to an idle state.** There is always a pause between active contracts. The dot returns to the sideline, and the user consciously taps it again to start the next leg. This pause is an awareness moment.

5. **The two idle states tell you what you're holding.** Outlined dots = cash. Filled dots = shares. The sideline is a capital allocation snapshot.

6. **Entry points:** Dots are created during thesis setup. They default to Idle-Cash. If the user already owns shares, they can set a dot to Idle-Shares (which requires entering the share purchase price for cost basis tracking).

7. **Dots can be added and removed.** The initial contract count from thesis creation is not permanent. From the Ticker Thesis View, users can add new idle dots at any time (scaling up) or remove idle dots (scaling down). Only idle dots can be removed — a dot that is active on the ring must complete its current contract (expire, close, assign, or get called away) before it can be removed. This prevents orphaned trade events or interrupted state machines.

---

## The Wheel Cycle (Typical Flow)

The "classic" wheel follows this path, though not every dot will take this exact route:

```
Idle-Cash → CSP Active → [Assigned] → Idle-Shares → CC Active → [Called Away] → Idle-Cash → repeat
```

But many real-world variations exist:

- CSP expires worthless: `Idle-Cash → CSP Active → [Expired] → Idle-Cash → CSP Active → ...` (never leaving CSP phase, just collecting premium)
- CC expires worthless: `Idle-Shares → CC Active → [Expired] → Idle-Shares → CC Active → ...` (holding shares, collecting call premium repeatedly)
- Roll: `CSP Active → [Rolled] → CSP Active` (staying in the same phase, adjusting the contract)
- Early close: `CSP Active → [Closed] → Idle-Cash` (decided to exit the contract early)
- Starting from shares: `Idle-Shares → CC Active → ...` (user already owned shares, skipped the CSP entry entirely)

All of these are valid wheel behaviors. The state machine handles them all cleanly.
