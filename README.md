# AgentBreak Bench — Multi-Constraint Operations & Disruption-Recovery Benchmark

**AgentBreak Bench** (powered by the deterministic `CryoForge` simulation engine) is a Model Context Protocol (**MCP**) and **Harbor v1.0** benchmark for evaluating AI agents on coupled engineering design, multi-lane scheduling, resource budgeting, and mid-episode disruption recovery.

### Executive Summary

- **What the Agent Must Do:** Configure and commission **4 interdependent cryogenic vessel orders (`ORD-1..ORD-4`)** across **2 fabrication lanes (`BAY-A`, `BAY-B`)** and constrained transport corridors within a shared plant budget, a **strict 3-call simulation tool limit (`run_physics_sim`)**, and customer delivery SLAs—then dynamically re-plan via `revise_order` when a **live Step-4 disruption** invalidates initial assumptions.
- **Why Frontier Models Struggle (`0.95` vs `0.32`):** Every formula and constraint is 100% transparent on Turn 1 via `query_handbook(section="all")` (and `gemini-3.8-flash` reaches `0.8922` on its best single run), yet across 15 live MCP rollouts (`5` scenarios × `3` runs) it averages **`0.3162 ± 0.2496`** against the analytical Reference Planner's **`0.9491`** (**`+0.6329` gap**). Frontier models burn all `3/3` simulation calls guessing early parameters instead of solving the handbook equations, collide on shared fabrication lanes, or fail to revise pre-booked orders after the Step-4 shock.
- **How Scoring & Anti-Cheat Work:** Rewards are computed exclusively at episode termination (`finalize_commissioning`) by an isolated zero-trust verifier (`env_core/verifier.py`) with `HMAC-SHA256` state verification. Partial completion is gated (`0` valid orders = `0.00`, `1/4` valid = capped at `<= 0.08`), `do_nothing` scores **`0.0000`**, `stop_early` scores **`0.0800`**, and **all `8/8` adversarial reward-hacking exploits** (schema/NaN injection, reserve/revise oracle farming, sim quota overflow, lane/permit double-spend, post-finalize mutation) are blocked (`0.00–0.08`).
- **Verified Harbor Sandbox Logs (`runs/harbor_jobs/`):** Containerized two-service Harbor evaluations (`cryoforge-mcp` SSE sidecar + isolated `/workspace` agent container) are verified and logged in [`runs/harbor_jobs/`](runs/harbor_jobs/) with **`oracle = 0.9445`** and **`nop = 0.0000`**.
- **Built-In Agent Skill (`.agents/skills/agentbreak-bench`):** Includes a ready-to-use agent skill ([`.agents/skills/agentbreak-bench/SKILL.md`](.agents/skills/agentbreak-bench/SKILL.md)) supporting **3 execution modes**:
  1. **No API Key — Offline Verify & Web Dashboard:** `python scripts/run_eval.py --verify-recorded --serve` (`http://127.0.0.1:8095`) + Harbor `oracle` / `nop`.
  2. **No Extra API Key — Live Agent Playtest via MCP:** Connect Codex, OpenCode, or Antigravity directly to `python -m mcp_server.server --transport stdio --seed S01` to benchmark the active assistant itself.
  3. **API Key Needed — Standalone LLM Benchmarking:** Run automated multi-seed rollouts via `harbor run -p ./harbor_task -a opencode -m <provider/model>` or `python scripts/run_eval.py --all --env-file .env --runs 3`.

---

## 1. Benchmark Scorecard Summary (Live MCP Trajectories)

All trajectories are persisted with `HMAC-SHA256` state signatures in [`runs/trajectories/`](runs/trajectories/), [`runs/scorecard.json`](runs/scorecard.json), and [`runs/SCORECARD.md`](runs/SCORECARD.md).

| Benchmark Dimension | Metric | Observed Value | Target / Invariant | Status |
|---|---|---:|---:|:---:|
| **Capability Gap** | **Reference Planner (`Scenarios 1–5`)** | **`0.9491`** (`0.9526` across `S01–S08`) | `>= 0.9400` using public MCP tools only | **PASS** |
| **Capability Gap** | **Frontier Agent (`gemini-3.8-flash`, 3× runs/scenario)** | **`0.3162 ± 0.2496`** | Evaluated 3× per scenario over live MCP (`15` runs) | **PASS** |
| **Capability Gap** | **Reproducible Score Gap (`Ref − Frontier`)** | **`+0.6329`** | Consistent gap across all 5 eval scenarios | **PASS** |
| **Meaningful Difficulty** | **Transparent Handbook Coverage** | **`100%` of rules & equations** | Zero hidden rules, zero broken tools, deterministic | **PASS** |
| **Reward Integrity** | **`do_nothing` Baseline (`S01–S05`)** | **`0.0000`** | `== 0.0000` (unbooked & turn-1 finalize) | **PASS** |
| **Reward Integrity** | **`stop_early` Cherry-Pick Baseline (`S01–S05`)** | **`0.0800`** | `<= 0.1000` (`0.08` 1-of-4 batch gate) | **PASS** |
| **Reward Integrity** | **8-Attack Adversarial Exploit Suite** | **`8 / 8` Blocked** (`max = 0.0800`) | Schema fuzzing, oracle farming, double-spend, post-finalize | **PASS** |
| **Harbor Verification** | **Containerized `oracle` / `nop` (`runs/harbor_jobs/`)** | **`0.9445` / `0.0000`** | Isolated MCP SSE sidecar + `/logs/verifier/reward.txt` | **PASS** |
| **Small-Model Learning** | **`gemini-3.5-flash-lite` on Held-Out `S06–S08`** | **`0.1400 → 0.3400` (`+0.2000` / `+142.9%`)** | Distilled strictly on `S01–S05` (`0` holdout leakage) | **PASS** |

