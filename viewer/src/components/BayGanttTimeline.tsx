import React from "react";
import { AlertOctagon, CalendarClock, CheckCircle2, Factory, Flag, Wrench, Zap } from "lucide-react";
import type { BayId } from "../types/cryoforge";
import type { ReplayedFrameState } from "../lib/trajectoryEngine";

export interface BayGanttTimelineProps {
  frame: ReplayedFrameState;
  agentLabel: string;
  accentTone: "emerald" | "amber" | "cyan";
  selectedOrderId: string;
  onSelectOrder: (orderId: string) => void;
  horizonWeeks?: number;
}

const BAYS: BayId[] = ["BAY-A", "BAY-B"];

export const BayGanttTimeline: React.FC<BayGanttTimelineProps> = ({
  frame,
  agentLabel,
  accentTone,
  selectedOrderId,
  onSelectOrder,
  horizonWeeks = 16,
}) => {
  const weeks = Array.from({ length: horizonWeeks }, (_, i) => i + 1);
  const pct = (weekOneBased: number) => ((weekOneBased - 1) / horizonWeeks) * 100;
  const spanPct = (durationWeeks: number) => (durationWeeks / horizonWeeks) * 100;

  return (
    <div className="bg-[#0b131e] border border-scada-border rounded-xl overflow-hidden shadow-lg flex flex-col">
      {/* Top Header */}
      <div className="px-3.5 py-2.5 bg-[#0e1826] border-b border-scada-border flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Factory className="w-4 h-4 text-sky-400" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
            2-Bay Factory & Supply-Shock Gantt
          </span>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
              accentTone === "emerald"
                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
                : accentTone === "cyan"
                  ? "bg-sky-500/15 text-sky-300 border-sky-500/40"
                  : "bg-amber-500/15 text-amber-300 border-amber-500/40"
            }`}
          >
            {agentLabel}
          </span>
        </div>

        <div className="flex items-center gap-3 text-[10.5px] font-mono text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/70 inline-block" /> Valid Slot
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm hazard-stripes border border-amber-500/60 inline-block" /> Blackout
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-rose-500/80 inline-block" /> Conflict / SLA Miss
          </span>
        </div>
      </div>

      {/* Mid-Episode Disruption Shock Banner */}
      {frame.disruption && (
        <div
          className={`px-3.5 py-2 border-b text-xs font-mono transition-colors ${
            frame.disruptionJustTriggered
              ? "bg-amber-500/20 border-amber-400/60 text-amber-100"
              : frame.disruptionActive
                ? "bg-amber-950/35 border-amber-500/30 text-amber-200/90"
                : "bg-slate-900/60 border-scada-border text-slate-500"
          }`}
        >
          <div className="flex items-start gap-2">
            <Zap
              className={`w-4 h-4 shrink-0 mt-0.5 ${
                frame.disruptionActive ? "text-amber-400" : "text-slate-600"
              }`}
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold uppercase tracking-wider text-[10.5px]">
                  {frame.disruptionActive
                    ? frame.disruptionJustTriggered
                      ? "⚡ STEP 4 DISRUPTION SHOCK TRIGGERED NOW"
                      : `⚡ POST-SHOCK WORLD ACTIVE (TRIGGERED STEP ${frame.shockStepNumber ?? 4})`
                    : `PRE-SHOCK NOMINAL PLAN (SHOCK ARMED FOR STEP ${frame.shockStepNumber ?? 4})`}
                </span>
                {frame.retoolingFeesEur > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-sky-500/20 border border-sky-400/40 text-sky-200 text-[10px]">
                    REVISED (€{frame.retoolingFeesEur.toLocaleString()} retooling)
                  </span>
                )}
              </div>
              <p className="text-[11px] leading-snug mt-0.5 text-slate-300">
                {frame.disruption.headline}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Gantt Grid Body */}
      <div className="p-3 space-y-3 overflow-x-auto">
        <div className="min-w-[540px]">
          {/* Week Ruler W1..W16 */}
          <div className="flex items-center mb-1.5">
            <div className="w-24 shrink-0 text-[10px] font-mono uppercase text-slate-500 font-bold">
              Bay / Order
            </div>
            <div className="flex-1 grid grid-cols-16 border-l border-scada-border" style={{ gridTemplateColumns: `repeat(${horizonWeeks}, minmax(0, 1fr))` }}>
              {weeks.map((w) => (
                <div
                  key={w}
                  className="text-center text-[10px] font-mono text-slate-400 border-r border-slate-800/80 py-0.5"
                >
                  W{w}
                </div>
              ))}
            </div>
          </div>

          {/* BAY-A and BAY-B Fabrication Lanes */}
          <div className="space-y-2 mb-3">
            {BAYS.map((bayId) => {
              const bayBlackouts = frame.activeBlackouts.filter((b) => b.bay_id === bayId);
              const bayOrders = frame.orders.filter((o) => o.booking?.bay_id === bayId);
              const tareCap = frame.bayMaxTareKg[bayId];

              return (
                <div key={bayId} className="flex items-center">
                  <div className="w-24 shrink-0 pr-2">
                    <div className="text-xs font-mono font-bold text-slate-200">{bayId}</div>
                    {tareCap !== undefined && (
                      <div className="text-[9.5px] font-mono text-amber-400">
                        Max {Math.round(tareCap)}kg
                      </div>
                    )}
                  </div>

                  <div className="flex-1 relative h-10 bg-[#08101a] border border-scada-border rounded overflow-hidden">
                    {/* Background week gridlines */}
                    <div
                      className="absolute inset-0 grid pointer-events-none"
                      style={{ gridTemplateColumns: `repeat(${horizonWeeks}, minmax(0, 1fr))` }}
                    >
                      {weeks.map((w) => (
                        <div key={w} className="border-r border-slate-800/55 h-full" />
                      ))}
                    </div>

                    {/* Blackout Windows */}
                    {bayBlackouts.map((blk, idx) => (
                      <div
                        key={`${blk.bay_id}-${blk.start_week}-${idx}`}
                        style={{
                          left: `${pct(blk.start_week)}%`,
                          width: `${spanPct(blk.end_week - blk.start_week)}%`,
                        }}
                        title={`${blk.bay_id} Blackout [W${blk.start_week}-W${blk.end_week}): ${blk.reason}`}
                        className="absolute inset-y-0 hazard-stripes border-x border-amber-500/70 flex items-center justify-center z-10"
                      >
                        <span className="px-1 py-0.5 rounded bg-slate-950/85 text-[9px] font-mono font-bold text-amber-300 truncate">
                          <Wrench className="w-2.5 h-2.5 inline mr-0.5" />
                          BLK
                        </span>
                      </div>
                    ))}

                    {/* Booked Order Fabrication Bars */}
                    {bayOrders.map((snap) => {
                      const b = snap.booking!;
                      const isSelected = snap.order.order_id === selectedOrderId;
                      const hasBayConflict = snap.bayConflictReasons.length > 0;
                      const isBad = !snap.passedAllHardChecks;

                      return (
                        <button
                          key={snap.order.order_id}
                          type="button"
                          onClick={() => onSelectOrder(snap.order.order_id)}
                          style={{
                            left: `${pct(b.bay_start_week)}%`,
                            width: `${spanPct(b.fab_weeks)}%`,
                          }}
                          title={`${snap.order.order_id}: ${b.bay_id} [W${b.bay_start_week}..W${b.fab_end_week}) · ${b.spec.unit_count}×${b.spec.unit_volume_m3}m³`}
                          className={`absolute top-1 bottom-1 rounded px-1.5 flex items-center justify-between text-[10px] font-mono font-bold transition z-20 ${
                            hasBayConflict
                              ? "crimson-stripes border-2 border-rose-400 text-rose-100"
                              : isBad
                                ? "bg-rose-500/30 border border-rose-400/80 text-rose-100"
                                : "bg-emerald-500/25 border border-emerald-400/75 text-emerald-100"
                          } ${isSelected ? "ring-2 ring-sky-400 shadow-glow-cyan" : "hover:brightness-125"}`}
                        >
                          <span className="truncate">
                            {snap.order.order_id.replace("ORD-", "#")} ({b.spec.unit_count}×{b.spec.unit_volume_m3}m³)
                          </span>
                          {b.post_shock_revised && (
                            <span className="ml-1 px-1 rounded bg-sky-500/40 text-[8.5px] text-sky-100 shrink-0">
                              REV⚡
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Per-Order Fittings -> Assembly -> Transit -> SLA Delivery Pipelines */}
          <div className="pt-2 border-t border-slate-800/90 space-y-1.5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mb-1">
              <CalendarClock className="w-3.5 h-3.5 text-sky-400" />
              Order Procurement, Transit & SLA Deadlines (Click row to inspect CAD Blueprint)
            </div>

            {frame.orders.map((snap) => {
              const b = snap.booking;
              const isSelected = snap.order.order_id === selectedOrderId;
              const slaW = snap.order.sla_week;
              const delW = snap.deliveryWeek;
              const fitW = snap.fittingsReadyWeek;
              const fabEnd = snap.fabEndWeek;

              return (
                <div
                  key={snap.order.order_id}
                  onClick={() => onSelectOrder(snap.order.order_id)}
                  className={`flex items-center cursor-pointer rounded px-1 py-0.5 transition ${
                    isSelected ? "bg-sky-500/10 ring-1 ring-sky-500/40" : "hover:bg-slate-800/40"
                  }`}
                >
                  <div className="w-24 shrink-0 pr-2 flex items-center gap-1">
                    {snap.passedAllHardChecks ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertOctagon className="w-3 h-3 text-rose-400 shrink-0" />
                    )}
                    <span className="text-[11px] font-mono font-bold text-slate-200">
                      {snap.order.order_id}
                    </span>
                  </div>

                  <div className="flex-1 relative h-6 bg-[#070d16] border border-slate-800/90 rounded overflow-hidden">
                    <div
                      className="absolute inset-0 grid pointer-events-none"
                      style={{ gridTemplateColumns: `repeat(${horizonWeeks}, minmax(0, 1fr))` }}
                    >
                      {weeks.map((w) => (
                        <div key={w} className="border-r border-slate-800/40 h-full" />
                      ))}
                    </div>

                    {/* Fittings Lead Indicator */}
                    {b && fitW !== null && (
                      <div
                        style={{
                          left: `${pct(b.order_release_week)}%`,
                          width: `${spanPct(Math.max(1, fitW - b.order_release_week))}%`,
                        }}
                        title={`Fittings (${b.spec.fittings}) Release W${b.order_release_week} -> Ready W${fitW}`}
                        className="absolute top-1 h-1.5 bg-violet-400/55 rounded-full"
                      />
                    )}

                    {/* Assembly + Transit Span (from max(fabEnd, fitW) to deliveryWeek) */}
                    {b && delW !== null && fabEnd !== null && fitW !== null && (
                      <div
                        style={{
                          left: `${pct(Math.max(fabEnd, fitW))}%`,
                          width: `${spanPct(Math.max(1, delW - Math.max(fabEnd, fitW)))}%`,
                        }}
                        title={`Commissioning (1w) + ${snap.route.route_id} Transit (${snap.route.transit_weeks}w) -> Delivery W${delW} (SLA W${slaW})`}
                        className={`absolute bottom-1 h-2 rounded-sm ${
                          snap.slaPass ? "bg-sky-400/75" : "bg-rose-500/85"
                        }`}
                      />
                    )}

                    {/* SLA Deadline Vertical Marker */}
                    <div
                      style={{ left: `${Math.min(99, pct(slaW + 1) - 0.5)}%` }}
                      title={`${snap.order.order_id} SLA Deadline: End of W${slaW}`}
                      className="absolute inset-y-0 w-0.5 bg-amber-400 z-20"
                    />
                    <span
                      style={{ left: `${Math.max(1, Math.min(86, pct(slaW) + 0.5))}%` }}
                      className="absolute top-0.5 text-[8.5px] font-mono font-bold text-amber-300 z-20 pointer-events-none"
                    >
                      <Flag className="w-2.5 h-2.5 inline mr-0.5" />
                      SLA W{slaW}
                    </span>
                  </div>

                  <div className="w-20 shrink-0 pl-2 text-right text-[10px] font-mono tabular-nums">
                    {delW !== null ? (
                      <span className={snap.slaPass ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                        DEL W{delW}
                      </span>
                    ) : (
                      <span className="text-slate-500">UNBOOKED</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
