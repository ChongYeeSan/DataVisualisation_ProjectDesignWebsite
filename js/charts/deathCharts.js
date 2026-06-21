
function getDeathTooltip() {
  let tooltip = document.getElementById('death-tooltip');
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.id = 'death-tooltip';
    tooltip.style.cssText = `
      position: fixed; background: #3d2010; color: #f5e6d0;
      padding: 8px 12px; border-radius: 8px; font-size: 11px;
      font-family: JetBrains Mono, monospace; pointer-events: none;
      opacity: 0; transition: opacity 0.15s;
      border: 1px solid rgba(156,56,72,0.5); white-space: nowrap;
      z-index: 999; line-height: 1.6;
    `;
    document.body.appendChild(tooltip);
  }
  return tooltip;
}

function deathTipShow(tooltip, event, title, value, sub) {
  tooltip.innerHTML = `
    <div style="font-weight:700; margin-bottom:3px; color:#f5e6d0;">${title}</div>
    <div style="font-size:15px; font-weight:800; color:#d4621a;">${value}</div>
    <div style="font-size:10px; color:#c4956a; margin-top:3px;">${sub}</div>
  `;
  tooltip.style.opacity = '1';
  deathTipMove(tooltip, event);
}

function deathTipMove(tooltip, event) {
  const x = event.clientX + 14, y = event.clientY - 50;
  const maxX = window.innerWidth  - tooltip.offsetWidth  - 16;
  const maxY = window.innerHeight - tooltip.offsetHeight - 16;
  tooltip.style.left = Math.min(x, maxX) + 'px';
  tooltip.style.top  = Math.max(8, Math.min(y, maxY)) + 'px';
}

function deathTipHide(tooltip) { tooltip.style.opacity = '0'; }


// 1. TREND LINE — deaths by year (2014–2025)

function renderDeathTrend() {
  const container = document.getElementById('death-trend-chart');
  if (!container) return;
  container.innerHTML = '';
  const tooltip = getDeathTooltip();

  const margin = { top: 20, right: 20, bottom: 35, left: 50 };
  const width  = container.clientWidth - margin.left - margin.right;
  const height = 200 - margin.top - margin.bottom;

  const svg = d3.select('#death-trend-chart').append('svg')
    .attr('class', 'chart-svg')
    .attr('width',  width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  // count deaths per year, excluding the partial 2026
  const byYear = d3.rollup(
    deathData.filter(d => d.Year <= 2025),
    v => v.length,
    d => d.Year
  );
  const data = Array.from(byYear, ([year, count]) => ({ year, count }))
    .sort((a, b) => a.year - b.year);

  const x = d3.scalePoint()
    .domain(data.map(d => d.year))
    .range([0, width]).padding(0.2);

  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.count) * 1.28])
    .range([height, 0]);

  svg.append('g').attr('class', 'grid')
    .call(d3.axisLeft(y).tickSize(-width).tickFormat('').ticks(4));

  const area = d3.area()
    .x(d => x(d.year)).y0(height).y1(d => y(d.count))
    .curve(d3.curveMonotoneX);
  svg.append('path').datum(data)
    .attr('d', area).attr('fill', 'var(--orange)').attr('opacity', 0.12);

  const line = d3.line()
    .x(d => x(d.year)).y(d => y(d.count))
    .curve(d3.curveMonotoneX);
  svg.append('path').datum(data)
    .attr('d', line).attr('fill', 'none')
    .attr('stroke', 'var(--orange)').attr('stroke-width', 2.5);

  svg.selectAll('.dot').data(data).enter().append('circle')
    .attr('class', 'dot-circle')
    .attr('cx', d => x(d.year)).attr('cy', d => y(d.count)).attr('r', 4)
    .attr('fill', 'var(--orange)')
    .attr('stroke', 'var(--surface-light)').attr('stroke-width', 1.5)
    .on('mousemove', function(event, d) {
      d3.select(this).attr('r', 6);
      deathTipShow(tooltip, event, `${d.year}`, `${d.count} deaths`, 'Road fatalities that year');
    })
    .on('mouseleave', function() {
      d3.select(this).attr('r', 4);
      deathTipHide(tooltip);
    });

    // displays the years from 2014-2025
  svg.append('g').attr('class', 'axis')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x).tickSize(0))
    .select('.domain').remove();

  svg.append('g').attr('class', 'axis')
    .call(d3.axisLeft(y).ticks(4)).select('.domain').remove();
}