---

## 2. Quick-Start & Reproduction Modes

### Prerequisites
- **Python 3.11+** (tested on Python 3.12)
- *(Optional, for rebuilding frontend assets — prebuilt SPA is already included in `viewer/dist/`)*: **Node.js 20+**

```bash
python -m venv .venv
# Windows PowerShell:
.\.venv\Scripts\pip install -r requirements.txt
# Linux / macOS:
# .venv/bin/pip install -r requirements.txt
```

### Mode 1: Offline Deterministic Verify + Web Dashboard (~25s, Zero API Keys)
Runs all 17 unit tests, executes the **Reference Planner (`S01–S08`)**, **`do_nothing` & `stop_early` baselines (`S01–S05`)**, and **all 8 adversarial exploit checks** live over MCP `stdio`, re-verifies all recorded trajectories in `runs/trajectories/`, and launches the **AgentBreak Bench Web Dashboard** at `http://127.0.0.1:8095`:

```bash
python scripts/run_eval.py --verify-recorded --serve
```

### Mode 2: Live Interactive Playtest via MCP (Zero Extra API Keys)
Connect your active **Codex**, **OpenCode**, **Claude Code**, or **Antigravity** session directly to the MCP server (see [`.agents/skills/agentbreak-bench/SKILL.md`](.agents/skills/agentbreak-bench/SKILL.md)):

```bash
# stdio transport
python -m mcp_server.server --transport stdio --seed S01

# SSE transport on port 8090
python -m mcp_server.server --transport sse --host 127.0.0.1 --port 8090 --seed S01
```

### Mode 3: Harbor Containerized Execution & Standalone LLM Benchmarking
`harbor_task/` is a self-contained Harbor v1.0 task with an isolated `cryoforge-mcp` SSE sidecar so `/workspace` has zero access to `env_core/scenarios.py` or `env_core/verifier.py`:

```bash
# 1. Verify Reference Planner & Do-Nothing inside Harbor (No API key needed):
harbor run --path harbor_task --agent oracle --jobs-dir runs/harbor_jobs
harbor run --path harbor_task --agent nop --jobs-dir runs/harbor_jobs

# 2. Benchmark an external model via Harbor + OpenCode (API key required):
harbor run --path harbor_task --agent opencode --model gemini/gemini-3.8-flash --jobs-dir runs/harbor_jobs

# 3. Run full 3× multi-seed evaluation suite (API key required):
python scripts/run_eval.py --all --env-file .env --frontier-provider gemini --frontier-model gemini-3.8-flash --runs 3
```

---

## 3. Scenario-by-Scenario Breakdown (`S01–S05` Evaluation Split)

| Scenario | Purpose Name | Mid-Episode Step-4 Disruption | Reference Planner | Frontier (`gemini-3.8-flash`, 3× Runs) | Frontier Mean ± Std | Gap Δ |
|---|---|---|---:|---|---:|---:|
| **`S01`** | Accelerated deadline | Tier-3 Supplier `+3w` Delay, Tier-1 Efficiency Drop (`1.25×`) & Route North `5,800 kg` Weight Cap | `0.9445` | `0.340`, `0.340`, `0.340` | `0.3400 ± 0.0000` | **`+0.6045`** |
| **`S02`** | Standard lane outage | `Lane B [5, 8)` Maintenance Outage & `-15,000 EUR` Budget Freeze | `0.9483` | `0.587`, `0.080`, `0.080` | `0.2488 ± 0.2388` | **`+0.6995`** |
| **`S03`** | Reduced lane capacity | Tier-1 Efficiency Degradation (`1.55×`) & Oversize Permit Cut (`2 → 1`) | `0.9514` | `0.340`, `0.080`, `0.068` | `0.1627 ± 0.1255` | **`+0.7887`** |
| **`S04`** | Safety clearance increase | `Task 3` Load Uprate (`2.5 MPa`) & Route Alpine `2,700 mm` Clearance Cap | `0.9480` | `0.340`, `0.068`, `0.892` | `0.4334 ± 0.3429` | **`+0.5146`** |
| **`S05`** | Emergency budget cut | Tier-2 Supplier `+2w` Delay & `Lane A` `5,200 kg` Capacity Derating | `0.9533` | `0.587`, `0.016`, `0.587` | `0.3963 ± 0.2689` | **`+0.5570`** |
| **Mean** | **5 Evaluation Scenarios** | **15 Live Frontier MCP Rollouts** | **`0.9491`** | **Min `0.016` / Max `0.892`** | **`0.3162 ± 0.2496`** | **`+0.6329`** |

