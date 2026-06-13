/* ═══════════════════════════════════════════
   finesArrests.js
   Bar chart — Arrests by offence type
   Shows which offences lead to arrests · 2024
═══════════════════════════════════════════ */

function renderFinesArrestsChart() {


  const container = document.getElementById('arrests-chart');
  if (!container) return;


  container.innerHTML = '';


  // reuse the shared tooltip if it already exists
  let tooltip = document.getElementById('fines-tooltip');
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.id = 'fines-tooltip';
    tooltip.style.cssText = `
      position: fixed;
      background: #3d2010;
      color: #f5e6d0;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 11px;
      font-family: JetBrains Mono, monospace;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.15s;
      border: 1px solid rgba(212,98,26,0.4);
      white-space: nowrap;
      z-index: 999;
      line-height: 1.6;
    `;
    document.body.appendChild(tooltip);
  }


  const margin = { top: 20, right: 20, bottom: 45, left: 70 };
  const width  = container.clientWidth - margin.left - margin.right;
  const height = 220 - margin.top - margin.bottom;

  // ── SVG SETUP ──────────────────────────────────────
  const svg = d3.select('#arrests-chart')
    .append('svg')
    .attr('class', 'chart-svg')
    .attr('width',  width  + margin.left + margin.right)
    .attr('height', height + margin.top  + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);


  // start with full fines dataset
  let data = finesData2024;


  if (filters.fines.state !== 'ALL') {
    data = data.filter(d => d.JURISDICTION === filters.fines.state);
  }

  // clean display labels for each offence metric
  const metricLabels = {
    'unlicensed_driving':    'Unlicensed',
    'speed_fines':           'Speeding',
    'non_wearing_seatbelts': 'Seatbelt',
    'mobile_phone_use':      'Mobile Phone',
  };


  const arrestData = Object.keys(metricLabels).map(metric => {
    const rows = data.filter(d => d.METRIC === metric);
    return {
      metric:  metric,
      label:   metricLabels[metric],
      arrests: d3.sum(rows, d => d.ARRESTS),
      fines:   d3.sum(rows, d => d.FINES),
      charges: d3.sum(rows, d => d.CHARGES),
    };
  });


  arrestData.sort((a, b) => b.arrests - a.arrests);


  // x scale — offence labels across the width
  const x = d3.scaleBand()
    .domain(arrestData.map(d => d.label))
    .range([0, width])
    .padding(0.3);


  const maxVal = d3.max(arrestData, d => d.arrests);


  const y = d3.scaleLinear()
    .domain([0, maxVal * 1.3])
    .range([height, 0]);

  // ── GRID LINES ─────────────────────────────────────
  svg.append('g')
    .attr('class', 'grid')
    .call(
      d3.axisLeft(y)
        .tickSize(-width)
        .tickFormat('')
        .ticks(4)
    );

  // ── TOOLTIP HELPERS ────────────────────────────────
  function showTooltip(event, d) {
    tooltip.innerHTML = `
      <div style="font-weight:700; margin-bottom:3px; color:#f5e6d0;">${d.label}</div>
      <div style="font-size:15px; font-weight:800; color:#d4621a;">${formatNum(d.arrests)} arrests</div>
      <div style="font-size:10px; color:#c4956a; margin-top:3px;">
        ${formatNum(d.fines)} fines · ${formatNum(d.charges)} charges<br>${getArrestInfo(d.metric)}
      </div>
    `;
    tooltip.style.opacity = '1';
    moveTooltip(event);
  }

  function moveTooltip(event) {
    const tx = event.clientX + 14;
    const ty = event.clientY - 60;
    const maxX = window.innerWidth  - tooltip.offsetWidth  - 16;
    const maxY = window.innerHeight - tooltip.offsetHeight - 16;
    tooltip.style.left = Math.min(tx, maxX) + 'px';
    tooltip.style.top  = Math.max(8, Math.min(ty, maxY)) + 'px';
  }

  function hideTooltip() {
    tooltip.style.opacity = '0';
  }

  // ── BARS ───────────────────────────────────────────
  svg.selectAll('.arrest-bar')
    .data(arrestData)
    .enter()
    .append('rect')
    .attr('class', 'bar-rect arrest-bar')
    .attr('x',      d => x(d.label))
    .attr('y',      d => y(d.arrests))
    .attr('width',  x.bandwidth())
    .attr('height', d => height - y(d.arrests))
    .attr('rx', 3)
    .attr('fill', 'var(--orange)')
    .on('mousemove', function(event, d) {
      showTooltip(event, d);
    })
    .on('mouseleave', hideTooltip);

  // ── VALUE LABELS on top of bars ────────────────────
  svg.selectAll('.arrest-label')
    .data(arrestData)
    .enter()
    .append('text')
    .attr('class', 'arrest-label')
    .attr('x', d => x(d.label) + x.bandwidth() / 2)
    .attr('y', d => y(d.arrests) - 6)
    .attr('text-anchor', 'middle')
    .attr('fill', 'var(--text-dim)')
    .attr('font-size', '10px')
    .attr('font-weight', '700')
    .attr('font-family', 'JetBrains Mono, monospace')
    .text(d => formatNum(d.arrests));

  // ── AXES ───────────────────────────────────────────
  svg.append('g')
    .attr('class', 'axis')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x).tickSize(0))
    .select('.domain').remove();

  svg.append('g')
    .attr('class', 'axis')
    .call(
      d3.axisLeft(y)
        .ticks(4)
        .tickFormat(d => formatNum(d))
    )
    .select('.domain').remove();

  // ── LEGEND ─────────────────────────────────────────
  const legend = document.getElementById('arrests-legend');
  if (legend) {
    legend.innerHTML = `
      <div class="leg"><div class="leg-sq" style="background:var(--orange)"></div>Arrests</div>
    `;
  }
}


// short note for each offence shown in the tooltip
function getArrestInfo(metric) {
  const info = {
    'unlicensed_driving':       '',
    'speed_fines':           '',
    'non_wearing_seatbelts': '',
    'mobile_phone_use':      '',
  };
  return info[metric] || '';
}