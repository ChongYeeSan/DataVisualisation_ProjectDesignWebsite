/**
 * drugType.js
 * ─────────────────────────────────────────────────────────────
 * Horizontal bar chart: substances detected in positive tests.
 * Uses a gradient fill per bar for a distinctive look.
 * Clicking a bar shows info panel detail.
 * No filter side-effects — purely informational.
 * ─────────────────────────────────────────────────────────────
 */

(function () {
    const CONTAINER_ID = 'drug-type-chart';
    const HEIGHT       = 200;
    const MARGIN       = { top: 6, right: 54, bottom: 6, left: 90 };

    // One accent colour per drug
    const DRUG_COLORS = {
        'Amphetamine': 'var(--orange)',
        'Cannabis':    'var(--green)',
        'Cocaine':     'var(--blue)',
        'Ecstasy':     'var(--amber)',
        'Methylamph.': 'var(--red)',
    };

    let svg, xScale, yScale, innerW, innerH;
    let initialized = false;

    // ── INIT ────────────────────────────────────────────────────
    function init(data) {
        const container = document.getElementById(CONTAINER_ID);
        if (!container) return;

        container.innerHTML = '';

        const totalW = container.clientWidth || 300;
        innerW = totalW  - MARGIN.left - MARGIN.right;
        innerH = HEIGHT  - MARGIN.top  - MARGIN.bottom;

        const wrapper = d3.select(`#${CONTAINER_ID}`)
            .append('svg')
            .attr('class', 'chart-svg')
            .attr('viewBox', `0 0 ${totalW} ${HEIGHT}`)
            .attr('preserveAspectRatio', 'xMidYMid meet');

        // Gradient defs
        const defs = wrapper.append('defs');
        Object.entries(DRUG_COLORS).forEach(([drug, color]) => {
            const grad = defs.append('linearGradient')
                .attr('id',  `drug-grad-${_slug(drug)}`)
                .attr('x1',  '0%').attr('y1', '0%')
                .attr('x2', '100%').attr('y2', '0%');
            grad.append('stop').attr('offset', '0%')
                .style('stop-color', color).style('stop-opacity', 0.9);
            grad.append('stop').attr('offset', '100%')
                .style('stop-color', color).style('stop-opacity', 0.4);
        });

        svg = wrapper.append('g')
            .attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

        const { drugTypeData } = data;

        yScale = d3.scaleBand()
            .domain(drugTypeData.map(d => d.drug))
            .range([0, innerH])
            .padding(0.3);

        xScale = d3.scaleLinear()
            .domain([0, (d3.max(drugTypeData, d => d.count) || 0) * 1.1 || 1])
            .range([0, innerW]);

        // Y axis (drug names)
        svg.append('g')
            .attr('class', 'axis')
            .call(d3.axisLeft(yScale).tickSize(0))
            .select('.domain').remove();

        // Vertical grid
        svg.append('g')
            .attr('class', 'grid')
            .attr('transform', `translate(0,${innerH})`)
            .call(d3.axisBottom(xScale).ticks(4).tickSize(-innerH).tickFormat(''))
            .select('.domain').remove();

        // Bar group
        svg.append('g').attr('class', 'drug-type-bars');

        initialized = true;
        render(data);
    }

    // ── RENDER ───────────────────────────────────────────────────
    function render(data) {
        if (!initialized) { init(data); return; }

        const { drugTypeData } = data;

        xScale.domain([0, (d3.max(drugTypeData, d => d.count) || 0) * 1.1 || 1]);

        const bars = svg.select('.drug-type-bars')
            .selectAll('.dtype-bar')
            .data(drugTypeData, d => d.drug);

        // ENTER
        const enter = bars.enter()
            .append('g')
            .attr('class', 'dtype-bar')
            .style('cursor', 'pointer')
            .on('click', (event, d) => {
                if (typeof showInfoPanel === 'function') {
                    showInfoPanel(
                        'Drug Type',
                        d.drug,
                        d.count.toLocaleString() + ' tests flagged',
                    );
                }
            });

        enter.append('rect')
            .attr('class', 'bar-rect')
            .attr('rx', 3)
            .attr('y',      d => yScale(d.drug))
            .attr('height', yScale.bandwidth())
            .attr('x',  0)
            .attr('width', 0);

        enter.append('text')
            .attr('class', 'dtype-val')
            .attr('y', d => yScale(d.drug) + yScale.bandwidth() / 2 + 4)
            .style('font-size', '10px')
            .style('font-family', "'JetBrains Mono', monospace")
            .style('fill', 'var(--text-dim)');

        // UPDATE
        const all = enter.merge(bars);

        all.select('rect')
            .style('fill', d => `url(#drug-grad-${_slug(d.drug)})`)
            .transition().duration(500).ease(d3.easeCubicOut)
            .attr('y',     d => yScale(d.drug))
            .attr('height',yScale.bandwidth())
            .attr('width', d => xScale(d.count));

        all.select('.dtype-val')
            .transition().duration(500)
            .attr('x', d => xScale(d.count) + 6)
            .attr('y', d => yScale(d.drug) + yScale.bandwidth() / 2 + 4)
            .text(d => d.count >= 1000 ? (d.count / 1000).toFixed(1) + 'k' : d.count);

        bars.exit().remove();
    }

    // ── HELPERS ──────────────────────────────────────────────────
    function _slug(str) {
        return str.toLowerCase().replace(/[^a-z0-9]/g, '_');
    }

    // ── REGISTER WITH DrugPage ───────────────────────────────────
    DrugPage.onFilter(data => {
        if (!initialized) init(data);
        else render(data);
    });

})();