---

## 4. Why Frontier AI Fails Here (6 Diagnostic Failure Modes)

Every formula, threshold, and scoring weight is inspectable on Turn 1 via `query_handbook(section="all")`. Across 15 Frontier rollouts (`106` logged violation incidents across `6` failure categories), failures stem from four coupled planning bottlenecks:

1. **Simulation Tool Budget Discipline (`SIM_EXHAUSTION` — `3 Calls Max` Across 4 Tasks):**
   Frontier agents treat `run_physics_sim` as a trial-and-error guessing loop on Tasks 1–2, burning all `3/3` simulation calls (`100%` of Frontier runs exhaust `3/3` sims) instead of calculating wall thickness and boil-off from the handbook first and saving simulation calls for Step-4 recovery.
2. **Coupled 4-Task Global Resource Contention (`BAY_CONFLICT`):**
   All 4 tasks share **2 execution lanes (`Lane A`, `Lane B`)**, a tight **project budget**, and **1–2 oversize transport permits**. Overspending on Task 1 starves Tasks 3–4 of budget or causes schedule collisions (`19` rejected lane overlap attempts logged across Frontier runs).
3. **Modular Splitting vs. Thermal & Structural Tradeoffs (`BOIL_OFF`, `HOOP_STRESS`, `BRIDGE_MASS_CAP`):**
   Splitting a large workload into `2` smaller modular units cuts per-unit route weight in half and avoids oversize width permits, **but** increases surface-to-volume thermal loss and widens total site footprint.
4. **Mid-Episode Step-4 Disruptions (`SHOCK_UNADAPTED` — Zero Pre-Shock Spoilers):**
   At the 4th mutating action, a deterministic `DisruptionEvent` fires (`disruption_alert`), changing supplier lead times, lane maintenance windows, or route weight caps. Agents that do not re-plan previously scheduled tasks via `revise_order` fail post-disruption SLA or safety checks.

---

## 5. Small-Model Trajectory Learning on Held-Out Scenarios (`S06–S08`)

We distill successful trajectories and failure contrasts **strictly from `S01–S05`** (`tiebreaker/collect_trajectories.py` + `tiebreaker/train_sft.py`, `zero_leakage_verified = true`) and evaluate a smaller model (`gemini-3.5-flash-lite`) **Before vs. After** on three unseen held-out scenarios (`S06`, `S07`, `S08`):

| Held-Out Scenario | Step-4 Disruption | Before Training | After Training | Gain Δ |
|---|---|---:|---:|---:|
| **`S06`** | Tier-3 Supplier `+2w` Delay, Route Fjord `5,600 kg` Cap & `-10k EUR` Cut | `0.3400` (`2/4` valid) | `0.3400` (`2/4` valid) | `+0.0000` |
| **`S07`** | `Lane A [4, 7)` Outage, Tier-1 Degradation (`1.50×`) & Permit Cut | `0.0800` (`1/4` valid) | `0.3400` (`2/4` valid) | **`+0.2600`** |
| **`S08`** | `Task 2` Load Uprate (`2.5 MPa`), Route Gorge Cap & `Lane B` `5,100 kg` Cap | `0.0000` (`0/4` valid) | `0.3400` (`2/4` valid) | **`+0.3400`** |
| **Held-Out Mean** | **12 Unseen Tasks (`0` Shared Tasks/Routes with `S01–S05`)** | **`0.1400` (`3/12` valid)** | **`0.3400` (`6/12` valid)** | **`+0.2000` (`+142.9%`)** |

---

## 6. Interactive Web Dashboard (`viewer/`)

Launch with `python scripts/run_eval.py --verify-recorded --serve` and open `http://127.0.0.1:8095`:

1. **Overview:** Score gap orbit (`+0.63`), collapsible 3-step benchmark architecture, and live summary cards (`The Gap`, `Meaningful difficulty`, `Reward integrity`, `Craft & learning`).
2. **Agent comparison:** Plain-English scenario selector (`Standard lane outage`, `Emergency budget cut`, `Reduced lane capacity`, `Safety clearance increase`, `Accelerated deadline`), per-job comparison cards with `Why? ▾` failure explainers, multi-week `Lane A / Lane B` schedule & outage timeline, and collapsible **MCP tool call inspector**.
3. **Reward integrity:** Server-authoritative anti-cheat summary and all **8 blocked reward-hacking attacks** (`0.00–0.08`) with expandable attack details.
4. **Learning & CLI:** Held-out `Before (0.14) -> After (0.34)` (`+143%`) chart, automatic unseen disruption breakdown, and collapsible **`CLI & Harbor quick-start ▾`** drawer.
