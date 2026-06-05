/**
 * drugState.js
 * ─────────────────────────────────────────────────────────────
 * Two inline-bar lists on the right side card:
 *   1. Positive tests by State (clickable → state filter)
 *   2. Detection Stage breakdown (informational progress bars)
 * No D3 needed — pure DOM for these compact bar lists.
 * ─────────────────────────────────────────────────────────────
 */

(function () {
    const STATE_CONTAINER_ID  = 'drug-state-bars';
    const DETECT_CONTAINER_ID = 'drug-detect-bars';

    // Short human-readable labels for detection stages
    const DETECT_LABELS = {
        'Stage 1 – Indicator':       { short: 'Indicator', color: 'var(--orange)' },
        'Stage 2 – Confirmatory':    { short: 'Secondary Confirmatory', color: 'var(--amber)'  },
        'Stage 3 – Lab / Toxicology':{ short: 'Lab / Toxicology', color: 'var(--blue)'   },
    };

    // ── RENDER STATE BARS ────────────────────────────────────────
    function renderStateBars(stateData, activeState) {
        const container = document.getElementById(STATE_CONTAINER_ID);
        if (!container) return;

        const max = Math.max(...stateData.map(d => d.count));

        container.innerHTML = '';
        const list = document.createElement('div');
        list.className = 'state-list';

        stateData.forEach(d => {
            const pct     = max ? (d.count / max) * 100 : 0;
            const isActive = activeState !== 'ALL' && d.state === activeState;

            const row = document.createElement('div');
            row.className = `state-row${isActive ? ' selected' : ''}`;
            row.title     = `${d.state}: ${d.count.toLocaleString()} positive tests — click to filter`;
            row.addEventListener('click', () => {
                const cur = DrugPage.filtered().state;
                DrugPage.applyStateFilter(cur === d.state ? 'ALL' : d.state);
            });

            row.innerHTML = `
                <span class="state-name">${d.state}</span>
                <div class="state-bar-track">
                    <div class="state-bar" style="width:${pct}%"></div>
                </div>
                <span class="state-val">${_fmt(d.count)}</span>`;

            list.appendChild(row);
        });

        container.appendChild(list);
    }

    // ── RENDER DETECTION BARS ────────────────────────────────────
    function renderDetectBars(detectData) {
        const container = document.getElementById(DETECT_CONTAINER_ID);
        if (!container) return;

        const total = detectData.reduce((s, d) => s + d.count, 0);
        container.innerHTML = '';
        const list = document.createElement('div');
        list.className = 'prog-list';

        detectData.forEach(d => {
            const pct    = total ? (d.count / total) * 100 : 0;
            const meta   = DETECT_LABELS[d.method] || { short: d.method, color: 'var(--orange)' };

            const item = document.createElement('div');
            item.className = 'prog-item';

            item.innerHTML = `
                <div class="prog-row">
                    <span class="prog-label">${meta.short}</span>
                    <span class="prog-val">${pct.toFixed(1)}%</span>
                </div>
                <div class="prog-track">
                    <div class="prog-fill" style="width:${pct}%;background:${meta.color}"></div>
                </div>`;

            list.appendChild(item);
        });

        container.appendChild(list);
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
