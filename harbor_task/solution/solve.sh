#!/usr/bin/env bash
# Harbor Oracle Reference Solution for CryoForge RL.
# Solves the commissioning episode strictly over the MCP SSE protocol (`--mcp-url`).
# Uses `python -m eval.reference_solver --mcp-url ...` when `eval` is mounted on PYTHONPATH,
# and includes a self-contained pure-MCP SSE client fallback when executed inside the
# isolated `main` sandbox container (which intentionally excludes `env_core/` and `eval/`).

set -euo pipefail

MCP_URL="${CRYOFORGE_MCP_URL:-http://cryoforge-mcp:8090/sse}"

PYTHON_BIN="python3"
if ! command -v "${PYTHON_BIN}" >/dev/null 2>&1; then
    PYTHON_BIN="python"
fi

if "${PYTHON_BIN}" -c "import importlib.util, sys; sys.exit(0 if importlib.util.find_spec('eval.reference_solver') else 1)" 2>/dev/null; then
    exec "${PYTHON_BIN}" -m eval.reference_solver --mcp-url "${MCP_URL}" "$@"
fi

exec "${PYTHON_BIN}" - "${MCP_URL}" <<'PYEOF'
import asyncio
import itertools
import json
import math
import sys
from typing import Any

from mcp import ClientSession
from mcp.client.sse import sse_client

MEDIUM_TABLE = {
    "LIN": {"density": 808.0, "boil_k": 77.36, "latent": 199.0, "sf": 1.00, "req_evi": False, "forbid_cn": False, "lox_hp": False},
    "LOX": {"density": 1141.0, "boil_k": 90.19, "latent": 213.0, "sf": 1.25, "req_evi": False, "forbid_cn": False, "lox_hp": True},
    "LAR": {"density": 1395.0, "boil_k": 87.30, "latent": 161.0, "sf": 1.05, "req_evi": False, "forbid_cn": False, "lox_hp": False},
    "LCO2": {"density": 1030.0, "boil_k": 243.15, "latent": 302.0, "sf": 1.00, "req_evi": False, "forbid_cn": False, "lox_hp": False},
    "LNG": {"density": 430.0, "boil_k": 111.65, "latent": 510.0, "sf": 1.15, "req_evi": False, "forbid_cn": False, "lox_hp": False},
    "LH2": {"density": 70.85, "boil_k": 20.28, "latent": 446.0, "sf": 1.25, "req_evi": True, "forbid_cn": True, "lox_hp": False},
    "LHe": {"density": 124.9, "boil_k": 4.22, "latent": 20.7, "sf": 1.25, "req_evi": True, "forbid_cn": True, "lox_hp": False},
}
INS_TABLE = {
    "EVI": {"annulus": 120.0, "k": 0.00028, "casing_f": 1.00, "cost_m": 1.18},
    "PVI": {"annulus": 200.0, "k": 0.00185, "casing_f": 1.14, "cost_m": 1.00},
}
FIT_TABLE = {
    "CN": {"weld": 0.85, "q_valve": 18.0, "lead": 2, "cost_m": 1.00, "kit": 2200.0},
    "EU_STD": {"weld": 0.90, "q_valve": 11.0, "lead": 4, "cost_m": 1.12, "kit": 4800.0},
    "DE_PRECISION": {"weld": 0.96, "q_valve": 5.5, "lead": 6, "cost_m": 1.32, "kit": 8500.0},
}
VOLUMES = (1.0, 2.0, 3.0, 5.0, 8.0, 10.0, 15.0, 20.0, 25.0, 30.0)


def outer_d(vol: float) -> int:
    if vol <= 2.0:
        return 1400
    if vol <= 5.0:
        return 1600
    if vol <= 10.0:
        return 2000
    if vol <= 15.0:
        return 2400
    if vol <= 25.0:
        return 2600
    return 3000


