import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Award,
  BarChart3,
  CheckCircle2,
  ExternalLink,
  FileUp,
  Flame,
  Layers,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import {
  loadStudioData,
  normalizeScorecardPayload,
  type DataSourceMode,
} from "./lib/apiAdapter";
import { FALLBACK_SCORECARD } from "./data/fallbackScorecard";
import {
  EVAL_SEEDS,
  TIEBREAKER_SEEDS,
  type CanonicalFailureCode,
  type FailureIncidentLink,
  type ScorecardData,
} from "./types/cryoforge";
import { TrajectoryDiff, type FocusedIncidentTarget } from "./components/TrajectoryDiff";
import { ScorecardPanel } from "./components/ScorecardPanel";
import { TiebreakerPanel } from "./components/TiebreakerPanel";

type StudioTab = "replay" | "integrity" | "tiebreaker";

export const App: React.FC = () => {
  const [scorecard, setScorecard] = useState<ScorecardData>(FALLBACK_SCORECARD);
  const [sourceMode, setSourceMode] = useState<DataSourceMode>("bundled_fallback");
  const [sourceLabel, setSourceLabel] = useState<string>("PROBING API / ARTIFACT...");
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const [selectedSeed, setSelectedSeed] = useState<string>("S01");
  const [activeTab, setActiveTab] = useState<StudioTab>("replay");
  const [preferTiebreakerPair, setPreferTiebreakerPair] = useState<boolean>(false);
  const [expandedFailureCode, setExpandedFailureCode] = useState<CanonicalFailureCode | null>(null);
  const [focusedIncident, setFocusedIncident] = useState<FocusedIncidentTarget | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      const bundle = await loadStudioData();
      setScorecard(bundle.scorecard);
      setSourceMode(bundle.sourceMode);
      setSourceLabel(bundle.sourceLabel);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void refreshData();
  }, []);

  const handleUploadJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const txt = await file.text();
      const parsed = JSON.parse(txt);
      const merged = normalizeScorecardPayload(parsed);
      setScorecard(merged);
      setSourceMode("custom_upload");
      setSourceLabel(`UPLOADED (${file.name})`);
      if (parsed?.seed && typeof parsed.seed === "string") {
        setSelectedSeed(parsed.seed);
      }
    } catch {
      // Ignore malformed JSON silently
    } finally {
      e.target.value = "";
    }
  };

  const seedRuns = useMemo(() => {
    const matching = scorecard.trajectories.filter((t) => t.seed === selectedSeed);
    return matching.length > 0
      ? matching
      : FALLBACK_SCORECARD.trajectories.filter((t) => t.seed === selectedSeed);
  }, [scorecard, selectedSeed]);

  const currentSeedSummary = useMemo(
    () => scorecard.per_seed.find((s) => s.seed === selectedSeed) ?? scorecard.per_seed[0],
    [scorecard, selectedSeed]
  );

  const jumpToFailureIncident = (inc: FailureIncidentLink) => {
    setSelectedSeed(inc.seed);
    setPreferTiebreakerPair(inc.run_id.includes("small"));
    setActiveTab("replay");
    setFocusedIncident({
      seed: inc.seed,
      run_id: inc.run_id,
      order_id: inc.order_id,
      step_index: inc.step_index,
      nonce: Date.now(),
    });
  };

  const selectedTaxonomy = scorecard.failure_taxonomy.find(
    (f) => f.code === expandedFailureCode
  );

  return (
    <div className="min-h-screen scada-grid-bg text-slate-100 flex flex-col">
      {/* Top Industrial SCADA Header */}
      <header className="sticky top-0 z-40 bg-[#080e17]/95 backdrop-blur-md border-b border-scada-border shadow-xl">
        <div className="max-w-[1640px] mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          {/* Brand Title */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-sky-500/15 border border-sky-400/50 flex items-center justify-center shadow-glow-cyan">
              <Flame className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-mono font-extrabold tracking-tight text-white">
                  CryoForge RL <span className="text-sky-400">//</span> AfterQuery &ldquo;Break the Agent&rdquo; Studio
                </h1>
                <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  GOST 34347 · HARBOR MCP
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-400">
                Multi-Physics Cryogenic Vessel Engineering, 2-Bay Scheduling & Mid-Episode Supply-Shock Evaluation
              </p>
            </div>
          </div>

          {/* Seed Selector + Live API / Artifact Mode Pill */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Eval Seeds S01-S05 */}
            <div className="flex items-center bg-[#0c1522] border border-scada-border rounded-lg p-1 gap-1">
              <span className="px-1.5 text-[10px] font-mono font-bold text-slate-400 uppercase">
                Eval
              </span>
              {EVAL_SEEDS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setSelectedSeed(s);
                    setPreferTiebreakerPair(false);
                  }}
                  className={`px-2 py-1 rounded text-xs font-mono font-bold transition ${
                    selectedSeed === s
                      ? "bg-sky-500 text-slate-950 shadow-glow-cyan"
                      : "text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  {s}
                </button>
              ))}
              <span className="text-slate-700 px-0.5">|</span>
              <span className="px-1 text-[10px] font-mono font-bold text-violet-300 uppercase">
                Held-Out
              </span>
              {TIEBREAKER_SEEDS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setSelectedSeed(s);
                    setPreferTiebreakerPair(true);
                  }}
                  className={`px-2 py-1 rounded text-xs font-mono font-bold transition ${
                    selectedSeed === s
                      ? "bg-violet-400 text-slate-950"
                      : "text-violet-200/80 hover:bg-violet-950/60"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Data Source Indicator + Refresh + Upload */}
            <div className="flex items-center gap-1.5">
              <span
                title={sourceLabel}
                className={`px-2.5 py-1.5 rounded-lg text-[10.5px] font-mono font-bold border flex items-center gap-1.5 ${
                  sourceMode === "live_api"
                    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
                    : sourceMode === "custom_upload"
                      ? "bg-violet-500/15 text-violet-200 border-violet-400/40"
                      : "bg-sky-500/15 text-sky-300 border-sky-500/40"
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                {sourceMode === "live_api"
                  ? "LIVE API BRIDGE"
                  : sourceMode === "custom_upload"
                    ? sourceLabel
                    : "BUNDLED ARTIFACT"}
              </span>

              <button
                type="button"
                onClick={() => void refreshData()}
                title="Probe /api/scorecard & /api/runs"
                className="p-1.5 rounded-lg bg-[#0c1522] border border-scada-border text-slate-300 hover:text-white"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-sky-400" : ""}`} />
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleUploadJson}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Load custom scorecard.json or TrajectoryLog JSON"
                className="px-2 py-1.5 rounded-lg bg-[#0c1522] border border-scada-border text-[11px] font-mono text-slate-300 hover:text-white flex items-center gap-1"
              >
                <FileUp className="w-3.5 h-3.5 text-sky-400" />
                JSON
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-[1640px] w-full mx-auto px-4 py-4 space-y-4 flex-1">
        {/* 4 AfterQuery Rubric KPI Ribbon Cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5">
          {/* Card 1: THE GAP (30 pts) */}
          <div
            onClick={() => setActiveTab("replay")}
            className="cursor-pointer bg-[#0c1420] hover:bg-[#0f1928] border border-scada-border hover:border-sky-500/50 rounded-xl p-3.5 shadow-lg transition flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-[10.5px] font-mono uppercase">
                <span className="text-sky-400 font-bold flex items-center gap-1">
                  <BarChart3 className="w-3.5 h-3.5" /> 1. THE GAP (30 PTS)
                </span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-extrabold">
                  Δ +{scorecard.rubric.gap_delta.toFixed(2)}
                </span>
              </div>

              <div className="mt-2 flex items-baseline justify-between font-mono">
                <div>
                  <div className="text-[10px] text-slate-400">Ref Solver</div>
                  <div className="text-xl font-extrabold text-emerald-400 tabular-nums">
                    {scorecard.rubric.reference_mean.toFixed(2)}
                  </div>
                </div>
                <div className="text-slate-600 text-xs">vs</div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-400">3× Frontier Mean</div>
                  <div className="text-xl font-extrabold text-amber-400 tabular-nums">
                    {scorecard.rubric.frontier_mean.toFixed(2)}{" "}
                    <span className="text-xs font-normal text-slate-400">
                      ±{scorecard.rubric.frontier_std.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Per-Seed Grouped Mini Bar Visualization (S01-S05) */}
            <div className="mt-3 pt-2 border-t border-slate-800/80 grid grid-cols-5 gap-1.5">
              {scorecard.per_seed
                .filter((s) => s.split === "eval")
                .map((s) => (
                  <button
                    key={s.seed}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSeed(s.seed);
                      setPreferTiebreakerPair(false);
                      setActiveTab("replay");
                    }}
                    title={`${s.seed}: Ref ${s.reference_score.toFixed(2)} vs Frontier ${s.frontier_mean.toFixed(2)}`}
                    className={`p-1 rounded bg-[#070e18] border ${
                      selectedSeed === s.seed ? "border-sky-400" : "border-slate-800"
                    }`}
                  >
                    <div className="h-8 flex items-end justify-center gap-1">
                      <div
                        className="w-2 bg-emerald-400 rounded-t-sm"
                        style={{ height: `${Math.round(s.reference_score * 100)}%` }}
                      />
                      <div
                        className="w-2 bg-amber-400 rounded-t-sm"
                        style={{ height: `${Math.round(s.frontier_mean * 100)}%` }}
                      />
                    </div>
                    <div className="text-[9px] font-mono text-center text-slate-400 mt-0.5">
                      {s.seed}
                    </div>
                  </button>
                ))}
            </div>
          </div>

          {/* Card 2: MEANINGFUL DIFFICULTY (30 pts) */}
          <div className="bg-[#0c1420] border border-scada-border rounded-xl p-3.5 shadow-lg flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-[10.5px] font-mono uppercase">
                <span className="text-amber-400 font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> 2. MEANINGFUL DIFFICULTY (30 PTS)
                </span>
                <span className="text-slate-400">Click tag → Step</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                6 coupled physics, supply-shock & factory failure modes linked to logged decisions:
              </p>
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5">
              {scorecard.failure_taxonomy.map((ft) => {
                const isExp = expandedFailureCode === ft.code;
                return (
                  <button
                    key={ft.code}
                    type="button"
                    onClick={() => setExpandedFailureCode(isExp ? null : ft.code)}
                    className={`px-2 py-1 rounded text-[10px] font-mono font-bold border transition flex items-center gap-1 ${
                      isExp
                        ? "bg-amber-500/25 text-amber-200 border-amber-400"
                        : "bg-[#08101a] text-slate-300 border-slate-800 hover:border-amber-500/50"
                    }`}
                  >
                    <span>{ft.code}</span>
                    <span className="text-amber-400">({ft.occurrences})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Card 3: REWARD INTEGRITY (25 pts) */}
          <div
            onClick={() => setActiveTab("integrity")}
            className="cursor-pointer bg-[#0c1420] hover:bg-[#0f1928] border border-scada-border hover:border-emerald-500/50 rounded-xl p-3.5 shadow-lg transition flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-[10.5px] font-mono uppercase">
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> 3. REWARD INTEGRITY (25 PTS)
                </span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-extrabold">
                  {scorecard.rubric.exploits_blocked}/{scorecard.rubric.exploits_total} BLOCKED
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-2.5 font-mono">
                <div className="p-2 rounded bg-[#070e18] border border-slate-800">
                  <div className="text-[9.5px] text-slate-500">DO-NOTHING</div>
                  <div className="text-base font-extrabold text-emerald-400 tabular-nums">
                    {scorecard.rubric.do_nothing_score.toFixed(3)}
                  </div>
                </div>
                <div className="p-2 rounded bg-[#070e18] border border-slate-800">
                  <div className="text-[9.5px] text-slate-500">STOP-EARLY CAP</div>
                  <div className="text-base font-extrabold text-emerald-400 tabular-nums">
                    {scorecard.rubric.stop_early_score.toFixed(3)}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10.5px] font-mono text-emerald-300">
              <span>Max Red-Team Exploit &le; {scorecard.rubric.max_exploit_score.toFixed(2)}</span>
              <span className="underline">Audit 8 Attacks →</span>
            </div>
          </div>

          {/* Card 4: TIEBREAKER (+EDGE) */}
          <div
            onClick={() => setActiveTab("tiebreaker")}
            className="cursor-pointer bg-[#0c1420] hover:bg-[#0f1928] border border-scada-border hover:border-violet-400/50 rounded-xl p-3.5 shadow-lg transition flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-[10.5px] font-mono uppercase">
                <span className="text-violet-300 font-bold flex items-center gap-1">
                  <Award className="w-3.5 h-3.5" /> 4. TIEBREAKER (+EDGE)
                </span>
                <span className="px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-200 font-extrabold">
                  S06–S08 HELD-OUT
                </span>
              </div>

              <div className="mt-2 flex items-baseline justify-between font-mono">
                <div>
                  <div className="text-[10px] text-slate-400">Small Before</div>
                  <div className="text-xl font-extrabold text-amber-400 tabular-nums">
                    {scorecard.tiebreaker.before_mean.toFixed(3)}
                  </div>
                </div>
                <Sparkles className="w-4 h-4 text-violet-400" />
                <div className="text-right">
                  <div className="text-[10px] text-emerald-300">After QLoRA</div>
                  <div className="text-xl font-extrabold text-emerald-400 tabular-nums">
                    {scorecard.tiebreaker.after_mean.toFixed(3)}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10.5px] font-mono text-violet-200">
              <span>Qwen2.5-3B / Gemma-4 LoRA (+{scorecard.tiebreaker.delta_improvement.toFixed(2)})</span>
              <span className="underline">Inspect S06–S08 →</span>
            </div>
          </div>
        </section>

        {/* Interactive Failure-Mode Taxonomy Drawer (when a failure tag is clicked) */}
        {selectedTaxonomy && (
          <section className="bg-[#101927] border border-amber-400/50 rounded-xl p-4 shadow-glow-amber space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-xs font-mono font-extrabold">
                    {selectedTaxonomy.code}
                  </span>
                  <h3 className="text-sm font-bold text-slate-100">{selectedTaxonomy.title}</h3>
                  <span className="text-xs font-mono text-slate-400">
                    ({selectedTaxonomy.occurrences} logged violations across {selectedTaxonomy.affected_seeds.join(", ")})
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1">{selectedTaxonomy.root_cause}</p>
              </div>
              <button
                type="button"
                onClick={() => setExpandedFailureCode(null)}
                className="text-xs font-mono text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-900 border border-slate-800"
              >
                Close ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {selectedTaxonomy.incidents.map((inc, i) => (
                <button
                  key={`${inc.run_id}-${inc.order_id}-${i}`}
                  type="button"
                  onClick={() => jumpToFailureIncident(inc)}
                  className="text-left p-3 rounded-lg bg-[#070e18] hover:bg-sky-950/40 border border-slate-800 hover:border-sky-400/60 transition flex flex-col justify-between gap-2"
                >
                  <div>
                    <div className="flex items-center justify-between text-[10.5px] font-mono">
                      <span className="text-sky-300 font-bold">
                        {inc.seed} · {inc.order_id} · Step #{inc.step_index}
                      </span>
                      <ExternalLink className="w-3 h-3 text-sky-400" />
                    </div>
                    <div className="mt-1 px-1.5 py-0.5 inline-block rounded bg-rose-500/20 border border-rose-500/40 text-rose-200 text-[10px] font-mono font-bold">
                      {inc.violation_badge}
                    </div>
                    <p className="text-[11px] text-slate-300 mt-1.5 leading-snug">{inc.summary}</p>
                  </div>
                  <div className="text-[10px] font-mono text-sky-400 font-bold">
                    Jump to Logged CAD & Gantt Decision →
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Studio Navigation Tabs + Active Seed Scenario Context */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-scada-border pb-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("replay")}
              className={`px-3.5 py-2 rounded-lg text-xs font-mono font-bold flex items-center gap-2 transition ${
                activeTab === "replay"
                  ? "bg-sky-500/20 text-sky-200 border border-sky-400/60 shadow-glow-cyan"
                  : "bg-[#0c1420] text-slate-400 border border-scada-border hover:text-slate-200"
              }`}
            >
              <Layers className="w-4 h-4 text-sky-400" />
              Tab 1 · Trajectory, GOST CAD & Shock Replay
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("integrity")}
              className={`px-3.5 py-2 rounded-lg text-xs font-mono font-bold flex items-center gap-2 transition ${
                activeTab === "integrity"
                  ? "bg-emerald-500/20 text-emerald-200 border border-emerald-400/60 shadow-glow-emerald"
                  : "bg-[#0c1420] text-slate-400 border border-scada-border hover:text-slate-200"
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Tab 2 · Reward Integrity & 8-Attack Red-Team Audit
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("tiebreaker")}
              className={`px-3.5 py-2 rounded-lg text-xs font-mono font-bold flex items-center gap-2 transition ${
                activeTab === "tiebreaker"
                  ? "bg-violet-500/20 text-violet-100 border border-violet-400/60"
                  : "bg-[#0c1420] text-slate-400 border border-scada-border hover:text-slate-200"
              }`}
            >
              <Sparkles className="w-4 h-4 text-violet-400" />
              Tab 3 · Held-Out Tiebreaker (S06–S08) & Reproducibility
            </button>
          </div>

          {currentSeedSummary && (
            <div className="flex items-center gap-2 text-xs font-mono text-slate-300 bg-[#0c1420] px-3 py-1.5 rounded-lg border border-scada-border">
              <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="font-bold text-sky-300">{currentSeedSummary.seed}:</span>
              <span className="truncate max-w-md">{currentSeedSummary.scenario_title}</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 ml-1 shrink-0" />
              <span className="text-emerald-400 font-bold">
                Ref {currentSeedSummary.reference_score.toFixed(3)}
              </span>
            </div>
          )}
        </div>

        {/* Active Tab View */}
        {activeTab === "replay" && (
          <TrajectoryDiff
            seed={selectedSeed}
            seedRuns={seedRuns}
            focusedIncident={focusedIncident}
            preferTiebreakerPair={preferTiebreakerPair}
          />
        )}

        {activeTab === "integrity" && <ScorecardPanel scorecard={scorecard} />}

        {activeTab === "tiebreaker" && (
          <TiebreakerPanel
            scorecard={scorecard}
            onInspectHeldOutSeed={(seed) => {
              setSelectedSeed(seed);
              setPreferTiebreakerPair(true);
              setActiveTab("replay");
            }}
          />
        )}
      </main>
    </div>
  );
};

export default App;
