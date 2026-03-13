import { describe, it, expect } from "vitest";
import { parseFidelityCSV } from "./fidelity";

const HEADER = "Run Date,Action,Symbol,Description,Type,Price ($),Quantity,Commission ($),Fees ($),Accrued Interest ($),Amount ($),Settlement Date";

function makeCSV(rows: string[]): string {
  return [
    "Brokerage",
    "",
    HEADER,
    ...rows,
    "",
  ].join("\n");
}

describe("parseFidelityCSV", () => {
  it("throws if no header row found", () => {
    expect(() => parseFidelityCSV("not a csv\nno header")).toThrow(
      "Could not find CSV header row"
    );
  });

  it("parses a complete sell-to-open + buy-to-close trade", () => {
    const csv = makeCSV([
      '03/01/2025,YOU SOLD OPENING TRANSACTION,-AAPL250321P150,AAPL MAR 21 2025 150 PUT,Option,3.00,1,0.65,0.04,,-299.31,03/03/2025',
      '03/10/2025,YOU BOUGHT CLOSING TRANSACTION,-AAPL250321P150,AAPL MAR 21 2025 150 PUT,Option,1.00,1,0.65,0.04,,100.69,03/12/2025',
    ]);
    const result = parseFidelityCSV(csv);
    expect(result.trades).toHaveLength(1);
    expect(result.fullCount).toBe(1);
    expect(result.partialCount).toBe(0);
    expect(result.skippedCount).toBe(0);

    const trade = result.trades[0];
    expect(trade.ticker).toBe("AAPL");
    expect(trade.optionType).toBe("Put");
    expect(trade.action).toBe("Sell to Open");
    expect(trade.strikePrice).toBe(150);
    expect(trade.expirationDate).toBe("2025-03-21");
    expect(trade.premiumPerContract).toBe(3.0);
    expect(trade.closePrice).toBe(1.0);
    expect(trade.contracts).toBe(1);
    expect(trade.status).toBe("Closed (Win)");
    expect(trade.strategy).toBe("Cash Secured Put");
    expect(trade.dateOpened).toBe("2025-03-01");
    expect(trade.dateClosed).toBe("2025-03-10");
    expect(trade.fees).toBeCloseTo(1.38); // 0.65+0.04 + 0.65+0.04
  });

  it("parses a buy-to-open + sell-to-close trade", () => {
    const csv = makeCSV([
      '02/01/2025,YOU BOUGHT OPENING TRANSACTION,-AAPL250321C170,AAPL MAR 21 2025 170 CALL,Option,5.00,2,0.65,0.04,,-1000.69,02/03/2025',
      '02/15/2025,YOU SOLD CLOSING TRANSACTION,-AAPL250321C170,AAPL MAR 21 2025 170 CALL,Option,8.00,2,0.65,0.04,,1599.31,02/18/2025',
    ]);
    const result = parseFidelityCSV(csv);
    expect(result.trades).toHaveLength(1);

    const trade = result.trades[0];
    expect(trade.action).toBe("Buy to Open");
    expect(trade.optionType).toBe("Call");
    expect(trade.strikePrice).toBe(170);
    expect(trade.premiumPerContract).toBe(5.0);
    expect(trade.closePrice).toBe(8.0);
    expect(trade.contracts).toBe(2);
    expect(trade.status).toBe("Closed (Win)");
    expect(trade.strategy).toBe("Long Call");
  });

  it("parses an expired option", () => {
    const csv = makeCSV([
      '01/15/2025,YOU SOLD OPENING TRANSACTION,-SPY250221P450,SPY FEB 21 2025 450 PUT,Option,2.50,1,0.65,0.04,,-249.31,01/17/2025',
      '02/21/2025,EXPIRED,-SPY250221P450,SPY FEB 21 2025 450 PUT,Option,0,0,0,0,,0,02/21/2025',
    ]);
    const result = parseFidelityCSV(csv);
    const trade = result.trades[0];
    expect(trade.status).toBe("Expired");
    expect(trade.closePrice).toBe(0);
    expect(trade.dateClosed).toBe("2025-02-21");
  });

  it("parses an assigned option", () => {
    const csv = makeCSV([
      '01/10/2025,YOU SOLD OPENING TRANSACTION,-MSFT250221P400,MSFT FEB 21 2025 400 PUT,Option,4.00,1,0.65,0.04,,-399.31,01/13/2025',
      '02/21/2025,ASSIGNED,-MSFT250221P400,MSFT FEB 21 2025 400 PUT,Option,0,0,0,0,,0,02/21/2025',
    ]);
    const result = parseFidelityCSV(csv);
    const trade = result.trades[0];
    expect(trade.status).toBe("Assigned");
    expect(trade.assignedShares).toBe(100);
    expect(trade.assignedCostBasis).toBe(400);
    expect(trade.sharesSoldPrice).toBeNull();
  });

  it("handles assigned call — sets sharesSoldPrice", () => {
    const csv = makeCSV([
      '01/10/2025,YOU SOLD OPENING TRANSACTION,-AAPL250221C180,AAPL FEB 21 2025 180 CALL,Option,3.00,1,0.65,0.04,,-299.31,01/13/2025',
      '02/21/2025,ASSIGNED,-AAPL250221C180,AAPL FEB 21 2025 180 CALL,Option,0,0,0,0,,0,02/21/2025',
    ]);
    const result = parseFidelityCSV(csv);
    const trade = result.trades[0];
    expect(trade.status).toBe("Assigned");
    expect(trade.assignedShares).toBe(100);
    expect(trade.assignedCostBasis).toBeNull();
    expect(trade.sharesSoldPrice).toBe(180);
  });

  it("creates a partial trade when only closing transaction exists", () => {
    const csv = makeCSV([
      '03/10/2025,YOU BOUGHT CLOSING TRANSACTION,-AAPL250321P150,AAPL MAR 21 2025 150 PUT,Option,1.00,1,0.65,0.04,,100.69,03/12/2025',
    ]);
    const result = parseFidelityCSV(csv);
    expect(result.fullCount).toBe(0);
    expect(result.partialCount).toBe(1);

    const trade = result.trades[0];
    expect(trade.premiumPerContract).toBe(0);
    expect(trade.action).toBe("Sell to Open"); // Inferred from BUY_TO_CLOSE
    expect(trade.notes).toContain("Opening transaction not in export");
  });

  it("skips non-option actions", () => {
    const csv = makeCSV([
      '03/01/2025,DIVIDEND RECEIVED,AAPL,APPLE INC,Cash,,,0,0,,25.00,03/01/2025',
    ]);
    const result = parseFidelityCSV(csv);
    expect(result.trades).toHaveLength(0);
    expect(result.skippedCount).toBe(1);
  });

  it("skips lines with unparseable option symbols", () => {
    const csv = makeCSV([
      '03/01/2025,YOU SOLD OPENING TRANSACTION,INVALID_SYMBOL,Some Description,Option,3.00,1,0.65,0.04,,-299.31,03/03/2025',
    ]);
    const result = parseFidelityCSV(csv);
    expect(result.trades).toHaveLength(0);
    expect(result.skippedCount).toBe(1);
  });

  it("handles multiple independent trades", () => {
    const csv = makeCSV([
      '01/05/2025,YOU SOLD OPENING TRANSACTION,-AAPL250221P150,AAPL,Option,3.00,1,0.65,0.04,,-299.31,01/07/2025',
      '01/10/2025,YOU SOLD OPENING TRANSACTION,-MSFT250221P400,MSFT,Option,4.00,2,0.65,0.04,,-799.31,01/13/2025',
      '01/15/2025,YOU BOUGHT CLOSING TRANSACTION,-AAPL250221P150,AAPL,Option,1.00,1,0.65,0.04,,100.69,01/17/2025',
      '01/20/2025,YOU BOUGHT CLOSING TRANSACTION,-MSFT250221P400,MSFT,Option,2.00,2,0.65,0.04,,399.31,01/22/2025',
    ]);
    const result = parseFidelityCSV(csv);
    expect(result.trades).toHaveLength(2);
    expect(result.fullCount).toBe(2);

    const aapl = result.trades.find((t) => t.ticker === "AAPL")!;
    const msft = result.trades.find((t) => t.ticker === "MSFT")!;
    expect(aapl.premiumPerContract).toBe(3.0);
    expect(msft.premiumPerContract).toBe(4.0);
    expect(msft.contracts).toBe(2);
  });

  it("handles CSV fields with quotes", () => {
    const csv = makeCSV([
      '03/01/2025,"YOU SOLD OPENING TRANSACTION",-AAPL250321P150,"AAPL MAR 21, 2025 150 PUT",Option,3.00,1,0.65,0.04,,-299.31,03/03/2025',
      '03/10/2025,"YOU BOUGHT CLOSING TRANSACTION",-AAPL250321P150,"AAPL MAR 21, 2025 150 PUT",Option,1.00,1,0.65,0.04,,100.69,03/12/2025',
    ]);
    const result = parseFidelityCSV(csv);
    expect(result.trades).toHaveLength(1);
    expect(result.trades[0].status).toBe("Closed (Win)");
  });

  it("correctly infers strategy from action + option type", () => {
    // Sell to Open + Put → Cash Secured Put
    const cspCSV = makeCSV([
      '01/01/2025,YOU SOLD OPENING TRANSACTION,-AAPL250221P150,AAPL,Option,3.00,1,0,0,,0,01/03/2025',
    ]);
    expect(parseFidelityCSV(cspCSV).trades[0].strategy).toBe("Cash Secured Put");

    // Sell to Open + Call → Covered Call
    const ccCSV = makeCSV([
      '01/01/2025,YOU SOLD OPENING TRANSACTION,-AAPL250221C150,AAPL,Option,3.00,1,0,0,,0,01/03/2025',
    ]);
    expect(parseFidelityCSV(ccCSV).trades[0].strategy).toBe("Covered Call");

    // Buy to Open + Call → Long Call
    const lcCSV = makeCSV([
      '01/01/2025,YOU BOUGHT OPENING TRANSACTION,-AAPL250221C150,AAPL,Option,3.00,1,0,0,,0,01/03/2025',
    ]);
    expect(parseFidelityCSV(lcCSV).trades[0].strategy).toBe("Long Call");

    // Buy to Open + Put → Long Put
    const lpCSV = makeCSV([
      '01/01/2025,YOU BOUGHT OPENING TRANSACTION,-AAPL250221P150,AAPL,Option,3.00,1,0,0,,0,01/03/2025',
    ]);
    expect(parseFidelityCSV(lpCSV).trades[0].strategy).toBe("Long Put");
  });

  it("sorts output trades by dateOpened", () => {
    const csv = makeCSV([
      '03/01/2025,YOU SOLD OPENING TRANSACTION,-MSFT250421P400,MSFT,Option,4.00,1,0,0,,0,03/03/2025',
      '01/15/2025,YOU SOLD OPENING TRANSACTION,-AAPL250321P150,AAPL,Option,3.00,1,0,0,,0,01/17/2025',
    ]);
    const result = parseFidelityCSV(csv);
    expect(result.trades[0].ticker).toBe("AAPL");
    expect(result.trades[1].ticker).toBe("MSFT");
  });

  it("sets underlyingPriceAtEntry to 0", () => {
    const csv = makeCSV([
      '03/01/2025,YOU SOLD OPENING TRANSACTION,-AAPL250321P150,AAPL,Option,3.00,1,0,0,,0,03/03/2025',
    ]);
    const result = parseFidelityCSV(csv);
    expect(result.trades[0].underlyingPriceAtEntry).toBe(0);
  });

  it("generates unique IDs for each trade", () => {
    const csv = makeCSV([
      '01/01/2025,YOU SOLD OPENING TRANSACTION,-AAPL250221P150,AAPL,Option,3.00,1,0,0,,0,01/03/2025',
      '01/01/2025,YOU SOLD OPENING TRANSACTION,-MSFT250221P400,MSFT,Option,4.00,1,0,0,,0,01/03/2025',
    ]);
    const result = parseFidelityCSV(csv);
    expect(result.trades[0].id).not.toBe(result.trades[1].id);
  });
});