def eval_candidate(
    order: dict[str, Any],
    route: dict[str, Any],
    *,
    unit_count: int,
    vol: float,
    ins: str,
    fit: str,
    wall_mm: float,
    pressure_mpa: float,
    use_permit: bool,
    pvi_mult: float = 1.0,
    lead_deltas: dict[str, int] | None = None,
    max_tare_by_bay: dict[str, float] | None = None,
) -> dict[str, Any] | None:
    m = MEDIUM_TABLE[order["medium"]]
    if m["req_evi"] and ins != "EVI":
        return None
    if m["forbid_cn"] and fit == "CN":
        return None
    if m["lox_hp"] and pressure_mpa > 2.0 and fit == "CN":
        return None

    usable_unit = round(vol * m["density"] * 0.95, 2)
    if round(unit_count * usable_unit, 2) < order["required_product_mass_kg"]:
        return None

    od = outer_d(vol)
    ann = INS_TABLE[ins]["annulus"]
    id_mm = int(round(od - 2.0 * ann))
    raw_axis = (vol / (math.pi * ((id_mm / 1000.0) / 2.0) ** 2)) * 1000.0
    axis_mm = int(math.ceil(raw_axis / 10.0) * 10)

    is_trans = order["execution"] == "TRANSPORTABLE"
    if not is_trans:
        inst_h, inst_w = axis_mm + 900, od
        ship_h, ship_w = od + 350, od
    else:
        inst_h, inst_w = od + 600, od + 200
        ship_h, ship_w = inst_h, inst_w

    if inst_h > order["max_site_height_mm"]:
        return None
    if unit_count * inst_w + (unit_count - 1) * 400 > order["max_site_footprint_mm"]:
        return None

    weld = FIT_TABLE[fit]["weld"]
    hoop = round((pressure_mpa * (id_mm + wall_mm)) / (2.0 * weld * wall_mm), 2)
    allow = round(235.0 / m["sf"], 2)
    if hoop > allow:
        return None

    r_m = (id_mm / 1000.0) / 2.0
    l_m = axis_mm / 1000.0
    area = 2.0 * math.pi * r_m * l_m + 4.0 * math.pi * (r_m ** 2) * 0.65
    inner_mass = area * (wall_mm / 1000.0) * 1.12 * 7900.0
    outer_mass = area * 0.0055 * 7850.0 * INS_TABLE[ins]["casing_f"]
    tare_kg = round(inner_mass + outer_mass + 420.0, 1)
    skid_kg = round(0.18 * tare_kg + 650.0, 1) if is_trans else 480.0
    trans_kg = round(tare_kg + skid_kg, 1)

    if trans_kg > route["max_unit_transport_mass_kg"]:
        return None
    if not use_permit:
        if ship_w > route["std_max_width_mm"] or ship_h > route["std_max_height_mm"]:
            return None
    else:
        if not route.get("escort_permit_allowed", True):
            return None
        if ship_w > route["permit_max_width_mm"] or ship_h > route["permit_max_height_mm"]:
            return None

    k_eff = INS_TABLE[ins]["k"] * (pvi_mult if ins == "PVI" else 1.0)
    q_cond = k_eff * area * (293.15 - m["boil_k"]) / (ann / 1000.0)
    q_valve = FIT_TABLE[fit]["q_valve"] * (1.25 if is_trans else 1.0)
    evap = (q_cond + q_valve) * 86400.0 / (m["latent"] * 1000.0)
    boil_pct = round((evap / usable_unit) * 100.0, 4)
    if boil_pct > order["max_boil_off_pct_day"]:
        return None

    base_fab = 2 + (1 if vol >= 10.0 else 0) + (1 if vol >= 20.0 else 0) + (1 if wall_mm >= 14.0 else 0) + (1 if is_trans else 0)
    fab_weeks = base_fab + (unit_count - 1)
    delta_l = int((lead_deltas or {}).get(fit, 0))
    fit_lead = max(1, FIT_TABLE[fit]["lead"] + delta_l)

    exec_m = 1.18 if is_trans else 1.00
    unit_cost = (9500.0 + vol * 2150.0 + tare_kg * 3.10) * INS_TABLE[ins]["cost_m"] * FIT_TABLE[fit]["cost_m"] * exec_m + FIT_TABLE[fit]["kit"]
    mfg_cost = round(unit_count * unit_cost * (0.94 if unit_count > 1 else 1.0), 2)
    freight_cost = unit_count * route["base_freight_eur_per_unit"] + (route["permit_fee_eur"] if use_permit else 0.0)

    allowed_bays = []
    for bay in ("BAY-A", "BAY-B"):
        cap = (max_tare_by_bay or {}).get(bay)
        if cap is None or tare_kg <= float(cap):
            allowed_bays.append(bay)
    if not allowed_bays:
        return None

    return {
        "unit_count": unit_count,
        "unit_volume_m3": vol,
        "design_pressure_mpa": pressure_mpa,
        "wall_thickness_mm": wall_mm,
        "insulation": ins,
        "fittings": fit,
        "use_escort_permit": use_permit,
        "fab_weeks": fab_weeks,
        "fit_lead": fit_lead,
        "tare_kg": tare_kg,
        "total_cost": round(mfg_cost + freight_cost, 2),
        "allowed_bays": allowed_bays,
    }


