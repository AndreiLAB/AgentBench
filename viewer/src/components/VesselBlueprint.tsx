import React, { useId, useState } from "react";
import { AlertTriangle, Layers, ShieldCheck, Truck } from "lucide-react";
import { fitVessel, MEDIUM_PROPS } from "../lib/cryoPhysics";
import type { OrderLiveSnapshot } from "../lib/trajectoryEngine";

export type CadViewMode = "cross_section" | "corridor";

interface DimArrowProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
  vertical?: boolean;
  alert?: boolean;
  uid: string;
}

function CadDimension({ x1, y1, x2, y2, label, vertical = false, alert = false, uid }: DimArrowProps) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const pillW = Math.max(128, label.length * 9.5 + 24);
  const pillH = 26;
  const stroke = alert ? "#fb7185" : "#38bdf8";
  const markerStart = `url(#${uid}-${alert ? "arrow-alert-start" : "arrow-ok-start"})`;
  const markerEnd = `url(#${uid}-${alert ? "arrow-alert-end" : "arrow-ok-end"})`;

  return (
    <g className="select-none">
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={stroke}
        strokeWidth="1.7"
        markerStart={markerStart}
        markerEnd={markerEnd}
      />
      {vertical ? (
        <g transform={`translate(${mx}, ${my})`}>
          <rect
            x={-pillH / 2}
            y={-pillW / 2}
            width={pillH}
            height={pillW}
            rx={4}
            fill="#08111d"
            stroke={stroke}
            strokeWidth="1.3"
          />
          <text
            x="0"
            y="0"
            transform="rotate(-90)"
            textAnchor="middle"
            dominantBaseline="central"
            fill={alert ? "#fecdd3" : "#7dd3fc"}
            fontSize="12.5"
            fontWeight="700"
            fontFamily="JetBrains Mono, IBM Plex Mono, monospace"
          >
            {label}
          </text>
        </g>
      ) : (
        <g transform={`translate(${mx}, ${my})`}>
          <rect
            x={-pillW / 2}
            y={-pillH / 2}
            width={pillW}
            height={pillH}
            rx={4}
            fill="#08111d"
            stroke={stroke}
            strokeWidth="1.3"
          />
          <text
            x="0"
            y="0"
            textAnchor="middle"
            dominantBaseline="central"
            fill={alert ? "#fecdd3" : "#7dd3fc"}
            fontSize="12.5"
            fontWeight="700"
            fontFamily="JetBrains Mono, IBM Plex Mono, monospace"
          >
            {label}
          </text>
        </g>
      )}
    </g>
  );
}

function CadCallout({
  dotX,
  dotY,
  shelfX,
  shelfY,
  shelfEndX,
  title,
  subtitle,
  alignRight = false,
  tone = "normal",
}: {
  dotX: number;
  dotY: number;
  shelfX: number;
  shelfY: number;
  shelfEndX: number;
  title: string;
  subtitle?: string;
  alignRight?: boolean;
  tone?: "normal" | "crimson" | "amber" | "emerald";
}) {
  const textX = alignRight ? shelfEndX - 6 : shelfEndX + 6;
  const stroke =
    tone === "crimson"
      ? "#fb7185"
      : tone === "amber"
        ? "#fbbf24"
        : tone === "emerald"
          ? "#34d399"
          : "#47698f";
  const titleFill =
    tone === "crimson"
      ? "#fda4af"
      : tone === "amber"
        ? "#fde68a"
        : tone === "emerald"
          ? "#6ee7b7"
          : "#e2e8f0";

  return (
    <g className="select-none">
      <circle cx={dotX} cy={dotY} r="3.2" fill={stroke} />
      <polyline
        points={`${dotX},${dotY} ${shelfX},${shelfY} ${shelfEndX},${shelfY}`}
        fill="none"
        stroke={stroke}
        strokeWidth="1.35"
      />
      <text
        x={textX}
        y={subtitle ? shelfY - 4 : shelfY - 2}
        textAnchor={alignRight ? "end" : "start"}
        fill={titleFill}
        fontSize="12"
        fontWeight="700"
        fontFamily="IBM Plex Sans, Inter, sans-serif"
      >
        {title}
      </text>
      {subtitle && (
        <text
          x={textX}
          y={shelfY + 12}
          textAnchor={alignRight ? "end" : "start"}
          fill="#94a3b8"
          fontSize="10.5"
          fontWeight="500"
          fontFamily="JetBrains Mono, monospace"
        >
          {subtitle}
        </text>
      )}
    </g>
  );
}

function CadRulerMarks() {
  const topTicks: React.ReactNode[] = [];
  for (let x = 40; x <= 880; x += 20) {
    const is100 = x % 100 === 0;
    topTicks.push(
      <line
        key={`tx-${x}`}
        x1={x}
        y1={16}
        x2={x}
        y2={16 + (is100 ? 7 : 4)}
        stroke="#2c4869"
        strokeWidth={is100 ? 1.2 : 0.7}
      />
    );
    if (is100) {
      topTicks.push(
        <text
          key={`txt-${x}`}
          x={x}
          y={12}
          textAnchor="middle"
          fill="#527196"
          fontSize="8.5"
          fontWeight="700"
          fontFamily="JetBrains Mono, monospace"
        >
          {x}
        </text>
      );
    }
  }
  const leftTicks: React.ReactNode[] = [];
  for (let y = 40; y <= 580; y += 20) {
    const is100 = y % 100 === 0;
    leftTicks.push(
      <line
        key={`ty-${y}`}
        x1={20}
        y1={y}
        x2={20 + (is100 ? 7 : 4)}
        y2={y}
        stroke="#2c4869"
        strokeWidth={is100 ? 1.2 : 0.7}
      />
    );
    if (is100) {
      leftTicks.push(
        <text
          key={`tyt-${y}`}
          x={15}
          y={y + 3}
          textAnchor="end"
          fill="#527196"
          fontSize="8.5"
          fontWeight="700"
          fontFamily="JetBrains Mono, monospace"
        >
          {y}
        </text>
      );
    }
  }
  return (
    <g className="select-none">
      {topTicks}
      {leftTicks}
    </g>
  );
}

