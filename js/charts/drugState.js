/**
 * drugState.js
 * ─────────────────────────────────────────────────────────────
 * Two inline-bar lists on the right side card:
 *   1. Positive tests by State (clickable → state filter)
 *   2. Detection Stage breakdown (informational progress bars)
 * Rendered with D3 data-joins (enter/update/exit) instead of
 * manual innerHTML rebuilding. Markup/classes are unchanged so
 * the existing CSS (state-list, state-row, prog-item, etc.)
 * still applies as-is.
 * ─────────────────────────────────────────────────────────────
 */

(function () {
    const STATE_CONTAINER_ID  = 'drug-state-bars';
    const DETECT_CONTAINER_ID = 'drug-detect-bars';

    // Short human-readable labels for detection stages
    const DETECT_LABELS = {
        'Stage 1 – Indicator':        { short: 'Indicator', color: 'var(--orange)' },
        'Stage 2 – Confirmatory':     { short: 'Secondary Confirmatory', color: 'var(--amber)'  },
        'Stage 3 – Lab / Toxicology': { short: 'Lab / Toxicology', color: 'var(--blue)'   },
    };

    // ── RENDER STATE BARS ────────────────────────────────────────
    function renderStateBars(stateData, activeState) {
        const container = d3.select(`#${STATE_CONTAINER_ID}`);
        if (container.empty()) return;

        const max = d3.max(stateData, d => d.count) || 0;

        // Ensure the wrapping list exists exactly once
        let list = container.select('.state-list');
        if (list.empty()) {
            list = container.append('div').attr('class', 'state-list');
        }

        // ── ROWS (data-join keyed by state) ──
        const rows = list.selectAll('.state-row')
            .data(stateData, d => d.state);

        const rowsEnter = rows.enter()
            .append('div')
            .attr('class', 'state-row')
            .on('click', (event, d) => {
                const cur = DrugPage.filtered().state;
                DrugPage.applyStateFilter(cur === d.state ? 'ALL' : d.state);
            });

        rowsEnter.append('span').attr('class', 'state-name');
        const trackEnter = rowsEnter.append('div').attr('class', 'state-bar-track');
        trackEnter.append('div').attr('class', 'state-bar').style('width', '0%');
        rowsEnter.append('span').attr('class', 'state-val');

        const rowsMerged = rowsEnter.merge(rows);

        rowsMerged
            .attr('class', d => {
                const isActive = activeState !== 'ALL' && d.state === activeState;
                return `state-row${isActive ? ' selected' : ''}`;
            })
            .attr('title', d => `${d.state}: ${d.count.toLocaleString()} positive tests — click to filter`);

        rowsMerged.select('.state-name')
            .text(d => d.state);

        rowsMerged.select('.state-bar')
            .transition().duration(400)
            .style('width', d => `${max ? (d.count / max) * 100 : 0}%`);

        rowsMerged.select('.state-val')
            .text(d => _fmt(d.count));

        rows.exit().remove();
    }

    // ── RENDER DETECTION BARS ────────────────────────────────────
    function renderDetectBars(detectData) {
        const container = d3.select(`#${DETECT_CONTAINER_ID}`);
        if (container.empty()) return;

        const total = d3.sum(detectData, d => d.count);

        let list = container.select('.prog-list');
        if (list.empty()) {
            list = container.append('div').attr('class', 'prog-list');
        }

        // ── ITEMS (data-join keyed by method) ──
        const items = list.selectAll('.prog-item')
            .data(detectData, d => d.method);

        const itemsEnter = items.enter()
            .append('div')
            .attr('class', 'prog-item');

        const rowEnter = itemsEnter.append('div').attr('class', 'prog-row');
        rowEnter.append('span').attr('class', 'prog-label');
        rowEnter.append('span').attr('class', 'prog-val');

        const trackEnter = itemsEnter.append('div').attr('class', 'prog-track');
        trackEnter.append('div').attr('class', 'prog-fill').style('width', '0%');

        const itemsMerged = itemsEnter.merge(items);

        itemsMerged.each(function (d) {
            const meta = DETECT_LABELS[d.method] || { short: d.method, color: 'var(--orange)' };
            const pct  = total ? (d.count / total) * 100 : 0;
            const item = d3.select(this);

            item.select('.prog-label').text(meta.short);
            item.select('.prog-val').text(`${pct.toFixed(1)}%`);
            item.select('.prog-fill')
                .style('background', meta.color)
                .transition().duration(400)
                .style('width', `${pct}%`);
        });

        items.exit().remove();
    }

    // ── FORMAT HELPER ────────────────────────────────────────────
    function _fmt(n) {
        if (n >= 1000) return (n / 1000).toFixed(0) + 'k';
        return String(n);
    }

    // ── REGISTER WITH DrugPage ───────────────────────────────────
    DrugPage.onFilter(data => {
        renderStateBars(data.stateData, data.state);
        renderDetectBars(data.detectData);
    });

})();