def generate_candidates(
    order: dict[str, Any],
    route: dict[str, Any],
    pvi_mult: float = 1.0,
    lead_deltas: dict[str, int] | None = None,
    max_tare_by_bay: dict[str, float] | None = None,
) -> list[dict[str, Any]]:
    p_req = round(max(0.25, float(order["min_pressure_mpa"])), 2)
    cands: list[dict[str, Any]] = []
    walls = [float(w) for w in range(4, 25)]
    for uc in (1, 2, 3):
        for vol in VOLUMES:
            for ins in ("PVI", "EVI"):
                for fit in ("CN", "EU_STD", "DE_PRECISION"):
                    for use_permit in (False, True):
                        for w in walls:
                            res = eval_candidate(
                                order,
                                route,
                                unit_count=uc,
                                vol=vol,
                                ins=ins,
                                fit=fit,
                                wall_mm=w,
                                pressure_mpa=p_req,
                                use_permit=use_permit,
                                pvi_mult=pvi_mult,
                                lead_deltas=lead_deltas,
                                max_tare_by_bay=max_tare_by_bay,
                            )
                            if res is not None:
                                cands.append(res)
                                break
    cands.sort(key=lambda c: (c["total_cost"], c["fab_weeks"], c["fit_lead"]))
    return cands[:28]


