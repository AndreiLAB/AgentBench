import React, { useState } from "react";
import {
  CheckCircle2,
  Lock,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  TrendingUp,
} from "lucide-react";
import type { ScorecardData } from "../types/cryoforge";

export interface ScorecardPanelProps {
  scorecard: ScorecardData;
}

const PROGRESS_CURVE_POINTS = [
  { orders: 0, label: "0 Valid (Do-Nothing / Unfinalized)", score: 0.0, tag: "0.000 HARD ZERO" },
  { orders: 1, label: "1 Valid (Stop-Early Cherry-Pick)", score: 0.08, tag: "0.080 CAPPED GATE" },
  { orders: 2, label: "2 Valid (Frontier Typical)", score: 0.34, tag: "0.340 (0.80× GATE)" },
  { orders: 3, label: "3 Valid (Near-Complete)", score: 0.587, tag: "0.587 (0.92× GATE)" },
  { orders: 4, label: "4 Valid + Efficiency Margins", score: 0.979, tag: "0.979 FULL + BONUSES" },
];

export const ScorecardPanel: React.FC<ScorecardPanelProps> = ({ scorecard }) => {
  const [selectedExploitId, setSelectedExploitId] = useState<string>(
    scorecard.exploits[0]?.exploit_id ?? "EXPLOIT_01"
  );
  const selectedExploit =
    scorecard.exploits.find((e) => e.exploit_id === selectedExploitId) ?? scorecard.exploits[0];

  return (
    <div className="space-y-5">
      {/* Top Banner: Zero-Trust Reward Integrity Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Monotonic Progress & Anti-Cherry-Picking Curve */}
        <div className="lg:col-span-7 bg-[#0b131e] border border-scada-border rounded-xl p-4 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-100">
                  Monotonic Batch-Completion Reward Curve
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded text-[10.5px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/40">
                STRICTLY MONOTONIC · ANTI-CHERRY-PICKING
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Rewards reflect genuine physical & logistical progress across the 4-vessel plant batch while clamping{" "}
              <code className="text-amber-300">stop_early</code> single-order cherry-picking to{" "}
              <code className="text-amber-300">&le; 0.080</code> and withholding efficiency bonuses until{" "}
              <code className="text-emerald-300">4/4</code> orders pass all hard checks.
            </p>
          </div>

          {/* SVG Monotonic Curve Chart */}
          <div className="bg-[#070e18] border border-slate-800 rounded-lg p-3">
            <svg viewBox="0 0 640 215" className="w-full h-auto select-none">
              {/* Horizontal reference lines */}
              {[0, 0.25, 0.5, 0.75, 1.0].map((val) => {
                const y = 175 - val * 145;
                return (
                  <g key={val}>
                    <line x1="56" y1={y} x2="605" y2={y} stroke="#192b42" strokeWidth="1" />
                    <text
                      x="48"
                      y={y + 4}
                      textAnchor="end"
                      fill="#64748b"
                      fontSize="10"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {val.toFixed(2)}
                    </text>
                  </g>
                );
              })}

              {/* Max Exploit Ceiling Line at 0.080 */}
              <line
                x1="56"
                y1={175 - 0.08 * 145}
                x2="605"
                y2={175 - 0.08 * 145}
                stroke="#fb7185"
                strokeWidth="1.3"
                strokeDasharray="6 4"
              />
              <text
                x="598"
                y={175 - 0.08 * 145 - 6}
                textAnchor="end"
                fill="#fda4af"
                fontSize="9.5"
                fontWeight="700"
                fontFamily="JetBrains Mono, monospace"
              >
                MAX EXPLOIT / STOP-EARLY CEILING (0.080)
              </text>

              {/* Curve Polyline */}
              <polyline
                fill="none"
                stroke="#38bdf8"
                strokeWidth="3"
                points={PROGRESS_CURVE_POINTS.map((pt, idx) => {
                  const x = 90 + idx * 122;
                  const y = 175 - pt.score * 145;
                  return `${x},${y}`;
                }).join(" ")}
              />

              {/* Nodes */}
              {PROGRESS_CURVE_POINTS.map((pt, idx) => {
                const x = 90 + idx * 122;
                const y = 175 - pt.score * 145;
                const fill =
                  pt.orders === 4
                    ? "#34d399"
                    : pt.orders <= 1
                      ? "#fb7185"
                      : "#38bdf8";
                return (
                  <g key={pt.orders}>
                    <circle cx={x} cy={y} r="6" fill="#070e18" stroke={fill} strokeWidth="3" />
                    <text
                      x={x}
                      y={y - 12}
                      textAnchor="middle"
                      fill={fill}
                      fontSize="11"
                      fontWeight="800"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {pt.score.toFixed(3)}
                    </text>
                    <text
                      x={x}
                      y="196"
                      textAnchor="middle"
                      fill="#cbd5e1"
                      fontSize="10.5"
                      fontWeight="700"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {pt.orders}/4 Valid
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Zero-Trust Defense Architecture Card */}
        <div className="lg:col-span-5 bg-[#0b131e] border border-scada-border rounded-xl p-4 shadow-lg flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Lock className="w-4 h-4 text-sky-400" />
              <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-100">
                Zero-Trust Harbor Verification Architecture
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              Every exploit vector common to agentic benchmarks is structurally eliminated at both the MCP protocol boundary and container boundary:
            </p>
          </div>

          <div className="space-y-2 text-xs font-mono">
            {[
              {
                title: "1. Sidecar Container Network Isolation",
                desc: "Agent runs in unprivileged container; scenarios.py & verifier.py live strictly inside isolated MCP sidecar.",
              },
              {
                title: "2. Anti-Oracle Booking & Retooling Gate",
                desc: "reserve_bay_and_order never leaks stress/boil-off; revise_order charges €1.5k/€4.5k retooling fees.",
              },
              {
                title: "3. Mandatory Terminal Commissioning",
                desc: "Unfinalized trajectories multiply score by 0.0000; post-finalize calls return EPISODE_ALREADY_FINALIZED.",
              },
              {
                title: "4. HMAC-SHA256 & Post-Shock Recomputation",
                desc: "Terminal verifier recomputes every vessel's physics & route constraints from scratch under post-shock state.",
              },
            ].map((item) => (
              <div key={item.title} className="p-2.5 rounded-lg bg-[#070e18] border border-slate-800">
                <div className="text-sky-300 font-bold text-[11px]">{item.title}</div>
                <div className="text-slate-400 text-[10.5px] font-sans mt-0.5">{item.desc}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1 text-center font-mono">
            <div className="p-2 rounded bg-slate-900/90 border border-slate-800">
              <div className="text-[10px] text-slate-500">DO-NOTHING</div>
              <div className="text-sm font-extrabold text-emerald-400">
                {scorecard.rubric.do_nothing_score.toFixed(3)}
              </div>
            </div>
            <div className="p-2 rounded bg-slate-900/90 border border-slate-800">
              <div className="text-[10px] text-slate-500">STOP-EARLY</div>
              <div className="text-sm font-extrabold text-emerald-400">
                {scorecard.rubric.stop_early_score.toFixed(3)}
              </div>
            </div>
            <div className="p-2 rounded bg-emerald-950/40 border border-emerald-500/40">
              <div className="text-[10px] text-emerald-300">EXPLOITS BLOCKED</div>
              <div className="text-sm font-extrabold text-emerald-400">
                {scorecard.rubric.exploits_blocked}/{scorecard.rubric.exploits_total}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 8-Attack Adversarial Red-Team Suite */}
      <div className="bg-[#0b131e] border border-scada-border rounded-xl overflow-hidden shadow-lg">
        <div className="px-4 py-3 bg-[#0e1826] border-b border-scada-border flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-100">
              8-Attack Automated Red-Team Exploit Audit (eval/exploit_tests.py)
            </h3>
          </div>
          <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            ALL {scorecard.rubric.exploits_blocked}/{scorecard.rubric.exploits_total} ADVERSARIAL ATTACKS BLOCKED (&le; 0.080)
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-scada-border">
          {/* Left Table of 8 Exploits */}
          <div className="lg:col-span-7 divide-y divide-slate-800/80">
            {scorecard.exploits.map((exp) => {
              const active = exp.exploit_id === selectedExploit?.exploit_id;
              return (
                <button
                  key={exp.exploit_id}
                  type="button"
                  onClick={() => setSelectedExploitId(exp.exploit_id)}
                  className={`w-full text-left px-4 py-3 transition flex items-center justify-between gap-3 ${
                    active ? "bg-sky-500/10" : "hover:bg-slate-900/60"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-extrabold text-sky-300">
                        {exp.exploit_id}
                      </span>
                      <span className="text-xs font-semibold text-slate-100 truncate">
                        {exp.name}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 truncate mt-0.5">
                      {exp.category} · {exp.invariant_ref}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 font-mono">
                    <div className="text-right">
                      <div className="text-[10px] text-slate-500">SCORE</div>
                      <div className="text-xs font-bold text-slate-200 tabular-nums">
                        {exp.observed_score.toFixed(3)}
                      </div>
                    </div>
                    <span className="px-2 py-1 rounded text-[10.5px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      PASS (BLOCKED)
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Selected Exploit Deep-Dive */}
          {selectedExploit && (
            <div className="lg:col-span-5 p-4 bg-[#08101a] space-y-3.5 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-sky-500/20 border border-sky-400/40 text-sky-300 text-xs font-mono font-bold">
                    {selectedExploit.exploit_id} · {selectedExploit.category}
                  </span>
                  <span className="text-xs font-mono text-emerald-400 font-bold">
                    Observed: {selectedExploit.observed_score.toFixed(4)} &le; {selectedExploit.max_allowed_score.toFixed(2)}
                  </span>
                </div>

                <h4 className="text-base font-bold text-slate-100">{selectedExploit.name}</h4>

                <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-500/30">
                  <div className="text-[10px] font-mono font-bold uppercase text-rose-300 mb-1">
                    Adversarial Attack Vector
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {selectedExploit.attack_vector}
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/30">
                  <div className="text-[10px] font-mono font-bold uppercase text-emerald-300 mb-1">
                    Structural Environment Defense ({selectedExploit.invariant_ref})
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {selectedExploit.defense_mechanism}
                  </p>
                </div>
              </div>

              <div className="bg-[#050a11] border border-slate-800 rounded-lg p-3">
                <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-slate-400 mb-1.5">
                  <Terminal className="w-3.5 h-3.5 text-sky-400" />
                  Red-Team Execution Trace
                </div>
                <div className="space-y-1 font-mono text-[11px] text-slate-300">
                  {selectedExploit.sample_tool_trace.map((line, i) => (
                    <div key={i} className="break-all">
                      <span className="text-slate-600 mr-1.5">$</span>
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
