/* ═══════════════════════════════════════════
   finesMonthly.js
   Line chart — Monthly fines trend
   All fines · Jan–Dec 2024
═══════════════════════════════════════════ */

function renderFinesMonthlyChart() {

  const container = document.getElementById('fines-monthly-chart');
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

  // creating the chart margins
  const margin = { top: 20, right: 20, bottom: 40, left: 65 };
  const width  = container.clientWidth - margin.left - margin.right;
  const height = 180 - margin.top - margin.bottom;

  // creating the SVG 
  const svg = d3.select('#fines-monthly-chart')
    .append('svg')
    .attr('class', 'chart-svg')
    .attr('width',  width  + margin.left + margin.right)
    .attr('height', height + margin.top  + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // start with full fines dataset
  let data = finesData2024;

  // apply state filter if active
  if (filters.fines.state !== 'ALL') {
    data = data.filter(d => d.JURISDICTION === filters.fines.state);
  }

  // apply age filter if active
  if (filters.fines.age !== 'ALL') {
    data = data.filter(d => d.AGE_GROUP === filters.fines.age);
  }

  // month names for display on x axis
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];


  const parseDate = d3.timeParse('%Y-%m-%d');

  // group rows by month number and sum fines
  const monthlyMap = d3.rollup(
    data,
    rows => d3.sum(rows, d => d.FINES),
    d => {
      const date = parseDate(d.START_DATE);
      return date ? date.getMonth() : null;
    }
  );


  const monthlyData = monthNames.map((name, i) => ({
    month: i,
    name:  name,
    fines: monthlyMap.get(i) || 0,
  }));


  // x scale — evenly spaces 12 months across the chart width
  const x = d3.scalePoint()
    .domain(monthNames)
    .range([0, width])
    .padding(0.2);

  // y scale — maps fines values to vertical pixel positions
  const maxVal = d3.max(monthlyData, d => d.fines);

  const y = d3.scaleLinear()
    .domain([0, maxVal * 1.15])
    .range([height, 0]);


  svg.append('g')
    .attr('class', 'grid')
    .call(
      d3.axisLeft(y)
        .tickSize(-width)
        .tickFormat('')
        .ticks(4)
    );


  // d3.area() creates a path that goes along the line then back along the bottom
  const area = d3.area()
    .x(d => x(d.name))
    .y0(height)        // bottom of chart
    .y1(d => y(d.fines)) // top follows the data
    .curve(d3.curveMonotoneX); // smooth curve instead of sharp angles

  svg.append('path')
    .datum(monthlyData)
    .attr('class', 'area-path')
    .attr('d', area)
    .attr('fill', 'var(--orange)')
    .attr('opacity', 0.12);


  // draws the main trend line connecting all monthly points
  const line = d3.line()
    .x(d => x(d.name))
    .y(d => y(d.fines))
    .curve(d3.curveMonotoneX); // matches the area curve

  svg.append('path')
    .datum(monthlyData)
    .attr('class', 'line-path')
    .attr('d', line)
    .attr('stroke', 'var(--orange)')
    .attr('stroke-width', 2.5)
    .attr('fill', 'none');


  function showTooltip(event, d) {
    tooltip.innerHTML = `
      <div style="font-weight:700; margin-bottom:3px; color:#f5e6d0;">${d.name} 2024</div>
      <div style="font-size:15px; font-weight:800; color:#d4621a;">${formatNum(d.fines)} fines</div>
      <div style="font-size:10px; color:#c4956a; margin-top:3px;">${getMonthInfo(d.month)}</div>
    `;
    tooltip.style.opacity = '1';
    moveTooltip(event);
  }

  function moveTooltip(event) {
    const tx = event.clientX + 14;
    const ty = event.clientY - 50;
    const maxX = window.innerWidth  - tooltip.offsetWidth  - 16;
    const maxY = window.innerHeight - tooltip.offsetHeight - 16;
    tooltip.style.left = Math.min(tx, maxX) + 'px';
    tooltip.style.top  = Math.max(8, Math.min(ty, maxY)) + 'px';
  }

  function hideTooltip() {
    tooltip.style.opacity = '0';
  }


  // one dot per month — hoverable to show tooltip
  svg.selectAll('.month-dot')
    .data(monthlyData)
    .enter()
    .append('circle')
    .attr('class', 'dot-circle month-dot')
    .attr('cx', d => x(d.name))
    .attr('cy', d => y(d.fines))
    .attr('r', 4)
    .attr('fill', 'var(--orange)')
    .attr('stroke', 'var(--surface-light)')
    .attr('stroke-width', 1.5)
    .on('mousemove', function(event, d) {
      // make dot slightly bigger on hover
      d3.select(this).attr('r', 6);
      showTooltip(event, d);
    })
    .on('mouseleave', function() {
      d3.select(this).attr('r', 4);
      hideTooltip();
    });



  // x axis at the bottom — shows month names
  svg.append('g')
    .attr('class', 'axis')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x).tickSize(0))
    .select('.domain').remove();

  // y axis on the left — shows fines values
  svg.append('g')
    .attr('class', 'axis')
    .call(
      d3.axisLeft(y)
        .ticks(4)
        .tickFormat(d => formatNum(d))
    )
    .select('.domain').remove();
}


// short note for each month shown in the tooltip
function getMonthInfo(month) {
  const info = {
    0:  'January — post-Christmas holiday period, high traffic enforcement.',
    1:  'February — return to work and school, normalising traffic volumes.',
    2:  'March — autumn period, Easter enforcement campaigns begin.',
    3:  'April — Easter long weekend, targeted road safety campaigns.',
    4:  'May — steady enforcement, school holiday period ends.',
    5:  'June — mid-year, consistent enforcement across all states.',
    6:  'July — school holidays, increased regional travel.',
    7:  'August — winter period, steady enforcement activity.',
    8:  'September — spring, increasing traffic volumes.',
    9:  'October — October long weekend, targeted enforcement.',
    10: 'November — pre-Christmas period, enforcement ramps up.',
    11: 'December — Christmas holiday period, major enforcement campaigns.',
  };
  return info[month] || '';
}