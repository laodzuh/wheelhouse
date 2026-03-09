import { useRef, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useTheme } from "@/hooks/useTheme";
import { useAccounts, addAccount, updateAccount, deleteAccount } from "@/hooks/useAccounts";
import { exportTrades, importTrades, deleteAllTrades } from "@/lib/export";
import { parseFidelityCSV, type FidelityImportResult } from "@/lib/fidelity";
import { db } from "@/db";

export function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const accounts = useAccounts();
  const fileRef = useRef<HTMLInputElement>(null);
  const fidelityFileRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<string>("");
  const [fidelityPreview, setFidelityPreview] = useState<FidelityImportResult | null>(null);
  const [fidelityStatus, setFidelityStatus] = useState<string>("");
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountSize, setNewAccountSize] = useState("");
  const [fidelityAccountId, setFidelityAccountId] = useState("");

  async function handleExport() {
    await exportTrades();
  }

  async function handleImport() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    try {
      const count = await importTrades(file);
      setImportStatus(`Imported ${count} trades successfully.`);
    } catch (err) {
      setImportStatus(
        `Import failed: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleFidelityParse() {
    const file = fidelityFileRef.current?.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const result = parseFidelityCSV(text);
      setFidelityPreview(result);
      setFidelityStatus("");
    } catch (err) {
      setFidelityStatus(
        `Parse failed: ${err instanceof Error ? err.message : "Unknown error"}`
      );
      setFidelityPreview(null);
    }
  }

  async function handleFidelityConfirm() {
    if (!fidelityPreview) return;
    try {
      const trades = fidelityAccountId
        ? fidelityPreview.trades.map((t) => ({ ...t, accountId: fidelityAccountId }))
        : fidelityPreview.trades;
      await db.trades.bulkPut(trades);
      setFidelityStatus(
        `Imported ${fidelityPreview.trades.length} trades successfully.`
      );
      setFidelityPreview(null);
      if (fidelityFileRef.current) fidelityFileRef.current.value = "";
    } catch (err) {
      setFidelityStatus(
        `Import failed: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    }
  }

  async function handleDeleteAll() {
    if (
      confirm(
        "Are you sure you want to delete ALL trades? This cannot be undone."
      )
    ) {
      await deleteAllTrades();
      setImportStatus("All trades deleted.");
      setFidelityStatus("");
      setFidelityPreview(null);
    }
  }

  return (
    <div>
      <PageHeader title="Settings" />

      <div className="space-y-6 max-w-2xl">
        <Card>
          <h3 className="text-sm font-medium text-gray-300 mb-3">Appearance</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-100">Theme</p>
              <p className="text-xs text-gray-500">
                Currently using {theme} mode
              </p>
            </div>
            <Button variant="secondary" onClick={toggleTheme}>
              Switch to {theme === "dark" ? "Light" : "Dark"}
            </Button>
          </div>
        </Card>

        <Card>
          <h3 className="text-sm font-medium text-gray-300 mb-3">Accounts</h3>
          <p className="text-xs text-gray-500 mb-3">
            Manage your trading accounts. Account size is used for portfolio-level ROI on the dashboard.
          </p>

          {accounts && accounts.length > 0 && (
            <div className="mb-4 space-y-3">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center gap-3 rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-3"
                >
                  <div className="flex-1">
                    <input
                      className="bg-transparent text-sm font-medium text-gray-100 focus:outline-none w-full"
                      value={account.name}
                      onChange={(e) =>
                        updateAccount(account.id, { name: e.target.value })
                      }
                    />
                  </div>
                  <div className="w-36">
                    <input
                      type="number"
                      step="0.01"
                      className="w-full bg-transparent text-sm text-gray-300 text-right focus:outline-none"
                      value={account.size || ""}
                      onChange={(e) =>
                        updateAccount(account.id, {
                          size: Number(e.target.value) || 0,
                        })
                      }
                      placeholder="Size"
                    />
                  </div>
                  <button
                    onClick={() => {
                      if (confirm(`Delete account "${account.name}"?`)) {
                        deleteAccount(account.id);
                      }
                    }}
                    className="rounded p-1 text-red-400 hover:bg-red-500/10 cursor-pointer"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Input
                label="Name"
                value={newAccountName}
                onChange={(e) => setNewAccountName(e.target.value)}
                placeholder="e.g. Fidelity Brokerage"
              />
            </div>
            <div className="w-36">
              <Input
                label="Starting Value"
                type="number"
                step="0.01"
                value={newAccountSize}
                onChange={(e) => setNewAccountSize(e.target.value)}
                placeholder="25000"
              />
            </div>
            <Button
              variant="secondary"
              onClick={async () => {
                if (!newAccountName.trim()) return;
                await addAccount(
                  newAccountName.trim(),
                  Number(newAccountSize) || 0
                );
                setNewAccountName("");
                setNewAccountSize("");
              }}
            >
              Add
            </Button>
          </div>
        </Card>

        <Card>
          <h3 className="text-sm font-medium text-gray-300 mb-3">
            Import from Fidelity
          </h3>
          <p className="text-xs text-gray-500 mb-3">
            Upload a Fidelity CSV export (Activity &amp; Orders &rarr; History
            &rarr; Download). Parses option trades including opens, closes,
            expirations, and assignments.
          </p>
          <div className="flex items-center gap-3">
            <input
              ref={fidelityFileRef}
              type="file"
              accept=".csv"
              className="text-sm text-gray-400 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-700 file:px-4 file:py-2 file:text-sm file:font-medium file:text-gray-100 file:cursor-pointer hover:file:bg-gray-600"
            />
            <Button variant="secondary" onClick={handleFidelityParse}>
              Parse
            </Button>
          </div>

          {fidelityPreview && (
            <div className="mt-4 rounded-lg border border-gray-700 bg-gray-800/50 p-4 space-y-3">
              <h4 className="text-sm font-medium text-gray-200">
                Preview — {fidelityPreview.trades.length} trades found
              </h4>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="rounded-lg bg-green-500/10 p-2.5 text-center">
                  <div className="text-lg font-bold text-green-400">
                    {fidelityPreview.fullCount}
                  </div>
                  <div className="text-green-400/70">Complete</div>
                </div>
                <div className="rounded-lg bg-yellow-500/10 p-2.5 text-center">
                  <div className="text-lg font-bold text-yellow-400">
                    {fidelityPreview.partialCount}
                  </div>
                  <div className="text-yellow-400/70">Partial</div>
                </div>
                <div className="rounded-lg bg-gray-600/20 p-2.5 text-center">
                  <div className="text-lg font-bold text-gray-400">
                    {fidelityPreview.skippedCount}
                  </div>
                  <div className="text-gray-500">Skipped</div>
                </div>
              </div>
              {fidelityPreview.partialCount > 0 && (
                <p className="text-xs text-yellow-400/80">
                  Partial trades were opened before the export period. Their
                  opening premium is set to $0 — edit them in the Trade Log to
                  enter the correct value.
                </p>
              )}
              <p className="text-xs text-gray-500">
                Underlying price at entry is not available in Fidelity exports
                and is set to $0. You can update individual trades later.
              </p>
              {accounts && accounts.length > 0 && (
                <div className="w-48">
                  <Select
                    label="Assign to Account"
                    value={fidelityAccountId}
                    onChange={(e) => setFidelityAccountId(e.target.value)}
                    options={[
                      { value: "", label: "No Account" },
                      ...accounts.map((a) => ({ value: a.id, label: a.name })),
                    ]}
                  />
                </div>
              )}
              <div className="flex gap-3 pt-1">
                <Button onClick={handleFidelityConfirm}>
                  Import {fidelityPreview.trades.length} Trades
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setFidelityPreview(null);
                    if (fidelityFileRef.current)
                      fidelityFileRef.current.value = "";
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {fidelityStatus && (
            <p className="mt-2 text-xs text-gray-400">{fidelityStatus}</p>
          )}
        </Card>

        <Card>
          <h3 className="text-sm font-medium text-gray-300 mb-3">
            Data Export
          </h3>
          <p className="text-xs text-gray-500 mb-3">
            Download all your trades as a JSON file.
          </p>
          <Button variant="secondary" onClick={handleExport}>
            Export Trades
          </Button>
        </Card>

        <Card>
          <h3 className="text-sm font-medium text-gray-300 mb-3">
            JSON Import
          </h3>
          <p className="text-xs text-gray-500 mb-3">
            Import trades from a previously exported JSON file.
          </p>
          <div className="flex items-center gap-3">
            <input
              ref={fileRef}
              type="file"
              accept=".json"
              className="text-sm text-gray-400 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-700 file:px-4 file:py-2 file:text-sm file:font-medium file:text-gray-100 file:cursor-pointer hover:file:bg-gray-600"
            />
            <Button variant="secondary" onClick={handleImport}>
              Import
            </Button>
          </div>
          {importStatus && (
            <p className="mt-2 text-xs text-gray-400">{importStatus}</p>
          )}
        </Card>

        <Card>
          <h3 className="text-sm font-medium text-red-400 mb-3">
            Danger Zone
          </h3>
          <p className="text-xs text-gray-500 mb-3">
            Permanently delete all trade data. This cannot be undone.
          </p>
          <Button variant="danger" onClick={handleDeleteAll}>
            Delete All Trades
          </Button>
        </Card>
      </div>
    </div>
  );
}
