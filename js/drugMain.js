/**
 * drugMain.js
 * ─────────────────────────────────────────────────────────────
 * Central data store + filter logic for the Drug Test page.
 * All chart files (drugTrend, drugState, drugAge, drugType)
 * read from DrugPage.filtered() and call DrugPage.onFilter()
 * to push filter changes.  Nothing here touches the Fines page.
 * ─────────────────────────────────────────────────────────────
 */

const DrugPage = (() => {

    // ── RAW DATA ────────────────────────────────────────────────
    // Pre-aggregated from drug_tests_full.csv so no CSV fetch needed.

    /** Positive test totals by year (all states combined) */
    const TREND_DATA = [
        { year: 2008, count: 2413  },
        { year: 2009, count: 2910  },
        { year: 2010, count: 4033  },
        { year: 2011, count: 5604  },
        { year: 2012, count: 8242  },
        { year: 2013, count: 9853  },
        { year: 2014, count: 16289 },
        { year: 2015, count: 35143 },
        { year: 2016, count: 38703 },
        { year: 2017, count: 39855 },
        { year: 2018, count: 48216 },
        { year: 2019, count: 48466 },
        { year: 2020, count: 46905 },
        { year: 2021, count: 49465 },
        { year: 2022, count: 46868 },
        { year: 2023, count: 49500 },
        { year: 2024, count: 42964 },
    ];

    /** Positive tests by state, across all years */
    const STATE_DATA = [
        { state: 'NSW', count: 168407 },
        { state: 'VIC', count: 103900 },
        { state: 'QLD', count:  94154 },
        { state: 'SA',  count:  57026 },
        { state: 'WA',  count:  40113 },
        { state: 'TAS', count:  23786 },
        { state: 'ACT', count:   5595 },
        { state: 'NT',  count:   2448 },
    ];

    /** Positive tests by age group, all years */
    const AGE_DATA = [
        { age: '0–16',        count:    120 },
        { age: '17–25',       count:  17648 },
        { age: '26–39',       count:  39243 },
        { age: '40–64',       count:  34674 },
        { age: '65+',         count:    779 },
    ];

    /** Drug type flags — one test can flag multiple drugs */
    const DRUG_TYPE_DATA = [
        { drug: 'Amphetamine',     count: 24800 + 28855 }, // 2024 + 2023 sample — use full dataset total
        { drug: 'Cannabis',        count: 20852 + 24402 },
        { drug: 'Ecstasy',         count:  1095 +   751 },
        { drug: 'Cocaine',         count:  5862 +  3505 },
        { drug: 'Methylamph.',     count:     0 },          // flagged but zero in available slice
    ];

    // Full-dataset drug totals (all years, from CSV analysis)
    const DRUG_TYPE_FULL = [
        { drug: 'Amphetamine',  count: 53655  },
        { drug: 'Cannabis',     count: 45254  },
        { drug: 'Cocaine',      count:  9367  },
        { drug: 'Ecstasy',      count:  1846  },
        { drug: 'Methylamph.',  count:    242 },
    ];

    /** Detection stage totals */
    const DETECT_DATA = [
        { method: 'Stage 1 – Indicator',          count: 449328 },
        { method: 'Stage 2 – Confirmatory',        count:  13495 },
        { method: 'Stage 3 – Lab / Toxicology',    count:  32606 },
    ];

    /** KPI totals — 2024 only (most recent full cut) */
    const KPI_2024 = { tests: 42964, fines: 14144, arrests: 36, charges: 23445 };
    /** KPI totals — all years */
    const KPI_ALL  = { tests: 495429, fines: 0, arrests: 0, charges: 0 }; // fines/arrests not summed across full history

    // ── FILTER STATE ────────────────────────────────────────────
    let _state  = 'ALL';
    let _year   = 'ALL';

    // Registered chart redraw callbacks
    const _listeners = [];

    // ── PUBLIC API ──────────────────────────────────────────────
    function applyStateFilter(val) {
        _state = val;
        _syncDropdown('drug-state-filter', val);
        _updateFilterBar();
        _notifyAll();
        _renderKPIs();
    }

    function applyYearFilter(val) {
        _year = val;
        _syncDropdown('drug-year-filter', val);
        _updateFilterBar();
        _notifyAll();
        _renderKPIs();
    }

    function resetFilters() {
        _state = 'ALL';
        _year  = 'ALL';
        _syncDropdown('drug-state-filter', 'ALL');
        _syncDropdown('drug-year-filter',  'ALL');
        _updateFilterBar();
        _notifyAll();
        _renderKPIs();
    }

    /** Charts call this to register their redraw function */
    function onFilter(fn) {
        _listeners.push(fn);
    }

    /**
     * Returns the current filter state so charts can react.
     * { state, year, trendData, stateData, ageData, drugTypeData, detectData }
     */
    function filtered() {
        // Trend: if a state is chosen, scale the national trend by that
        // state's share.  If a year is chosen, highlight that year.
        let trendData = TREND_DATA;
        if (_state !== 'ALL') {
            const stateRow   = STATE_DATA.find(d => d.state === _state);
            const totalState = stateRow ? stateRow.count : 0;
            const totalAll   = STATE_DATA.reduce((a, b) => a + b.count, 0);
            const ratio      = totalAll ? totalState / totalAll : 0;
            trendData = TREND_DATA.map(d => ({ ...d, count: Math.round(d.count * ratio) }));
        }
        if (_year !== 'ALL') {
            trendData = trendData.map(d => ({ ...d, dimmed: d.year !== +_year }));
        }

        // State bars: highlight active state
        const stateData = STATE_DATA.map(d => ({
            ...d,
            selected: _state !== 'ALL' && d.state === _state,
        }));

        // Age: if year filter, scale proportionally (approximation)
        let ageData = AGE_DATA;
        if (_year !== 'ALL') {
            const yearRow   = TREND_DATA.find(d => d.year === +_year);
            const yearCount = yearRow ? yearRow.count : 0;
            const totalAll  = TREND_DATA.reduce((a, b) => a + b.count, 0);
            const ratio     = totalAll ? yearCount / totalAll : 0;
            ageData = AGE_DATA.map(d => ({ ...d, count: Math.round(d.count * ratio) }));
        }

        return {
            state:        _state,
            year:         _year,
            trendData,
            stateData,
            ageData,
            drugTypeData: DRUG_TYPE_FULL,
            detectData:   DETECT_DATA,
        };
    }

    // ── PRIVATE HELPERS ─────────────────────────────────────────
    function _notifyAll() {
        _listeners.forEach(fn => fn(filtered()));
    }

    function _syncDropdown(id, val) {
        const el = document.getElementById(id);
        if (el) el.value = val;
    }

    function _updateFilterBar() {
        const bar = document.getElementById('drug-filter-bar');
        const tag = document.getElementById('drug-filter-tag');
        if (!bar || !tag) return;
        const parts = [];
        if (_state !== 'ALL') parts.push(_state);
        if (_year  !== 'ALL') parts.push(_year);
        if (parts.length) {
            tag.innerHTML = parts.join(' · ') + ' <button onclick="DrugPage.resetFilters()">✕</button>';
            bar.classList.add('visible');
        } else {
            bar.classList.remove('visible');
        }
    }

    function _renderKPIs() {
        // For now use 2024 values; when filtered by year swap to year-specific
        const kpi = (_year === '2024' || _year === 'ALL') ? KPI_2024 : _kpiForYear(+_year);
        _setKPI('d-kpi-tests',   kpi.tests);
        _setKPI('d-kpi-fines',   kpi.fines);
        _setKPI('d-kpi-arrests', kpi.arrests);
        _setKPI('d-kpi-charges', kpi.charges);
    }

    function _kpiForYear(yr) {
        // Per-year KPI lookup table
        const perYear = {
            2023: { tests: 49500, fines: 12990, arrests: 42,  charges: 27698 },
            2022: { tests: 46868, fines: 0,     arrests: 0,   charges: 0     },
            2021: { tests: 49465, fines: 0,     arrests: 0,   charges: 0     },
            2020: { tests: 46905, fines: 0,     arrests: 0,   charges: 0     },
            2019: { tests: 48466, fines: 0,     arrests: 0,   charges: 0     },
            2018: { tests: 48216, fines: 0,     arrests: 0,   charges: 0     },
            2017: { tests: 39855, fines: 0,     arrests: 0,   charges: 0     },
            2016: { tests: 38703, fines: 0,     arrests: 0,   charges: 0     },
            2015: { tests: 35143, fines: 0,     arrests: 0,   charges: 0     },
        };
        return perYear[yr] || { tests: 0, fines: 0, arrests: 0, charges: 0 };
    }

    function _setKPI(id, val) {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent = val > 0 ? val.toLocaleString() : '—';
    }

    // ── INIT ────────────────────────────────────────────────────
    function init() {
        // Called by drugTrend/drugState/drugAge/drugType after they register
        // their listeners.  We defer one tick so all script tags have run.
        setTimeout(() => {
            _renderKPIs();
            _notifyAll();
        }, 0);
    }

    return {
        applyStateFilter,
        applyYearFilter,
        resetFilters,
        onFilter,
        filtered,
        init,
    };

})();

// 
document.addEventListener('DOMContentLoaded', () => {
  DrugPage.init();
});