export interface VesselBlueprintProps {
  snapshot: OrderLiveSnapshot;
  agentLabel: string;
  accentTone: "emerald" | "amber" | "cyan";
}

export const VesselBlueprint: React.FC<VesselBlueprintProps> = ({
  snapshot,
  agentLabel,
  accentTone,
}) => {
  const rawUid = useId().replace(/:/g, "");
  const uid = `cad-${rawUid}`;
  const [viewMode, setViewMode] = useState<CadViewMode>("cross_section");

  const { order, spec, physics, route, booking, passedAllHardChecks, blueprintBadges } = snapshot;
  const dims = physics.dimensions;
  const stationary = order.execution === "STATIONARY";
  const isEVI = spec.insulation === "EVI";
  const mprops = MEDIUM_PROPS[order.medium] ?? MEDIUM_PROPS.LIN;

  // Dynamic stroke width from wall thickness (4..24mm -> 2..6px)
  const innerStrokeWidth = 2 + ((Math.min(24, Math.max(4, spec.wall_thickness_mm)) - 4) / 20) * 4;
  const stressFail = !physics.stress_pass || !physics.pressure_pass;
  const boilFail = !physics.boil_off_pass || !physics.material_compat_pass;
  const innerShellStroke = stressFail ? "#fb7185" : passedAllHardChecks ? "#34d399" : "#38bdf8";

  const usePermit = booking?.use_escort_permit ?? false;
  const roadWidthLimit = usePermit && route.escort_permit_allowed ? route.permit_max_width_mm : route.std_max_width_mm;
  const roadHeightLimit = usePermit && route.escort_permit_allowed ? route.permit_max_height_mm : route.std_max_height_mm;
  const widthAlert = dims.shipping_width_mm > roadWidthLimit;
  const heightAlert =
    dims.installed_height_mm > order.max_site_height_mm || dims.shipping_height_mm > roadHeightLimit;

  return (
    <div className="bg-[#0b131e] border border-scada-border rounded-xl overflow-hidden flex flex-col shadow-lg">
      {/* Blueprint Top Control Bar */}
      <div className="px-3.5 py-2.5 bg-[#0e1826] border-b border-scada-border flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border ${
              accentTone === "emerald"
                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
                : accentTone === "cyan"
                  ? "bg-sky-500/15 text-sky-300 border-sky-500/40"
                  : "bg-amber-500/15 text-amber-300 border-amber-500/40"
            }`}
          >
            {agentLabel}
          </span>
          <span className="text-xs font-mono font-bold text-slate-200 truncate">
            {order.order_id} · {stationary ? "GHK" : "CTK"}-{spec.unit_count}×{spec.unit_volume_m3}m³/{spec.design_pressure_mpa}MPa
          </span>
          <span className="hidden sm:inline-block text-[11px] font-mono text-slate-400">
            ({order.medium} · {spec.insulation} · {spec.fittings})
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setViewMode("cross_section")}
            className={`px-2.5 py-1 rounded text-[11px] font-mono font-semibold flex items-center gap-1 transition ${
              viewMode === "cross_section"
                ? "bg-sky-500/20 text-sky-300 border border-sky-500/40"
                : "bg-slate-900/60 text-slate-400 border border-slate-800 hover:text-slate-200"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            GOST CAD
          </button>
          <button
            type="button"
            onClick={() => setViewMode("corridor")}
            className={`px-2.5 py-1 rounded text-[11px] font-mono font-semibold flex items-center gap-1 transition ${
              viewMode === "corridor"
                ? "bg-sky-500/20 text-sky-300 border border-sky-500/40"
                : "bg-slate-900/60 text-slate-400 border border-slate-800 hover:text-slate-200"
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            SHIPPING GAUGE
            {(widthAlert || dims.shipping_height_mm > roadHeightLimit) && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            )}
          </button>
        </div>
      </div>

      {/* GOST 2.104 Dark SCADA Parametric SVG Canvas */}
      <div className="relative bg-[#070e18]">
        <svg
          viewBox="0 0 920 620"
          className="w-full h-auto select-none"
          role="img"
          aria-label={`GOST Parametric CAD Blueprint for ${order.order_id}`}
        >
          <defs>
            <marker id={`${uid}-arrow-ok-end`} viewBox="0 0 14 14" refX="12" refY="7" markerWidth="9" markerHeight="9" orient="auto">
              <path d="M 1,4 L 13,7 L 1,10 Z" fill="#38bdf8" />
            </marker>
            <marker id={`${uid}-arrow-ok-start`} viewBox="0 0 14 14" refX="2" refY="7" markerWidth="9" markerHeight="9" orient="auto">
              <path d="M 13,4 L 1,7 L 13,10 Z" fill="#38bdf8" />
            </marker>
            <marker id={`${uid}-arrow-alert-end`} viewBox="0 0 14 14" refX="12" refY="7" markerWidth="9" markerHeight="9" orient="auto">
              <path d="M 1,4 L 13,7 L 1,10 Z" fill="#fb7185" />
            </marker>
            <marker id={`${uid}-arrow-alert-start`} viewBox="0 0 14 14" refX="2" refY="7" markerWidth="9" markerHeight="9" orient="auto">
              <path d="M 13,4 L 1,7 L 13,10 Z" fill="#fb7185" />
            </marker>

            <pattern id={`${uid}-grid-fine`} width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#0f1e30" strokeWidth="0.6" />
            </pattern>
            <pattern id={`${uid}-grid-main`} width="50" height="50" patternUnits="userSpaceOnUse">
              <rect width="50" height="50" fill={`url(#${uid}-grid-fine)`} />
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#162a42" strokeWidth="1.05" />
            </pattern>

            <pattern id={`${uid}-perlite`} width="12" height="12" patternUnits="userSpaceOnUse">
              <circle cx="3" cy="3" r="1.25" fill={boilFail ? "#fbbf24" : "#94a3b8"} opacity={boilFail ? "0.7" : "0.4"} />
              <circle cx="9" cy="9" r="1.25" fill={boilFail ? "#fb7185" : "#64748b"} opacity={boilFail ? "0.7" : "0.4"} />
              <circle cx="3" cy="9" r="0.9" fill="#38bdf8" opacity="0.25" />
            </pattern>

            <linearGradient id={`${uid}-liquid`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={mprops.liquidColor} stopOpacity="0.22" />
              <stop offset="100%" stopColor={mprops.liquidColor} stopOpacity="0.46" />
            </linearGradient>
          </defs>

          {/* Base SCADA Sheet & GOST Grid */}
          <rect width="920" height="620" fill="#070e18" />
          <rect width="920" height="620" fill={`url(#${uid}-grid-main)`} />

          {/* GOST 2.104 Double Technical Frame */}
          <rect x="20" y="16" width="880" height="588" fill="none" stroke="#2c4869" strokeWidth="2" />
          <rect x="24" y="20" width="872" height="580" fill="none" stroke="#1b3048" strokeWidth="0.9" />
          <CadRulerMarks />

          {/* Sheet Zone Indices */}
          <g fill="#527196" fontSize="9.5" fontWeight="700" fontFamily="JetBrains Mono, monospace">
            <text x="240" y="13" textAnchor="middle">1</text>
            <text x="460" y="13" textAnchor="middle">2</text>
            <text x="680" y="13" textAnchor="middle">3</text>
            <text x="14" y="170" textAnchor="middle">A</text>
            <text x="14" y="340" textAnchor="middle">B</text>
            <text x="14" y="500" textAnchor="middle">C</text>
          </g>

          {/* Status Stamp & Direct Blueprint Violation Overlay */}
          {passedAllHardChecks ? (
            <g transform="translate(36, 32)">
              <rect width="236" height="30" rx="5" fill="#052e22" stroke="#10b981" strokeWidth="1.4" />
              <circle cx="16" cy="15" r="5" fill="#10b981" />
              <text x="28" y="19" fill="#6ee7b7" fontSize="11.5" fontWeight="800" fontFamily="JetBrains Mono, monospace">
                VERIFIED PASS · GOST 34347
              </text>
            </g>
          ) : (
            <g transform="translate(36, 30)">
              {blueprintBadges.slice(0, 3).map((b, idx) => {
                const isCrim = b.severity === "crimson";
                const bw = Math.min(370, Math.max(220, b.label.length * 7.6 + 28));
                return (
                  <g key={b.code + idx} transform={`translate(0, ${idx * 28})`}>
                    <rect
                      width={bw}
                      height="24"
                      rx="4"
                      fill={isCrim ? "#3b0a18" : "#3a2507"}
                      stroke={isCrim ? "#fb7185" : "#fbbf24"}
                      strokeWidth="1.3"
                    />
                    <circle cx="12" cy="12" r="4" fill={isCrim ? "#fb7185" : "#fbbf24"} />
                    <text
                      x="22"
                      y="16"
                      fill={isCrim ? "#fecdd3" : "#fde68a"}
                      fontSize="10.5"
                      fontWeight="800"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {b.label}
                    </text>
                  </g>
                );
              })}
            </g>
          )}

          {/* Modular Multi-Unit Bank Badge (top-right inside frame) */}
          <g transform="translate(650, 32)">
            <rect width="234" height="44" rx="5" fill="#0b1726" stroke="#284363" strokeWidth="1.2" />
            <text x="12" y="17" fill="#93c5fd" fontSize="10.5" fontWeight="800" fontFamily="JetBrains Mono, monospace">
              {spec.unit_count}×{spec.unit_volume_m3}m³ {spec.unit_count > 1 ? "MODULAR BANK" : "MONOLITHIC UNIT"}
            </text>
            <text x="12" y="34" fill="#94a3b8" fontSize="10" fontWeight="600" fontFamily="JetBrains Mono, monospace">
              SHIP W×H: {dims.shipping_width_mm}×{dims.shipping_height_mm}mm
            </text>
          </g>

          {viewMode === "cross_section" ? (
            stationary ? (
              <VerticalCrossSection
                snapshot={snapshot}
                uid={uid}
                innerStrokeWidth={innerStrokeWidth}
                innerShellStroke={innerShellStroke}
                boilFail={boilFail}
                stressFail={stressFail}
                heightAlert={heightAlert}
                widthAlert={widthAlert}
              />
            ) : (
              <HorizontalCrossSection
                snapshot={snapshot}
                uid={uid}
                innerStrokeWidth={innerStrokeWidth}
                innerShellStroke={innerShellStroke}
                boilFail={boilFail}
                stressFail={stressFail}
                heightAlert={heightAlert}
                widthAlert={widthAlert}
              />
            )
          ) : (
            <ShippingCorridorSvg
              snapshot={snapshot}
              uid={uid}
              roadWidthLimit={roadWidthLimit}
              roadHeightLimit={roadHeightLimit}
            />
          )}

          {/* Bottom GOST Stamp Strip */}
          <g transform="translate(24, 566)">
            <rect width="872" height="34" fill="#091320" stroke="#1e334d" strokeWidth="1" />
            <text x="14" y="21" fill="#94a3b8" fontSize="10.5" fontWeight="700" fontFamily="JetBrains Mono, monospace">
              CLIENT: {order.client_name.toUpperCase()} | SHELL: 12X18H10T ({spec.wall_thickness_mm}mm) | JACKET: 09G2S ({isEVI ? "EVI 120mm" : "PVI 200mm"})
            </text>
            <text x="858" y="21" textAnchor="end" fill="#38bdf8" fontSize="10.5" fontWeight="700" fontFamily="JetBrains Mono, monospace">
              ROUTE {route.route_id} {booking?.use_escort_permit ? "[ESCORT]" : "[STD ROAD]"}
            </text>
          </g>
        </svg>
      </div>

      {/* 6-Cell Engineering Telemetry Strip */}
      <div className="grid grid-cols-3 sm:grid-cols-6 divide-x divide-y sm:divide-y-0 divide-scada-border bg-[#09111b] border-t border-scada-border text-[11px] font-mono">
        <div className="p-2">
          <div className="text-[9.5px] text-slate-500 uppercase">Hoop Stress</div>
          <div className={`font-bold tabular-nums ${physics.stress_pass ? "text-emerald-400" : "text-rose-400"}`}>
            {physics.hoop_stress_mpa.toFixed(1)} <span className="text-slate-500 font-normal">/ {physics.allowable_stress_mpa} MPa</span>
          </div>
        </div>
        <div className="p-2">
          <div className="text-[9.5px] text-slate-500 uppercase">Boil-Off Rate</div>
          <div className={`font-bold tabular-nums ${physics.boil_off_pass ? "text-emerald-400" : "text-amber-400"}`}>
            {physics.boil_off_pct_day.toFixed(3)}% <span className="text-slate-500 font-normal">/ {order.max_boil_off_pct_day}%</span>
          </div>
        </div>
        <div className="p-2">
          <div className="text-[9.5px] text-slate-500 uppercase">Cryo Capacity</div>
          <div className={`font-bold tabular-nums ${physics.mass_pass ? "text-slate-200" : "text-rose-400"}`}>
            {Math.round(physics.usable_total_mass_kg).toLocaleString()} <span className="text-slate-500 font-normal">/ {order.required_product_mass_kg.toLocaleString()}kg</span>
          </div>
        </div>
        <div className="p-2">
          <div className="text-[9.5px] text-slate-500 uppercase">Ship W × H</div>
          <div className={`font-bold tabular-nums ${widthAlert || dims.shipping_height_mm > roadHeightLimit ? "text-amber-400" : "text-sky-300"}`}>
            {dims.shipping_width_mm}×{dims.shipping_height_mm} <span className="text-slate-500 font-normal">mm</span>
          </div>
        </div>
        <div className="p-2">
          <div className="text-[9.5px] text-slate-500 uppercase">Unit Ship Mass</div>
          <div className={`font-bold tabular-nums ${physics.unit_transport_mass_kg > route.max_unit_transport_mass_kg ? "text-rose-400" : "text-slate-200"}`}>
            {Math.round(physics.unit_transport_mass_kg).toLocaleString()} <span className="text-slate-500 font-normal">/ {Math.round(route.max_unit_transport_mass_kg).toLocaleString()}kg</span>
          </div>
        </div>
        <div className="p-2 flex items-center justify-between">
          <div>
            <div className="text-[9.5px] text-slate-500 uppercase">Delivery / SLA</div>
            <div className={`font-bold tabular-nums ${snapshot.slaPass ? "text-emerald-400" : "text-rose-400"}`}>
              {snapshot.deliveryWeek ? `W${snapshot.deliveryWeek}` : "UNSET"} <span className="text-slate-500 font-normal">/ W{order.sla_week}</span>
            </div>
          </div>
          {passedAllHardChecks ? (
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
        </div>
      </div>
    </div>
  );
};

function VerticalCrossSection({
  snapshot,
  uid,
  innerStrokeWidth,
  innerShellStroke,
  boilFail,
  stressFail,
  heightAlert,
  widthAlert,
}: {
  snapshot: OrderLiveSnapshot;
  uid: string;
  innerStrokeWidth: number;
  innerShellStroke: string;
  boilFail: boolean;
  stressFail: boolean;
  heightAlert: boolean;
  widthAlert: boolean;
}) {
  const { order, spec, physics } = snapshot;
  const H = physics.dimensions.installed_height_mm;
  const W = physics.dimensions.installed_width_mm;
  const fit = fitVessel(H, W, 380, 355);
  const w = fit.width;
  const clampedH = fit.height;
  const cx = 455;
  const topY = Math.round(295 - clampedH / 2);
  const botY = topY + clampedH;

  const domeR = Math.max(12, Math.min(Math.round(w * 0.28), Math.round(clampedH * 0.22)));
  const bodyTop = topY + domeR;
  const legsH = Math.max(20, Math.min(46, Math.round(clampedH * 0.14)));
  const bodyBot = botY - legsH - Math.round(domeR * 0.5);
  const x0 = cx - w / 2;
  const x1 = cx + w / 2;

  const isEVI = spec.insulation === "EVI";
  const insGap = Math.min(isEVI ? 10 : 16, Math.max(5, Math.round(w * 0.08)));
  const dimHX = Math.min(865, Math.max(590, x1 + 42));
  const rightShelfX = Math.min(830, Math.max(650, dimHX + 36));
  const liquidY = topY + clampedH * 0.36;
  const hazardFittings = !physics.material_compat_pass;

  return (
    <g>
      {/* Ghost Modular Bank Silhouette when unit_count > 1 */}
      {spec.unit_count > 1 && (
        <g opacity="0.24" transform={`translate(${Math.min(72, w * 0.42)}, -8)`}>
          <path
            d={`M ${x0} ${bodyTop}
                A ${w / 2} ${domeR} 0 0 1 ${x1} ${bodyTop}
                L ${x1} ${bodyBot}
                A ${w / 2} ${domeR * 0.75} 0 0 1 ${x0} ${bodyBot}
                Z`}
            fill="none"
            stroke="#38bdf8"
            strokeWidth="1.6"
            strokeDasharray="6 4"
          />
        </g>
      )}

      {/* Centerline Axis */}
      <line x1={cx} y1={topY - 36} x2={cx} y2={botY + 34} stroke="#3b5878" strokeWidth="1.2" strokeDasharray="16 3 2 3" />

      {/* Support Legs + Anchor Foundation */}
      <g stroke="#64748b" strokeWidth="2" fill="#132235">
        <polygon points={`${x0 + 14},${bodyBot + domeR * 0.4} ${x0 - 22},${botY} ${x0 - 6},${botY} ${x0 + 32},${bodyBot + domeR * 0.55}`} />
        <rect x={x0 - 32} y={botY} width="48" height="9" fill="#1e293b" rx="1.5" />
        <polygon points={`${x1 - 14},${bodyBot + domeR * 0.4} ${x1 + 22},${botY} ${x1 + 6},${botY} ${x1 - 32},${bodyBot + domeR * 0.55}`} />
        <rect x={x1 - 16} y={botY} width="48" height="9" fill="#1e293b" rx="1.5" />
        <line x1={x0 - 54} y1={botY + 9} x2={x1 + 54} y2={botY + 9} stroke="#94a3b8" strokeWidth="2.2" />
        {Array.from({ length: 13 }).map((_, i) => {
          const fx = x0 - 46 + i * 18;
          return <line key={i} x1={fx - 6} y1={botY + 20} x2={fx + 6} y2={botY + 9} stroke="#334155" strokeWidth="1.2" />;
        })}
      </g>

      {/* Outer Vacuum Jacket (09G2S) */}
      <path
        d={`M ${x0} ${bodyTop}
            A ${w / 2} ${domeR} 0 0 1 ${x1} ${bodyTop}
            L ${x1} ${bodyBot}
            A ${w / 2} ${domeR * 0.75} 0 0 1 ${x0} ${bodyBot}
            Z`}
        fill="#0b1624"
        stroke="#cbd5e1"
        strokeWidth="2.5"
      />

      {/* Vacuum Stiffening Rings */}
      {[0.32, 0.67].map((k) => {
        const ry = bodyTop + (bodyBot - bodyTop) * k;
        return (
          <g key={k}>
            <line x1={x0} y1={ry} x2={x1} y2={ry} stroke="#334155" strokeWidth="1.2" strokeDasharray="5 3" />
            <rect x={x0 - 3} y={ry - 2} width="6" height="4" fill="#94a3b8" />
            <rect x={x1 - 3} y={ry - 2} width="6" height="4" fill="#94a3b8" />
          </g>
        );
      })}

      {/* Insulation Annulus: EVI Multi-Layer Foil vs PVI Perlite Dots */}
      {isEVI ? (
        <g stroke={boilFail ? "#fbbf24" : "#38bdf8"} strokeWidth="0.95" fill="none" opacity="0.75">
          {[3, 6, 8.5].map((g) => (
            <path
              key={g}
              strokeDasharray="5 2.5"
              d={`M ${x0 + g} ${bodyTop}
                  A ${Math.max(4, w / 2 - g)} ${Math.max(4, domeR - g)} 0 0 1 ${x1 - g} ${bodyTop}
                  L ${x1 - g} ${bodyBot}
                  A ${Math.max(4, w / 2 - g)} ${Math.max(4, domeR * 0.75 - g)} 0 0 1 ${x0 + g} ${bodyBot}
                  Z`}
            />
          ))}
        </g>
      ) : (
        <path
          d={`M ${x0 + 3} ${bodyTop}
              A ${w / 2 - 3} ${domeR - 3} 0 0 1 ${x1 - 3} ${bodyTop}
              L ${x1 - 3} ${bodyBot}
              A ${w / 2 - 3} ${domeR * 0.75 - 3} 0 0 1 ${x0 + 3} ${bodyBot}
              Z`}
          fill={`url(#${uid}-perlite)`}
        />
      )}

      {/* Inner Cryogenic Vessel (12X18H10T) */}
      <path
        d={`M ${x0 + insGap} ${bodyTop}
            A ${Math.max(6, w / 2 - insGap)} ${Math.max(6, domeR - insGap)} 0 0 1 ${x1 - insGap} ${bodyTop}
            L ${x1 - insGap} ${bodyBot}
            A ${Math.max(6, w / 2 - insGap)} ${Math.max(6, domeR * 0.75 - insGap)} 0 0 1 ${x0 + insGap} ${bodyBot}
            Z`}
        fill="#07111d"
        stroke={innerShellStroke}
        strokeWidth={innerStrokeWidth}
      />

      {/* 95% Cryo Liquid Mirror */}
      <path
        d={`M ${x0 + insGap + 2} ${liquidY}
            L ${x1 - insGap - 2} ${liquidY}
            L ${x1 - insGap - 2} ${bodyBot}
            A ${Math.max(6, w / 2 - insGap)} ${Math.max(6, domeR * 0.75 - insGap)} 0 0 1 ${x0 + insGap + 2} ${bodyBot}
            Z`}
        fill={`url(#${uid}-liquid)`}
      />
      <line x1={x0 + insGap + 2} y1={liquidY} x2={x1 - insGap - 2} y2={liquidY} stroke="#38bdf8" strokeWidth="1.6" strokeDasharray="6 2.5" />
      <text x={cx} y={liquidY + 18} fill="#e0f2fe" fontSize="10.5" fontWeight="700" textAnchor="middle" fontFamily="JetBrains Mono, monospace">
        95% FILL · {order.medium}
      </text>

      {/* Top Dual SPPK Safety Relief Valves & Lifting Lugs */}
      <g stroke="#cbd5e1" strokeWidth="1.8" fill="#0f172a">
        <line x1={cx} y1={topY} x2={cx} y2={topY - 22} />
        <line x1={cx - 24} y1={topY - 22} x2={cx + 24} y2={topY - 22} />
        {[-24, 24].map((dx, i) => (
          <g key={i}>
            <polygon points={`${cx + dx - 5},${topY - 29} ${cx + dx + 5},${topY - 29} ${cx + dx},${topY - 22}`} fill="#38bdf8" />
            <rect x={cx + dx - 4} y={topY - 40} width="8" height="11" fill="#1e293b" rx="1" />
          </g>
        ))}
        <circle cx={cx + 46} cy={bodyTop - 8} r="4.5" fill="#fbbf24" stroke="#0f172a" strokeWidth="1.4" />
      </g>

      {/* Bottom PBU Vaporizer & Valve Manifold */}
      <g stroke={hazardFittings ? "#fb7185" : "#38bdf8"} strokeWidth="2" fill="none">
        <path
          d={`M ${cx - 30} ${bodyBot + domeR * 0.75 + 10}
              L ${cx + 30} ${bodyBot + domeR * 0.75 + 10}
              L ${cx + 30} ${bodyBot + domeR * 0.75 + 18}
              L ${cx - 30} ${bodyBot + domeR * 0.75 + 18}`}
        />
        <line x1={cx} y1={bodyBot + domeR * 0.75} x2={cx} y2={botY - 5} stroke="#94a3b8" />
        <line x1={cx} y1={botY - 5} x2={cx + 52} y2={botY - 5} stroke={hazardFittings ? "#fb7185" : "#94a3b8"} />
      </g>

      {/* GOST Callouts */}
      <CadCallout
        dotX={x0 + 3}
        dotY={bodyTop + (bodyBot - bodyTop) * 0.25}
        shelfX={Math.min(245, x0 - 22)}
        shelfY={Math.max(135, bodyTop + 15)}
        shelfEndX={42}
        title={`Vacuum Annulus (${spec.insulation})`}
        subtitle={`boil-off ${physics.boil_off_pct_day.toFixed(3)}%/d (max ${order.max_boil_off_pct_day}%)`}
        tone={boilFail ? "amber" : "normal"}
      />
      <CadCallout
        dotX={x0 + insGap + 2}
        dotY={bodyTop + (bodyBot - bodyTop) * 0.55}
        shelfX={Math.min(245, x0 - 22)}
        shelfY={Math.max(230, bodyTop + 85)}
        shelfEndX={42}
        title={`Inner Shell 12X18H10T (${spec.wall_thickness_mm}mm)`}
        subtitle={`σ_h = ${physics.hoop_stress_mpa} / ${physics.allowable_stress_mpa} MPa`}
        tone={stressFail ? "crimson" : "emerald"}
      />
      <CadCallout
        dotX={cx - 18}
        dotY={bodyBot + domeR * 0.75 + 14}
        shelfX={Math.min(245, x0 - 22)}
        shelfY={Math.min(475, botY - 15)}
        shelfEndX={42}
        title="PBU Finned Vaporizer"
        subtitle={`usable ${Math.round(physics.usable_total_mass_kg).toLocaleString()} kg`}
      />

      <CadCallout
        dotX={cx + 24}
        dotY={topY - 32}
        shelfX={rightShelfX}
        shelfY={Math.max(105, topY - 10)}
        shelfEndX={876}
        title="Dual SPPK Relief Block"
        subtitle={`P_des = ${spec.design_pressure_mpa} MPa (min ${order.min_pressure_mpa})`}
        alignRight
        tone={!physics.pressure_pass ? "crimson" : "normal"}
      />
      <CadCallout
        dotX={cx + 30}
        dotY={botY - 5}
        shelfX={rightShelfX}
        shelfY={Math.min(475, botY - 10)}
        shelfEndX={876}
        title={`Cryo Manifold (${spec.fittings})`}
        subtitle={`η_weld=${spec.fittings === "DE_PRECISION" ? "0.96" : spec.fittings === "EU_STD" ? "0.90" : "0.85"} · lead ${physics.fittings_lead_weeks}w`}
        alignRight
        tone={hazardFittings ? "crimson" : "normal"}
      />

      {/* GOST Dimensions H & Ø D */}
      <CadDimension x1={dimHX} y1={topY} x2={dimHX} y2={botY + 9} label={`H = ${H} mm`} vertical alert={heightAlert} uid={uid} />
      <CadDimension x1={x0} y1={botY + 42} x2={x1} y2={botY + 42} label={`Ø D = ${W} mm`} alert={widthAlert} uid={uid} />
    </g>
  );
}

function HorizontalCrossSection({
  snapshot,
  uid,
  innerStrokeWidth,
  innerShellStroke,
  boilFail,
  stressFail,
  heightAlert,
  widthAlert,
}: {
  snapshot: OrderLiveSnapshot;
  uid: string;
  innerStrokeWidth: number;
  innerShellStroke: string;
  boilFail: boolean;
  stressFail: boolean;
  heightAlert: boolean;
  widthAlert: boolean;
}) {
  const { order, spec, physics } = snapshot;
  const H = physics.dimensions.installed_height_mm;
  const W = physics.dimensions.installed_width_mm;
  const L = physics.dimensions.installed_length_mm;

  const safeL = Math.max(2000, Math.min(L, 12000));
  const l = Math.round(250 + ((safeL - 2000) / 10000) * 190);
  const safeW = Math.max(1000, Math.min(W, 3000));
  const d = Math.round(115 + ((safeW - 1000) / 2000) * 80);

  const cx = 500;
  const cy = 275;
  const x0 = cx - l / 2;
  const y0 = cy - d / 2;
  const frameY = y0 + d + 12;
  const isEVI = spec.insulation === "EVI";
  const insGap = isEVI ? 9 : 15;
  const dimHX = Math.min(868, x0 + l + 66);

  return (
    <g>
      {/* Centerline */}
      <line x1={x0 - 26} y1={cy} x2={x0 + l + 36} y2={cy} stroke="#3b5878" strokeWidth="1.2" strokeDasharray="16 3 2 3" />

      {/* Heavy Transport Skid & Saddle Cradles */}
      <g stroke="#94a3b8" strokeWidth="2" fill="#132235">
        <rect x={x0 - 18} y={frameY} width={l + 46} height="15" rx="2" />
        {[0.22, 0.78].map((k) => {
          const sx = x0 + l * k;
          return <polygon key={k} points={`${sx - 30},${frameY} ${sx - 16},${y0 + d - 2} ${sx + 16},${y0 + d - 2} ${sx + 30},${frameY}`} fill="#1e293b" />;
        })}
      </g>

      {/* Outer Vacuum Shell */}
      <rect x={x0} y={y0} width={l} height={d} rx={d * 0.44} fill="#0b1624" stroke="#cbd5e1" strokeWidth="2.5" />

      {/* Insulation */}
      {isEVI ? (
        <g stroke={boilFail ? "#fbbf24" : "#38bdf8"} strokeWidth="0.95" fill="none" opacity="0.75">
          {[3, 6].map((g) => (
            <rect key={g} x={x0 + g} y={y0 + g} width={l - g * 2} height={d - g * 2} rx={(d - g * 2) * 0.44} strokeDasharray="5 2.5" />
          ))}
        </g>
      ) : (
        <rect x={x0 + 3} y={y0 + 3} width={l - 6} height={d - 6} rx={(d - 6) * 0.44} fill={`url(#${uid}-perlite)`} />
      )}

      {/* Inner Cryo Vessel */}
      <rect
        x={x0 + insGap}
        y={y0 + insGap}
        width={l - insGap * 2}
        height={d - insGap * 2}
        rx={(d - insGap * 2) * 0.44}
        fill="#07111d"
        stroke={innerShellStroke}
        strokeWidth={innerStrokeWidth}
      />

      {/* 95% Liquid Phase */}
      <rect
        x={x0 + insGap + 4}
        y={y0 + d * 0.42}
        width={l - insGap * 2 - 8}
        height={d * 0.58 - insGap - 2}
        rx={8}
        fill={`url(#${uid}-liquid)`}
      />
      <line x1={x0 + insGap + 10} y1={y0 + d * 0.42} x2={x0 + l - insGap - 10} y2={y0 + d * 0.42} stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="6 2.5" />

      {/* Rear Cryogenic Valve Cabinet */}
      <rect x={x0 + l - 8} y={y0 + d * 0.14} width="34" height={d * 0.72} rx="2" fill="#17283d" stroke="#cbd5e1" strokeWidth="1.8" />

      {/* Inset End View (SECTION B-B) */}
      <g transform="translate(42, 185)">
        <rect x="0" y="0" width="156" height="196" fill="#091320" stroke="#26405e" strokeWidth="1.2" rx="4" />
        <text x="78" y="18" fill="#93c5fd" fontSize="11" fontWeight="800" textAnchor="middle" fontFamily="JetBrains Mono, monospace">
          SECTION B-B
        </text>
        <rect x="20" y="146" width="116" height="12" fill="#1e293b" stroke="#94a3b8" strokeWidth="1.6" />
        <circle cx="78" cy="86" r="48" fill="#0b1624" stroke="#cbd5e1" strokeWidth="2.2" />
        <circle cx="78" cy="86" r="37" fill="#07111d" stroke={innerShellStroke} strokeWidth={Math.max(2, innerStrokeWidth * 0.8)} />
        <CadDimension x1={18} y1={176} x2={138} y2={176} label={`W=${W}mm`} alert={widthAlert} uid={uid} />
      </g>

      {/* Callouts */}
      <CadCallout
        dotX={x0 + l * 0.35}
        dotY={y0 + insGap + 3}
        shelfX={x0 + 40}
        shelfY={y0 - 38}
        shelfEndX={220}
        title={`CTK Inner Shell (${spec.wall_thickness_mm}mm · ${spec.insulation})`}
        subtitle={`σ_h=${physics.hoop_stress_mpa}/${physics.allowable_stress_mpa}MPa · boil ${physics.boil_off_pct_day.toFixed(3)}%/d`}
        tone={stressFail ? "crimson" : boilFail ? "amber" : "emerald"}
      />
      <CadCallout
        dotX={x0 + l + 16}
        dotY={y0 + d * 0.35}
        shelfX={Math.max(690, x0 + l + 40)}
        shelfY={y0 - 38}
        shelfEndX={876}
        title={`Rear Cryo Cabinet (${spec.fittings})`}
        subtitle={`unit ship mass ${Math.round(physics.unit_transport_mass_kg).toLocaleString()} kg`}
        alignRight
      />

      {/* Dimensions L & H */}
      <CadDimension x1={x0} y1={frameY + 56} x2={x0 + l} y2={frameY + 56} label={`L = ${L} mm`} uid={uid} />
      <CadDimension x1={dimHX} y1={y0} x2={dimHX} y2={frameY + 15} label={`H = ${H} mm`} vertical alert={heightAlert} uid={uid} />
    </g>
  );
}

function ShippingCorridorSvg({
  snapshot,
  uid,
  roadWidthLimit,
  roadHeightLimit,
}: {
  snapshot: OrderLiveSnapshot;
  uid: string;
  roadWidthLimit: number;
  roadHeightLimit: number;
}) {
  const { spec, physics, route, booking } = snapshot;
  const shipW = physics.dimensions.shipping_width_mm;
  const shipH = physics.dimensions.shipping_height_mm;
  const scale = 0.082; // mm -> px

  const roadFloorY = 470;
  const cx = 460;

  const limWpx = roadWidthLimit * scale;
  const limHpx = roadHeightLimit * scale;
  const shipWpx = shipW * scale;
  const shipHpx = shipH * scale;

  const overW = shipW > roadWidthLimit;
  const overH = shipH > roadHeightLimit;
  const overMass = physics.unit_transport_mass_kg > route.max_unit_transport_mass_kg;

  return (
    <g>
      <text x={cx} y={118} textAnchor="middle" fill="#cbd5e1" fontSize="13" fontWeight="800" fontFamily="JetBrains Mono, monospace">
        HIGHWAY / TUNNEL CLEARANCE GAUGE — {route.name.toUpperCase()} ({route.route_id})
      </text>

      {/* Road Deck */}
      <line x1="120" y1={roadFloorY} x2="800" y2={roadFloorY} stroke="#64748b" strokeWidth="3" />

      {/* Allowed Corridor Clearance Box */}
      <rect
        x={cx - limWpx / 2}
        y={roadFloorY - limHpx}
        width={limWpx}
        height={limHpx}
        fill={overW || overH ? "rgba(244, 63, 94, 0.06)" : "rgba(16, 185, 129, 0.06)"}
        stroke={overW || overH ? "#fb7185" : "#34d399"}
        strokeWidth="2.2"
        strokeDasharray="10 5"
      />
      <text
        x={cx}
        y={roadFloorY - limHpx - 10}
        textAnchor="middle"
        fill={overW || overH ? "#fda4af" : "#6ee7b7"}
        fontSize="11.5"
        fontWeight="700"
        fontFamily="JetBrains Mono, monospace"
      >
        ALLOWED CORRIDOR LIMIT: {roadWidthLimit}W × {roadHeightLimit}H mm {booking?.use_escort_permit ? "(ESCORT PERMIT)" : "(STD ROAD)"}
      </text>

      {/* Shipped Cryogenic Tank Cross-Section on Flatbed Saddle */}
      <rect
        x={cx - shipWpx / 2}
        y={roadFloorY - 22}
        width={shipWpx}
        height={22}
        fill="#1e293b"
        stroke="#94a3b8"
        strokeWidth="1.8"
      />
      <ellipse
        cx={cx}
        cy={roadFloorY - 22 - (shipHpx - 22) / 2}
        rx={shipWpx / 2}
        ry={(shipHpx - 22) / 2}
        fill={overW || overH ? "rgba(244, 63, 94, 0.22)" : "rgba(56, 189, 248, 0.18)"}
        stroke={overW || overH ? "#fb7185" : "#38bdf8"}
        strokeWidth="3"
      />

      <CadDimension
        x1={cx - shipWpx / 2}
        y1={roadFloorY + 36}
        x2={cx + shipWpx / 2}
        y2={roadFloorY + 36}
        label={`SHIP W = ${shipW} mm`}
        alert={overW}
        uid={uid}
      />
      <CadDimension
        x1={cx + Math.max(limWpx, shipWpx) / 2 + 48}
        y1={roadFloorY - shipHpx}
        x2={cx + Math.max(limWpx, shipWpx) / 2 + 48}
        y2={roadFloorY}
        label={`SHIP H = ${shipH} mm`}
        vertical
        alert={overH}
        uid={uid}
      />

      {/* Bridge Mass Gauge Box on Left */}
      <g transform="translate(54, 195)">
        <rect width="225" height="118" rx="6" fill="#0b1726" stroke={overMass ? "#fb7185" : "#26405e"} strokeWidth="1.5" />
        <text x="14" y="24" fill="#93c5fd" fontSize="11" fontWeight="800" fontFamily="JetBrains Mono, monospace">
          BRIDGE MASS CHECK (PER UNIT)
        </text>
        <text x="14" y="50" fill={overMass ? "#fda4af" : "#6ee7b7"} fontSize="15" fontWeight="800" fontFamily="JetBrains Mono, monospace">
          {Math.round(physics.unit_transport_mass_kg).toLocaleString()} kg
        </text>
        <text x="14" y="70" fill="#94a3b8" fontSize="11" fontFamily="JetBrains Mono, monospace">
          Bridge Cap: {Math.round(route.max_unit_transport_mass_kg).toLocaleString()} kg
        </text>
        <text x="14" y="96" fill="#cbd5e1" fontSize="10.5" fontFamily="JetBrains Mono, monospace">
          Config: {spec.unit_count} unit(s) × {spec.unit_volume_m3} m³
        </text>
      </g>
    </g>
  );
}
