/**
 * drugMain.js
 * ─────────────────────────────────────────────────────────────
 * Central data layer for the drug-test dashboard.
 *
 * Loads drug_tests_full.csv with d3.csv(), shapes it into the
 * slices each chart needs, and exposes a small pub/sub API
 * (DrugPage) that drugTrend.js / drugType.js / drugAge.js /
 * drugState.js all register against via DrugPage.onFilter().
 *
 * CSV schema (one row per detection-method record):
 *   YEAR, JURISDICTION, LOCATION, AGE_GROUP, METRIC,
 *   DETECTION_METHOD, FINES, ARRESTS, CHARGES,
 *   BEST_DETECTION_METHOD, AMPHETAMINE, CANNABIS, COCAINE,
 *   ECSTASY, METHYLAMPHETAMINE, NO_DRUGS_DETECTED, COUNT
 *
 *
 * ─────────────────────────────────────────────────────────────
 */

const DrugPage = (function () {
  const CSV_PATH = 'data/drug_tests_full.csv';

  const DETECT_LABEL_MAP = {
    "Indicator (Stage 1)": "Stage 1 – Indicator",
    "Secondary Confirmatory (Stage 2)": "Stage 2 – Confirmatory",
    "Laboratory or Toxicology (Stage 3)": "Stage 3 – Lab / Toxicology",
  };

  const DRUG_FIELD_MAP = {
    AMPHETAMINE: "Amphetamine",
    CANNABIS: "Cannabis",
    COCAINE: "Cocaine",
    ECSTASY: "Ecstasy",
    METHYLAMPHETAMINE: "Methylamph.",
  };

  let rawRows = [];
  let listeners = [];
  let filters = { year: "ALL", state: "ALL" };
  let ready = false;
  let loadPromise = null;

  // ── LOAD ────────────────────────────────────────────────────
  function load() {
    if (loadPromise) return loadPromise;

    loadPromise = d3.csv(CSV_PATH, d3.autoType).then((rows) => {
      // d3.autoType will coerce YEAR to a number and leave the
      // "Yes"/"No"/"Not applicable" strings as-is, which is what
      // we want for the boolean-ish flag columns.
      rawRows = rows;
      ready = true;
      return rawRows;
    });

    return loadPromise;
  }

  // ── AGGREGATION HELPERS ─────────────────────────────────────

  function applyScopeFilters(rows) {
    return rows.filter((r) => {
      if (filters.year !== "ALL" && String(r.YEAR) !== String(filters.year))
        return false;
      if (filters.state !== "ALL" && r.JURISDICTION !== filters.state)
        return false;
      return true;
    });
  }

  /** Trend: positive tests per year. BEST_DETECTION_METHOD = "Yes" is the
   *  de-dup key across both the 2008–2022 rollup rows and the 2023–2024
   *  granular rows, so no AGE_GROUP/LOCATION constraint is applied here —
   *  adding one would silently drop 2023–2024, which never has
   *  "All ages / All regions" rows. */
  function buildTrendData(rows) {
    const scoped = rows.filter(
      (r) =>
        r.BEST_DETECTION_METHOD === "Yes" &&
        (filters.state === "ALL" || r.JURISDICTION === filters.state),
    );

    const byYear = d3.rollup(
      scoped,
      (v) => d3.sum(v, (d) => d.COUNT),
      (d) => d.YEAR,
    );

    return Array.from(byYear, ([year, count]) => ({ year: +year, count }))
      .sort((a, b) => a.year - b.year)
      .map((d) => ({
        ...d,
        dimmed:
          filters.year !== "ALL" && String(d.year) !== String(filters.year),
      }));
  }

  /** Type: total positive tests per substance, honoring year/state filters. */
  function buildDrugTypeData(rows) {
    const scoped = applyScopeFilters(rows);
    const counts = {};
    Object.values(DRUG_FIELD_MAP).forEach((label) => {
      counts[label] = 0;
    });

    scoped.forEach((r) => {
      Object.entries(DRUG_FIELD_MAP).forEach(([field, label]) => {
        if (r[field] === "Yes") counts[label] += r.COUNT;
      });
    });

    return Object.entries(counts)
      .map(([drug, count]) => ({ drug, count }))
      .filter((d) => d.count > 0)
      .sort((a, b) => b.count - a.count);
  }

  /** Age: total positive tests per age group, honoring year/state filters.
   *  Excludes AGE_GROUP = "All ages" so the 2008–2022 national rollup rows
   *  (which use that placeholder) aren't counted as a fake age bucket. */
  function buildAgeData(rows) {
    const scoped = applyScopeFilters(rows).filter(
      (r) => r.AGE_GROUP !== "All ages" && r.BEST_DETECTION_METHOD === "Yes",
    );

    const byAge = d3.rollup(
      scoped,
      (v) => d3.sum(v, (d) => d.COUNT),
      (d) => d.AGE_GROUP,
    );

    const order = ["0-16", "17-25", "26-39", "40-64", "65 and over"];
    return order
      .filter((age) => byAge.has(age))
      .map((age) => ({ age, count: byAge.get(age) }));
  }

  /** State: total positive tests per jurisdiction, honoring the year filter
   *  only (state itself is the dimension being shown, so it ignores the
   *  state filter). Same BEST_DETECTION_METHOD de-dup rule as Trend, with
   *  no AGE_GROUP/LOCATION constraint so 2023–2024 isn't dropped. */
  function buildStateData(rows) {
    const scoped = rows.filter(
      (r) =>
        r.BEST_DETECTION_METHOD === "Yes" &&
        (filters.year === "ALL" || String(r.YEAR) === String(filters.year)),
    );

    const byState = d3.rollup(
      scoped,
      (v) => d3.sum(v, (d) => d.COUNT),
      (d) => d.JURISDICTION,
    );

    return Array.from(byState, ([state, count]) => ({ state, count })).sort(
      (a, b) => b.count - a.count,
    );
  }

  /** Detection stage breakdown: Indicator / Secondary Confirmatory / Lab-Toxicology,
   *  summed across all rows (this is the only slice where the three stages are
   *  meant to be compared directly), honoring year/state filters. */
  function buildDetectData(rows) {
    const scoped = applyScopeFilters(rows);

    const byMethod = d3.rollup(
      scoped,
      (v) => d3.sum(v, (d) => d.COUNT),
      (d) => d.DETECTION_METHOD,
    );

    const order = [
      "Indicator (Stage 1)",
      "Secondary Confirmatory (Stage 2)",
      "Laboratory or Toxicology (Stage 3)",
    ];

    return order
      .filter((m) => byMethod.has(m))
      .map((m) => ({
        method: DETECT_LABEL_MAP[m] || m,
        count: byMethod.get(m),
      }));
  }

  /** KPI totals: positive tests, fines, arrests, charges, honoring both
   *  year and state filters. Same BEST_DETECTION_METHOD de-dup rule as
   *  Trend/State, with no AGE_GROUP/LOCATION constraint. */
  function buildKpiData(rows) {
    const scoped = rows.filter(
      (r) =>
        r.BEST_DETECTION_METHOD === "Yes" &&
        (filters.year === "ALL" || String(r.YEAR) === String(filters.year)) &&
        (filters.state === "ALL" || r.JURISDICTION === filters.state),
    );

    return {
      tests: d3.sum(scoped, (d) => d.COUNT),
      fines: d3.sum(scoped, (d) => d.FINES),
      arrests: d3.sum(scoped, (d) => d.ARRESTS),
      charges: d3.sum(scoped, (d) => d.CHARGES),
    };
  }

  // ── BUILD + BROADCAST ───────────────────────────────────────
  function buildPayload() {
    return {
      trendData: buildTrendData(rawRows),
      drugTypeData: buildDrugTypeData(rawRows),
      ageData: buildAgeData(rawRows),
      stateData: buildStateData(rawRows),
      detectData: buildDetectData(rawRows),
      kpiData: buildKpiData(rawRows),
      year: filters.year,
      state: filters.state,
    };
  }

  function notify() {
    if (!ready) return;
    const payload = buildPayload();
    renderChrome(payload);
    listeners.forEach((fn) => fn(payload));
  }

  // ── UI CHROME (KPI cards, filter tag, dropdown sync) ─────────
  // These touch DOM elements that live in index.html but aren't owned by
  // any individual chart file, so drugMain.js updates them directly.

  function _fmt(n) {
    if (n == null) return "—";
    return n.toLocaleString();
  }

  function renderKpis(kpiData) {
    const map = {
      "d-kpi-tests": kpiData.tests,
      "d-kpi-fines": kpiData.fines,
      "d-kpi-arrests": kpiData.arrests,
      "d-kpi-charges": kpiData.charges,
    };
    Object.entries(map).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = _fmt(value);
    });
  }

  function renderFilterBar(payload) {
    const tagEl = document.getElementById("drug-filter-tag");
    const barEl = document.getElementById("drug-filter-bar");
    if (!tagEl) return;

    const parts = [];
    if (payload.year !== "ALL") parts.push(String(payload.year));
    if (payload.state !== "ALL") parts.push(payload.state);

    const label = parts.length ? parts.join(", ") : "—";
    // Preserve the close (✕) button; only swap the leading text node.
    const closeBtn = tagEl.querySelector("button");
    tagEl.textContent = label + " ";
    if (closeBtn) tagEl.appendChild(closeBtn);

    if (barEl) barEl.classList.toggle("active", parts.length > 0);
  }

  function syncDropdowns(payload) {
    const stateSel = document.getElementById("drug-state-filter");
    const yearSel = document.getElementById("drug-year-filter");
    if (stateSel && stateSel.value !== payload.state)
      stateSel.value = payload.state;
    if (yearSel && yearSel.value !== String(payload.year))
      yearSel.value = String(payload.year);
  }

  function renderChrome(payload) {
    renderKpis(payload.kpiData);
    renderFilterBar(payload);
    syncDropdowns(payload);
  }

  // ── PUBLIC API ───────────────────────────────────────────────
  function onFilter(fn) {
    listeners.push(fn);
    if (ready) fn(buildPayload());
  }

  function applyYearFilter(year) {
    filters.year = year;
    notify();
  }

  function applyStateFilter(state) {
    filters.state = state;
    notify();
  }

  function resetFilters() {
    filters = { year: "ALL", state: "ALL" };
    notify();
  }

  function filtered() {
    return { ...filters };
  }

  function init() {
    load().then(() => notify());
  }

  return {
    init,
    onFilter,
    applyYearFilter,
    applyStateFilter,
    resetFilters,
    filtered,
  };
})();