def solve_batch(
    orders: list[dict[str, Any]],
    routes_by_id: dict[str, dict[str, Any]],
    *,
    budget_eur: float,
    horizon_weeks: int,
    permit_quota: int,
    blackouts: list[dict[str, Any]],
    pvi_mult: float = 1.0,
    lead_deltas: dict[str, int] | None = None,
    max_tare_by_bay: dict[str, float] | None = None,
    existing_bookings: dict[str, dict[str, Any]] | None = None,
    retooling_spent_so_far: float = 0.0,
    post_shock: bool = False,
) -> dict[str, dict[str, Any]]:
    cand_map = {
        o["order_id"]: generate_candidates(
            o,
            routes_by_id[o["route_id"]],
            pvi_mult=pvi_mult,
            lead_deltas=lead_deltas,
            max_tare_by_bay=max_tare_by_bay,
        )
        for o in orders
    }
    order_ids = [o["order_id"] for o in orders]
    orders_by_id = {o["order_id"]: o for o in orders}

    blackout_set: dict[str, set[int]] = {"BAY-A": set(), "BAY-B": set()}
    for bl in blackouts:
        b_id = bl["bay_id"]
        for wk in range(int(bl["start_week"]), int(bl["end_week"])):
            blackout_set.setdefault(b_id, set()).add(wk)

    best_plan: dict[str, dict[str, Any]] | None = None
    best_obj = -1e9

    for combo in itertools.product(*(cand_map[oid] for oid in order_ids)):
        permits_used = sum(1 for c in combo if c["use_escort_permit"])
        if permits_used > permit_quota:
            continue

        extra_retool = 0.0
        rel_weeks: dict[str, int] = {}
        for oid, cand in zip(order_ids, combo):
            prev = (existing_bookings or {}).get(oid)
            if prev is None:
                rel_weeks[oid] = 2 if post_shock else 1
            else:
                prev_spec = prev.get("spec", prev)
                spec_changed = any(
                    prev_spec.get(k) != cand[k]
                    for k in ("unit_count", "unit_volume_m3", "design_pressure_mpa", "wall_thickness_mm", "insulation", "fittings")
                )
                if not post_shock:
                    rel_weeks[oid] = int(prev.get("order_release_week", 1))
                elif prev_spec.get("fittings") != cand["fittings"] or prev_spec.get("unit_count") != cand["unit_count"]:
                    rel_weeks[oid] = 2
                else:
                    rel_weeks[oid] = int(prev.get("order_release_week", 1))
                # Estimate retooling if schedule or spec will be revised
                if spec_changed:
                    extra_retool += 1500.0 if (post_shock and not prev.get("post_shock_revised", False)) else 4500.0

        base_cost = sum(c["total_cost"] for c in combo) + retooling_spent_so_far + extra_retool
        if base_cost > budget_eur:
            continue

        # Schedule across BAY-A and BAY-B
        occ: dict[str, set[int]] = {
            "BAY-A": set(blackout_set["BAY-A"]),
            "BAY-B": set(blackout_set["BAY-B"]),
        }
        # Sort tighter SLA orders first
        indexed = sorted(
            zip(order_ids, combo),
            key=lambda pair: (orders_by_id[pair[0]]["sla_week"], pair[1]["fab_weeks"]),
        )
        schedule_ok = True
        placement: dict[str, dict[str, Any]] = {}
        total_slack = 0.0
        sched_retool_extra = 0.0

        for oid, cand in indexed:
            o = orders_by_id[oid]
            rt = routes_by_id[o["route_id"]]
            deadline = min(int(o["sla_week"]), int(horizon_weeks))
            chosen_slot: tuple[str, int, int] | None = None
            prev = (existing_bookings or {}).get(oid)

            # Prefer keeping existing bay/start_week if valid to avoid unnecessary retooling fees
            slot_trials: list[tuple[str, int]] = []
            if prev is not None and prev.get("bay_id") in cand["allowed_bays"]:
                slot_trials.append((prev["bay_id"], int(prev["bay_start_week"])))
            for wk in range(1, horizon_weeks + 1):
                for bay in cand["allowed_bays"]:
                    if (bay, wk) not in slot_trials:
                        slot_trials.append((bay, wk))

            for bay, start_wk in slot_trials:
                fab_end = start_wk + cand["fab_weeks"]
                needed = set(range(start_wk, fab_end))
                if needed & occ[bay]:
                    continue
                ready_wk = max(fab_end, rel_weeks[oid] + cand["fit_lead"])
                deliv_wk = ready_wk + 1 + int(rt["transit_weeks"])
                if deliv_wk <= deadline:
                    chosen_slot = (bay, start_wk, deliv_wk)
                    break

            if chosen_slot is None:
                schedule_ok = False
                break

            bay, start_wk, deliv_wk = chosen_slot
            if prev is not None:
                prev_spec = prev.get("spec", prev)
                spec_same = all(
                    prev_spec.get(k) == cand[k]
                    for k in ("unit_count", "unit_volume_m3", "design_pressure_mpa", "wall_thickness_mm", "insulation", "fittings")
                )
                if spec_same and (prev.get("bay_id") != bay or int(prev.get("bay_start_week", 0)) != start_wk):
                    sched_retool_extra += 1500.0 if (post_shock and not prev.get("post_shock_revised", False)) else 4500.0

            occ[bay].update(range(start_wk, start_wk + cand["fab_weeks"]))
            total_slack += (int(o["sla_week"]) - deliv_wk)
            placement[oid] = {
                **cand,
                "bay_id": bay,
                "bay_start_week": start_wk,
                "delivery_week": deliv_wk,
                "route_id": o["route_id"],
            }

        if not schedule_ok:
            continue
        final_cost = base_cost + sched_retool_extra
        if final_cost > budget_eur:
            continue

        budget_bonus = 0.07 * min(1.0, max(0.0, (budget_eur - final_cost) / (0.03 * budget_eur)))
        slack_bonus = 0.04 * min(1.0, (total_slack / len(order_ids)) / 2.0)
        obj = 0.85 + budget_bonus + slack_bonus
        if obj > best_obj:
            best_obj = obj
            best_plan = placement

    if best_plan is None:
        raise RuntimeError("Pure-MCP solver could not find a joint feasible plan.")
    return best_plan


