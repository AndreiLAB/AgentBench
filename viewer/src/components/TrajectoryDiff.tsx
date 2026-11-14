import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Cpu,
  FastForward,
  Pause,
  Play,
  RotateCcw,
  Terminal,
  Zap,
} from "lucide-react";
import type { TrajectoryLog } from "../types/cryoforge";
import {
  extractSeedWorldMetadata,
  findShockArrayIndex,
  replayTrajectoryAtStep,
} from "../lib/trajectoryEngine";
import { VesselBlueprint } from "./VesselBlueprint";
import { BayGanttTimeline } from "./BayGanttTimeline";

export interface FocusedIncidentTarget {
  seed: string;
  run_id: string;
  order_id: string;
  step_index: number;
  nonce: number;
}

export interface TrajectoryDiffProps {
  seed: string;
  seedRuns: TrajectoryLog[];
  focusedIncident?: FocusedIncidentTarget | null;
  preferTiebreakerPair?: boolean;
}

export const TrajectoryDiff: React.FC<TrajectoryDiffProps> = ({
  seed,
  seedRuns,
  focusedIncident,
  preferTiebreakerPair = false,
}) => {
  const hasSmallPair = useMemo(
    () =>
      seedRuns.some((r) => r.agent_type === "small_after") &&
      seedRuns.some((r) => r.agent_type === "small_before"),
    [seedRuns]
  );

  const [leftRunId, setLeftRunId] = useState<string>("");
  const [rightRunId, setRightRunId] = useState<string>("");
  const [scrubStep, setScrubStep] = useState<number>(999);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");

  // Select default comparison pair whenever seed or runs change
  useEffect(() => {
    setIsPlaying(false);
    const refRun = seedRuns.find((r) => r.agent_type === "reference") ?? seedRuns[0];
    const frontierCandidates = seedRuns
      .filter((r) => r.agent_type === "frontier")
      .sort((a, b) => a.verification.final_score - b.verification.final_score);
    const frontRun = frontierCandidates[0] ?? seedRuns[1] ?? seedRuns[0];
    const saRun = seedRuns.find((r) => r.agent_type === "small_after");
    const sbRun = seedRuns.find((r) => r.agent_type === "small_before");

    if (preferTiebreakerPair && saRun && sbRun) {
      setLeftRunId(saRun.run_id);
      setRightRunId(sbRun.run_id);
    } else {
      setLeftRunId(refRun?.run_id ?? "");
      setRightRunId(frontRun?.run_id ?? "");
    }
    const maxLen = Math.max(...seedRuns.map((r) => r.steps.length), 1);
    setScrubStep(maxLen - 1);
  }, [seed, seedRuns, preferTiebreakerPair]);

  const world = useMemo(() => extractSeedWorldMetadata(seed, seedRuns), [seed, seedRuns]);

  useEffect(() => {
    if (world.orders.length > 0 && !world.orders.some((o) => o.order_id === selectedOrderId)) {
      setSelectedOrderId(world.orders[0].order_id);
    }
  }, [world, selectedOrderId]);

  // Jump to exact incident when user clicks a Failure-Mode Taxonomy link
  useEffect(() => {
    if (!focusedIncident || focusedIncident.seed !== seed) return;
    setIsPlaying(false);
    const targetRun = seedRuns.find((r) => r.run_id === focusedIncident.run_id);
    if (targetRun) {
      if (targetRun.agent_type === "small_before") {
        const sa = seedRuns.find((r) => r.agent_type === "small_after");
        if (sa) setLeftRunId(sa.run_id);
      } else {
        const ref = seedRuns.find((r) => r.agent_type === "reference");
        if (ref) setLeftRunId(ref.run_id);
      }
      setRightRunId(targetRun.run_id);
      const arrIdx = targetRun.steps.findIndex((s) => s.step_index >= focusedIncident.step_index);
      // Scrub to end or shock/target step so full violation context is visible
      setScrubStep(arrIdx >= 0 ? Math.max(arrIdx, targetRun.steps.length - 1) : targetRun.steps.length - 1);
    }
    if (focusedIncident.order_id) {
      setSelectedOrderId(focusedIncident.order_id);
    }
  }, [focusedIncident, seed, seedRuns]);

  const leftRun = seedRuns.find((r) => r.run_id === leftRunId) ?? seedRuns[0];
  const rightRun = seedRuns.find((r) => r.run_id === rightRunId) ?? seedRuns[1] ?? seedRuns[0];

  const maxSteps = Math.max(leftRun?.steps.length ?? 1, rightRun?.steps.length ?? 1);
  const clampedStep = Math.max(0, Math.min(scrubStep, maxSteps - 1));

  useEffect(() => {
    if (!isPlaying) return;
    const id = window.setInterval(() => {
      setScrubStep((prev) => {
        if (prev >= maxSteps - 1) {
          setIsPlaying(false);
          return maxSteps - 1;
        }
        return prev + 1;
      });
    }, 850);
    return () => window.clearInterval(id);
  }, [isPlaying, maxSteps]);

  const leftFrame = useMemo(
    () => replayTrajectoryAtStep(leftRun, clampedStep, world),
    [leftRun, clampedStep, world]
  );
  const rightFrame = useMemo(
    () => replayTrajectoryAtStep(rightRun, clampedStep, world),
    [rightRun, clampedStep, world]
  );

  const shockIdx = useMemo(() => {
    const rShock = rightRun ? findShockArrayIndex(rightRun) : null;
    const lShock = leftRun ? findShockArrayIndex(leftRun) : null;
    return rShock ?? lShock ?? 3;
  }, [leftRun, rightRun]);

  if (!leftRun || !rightRun) {
    return <div className="p-6 text-slate-400 font-mono">No trajectory runs available for {seed}.</div>;
  }

  const activeOrderId = selectedOrderId || world.orders[0]?.order_id || "";
  const leftOrderSnap =
    leftFrame.orders.find((o) => o.order.order_id === activeOrderId) ?? leftFrame.orders[0];
  const rightOrderSnap =
    rightFrame.orders.find((o) => o.order.order_id === activeOrderId) ?? rightFrame.orders[0];

  const leftStepObj = leftRun.steps[Math.min(clampedStep, leftRun.steps.length - 1)];
  const rightStepObj = rightRun.steps[Math.min(clampedStep, rightRun.steps.length - 1)];

  const switchPairPreset = (mode: "ref_vs_frontier" | "small_after_vs_before") => {
    setIsPlaying(false);
    if (mode === "small_after_vs_before") {
      const sa = seedRuns.find((r) => r.agent_type === "small_after");
      const sb = seedRuns.find((r) => r.agent_type === "small_before");
      if (sa && sb) {
        setLeftRunId(sa.run_id);
        setRightRunId(sb.run_id);
      }
    } else {
      const ref = seedRuns.find((r) => r.agent_type === "reference") ?? seedRuns[0];
      const frCands = seedRuns
        .filter((r) => r.agent_type === "frontier")
        .sort((a, b) => a.verification.final_score - b.verification.final_score);
      const fr = frCands[0] ?? seedRuns[1] ?? seedRuns[0];
      setLeftRunId(ref.run_id);
      setRightRunId(fr.run_id);
    }
  };

  return (
    <div className="space-y-4">
      {/* Playback Scrubber & Pair Selector Control Deck */}
      <div className="bg-[#0c1420] border border-scada-border rounded-xl p-3.5 shadow-lg space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Pair Selector */}
          <div className="flex flex-wrap items-center gap-2">
            {hasSmallPair && (
              <div className="flex items-center bg-[#070d16] p-0.5 rounded-lg border border-scada-border mr-1">
                <button
                  type="button"
                  onClick={() => switchPairPreset("ref_vs_frontier")}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-bold transition ${
                    leftRun.agent_type === "reference"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Ref vs Frontier
                </button>
                <button
                  type="button"
                  onClick={() => switchPairPreset("small_after_vs_before")}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-bold transition ${
                    leftRun.agent_type === "small_after"
                      ? "bg-sky-500/20 text-sky-300 border border-sky-500/40"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Small LoRA: After vs Before
                </button>
              </div>
            )}

            <div className="flex items-center gap-1.5 text-xs font-mono">
              <span className="text-emerald-400 font-bold">L:</span>
              <select
                value={leftRun.run_id}
                onChange={(e) => setLeftRunId(e.target.value)}
                className="bg-[#08101a] border border-emerald-500/40 rounded px-2 py-1 text-slate-200 text-xs font-mono focus:outline-none"
              >
                {seedRuns.map((r) => (
                  <option key={r.run_id} value={r.run_id}>
                    {r.agent_name} ({r.verification.final_score.toFixed(3)})
                  </option>
                ))}
              </select>
              <span className="text-slate-500 px-1">vs</span>
              <span className="text-amber-400 font-bold">R:</span>
              <select
                value={rightRun.run_id}
                onChange={(e) => setRightRunId(e.target.value)}
                className="bg-[#08101a] border border-amber-500/40 rounded px-2 py-1 text-slate-200 text-xs font-mono focus:outline-none"
              >
                {seedRuns.map((r) => (
                  <option key={r.run_id} value={r.run_id}>
                    {r.agent_name} ({r.verification.final_score.toFixed(3)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Transport Playback Controls */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setIsPlaying(false);
                setScrubStep(0);
              }}
              title="Reset to Step 1"
              className="p-1.5 rounded bg-slate-900 border border-scada-border text-slate-300 hover:text-white"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setIsPlaying(false);
                setScrubStep((s) => Math.max(0, s - 1));
              }}
              className="p-1.5 rounded bg-slate-900 border border-scada-border text-slate-300 hover:text-white"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                if (clampedStep >= maxSteps - 1) setScrubStep(0);
                setIsPlaying((p) => !p);
              }}
              className="px-3 py-1.5 rounded bg-sky-500/20 border border-sky-400/50 text-sky-200 hover:bg-sky-500/30 text-xs font-mono font-bold flex items-center gap-1.5"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {isPlaying ? "PAUSE" : "PLAY"}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsPlaying(false);
                setScrubStep((s) => Math.min(maxSteps - 1, s + 1));
              }}
              className="p-1.5 rounded bg-slate-900 border border-scada-border text-slate-300 hover:text-white"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => {
                setIsPlaying(false);
                setScrubStep(shockIdx);
              }}
              className="px-3 py-1.5 rounded bg-amber-500/20 border border-amber-400/60 text-amber-200 hover:bg-amber-500/30 text-xs font-mono font-bold flex items-center gap-1 shadow-glow-amber"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Jump to Step-{shockIdx + 1} Shock ⚡
            </button>

            <button
              type="button"
              onClick={() => {
                setIsPlaying(false);
                setScrubStep(maxSteps - 1);
              }}
              className="px-2.5 py-1.5 rounded bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/25 text-xs font-mono font-bold flex items-center gap-1"
            >
              <FastForward className="w-3.5 h-3.5" />
              Final
            </button>
          </div>
        </div>

        {/* Timeline Scrubber Slider */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>
              Scrubber: <strong className="text-sky-300">Step {clampedStep + 1}</strong> / {maxSteps}
              {clampedStep === shockIdx && (
                <span className="ml-2 px-1.5 py-0.5 rounded bg-amber-500/25 text-amber-300 font-bold">
                  ⚡ SUPPLY & CORRIDOR SHOCK FIRED
                </span>
              )}
            </span>
            <div className="flex items-center gap-4 tabular-nums">
              <span>
                L Sim Budget:{" "}
                <strong className="text-emerald-400">
                  {leftFrame.simCallsUsed}/{leftFrame.simBudgetTotal}
                </strong>{" "}
                · Capex €{leftFrame.spentEur.toLocaleString()}
              </span>
              <span>
                R Sim Budget:{" "}
                <strong
                  className={
                    rightFrame.simCallsUsed >= rightFrame.simBudgetTotal
                      ? "text-rose-400"
                      : "text-amber-300"
                  }
                >
                  {rightFrame.simCallsUsed}/{rightFrame.simBudgetTotal}
                </strong>{" "}
                · Capex €{rightFrame.spentEur.toLocaleString()}
              </span>
            </div>
          </div>
          <input
            type="range"
            min={0}
            max={Math.max(0, maxSteps - 1)}
            value={clampedStep}
            onChange={(e) => {
              setIsPlaying(false);
              setScrubStep(Number(e.target.value));
            }}
            className="w-full accent-sky-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
          />
        </div>

        {/* 4-Order Selector Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 pt-1">
          {world.orders.map((ord) => {
            const lSnap = leftFrame.orders.find((o) => o.order.order_id === ord.order_id);
            const rSnap = rightFrame.orders.find((o) => o.order.order_id === ord.order_id);
            const isSel = ord.order_id === activeOrderId;
            return (
              <button
                key={ord.order_id}
                type="button"
                onClick={() => setSelectedOrderId(ord.order_id)}
                className={`text-left p-2.5 rounded-lg border transition flex flex-col justify-between ${
                  isSel
                    ? "bg-sky-500/15 border-sky-400 shadow-glow-cyan"
                    : "bg-[#08101a] border-scada-border hover:border-slate-600"
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-mono font-extrabold text-slate-100">
                    {ord.order_id} · {ord.medium}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                    {ord.execution === "STATIONARY" ? "GHK-VERT" : "CTK-SKID"}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 truncate mt-0.5">{ord.client_name}</div>
                <div className="flex items-center justify-between gap-2 mt-2 pt-1.5 border-t border-slate-800/80 text-[10px] font-mono">
                  <span className="flex items-center gap-1 text-emerald-400 font-bold">
                    {lSnap?.passedAllHardChecks ? (
                      <CheckCircle2 className="w-3 h-3" />
                    ) : (
                      <AlertTriangle className="w-3 h-3 text-amber-400" />
                    )}
                    L: {lSnap?.passedAllHardChecks ? "PASS" : "WIP/WARN"}
                  </span>
                  <span
                    className={`flex items-center gap-1 font-bold ${
                      rSnap?.passedAllHardChecks ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {rSnap?.passedAllHardChecks ? (
                      <CheckCircle2 className="w-3 h-3" />
                    ) : (
                      <AlertTriangle className="w-3 h-3" />
                    )}
                    R: {rSnap?.passedAllHardChecks ? "PASS" : rSnap?.blueprintBadges[0]?.code ?? "FAIL"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Side-by-Side Parametric GOST CAD Vessel Blueprints */}
      {leftOrderSnap && rightOrderSnap && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <VesselBlueprint
            snapshot={leftOrderSnap}
            agentLabel={`${leftRun.agent_type === "small_after" ? "SMALL AFTER LoRA" : "REFERENCE"} · ${leftRun.verification.final_score.toFixed(3)}`}
            accentTone={leftRun.agent_type === "small_after" ? "cyan" : "emerald"}
          />
          <VesselBlueprint
            snapshot={rightOrderSnap}
            agentLabel={`${rightRun.agent_type === "small_before" ? "SMALL BEFORE" : "FRONTIER"} · ${rightRun.verification.final_score.toFixed(3)}`}
            accentTone="amber"
          />
        </div>
      )}

      {/* Side-by-Side 2-Bay Factory & Supply-Shock Gantt Schedules */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <BayGanttTimeline
          frame={leftFrame}
          agentLabel={`${leftRun.agent_name} (${leftRun.verification.valid_order_count}/4 Valid)`}
          accentTone={leftRun.agent_type === "small_after" ? "cyan" : "emerald"}
          selectedOrderId={activeOrderId}
          onSelectOrder={setSelectedOrderId}
          horizonWeeks={world.horizonWeeks}
        />
        <BayGanttTimeline
          frame={rightFrame}
          agentLabel={`${rightRun.agent_name} (${rightRun.verification.valid_order_count}/4 Valid)`}
          accentTone="amber"
          selectedOrderId={activeOrderId}
          onSelectOrder={setSelectedOrderId}
          horizonWeeks={world.horizonWeeks}
        />
      </div>

      {/* Side-by-Side Logged MCP Tool Step Diff */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {[
          { run: leftRun, stepObj: leftStepObj, tone: "emerald" as const },
          { run: rightRun, stepObj: rightStepObj, tone: "amber" as const },
        ].map(({ run, stepObj, tone }) => (
          <div
            key={run.run_id}
            className="bg-[#0b131e] border border-scada-border rounded-xl overflow-hidden shadow-lg"
          >
            <div className="px-3.5 py-2 bg-[#0e1826] border-b border-scada-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className={`w-4 h-4 ${tone === "emerald" ? "text-emerald-400" : "text-amber-400"}`} />
                <span className="text-xs font-mono font-bold text-slate-200">
                  MCP Tool Call Log · {run.agent_name}
                </span>
              </div>
              <span className="text-[10.5px] font-mono text-slate-400">
                Step {stepObj?.step_index ?? 0} / {run.steps.length}
              </span>
            </div>

            <div className="p-3 grid grid-cols-1 md:grid-cols-12 gap-3">
              {/* Step list */}
              <div className="md:col-span-5 max-h-52 overflow-y-auto space-y-1 pr-1">
                {run.steps.map((st, idx) => {
                  const active = idx === Math.min(clampedStep, run.steps.length - 1);
                  const err = st.observation?.ok === false;
                  return (
                    <button
                      key={st.step_index}
                      type="button"
                      onClick={() => {
                        setIsPlaying(false);
                        setScrubStep(idx);
                        if (typeof st.arguments?.order_id === "string") {
                          setSelectedOrderId(st.arguments.order_id);
                        }
                      }}
                      className={`w-full text-left px-2 py-1 rounded text-[11px] font-mono flex items-center justify-between transition ${
                        active
                          ? "bg-sky-500/20 border border-sky-400/50 text-sky-100 font-bold"
                          : idx <= clampedStep
                            ? "bg-slate-900/70 text-slate-300 hover:bg-slate-800"
                            : "bg-slate-950/40 text-slate-600 hover:text-slate-400"
                      }`}
                    >
                      <span className="truncate">
                        {st.step_index}. {st.tool_name}
                        {typeof st.arguments?.order_id === "string" ? `(${st.arguments.order_id})` : ""}
                      </span>
                      <span className="flex items-center gap-1 shrink-0 ml-1">
                        {st.disruption_triggered_this_step && <Zap className="w-3 h-3 text-amber-400" />}
                        {st.tool_name === "revise_order" && (
                          <Cpu className="w-3 h-3 text-emerald-400" />
                        )}
                        {err && <AlertTriangle className="w-3 h-3 text-rose-400" />}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Active step payload */}
              <div className="md:col-span-7 bg-[#070d16] border border-slate-800 rounded-lg p-2.5 max-h-52 overflow-y-auto font-mono text-[10.5px] space-y-2">
                {stepObj ? (
                  <>
                    <div className="flex items-center justify-between text-sky-300 font-bold border-b border-slate-800 pb-1">
                      <span>CALL: {stepObj.tool_name}()</span>
                      {stepObj.disruption_triggered_this_step && (
                        <span className="text-amber-300">⚡ SHOCK ALERT</span>
                      )}
                    </div>
                    <div>
                      <div className="text-slate-500 text-[9.5px] uppercase">Arguments</div>
                      <pre className="text-slate-300 whitespace-pre-wrap break-all">
                        {JSON.stringify(stepObj.arguments, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <div className="text-slate-500 text-[9.5px] uppercase">MCP Observation</div>
                      <pre className="text-emerald-300/90 whitespace-pre-wrap break-all">
                        {JSON.stringify(stepObj.observation, null, 2)}
                      </pre>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
