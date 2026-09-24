"use client";

import { useMemo, useState } from "react";
import ProfileForm from "@/components/risk/ProfileForm";
import SummaryStrip from "@/components/risk/SummaryStrip";
import HeatMatrix from "@/components/risk/HeatMatrix";
import DataGaps from "@/components/risk/DataGaps";
import RegisterTable from "@/components/risk/RegisterTable";
import AuditLog from "@/components/risk/AuditLog";
import MemoPanel from "@/components/risk/MemoPanel";
import { EMPTY_PROFILE, PRESETS } from "@/lib/risk/presets";
import { applyOverrides } from "@/lib/risk/scoring";
import { risksToCsv, downloadText } from "@/lib/risk/exportCsv";

export default function Home() {
  const [profile, setProfile] = useState(PRESETS[0].profile);
  const [raw, setRaw] = useState(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCell, setSelectedCell] = useState(null);

  const [reviewer, setReviewer] = useState("");
  const [overrides, setOverrides] = useState({});
  const [auditLog, setAuditLog] = useState([]);

  const [memo, setMemo] = useState("");
  const [memoLoading, setMemoLoading] = useState(false);
  const [memoError, setMemoError] = useState(null);

  const result = useMemo(() => applyOverrides(raw, overrides), [raw, overrides]);

  async function run() {
    setRunning(true);
    setError(null);
    setSelectedCell(null);
    setMemo("");
    setMemoError(null);
    try {
      const res = await fetch("/api/risk/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (!res.ok) throw new Error(`Scoring failed (${res.status})`);
      const data = await res.json();
      setRaw(data);
      generateMemoFor(applyOverrides(data, overrides));
    } catch (e) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  }

  async function generateMemoFor(data) {
    setMemoLoading(true);
    setMemoError(null);
    try {
      const res = await fetch("/api/risk/memo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, auditLog }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `Memo failed (${res.status})`);
      setMemo(json.memo);
    } catch (e) {
      setMemoError(e.message);
    } finally {
      setMemoLoading(false);
    }
  }

  function generateMemo() {
    if (result) generateMemoFor(result);
  }

  function handleOverride(riskId, { likelihood, impact, reason }) {
    const r = result.risks.find((x) => x.id === riskId);
    const at = new Date().toISOString();
    const by = reviewer.trim() || "Unnamed reviewer";
    const entry = {
      at,
      by,
      riskId,
      action: r.overridden ? "Update override" : "Override",
      from: { likelihood: r.likelihood, impact: r.impact },
      to: { likelihood, impact },
      reason,
    };
    setOverrides({ ...overrides, [riskId]: { likelihood, impact, reason, by, at } });
    setAuditLog([...auditLog, entry]);
  }

  function handleRevert(riskId) {
    const r = result.risks.find((x) => x.id === riskId);
    const next = { ...overrides };
    delete next[riskId];
    setOverrides(next);
    setAuditLog([
      ...auditLog,
      {
        at: new Date().toISOString(),
        by: reviewer.trim() || "Unnamed reviewer",
        riskId,
        action: "Revert to rule",
        from: { likelihood: r.likelihood, impact: r.impact },
        to: { likelihood: r.ruleLikelihood, impact: r.ruleImpact },
        reason: "",
      },
    ]);
  }

  function clearOverrides() {
    if (!Object.keys(overrides).length) return;
    setOverrides({});
    setAuditLog([
      ...auditLog,
      {
        at: new Date().toISOString(),
        by: reviewer.trim() || "Unnamed reviewer",
        riskId: "ALL",
        action: "Clear all overrides",
        from: null,
        to: null,
        reason: "",
      },
    ]);
  }

  function exportRows(rows) {
    const slug = (result.ctx.name || "project").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    downloadText(`${slug}-risk-register.csv`, risksToCsv(rows, result.ctx, auditLog));
  }

  async function copyMemo() {
    try {
      await navigator.clipboard.writeText(memo);
    } catch {}
  }

  return (
    <main>
      {result && (
        <div className="mx-auto max-w-[1440px] px-6 pt-5">
          <span className="mono text-[11px] text-ink-2">
              {result.ctx.name || "Untitled"} · {result.ctx.state.name} ·{" "}
              {result.ctx.capacityMW} MW · {result.ctx.phase.replace("_", " ")}
          </span>
        </div>
      )}

      <div
        className="mx-auto max-w-[1440px] px-6 py-6"
        style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 20, alignItems: "start" }}
      >
        <aside
          className="panel p-5"
          style={{ position: "sticky", top: 24, maxHeight: "calc(100vh - 48px)", overflowY: "auto" }}
        >
          <p className="eyebrow mb-4">Project profile</p>
          <ProfileForm
            profile={profile}
            onChange={setProfile}
            onLoadPreset={(p) => setProfile({ ...EMPTY_PROFILE, ...p })}
            onRun={run}
            running={running}
          />
        </aside>

        <section className="flex flex-col gap-5">
          {error && (
            <div
              className="panel px-5 py-3 text-[13px]"
              style={{ borderColor: "var(--risk-high)", color: "var(--risk-high)" }}
            >
              {error}
            </div>
          )}

          {!result ? (
            <div
              className="panel text-center"
              style={{ minHeight: 420, display: "grid", placeItems: "center" }}
            >
              <div>
                <p className="display text-[20px]">Run the register to score this project.</p>
                <p className="mt-2 text-[13px] text-ink-2">
                  72 lifecycle risks are evaluated against the profile. Load a sample or start blank.
                </p>
              </div>
            </div>
          ) : (
            <>
              <SummaryStrip summary={result.summary} ctx={result.ctx} />

              <div className="panel p-5">
                <div className="mb-4 flex items-baseline justify-between">
                  <p className="eyebrow">Heat matrix · active risks</p>
                  <p className="mono text-[11px] text-ink-3">
                    Click a cell to filter the register · ? marks scores with unknown inputs
                  </p>
                </div>
                <HeatMatrix
                  matrix={result.matrix}
                  selected={selectedCell}
                  onSelect={setSelectedCell}
                  top={result.summary.top}
                />
              </div>

              <DataGaps dataGaps={result.summary.dataGaps} risks={result.risks} />

              <MemoPanel
                memo={memo}
                loading={memoLoading}
                error={memoError}
                onGenerate={generateMemo}
                onCopy={copyMemo}
              />

              <div className="panel p-5">
                <div className="mb-4 flex items-center justify-between">
                  <p className="eyebrow">Register</p>
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] text-ink-3">Reviewer</label>
                    <input
                      className="field-input"
                      style={{ width: 180, height: 32 }}
                      placeholder="Your name for the audit log"
                      value={reviewer}
                      onChange={(e) => setReviewer(e.target.value)}
                    />
                    {result.summary.overridden > 0 && (
                      <span className="mono text-[11px] text-ink-2">
                        {result.summary.overridden} overridden
                      </span>
                    )}
                  </div>
                </div>
                <RegisterTable
                  risks={result.risks}
                  selectedCell={selectedCell}
                  onExport={exportRows}
                  onOverride={handleOverride}
                  onRevert={handleRevert}
                />
              </div>

              <AuditLog log={auditLog} onClear={clearOverrides} />
            </>
          )}
        </section>
      </div>

    </main>
  );
}