async def call_json(session: ClientSession, name: str, args: dict[str, Any] | None = None) -> dict[str, Any]:
    res = await session.call_tool(name, args or {})
    if getattr(res, "structured_content", None) and isinstance(res.structured_content, dict):
        return res.structured_content
    for block in res.content:
        if hasattr(block, "text"):
            return json.loads(block.text)
    return {}


async def run_solver(mcp_url: str) -> None:
    async with sse_client(mcp_url) as (read_stream, write_stream):
        async with ClientSession(read_stream, write_stream) as session:
            await session.initialize()
            brief = await call_json(session, "get_episode_brief")
            await call_json(session, "query_handbook", {"section": "overview"})
            state = await call_json(session, "get_factory_state")

            order_ids = brief.get("order_ids") or [o["order_id"] for o in brief.get("orders", [])]
            route_ids = brief.get("route_ids") or [r["route_id"] for r in brief.get("routes", [])]

            orders = []
            for oid in order_ids:
                resp = await call_json(session, "inspect_order", {"order_id": oid})
                orders.append(resp.get("order", resp))

            routes_by_id = {}
            for rid in route_ids:
                resp = await call_json(session, "inspect_route", {"route_id": rid})
                r_obj = resp.get("route", resp)
                routes_by_id[r_obj["route_id"]] = r_obj

            budget = float(state.get("total_budget_eur", brief.get("total_budget_eur", brief.get("initial_budget_eur", 250000.0))))
            horizon = int(brief.get("horizon_weeks", state.get("horizon_weeks", 16)))
            permits = int(state.get("escort_permits_total", brief.get("escort_permits_total", brief.get("initial_escort_permits", 1))))
            blackouts = state.get("bay_blackouts", brief.get("bay_blackouts", []))

            plan = solve_batch(
                orders,
                routes_by_id,
                budget_eur=budget,
                horizon_weeks=horizon,
                permit_quota=permits,
                blackouts=blackouts,
            )

            shock_seen = bool(state.get("disruption_triggered", False))
            booked_ids: list[str] = []

            for oid in order_ids:
                p = plan[oid]
                resp = await call_json(
                    session,
                    "reserve_bay_and_order",
                    {
                        "order_id": oid,
                        "bay_id": p["bay_id"],
                        "bay_start_week": p["bay_start_week"],
                        "unit_count": p["unit_count"],
                        "unit_volume_m3": p["unit_volume_m3"],
                        "design_pressure_mpa": p["design_pressure_mpa"],
                        "wall_thickness_mm": p["wall_thickness_mm"],
                        "insulation": p["insulation"],
                        "fittings": p["fittings"],
                    },
                )
                booked_ids.append(oid)
                await call_json(
                    session,
                    "assign_transport",
                    {
                        "order_id": oid,
                        "route_id": p["route_id"],
                        "use_escort_permit": p["use_escort_permit"],
                    },
                )
                if resp.get("disruption_alert"):
                    shock_seen = True
                    break

            # Refresh world state after shock or after initial bookings
            state2 = await call_json(session, "get_factory_state")
            orders2 = []
            for oid in order_ids:
                resp = await call_json(session, "inspect_order", {"order_id": oid})
                orders2.append(resp.get("order", resp))
            routes2 = {}
            for rid in route_ids:
                resp = await call_json(session, "inspect_route", {"route_id": rid})
                r_obj = resp.get("route", resp)
                routes2[r_obj["route_id"]] = r_obj

            disruption = state2.get("disruption_alert") or state2.get("active_disruption") or {}
            pvi_mult = float(state2.get("pvi_k_multiplier", disruption.get("pvi_k_multiplier", 1.0)))
            lead_deltas = state2.get("fittings_lead_deltas", disruption.get("fittings_lead_deltas", {}))
            max_tare = state2.get("bay_max_unit_tare_kg", disruption.get("bay_max_unit_tare_kg", {}))
            budget2 = float(state2.get("total_budget_eur", state2.get("effective_budget_eur", budget)))
            permits2 = int(state2.get("escort_permits_total", state2.get("effective_escort_permits_total", permits)))
            blackouts2 = state2.get("bay_blackouts", blackouts)
            retool_spent = float(state2.get("retooling_fees_eur", 0.0))

            raw_bookings = state2.get("bookings", state2.get("booked_orders", {}))
            existing_map: dict[str, dict[str, Any]] = {}
            if isinstance(raw_bookings, dict):
                existing_map = raw_bookings
            elif isinstance(raw_bookings, list):
                existing_map = {b["order_id"]: b for b in raw_bookings if isinstance(b, dict) and "order_id" in b}

            plan2 = solve_batch(
                orders2,
                routes2,
                budget_eur=budget2,
                horizon_weeks=horizon,
                permit_quota=permits2,
                blackouts=blackouts2,
                pvi_mult=pvi_mult,
                lead_deltas=lead_deltas,
                max_tare_by_bay=max_tare,
                existing_bookings=existing_map,
                retooling_spent_so_far=retool_spent,
                post_shock=bool(state2.get("disruption_triggered", shock_seen)),
            )

            # Book unbooked orders first, and revise any already-booked orders that changed or overlap
            for oid in order_ids:
                p = plan2[oid]
                if oid not in existing_map:
                    await call_json(
                        session,
                        "reserve_bay_and_order",
                        {
                            "order_id": oid,
                            "bay_id": p["bay_id"],
                            "bay_start_week": p["bay_start_week"],
                            "unit_count": p["unit_count"],
                            "unit_volume_m3": p["unit_volume_m3"],
                            "design_pressure_mpa": p["design_pressure_mpa"],
                            "wall_thickness_mm": p["wall_thickness_mm"],
                            "insulation": p["insulation"],
                            "fittings": p["fittings"],
                        },
                    )
                    await call_json(
                        session,
                        "assign_transport",
                        {
                            "order_id": oid,
                            "route_id": p["route_id"],
                            "use_escort_permit": p["use_escort_permit"],
                        },
                    )
                else:
                    prev = existing_map[oid]
                    prev_spec = prev.get("spec", prev)
                    needs_rev = (
                        prev.get("bay_id") != p["bay_id"]
                        or int(prev.get("bay_start_week", -1)) != p["bay_start_week"]
                        or any(
                            prev_spec.get(k) != p[k]
                            for k in ("unit_count", "unit_volume_m3", "design_pressure_mpa", "wall_thickness_mm", "insulation", "fittings")
                        )
                    )
                    needs_route = (
                        prev.get("assigned_route_id") != p["route_id"]
                        or bool(prev.get("use_escort_permit", False)) != p["use_escort_permit"]
                    )
                    if needs_rev:
                        await call_json(
                            session,
                            "revise_order",
                            {
                                "order_id": oid,
                                "bay_id": p["bay_id"],
                                "bay_start_week": p["bay_start_week"],
                                "unit_count": p["unit_count"],
                                "unit_volume_m3": p["unit_volume_m3"],
                                "design_pressure_mpa": p["design_pressure_mpa"],
                                "wall_thickness_mm": p["wall_thickness_mm"],
                                "insulation": p["insulation"],
                                "fittings": p["fittings"],
                                "route_id": p["route_id"],
                                "use_escort_permit": p["use_escort_permit"],
                            },
                        )
                    elif needs_route:
                        await call_json(
                            session,
                            "assign_transport",
                            {
                                "order_id": oid,
                                "route_id": p["route_id"],
                                "use_escort_permit": p["use_escort_permit"],
                            },
                        )

            fin = await call_json(session, "finalize_commissioning")
            print("[cryoforge-oracle] finalized:", json.dumps(fin)[:400])


asyncio.run(run_solver(sys.argv[1]))
PYEOF