// 2. STATE BARS — deaths by state (2024)

function renderDeathStateBars(selectedState) {
  const container = document.getElementById('death-state-bars');
  if (!container) return;
  container.innerHTML = '';
  const tooltip = getDeathTooltip();

  const data = deathData.filter(d => d.Year === DEATH_YEAR);
  const byState = d3.rollup(data, v => v.length, d => d.State);
  const stateData = Array.from(byState, ([code, val]) => ({ code, val }))
    .sort((a, b) => b.val - a.val);
  if (stateData.length === 0) return;
  const max = stateData[0].val;

  stateData.forEach(d => {
    const isSel = selectedState === d.code;
    const pct = (d.val / max) * 100;
    const row = document.createElement('div');
    row.className = `state-row${isSel ? ' selected' : ''}`;
    row.innerHTML = `
      <span class="state-name">${d.code}</span>
      <div class="state-bar-track"><div class="state-bar" style="width:${pct}%;background:${isSel ? 'var(--gold)' : 'var(--orange)'}"></div></div> 
      <span class="state-val">${d.val}</span>
    `;
    row.addEventListener('mousemove', e => deathTipShow(tooltip, e, d.code, `${d.val} deaths`, 'Road fatalities 2024'));
    row.addEventListener('mouseleave', () => deathTipHide(tooltip));
    row.addEventListener('click', e => {
      e.stopPropagation();
      applyDeathStateFilter(d.code);
    });
    container.appendChild(row);
  });
}


//  ROAD USER — progress bars (2024)

function renderDeathUserBars() {
  const container = document.getElementById('death-user-bars');
  if (!container) return;
  container.innerHTML = '';
  const tooltip = getDeathTooltip();

  let data = deathData.filter(d => d.Year === DEATH_YEAR);
  if (deathFilters.state !== 'ALL') data = data.filter(d => d.State === deathFilters.state);

  const byUser = d3.rollup(data, v => v.length, d => d.Road_User);
  let userData = Array.from(byUser, ([label, val]) => ({ label, val }))
    .sort((a, b) => b.val - a.val);

  const total = d3.sum(userData, d => d.val);
  userData = userData.filter(d => d.label !== 'Unknown').slice(0, 5);

  userData.forEach(d => {
    const pct = Math.round((d.val / total) * 100);
    const item = document.createElement('div');
    item.className = 'prog-item';
    item.innerHTML = `
      <div class="prog-row"><span class="prog-label">${d.label}</span><span class="prog-val">${pct}%</span></div>
      <div class="prog-track"><div class="prog-fill" style="width:${pct}%;background:var(--orange)"></div></div>
    `;
    item.addEventListener('mousemove', e => deathTipShow(tooltip, e, d.label, `${d.val} deaths`, `${pct}% of road deaths`));
    item.addEventListener('mouseleave', () => deathTipHide(tooltip));
    container.appendChild(item);
  });
}


// AGE GROUP BARS (2024)

