/**
 * drugAge.js
 * ─────────────────────────────────────────────────────────────
 * Vertical bar chart: positive drug tests by age group.
 * Bars are styled in amber/orange.
 * Clicking a bar is informational (no age filter implemented
 * server-side — extend DrugPage if you add age data slices).
 * ─────────────────────────────────────────────────────────────
 */

(function () {
    const CONTAINER_ID = 'drug-age-chart';
    const HEIGHT       = 200;
    const MARGIN       = { top: 14, right: 10, bottom: 30, left: 48 };

    let svg, xScale, yScale, innerH, innerW;
    let initialized = false;

    // ── INIT ────────────────────────────────────────────────────
    function init(data) {
        const container = document.getElementById(CONTAINER_ID);
        if (!container) return;

        container.innerHTML = '';

        const totalW = container.clientWidth || 300;
        innerW = totalW - MARGIN.left - MARGIN.right;
        innerH = HEIGHT - MARGIN.top  - MARGIN.bottom;

        const wrapper = d3.select(`#${CONTAINER_ID}`)
            .append('svg')
            .attr('class', 'chart-svg')
            .attr('viewBox', `0 0 ${totalW} ${HEIGHT}`)
            .attr('preserveAspectRatio', 'xMidYMid meet');

        svg = wrapper.append('g')
            .attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

        const { ageData } = data;

        xScale = d3.scaleBand()
            .domain(ageData.map(d => d.age))
            .range([0, innerW])
            .padding(0.28);

        yScale = d3.scaleLinear()
            .domain([0, d3.max(ageData, d => d.count) * 1.15])
            .range([innerH, 0]);

        // Horizontal grid
        svg.append('g')
            .attr('class', 'grid')
            .call(d3.axisLeft(yScale).ticks(4).tickSize(-innerW).tickFormat(''))
            .select('.domain').remove();

        // X axis
        svg.append('g')
            .attr('class', 'axis x-axis')
            .attr('transform', `translate(0,${innerH})`)
            .call(d3.axisBottom(xScale).tickSize(0))
            .select('.domain').remove();

        // Y axis
        svg.append('g')
            .attr('class', 'axis y-axis')
            .call(
                d3.axisLeft(yScale)
                    .ticks(4)
                    .tickFormat(d => d >= 1000 ? (d / 1000).toFixed(0) + 'k' : d)
            )
            .select('.domain').remove();

        // Bar group
        svg.append('g').attr('class', 'age-bars');

        initialized = true;
        render(data);
    }

    // ── RENDER ───────────────────────────────────────────────────
    function render(data) {
        if (!initialized) { init(data); return; }

        const { ageData } = data;

        // Update y scale domain if data changed (e.g. year filter)
        yScale.domain([0, d3.max(ageData, d => d.count) * 1.15]);
        svg.select('.y-axis')
            .transition().duration(400)
            .call(
                d3.axisLeft(yScale)
                    .ticks(4)
                    .tickFormat(d => d >= 1000 ? (d / 1000).toFixed(0) + 'k' : d)
            )
            .select('.domain').remove();

        // Bars
        const bars = svg.select('.age-bars')
            .selectAll('.age-bar')
            .data(ageData, d => d.age);

        // ENTER
        bars.enter()
            .append('rect')
            .attr('class', 'age-bar bar-rect')
            .attr('x',      d => xScale(d.age))
            .attr('width',  xScale.bandwidth())
            .attr('y',      innerH)
            .attr('height', 0)
            .attr('rx', 4)
            .style('fill', 'var(--amber)')
            .on('click', (event, d) => {
                if (typeof showInfoPanel === 'function') {
                    showInfoPanel(
                        'Age Group',
                        d.age,
                        d.count.toLocaleString() + ' positive tests',
                        
                    );
                }
            })
            // UPDATE
            .merge(bars)
            .transition().duration(500).ease(d3.easeCubicOut)
            .attr('x',      d => xScale(d.age))
            .attr('width',  xScale.bandwidth())
            .attr('y',      d => yScale(d.count))
            .attr('height', d => innerH - yScale(d.count));

        bars.exit()
            .transition().duration(300)
            .attr('y', innerH).attr('height', 0)
            .remove();

        // Value labels on top of each bar
        const labels = svg.select('.age-bars')
            .selectAll('.age-label')
            .data(ageData, d => d.age);

        labels.enter()
            .append('text')
            .attr('class', 'age-label')
            .attr('text-anchor', 'middle')
            .style('font-size', '9px')
            .style('font-family', "'JetBrains Mono', monospace")
            .style('fill', 'var(--text-dim)')
            .merge(labels)
            .transition().duration(500)
            .attr('x', d => xScale(d.age) + xScale.bandwidth() / 2)
            .attr('y', d => yScale(d.count) - 4)
            .text(d => d.count >= 1000 ? (d.count / 1000).toFixed(1) + 'k' : d.count);

        labels.exit().remove();
    }

    // ── REGISTER WITH DrugPage ───────────────────────────────────
    DrugPage.onFilter(data => {
        if (!initialized) init(data);
        else render(data);
    });

})();
