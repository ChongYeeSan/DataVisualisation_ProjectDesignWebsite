/**
 * drugTrend.js
 * ─────────────────────────────────────────────────────────────
 * Area + line chart: positive drug tests 2008–2024.
 * Clicking a year bar calls DrugPage.applyYearFilter().
 * No dependencies other than D3 and DrugPage (drugMain.js).
 * ─────────────────────────────────────────────────────────────
 */



(function () {
    const CONTAINER_ID = 'drug-trend-chart';
    const LEGEND_ID    = 'drug-trend-legend';
    const HEIGHT       = 200;
    const MARGIN       = { top: 10, right: 16, bottom: 30, left: 52 };

    let svg, xScale, yScale, line, area, width;
    let initialized = false;

    // ── INIT ────────────────────────────────────────────────────
    function init(data) {
        const container = document.getElementById(CONTAINER_ID);
        if (!container) return;

        // Clear any previous render
        container.innerHTML = '';

        // Hide the info panel once the cursor leaves the whole chart area
        // (rather than per-element, so moving between the dots and the
        // invisible hit-bars doesn't cause flicker).
        container.addEventListener('mouseleave', hideInfo);

        const totalW = container.clientWidth || 560;
        width = totalW - MARGIN.left - MARGIN.right;
        const innerH = HEIGHT - MARGIN.top - MARGIN.bottom;

        svg = d3.select(`#${CONTAINER_ID}`)
            .append('svg')
            .attr('class', 'chart-svg')
            .attr('viewBox', `0 0 ${totalW} ${HEIGHT}`)
            .attr('preserveAspectRatio', 'xMidYMid meet')
            .append('g')
            .attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

        const { trendData } = data;

        // Scales
        xScale = d3.scaleLinear()
            .domain(d3.extent(trendData, d => d.year))
            .range([0, width]);

        yScale = d3.scaleLinear()
            .domain([0, d3.max(trendData, d => d.count) * 1.12])
            .range([innerH, 0]);

        // Grid lines
        svg.append('g')
            .attr('class', 'grid')
            .call(d3.axisLeft(yScale).ticks(4).tickSize(-width).tickFormat(''))
            .select('.domain').remove();

        // Area generator
        area = d3.area()
            .x(d => xScale(d.year))
            .y0(innerH)
            .y1(d => yScale(d.count))
            .curve(d3.curveMonotoneX);

        // Line generator
        line = d3.line()
            .x(d => xScale(d.year))
            .y(d => yScale(d.count))
            .curve(d3.curveMonotoneX);

        // Axes
        svg.append('g')
            .attr('class', 'axis')
            .attr('transform', `translate(0,${innerH})`)
            .call(
                d3.axisBottom(xScale)
                    .ticks(trendData.length)
                    .tickFormat(d3.format('d'))
            )
            .select('.domain').remove();

        svg.append('g')
            .attr('class', 'axis')
            .call(
                d3.axisLeft(yScale)
                    .ticks(4)
                    .tickFormat(d => d >= 1000 ? (d / 1000) + 'k' : d)
            )
            .select('.domain').remove();

        // Groups for area, line, dots
        svg.append('path').attr('class', 'drug-area-path area-path');
        svg.append('path').attr('class', 'drug-line-path line-path');
        svg.append('g').attr('class', 'drug-dots');

        // Invisible wider hit bars for easy clicking
        svg.append('g').attr('class', 'drug-hit-bars');

        // Legend
        const legend = document.getElementById(LEGEND_ID);
        if (legend) {
            legend.innerHTML = `
                <div class="leg">
                    <div class="leg-sq" style="background:var(--orange);opacity:0.25"></div>
                    Area
                </div>
                <div class="leg">
                    <div class="leg-c" style="background:var(--orange)"></div>
                    Trend
                </div>`;
        }

        initialized = true;
        render(data);
    }

    // ── RENDER ───────────────────────────────────────────────────
    function render(data) {
        if (!initialized) { init(data); return; }

        const { trendData, year: activeYear } = data;
        const innerH = HEIGHT - MARGIN.top - MARGIN.bottom;

        // Area
        svg.select('.drug-area-path')
            .datum(trendData)
            .attr('d', area)
            .style('fill', 'var(--orange)')
            .style('opacity', 0.18);

        // Line
        svg.select('.drug-line-path')
            .datum(trendData)
            .attr('d', line)
            .style('stroke', 'var(--orange)')
            .style('stroke-width', 2.5);

        // Dots
        const dots = svg.select('.drug-dots')
            .selectAll('.drug-dot')
            .data(trendData, d => d.year);

        dots.enter()
            .append('circle')
            .attr('class', 'drug-dot dot-circle')
            .merge(dots)
            .attr('cx', d => xScale(d.year))
            .attr('cy', d => yScale(d.count))
            .attr('r',  d => (activeYear !== 'ALL' && d.year === +activeYear) ? 6 : 4)
            .style('fill', d => d.dimmed ? 'var(--border-light)' : 'var(--orange)')
            .style('stroke', 'var(--surface-light)')
            .style('stroke-width', 2)
            .style('opacity', d => d.dimmed ? 0.3 : 1)
            .on('click', (event, d) => {
                const cur = DrugPage.filtered().year;
                DrugPage.applyYearFilter(cur === String(d.year) ? 'ALL' : String(d.year));
            })
            .on('mouseover', function (event, d) {
                showInfo(d, event);
            })
            .on('mousemove', function (event, d) {
                positionInfoPanel(event);
            });

        dots.exit().remove();

        // Invisible hit bars (column-wide click zones)
        const barW = width / trendData.length * 0.8;
        const hitBars = svg.select('.drug-hit-bars')
            .selectAll('.drug-hit')
            .data(trendData, d => d.year);

        hitBars.enter()
            .append('rect')
            .attr('class', 'drug-hit')
            .merge(hitBars)
            .attr('x',      d => xScale(d.year) - barW / 2)
            .attr('y',      0)
            .attr('width',  barW)
            .attr('height', innerH)
            .style('fill',    'transparent')
            .style('cursor',  'pointer')
            .on('click', (event, d) => {
                const cur = DrugPage.filtered().year;
                DrugPage.applyYearFilter(cur === String(d.year) ? 'ALL' : String(d.year));
            })
            .on('mouseover', (event, d) => showInfo(d, event))
            .on('mousemove', (event, d) => positionInfoPanel(event));

        hitBars.exit().remove();
    }

    // ── INFO PANEL HELPER ────────────────────────────────────────

    /** Hides the info panel (called on mouseleave from the chart area). */
    function hideInfo() {
        const panel = document.getElementById('infoPanel');
        if (panel) panel.classList.remove('visible');
    }

    function showInfo(d, event) {
        if (event) positionInfoPanel(event);
        if (typeof showInfoPanel === 'function') {
            showInfoPanel(
                'Trend',
                String(d.year),
                d.count.toLocaleString() + ' positive tests',
                `Click to ${DrugPage.filtered().year === String(d.year) ? 'clear' : 'filter to'} ${d.year}`,
                true
            );
        }
    }

    /**
     * Moves #infoPanel so it sits just below-and-right of the cursor,
     * flipping to the opposite side(s) if it would overflow the viewport.
     * Overrides the CSS left/top fixed-position defaults; right/bottom
     * stay cleared (set in styles.css) so the panel doesn't stretch.
     */
    function positionInfoPanel(event) {
        const panel = document.getElementById('infoPanel');
        if (!panel || !event) return;

        const OFFSET = 16;          // gap between cursor and panel corner
        const EDGE   = 8;           // min gap from viewport edge
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        const rect = panel.getBoundingClientRect();
        const pw = rect.width  || 265;
        const ph = rect.height || 160;

        let left = event.clientX + OFFSET;
        let top  = event.clientY + OFFSET;

        // Flip to the left of the cursor if it would overflow the right edge
        if (left + pw > vw - EDGE) {
            left = event.clientX - pw - OFFSET;
        }
        // Flip above the cursor if it would overflow the bottom edge
        if (top + ph > vh - EDGE) {
            top = event.clientY - ph - OFFSET;
        }

        // Final clamp so it never goes off-screen on the top/left either
        left = Math.max(EDGE, Math.min(left, vw - pw - EDGE));
        top  = Math.max(EDGE, Math.min(top,  vh - ph - EDGE));

        panel.style.left = `${left}px`;
        panel.style.top  = `${top}px`;
    }

    // ── REGISTER WITH DrugPage ───────────────────────────────────
    DrugPage.onFilter(data => {
        if (!initialized) {
            init(data);
        } else {
            render(data);
        }
    });

    // Trigger first render after page load
    DrugPage.init();

})();