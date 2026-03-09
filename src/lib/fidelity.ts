import type { Trade } from "@/db/types";
import { generateId, nowISO } from "@/lib/utils";

export interface FidelityImportResult {
  trades: Trade[];
  fullCount: number;
  partialCount: number;
  skippedCount: number;
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields;
}

function parseFidelityDate(dateStr: string): string {
  const [month, day, year] = dateStr.trim().split("/");
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function parseOptionSymbol(symbol: string) {
  const cleaned = symbol.trim().replace(/^-\s*/, "").replace(/^\s*-/, "");
  const match = cleaned.match(/^([A-Z]+)(\d{6})([CP])([\d.]+)$/);
  if (!match) return null;
  const [, ticker, dateStr, cp, strike] = match;
  return {
    ticker,
    expirationDate: `20${dateStr.slice(0, 2)}-${dateStr.slice(2, 4)}-${dateStr.slice(4, 6)}`,
    optionType: cp === "C" ? ("Call" as const) : ("Put" as const),
    strikePrice: parseFloat(strike),
  };
}

type ActionType =
  | "SELL_TO_OPEN"
  | "BUY_TO_OPEN"
  | "BUY_TO_CLOSE"
  | "SELL_TO_CLOSE"
  | "EXPIRED"
  | "ASSIGNED"
  | "SKIP";

function classifyAction(action: string): ActionType {
  const a = action.trim();
  if (a.startsWith("YOU SOLD OPENING TRANSACTION")) return "SELL_TO_OPEN";
  if (a.startsWith("YOU BOUGHT OPENING TRANSACTION")) return "BUY_TO_OPEN";
  if (a.startsWith("YOU BOUGHT CLOSING TRANSACTION")) return "BUY_TO_CLOSE";
  if (a.startsWith("YOU SOLD CLOSING TRANSACTION")) return "SELL_TO_CLOSE";
  if (a.startsWith("EXPIRED")) return "EXPIRED";
  if (a.startsWith("ASSIGNED")) return "ASSIGNED";
  return "SKIP";
}

interface ParsedRow {
  runDate: string;
  actionType: ActionType;
  symbolKey: string;
  price: number;
  quantity: number;
  fees: number;
  optionInfo: NonNullable<ReturnType<typeof parseOptionSymbol>>;
}

export function parseFidelityCSV(csvText: string): FidelityImportResult {
  const lines = csvText.split(/\r?\n/);

  const headerIdx = lines.findIndex((l) => l.startsWith("Run Date,"));
  if (headerIdx === -1) throw new Error("Could not find CSV header row");

  const rows: ParsedRow[] = [];
  let skippedCount = 0;

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('"')) break;

    const fields = parseCSVLine(line);
    if (fields.length < 9) continue;

    const runDateRaw = fields[0].trim();
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(runDateRaw)) continue;

    const action = fields[1].trim();
    const symbol = fields[2].trim();
    const price = parseFloat(fields[5]) || 0;
    const quantity = Math.abs(parseInt(fields[6]) || 1);
    const commission = parseFloat(fields[7]) || 0;
    const fees = (parseFloat(fields[8]) || 0) + commission;

    const actionType = classifyAction(action);
    if (actionType === "SKIP") {
      skippedCount++;
      continue;
    }

    const optionInfo = parseOptionSymbol(symbol);
    if (!optionInfo) {
      skippedCount++;
      continue;
    }

    const symbolKey = symbol
      .trim()
      .replace(/^[\s-]+/, "")
      .replace(/\s+/g, "");

    rows.push({
      runDate: parseFidelityDate(runDateRaw),
      actionType,
      symbolKey,
      price,
      quantity,
      fees,
      optionInfo,
    });
  }

  // Group by option symbol key
  const symbolMap = new Map<string, ParsedRow[]>();
  for (const row of rows) {
    const existing = symbolMap.get(row.symbolKey) ?? [];
    existing.push(row);
    symbolMap.set(row.symbolKey, existing);
  }

  const trades: Trade[] = [];
  const now = nowISO();
  let fullCount = 0;
  let partialCount = 0;

  for (const [, symbolRows] of symbolMap) {
    const opening = symbolRows.find(
      (r) => r.actionType === "SELL_TO_OPEN" || r.actionType === "BUY_TO_OPEN"
    );
    const closing = symbolRows.find(
      (r) => r.actionType === "BUY_TO_CLOSE" || r.actionType === "SELL_TO_CLOSE"
    );
    const expired = symbolRows.find((r) => r.actionType === "EXPIRED");
    const assigned = symbolRows.find((r) => r.actionType === "ASSIGNED");

    const ref = opening ?? closing ?? expired ?? assigned;
    if (!ref) continue;

    const { ticker, expirationDate, optionType, strikePrice } = ref.optionInfo;
    const hasOpening = !!opening;

    // Determine action
    let action: Trade["action"];
    if (opening) {
      action =
        opening.actionType === "SELL_TO_OPEN" ? "Sell to Open" : "Buy to Open";
    } else if (closing) {
      action =
        closing.actionType === "BUY_TO_CLOSE" ? "Sell to Open" : "Buy to Open";
    } else {
      // Expired/assigned without open or close — assume Sell to Open (most common for these)
      action = "Sell to Open";
    }

    const premiumPerContract = opening?.price ?? 0;
    const dateOpened = opening?.runDate ?? (closing ?? ref).runDate;
    let totalFees = opening?.fees ?? 0;

    // Determine status and close info
    let status: Trade["status"] = "Open";
    let closePrice: number | null = null;
    let dateClosed: string | null = null;

    if (closing) {
      closePrice = closing.price;
      dateClosed = closing.runDate;
      totalFees += closing.fees;

      if (hasOpening) {
        if (action === "Sell to Open") {
          status =
            premiumPerContract > closePrice ? "Closed (Win)" : "Closed (Loss)";
        } else {
          status =
            closePrice > premiumPerContract ? "Closed (Win)" : "Closed (Loss)";
        }
      } else {
        // Can't determine win/loss without opening premium
        status = "Closed (Loss)";
      }
    } else if (expired) {
      status = "Expired";
      dateClosed = expired.runDate;
      closePrice = 0;
    } else if (assigned) {
      status = "Assigned";
      dateClosed = assigned.runDate;
      closePrice = 0;
    }
    // else: still Open (only have opening, no close event)

    const contracts = opening?.quantity ?? closing?.quantity ?? 1;

    // Assignment details
    let assignedShares: number | null = null;
    let assignedCostBasis: number | null = null;
    let sharesSoldPrice: number | null = null;

    if (status === "Assigned") {
      assignedShares = contracts * 100;
      if (optionType === "Put") {
        assignedCostBasis = strikePrice;
      } else {
        sharesSoldPrice = strikePrice;
      }
    }

    // Strategy
    let strategy: string;
    if (action === "Sell to Open" && optionType === "Call")
      strategy = "Covered Call";
    else if (action === "Sell to Open" && optionType === "Put")
      strategy = "Cash Secured Put";
    else if (action === "Buy to Open" && optionType === "Call")
      strategy = "Long Call";
    else strategy = "Long Put";

    // Notes
    const notes = hasOpening
      ? ""
      : "Opening transaction not in export. Please enter the original premium manually.";

    if (hasOpening) fullCount++;
    else partialCount++;

    trades.push({
      id: generateId(),
      groupId: null,
      dateOpened,
      dateClosed,
      ticker,
      optionType,
      action,
      strikePrice,
      expirationDate,
      contracts,
      premiumPerContract,
      closePrice,
      underlyingPriceAtEntry: 0,
      underlyingPriceAtExit: null,
      fees: totalFees,
      strategy,
      notes,
      status,
      createdAt: now,
      updatedAt: now,
      assignedShares,
      assignedCostBasis,
      sharesSoldPrice,
      sharesSoldDate: null,
      sharesPnL: null,
      accountId: null,
    });
  }

  trades.sort((a, b) => a.dateOpened.localeCompare(b.dateOpened));

  return { trades, fullCount, partialCount, skippedCount };
}