function renderDeathAgeBars() {
  const container = document.getElementById('death-age-chart');
  if (!container) return;
  container.innerHTML = '';
  const tooltip = getDeathTooltip();

  const margin = { top: 15, right: 10, bottom: 35, left: 40 };
  const width  = container.clientWidth - margin.left - margin.right;
  const height = 150 - margin.top - margin.bottom;

  const svg = d3.select('#death-age-chart').append('svg')
    .attr('class', 'chart-svg')
    .attr('width',  width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  let data = getDeathSnapshot();

  const bins = [
    { label: '1-16',  min: 0,  max: 16 },
    { label: '17-25', min: 17, max: 25 },
    { label: '26-39', min: 26, max: 39 },
    { label: '40-64', min: 40, max: 64 },
    { label: '65+',   min: 65, max: 200 },
  ];
  const ageData = bins.map(b => ({
    label: b.label,
    val: data.filter(d => d.Age >= b.min && d.Age <= b.max).length,
  }));

  const x = d3.scaleBand().domain(ageData.map(d => d.label)).range([0, width]).padding(0.25);
  const y = d3.scaleLinear().domain([0, d3.max(ageData, d => d.val) * 1.15 || 10]).range([height, 0]);

  svg.append('g').attr('class', 'grid')
    .call(d3.axisLeft(y).tickSize(-width).tickFormat('').ticks(3));

    // age-group bar chart colour
  svg.selectAll('.age-bar').data(ageData).enter().append('rect')
    .attr('class', 'bar-rect')
    .attr('x', d => x(d.label)).attr('y', d => y(d.val))
    .attr('width', x.bandwidth()).attr('height', d => height - y(d.val))
    .attr('rx', 3).attr('fill', 'var(--maroon)')
    .on('mousemove', (event, d) => deathTipShow(tooltip, event, `Age ${d.label}`, `${d.val} deaths`, 'Road fatalities 2024'))
    .on('mouseleave', () => deathTipHide(tooltip));

  svg.append('g').attr('class', 'axis')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x).tickSize(0)).select('.domain').remove();
  svg.append('g').attr('class', 'axis')
    .call(d3.axisLeft(y).ticks(3)).select('.domain').remove();
}

// ═══════════════════════════════════════════
// 5. SPEED ZONE BARS (2024)
// ═══════════════════════════════════════════
function renderDeathSpeedBars() {
  const container = document.getElementById('death-speed-chart');
  if (!container) return;
  container.innerHTML = '';
  const tooltip = getDeathTooltip();

  const margin = { top: 15, right: 10, bottom: 35, left: 40 };
  const width  = container.clientWidth - margin.left - margin.right;
  const height = 150 - margin.top - margin.bottom;

  const svg = d3.select('#death-speed-chart').append('svg')
    .attr('class', 'chart-svg')
    .attr('width',  width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  let data = getDeathSnapshot();

  const zones = [
    { label: '≤50',    test: s => s > 0 && s <= 50 },
    { label: '60',     test: s => s === 60 },
    { label: '70-80',  test: s => s === 70 || s === 80 },
    { label: '90-100', test: s => s === 90 || s === 100 },
    { label: '110+',   test: s => s >= 110 },
  ];
  const speedData = zones.map(z => ({
    label: z.label,
    val: data.filter(d => z.test(d.Speed_Limit)).length,
  }));

  const x = d3.scaleBand().domain(speedData.map(d => d.label)).range([0, width]).padding(0.25);
  const y = d3.scaleLinear().domain([0, d3.max(speedData, d => d.val) * 1.15 || 10]).range([height, 0]);

  svg.append('g').attr('class', 'grid')
    .call(d3.axisLeft(y).tickSize(-width).tickFormat('').ticks(3));

    // orange given to speed bar chart
  svg.selectAll('.speed-bar').data(speedData).enter().append('rect')
    .attr('class', 'bar-rect')
    .attr('x', d => x(d.label)).attr('y', d => y(d.val))
    .attr('width', x.bandwidth()).attr('height', d => height - y(d.val))
    .attr('rx', 3).attr('fill', 'var(--orange)')
    .on('mousemove', (event, d) => deathTipShow(tooltip, event, `${d.label} km/h zone`, `${d.val} deaths`, 'Road fatalities 2024')) // hovering on the chart 
    .on('mouseleave', () => deathTipHide(tooltip));

  svg.append('g').attr('class', 'axis')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x).tickSize(0)).select('.domain').remove();
  svg.append('g').attr('class', 'axis')
    .call(d3.axisLeft(y).ticks(3)).select('.domain').remove();
}