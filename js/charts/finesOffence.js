/* ═══════════════════════════════════════════
   finesOffence.js
   Grouped bar chart — Fines by offence type
   Police issued vs camera detected · 2024
═══════════════════════════════════════════ */

function renderFinesOffenceChart(dimOffence) {

  // function declaration and checking for container if it exist
  const container = document.getElementById('fines-offence-chart');
  if (!container) return;
  container.innerHTML = '';

  // Creates a shared tooltip div attached to body
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

  // creates a chart margin for the axes and labels
  const margin = { top: 20, right: 20, bottom: 45, left: 65 };
  const width  = container.clientWidth  - margin.left - margin.right;
  const height = 200 - margin.top - margin.bottom;

  // SVG Setup
  const svg = d3.select('#fines-offence-chart')
    .append('svg')
    .attr('class', 'chart-svg')
    .attr('width',  width  + margin.left + margin.right)
    .attr('height', height + margin.top  + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // Filtering of data
  let data = finesData2024;
  if (filters.fines.state !== 'ALL') {
    data = data.filter(d => d.JURISDICTION === filters.fines.state);
  }
  if (filters.fines.age !== 'ALL') {
    data = data.filter(d => d.AGE_GROUP === filters.fines.age);
  }

  // Camera detection method values or the types of camera 
  const cameraTypes = [
    'Mobile camera',
    'Fixed camera',
    'Fixed or mobile camera',
    'Average speed camera',
    'Red light camera'
  ];

  // Clean display labels for each metric
  const metricLabels = {
    'speed_fines':           'Speeding',
    'mobile_phone_use':      'Mobile Phone',
    'non_wearing_seatbelts': 'Seatbelt',
    'unlicensed_driving':    'Unlicensed',
  };

  const metrics = Object.keys(metricLabels);

  // Aggregate fines per metric per detection type
  const offenceData = metrics.map(metric => {
    const rows       = data.filter(d => d.METRIC === metric);
    const policeRows = rows.filter(d => d.DETECTION_METHOD === 'Police issued');
    const camRows    = rows.filter(d => cameraTypes.includes(d.DETECTION_METHOD));
    return {
      metric:  metric,
      label:   metricLabels[metric],
      police:  d3.sum(policeRows, d => d.FINES),
      camera:  d3.sum(camRows,    d => d.FINES),
      arrests: d3.sum(rows,       d => d.ARRESTS),
      charges: d3.sum(rows,       d => d.CHARGES),
    };
  });

  // to show the values on the axes line x and y
  const x0 = d3.scaleBand()
    .domain(offenceData.map(d => d.label))
    .range([0, width])
    .padding(0.25);

  const x1 = d3.scaleBand()
    .domain(['camera', 'police'])
    .range([0, x0.bandwidth()])
    .padding(0.1);

  const maxVal = d3.max(offenceData, d => Math.max(d.police, d.camera));

  const y = d3.scaleLinear()
    .domain([0, maxVal * 1.30])
    .range([height, 0]);

  // Grid Lines
  svg.append('g')
    .attr('class', 'grid')
    .call(
      d3.axisLeft(y)
        .tickSize(-width)
        .tickFormat('')
        .ticks(4)
    );

  // Tooltip helper such as hovering 
  function showTooltip(event, label, type, value, extra) {
    tooltip.innerHTML = `
      <div style="font-weight:700; margin-bottom:3px; color:#f5e6d0;">${label} — ${type}</div>
      <div style="font-size:15px; font-weight:800; color:#d4621a;">${formatNum(value)} fines</div>
      <div style="font-size:10px; color:#c4956a; margin-top:3px;">${extra}</div>
    `;
    tooltip.style.opacity = '1';
    moveTooltip(event);
  }

  function moveTooltip(event) {
    const x = event.clientX + 14;
    const y = event.clientY - 50;
    const maxX = window.innerWidth  - tooltip.offsetWidth  - 16;
    const maxY = window.innerHeight - tooltip.offsetHeight - 16;
    tooltip.style.left = Math.min(x, maxX) + 'px';
    tooltip.style.top  = Math.max(8, Math.min(y, maxY)) + 'px';
  }

  function hideTooltip() {
    tooltip.style.opacity = '0';
  }

  // Bar Charts
  const groups = svg.selectAll('.offence-group')
    .data(offenceData)
    .enter()
    .append('g')
    .attr('class', 'offence-group')
    .attr('transform', d => `translate(${x0(d.label)},0)`);

  // Camera bars (pink)
  groups.append('rect')
    .attr('class', d => {
      const isDimmed = dimOffence && dimOffence !== d.label.toLowerCase();
      return `bar-rect${isDimmed ? ' dimmed' : ''}`;
    })
    .attr('x',      () => x1('camera'))
    .attr('y',      d => d.camera > 0 ? y(d.camera) : height)
    .attr('width',  x1.bandwidth())
    .attr('height', d => d.camera > 0 ? height - y(d.camera) : 0)
    .attr('rx', 3)
    .attr('fill', 'var(--pink-bar)')
    .style('display', d => d.camera > 0 ? 'block' : 'none')
    .on('mousemove', function(event, d) {
      showTooltip(event, d.label, 'Camera', d.camera, getCameraInfo(d.metric));
    })
    .on('mouseleave', hideTooltip);

  // Police bars (orange)
  groups.append('rect')
    .attr('class', d => {
      const isDimmed = dimOffence && dimOffence !== d.label.toLowerCase();
      return `bar-rect${isDimmed ? ' dimmed' : ''}`;
    })
    .attr('x',      () => x1('police'))
    .attr('y',      d => d.police > 0 ? y(d.police) : height)
    .attr('width',  x1.bandwidth())
    .attr('height', d => d.police > 0 ? height - y(d.police) : 0)
    .attr('rx', 3)
    .attr('fill', 'var(--orange)')
    .on('mousemove', function(event, d) {
      showTooltip(event, d.label, 'Police issued', d.police, getPoliceInfo(d.metric));
    })
    .on('mouseleave', hideTooltip);

  // lines for axes x and y are drawn and adds a small tick on the top of the values
  svg.append('g')
    .attr('class', 'axis')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x0).tickSize(0))
    .select('.domain').remove();

  svg.append('g')
    .attr('class', 'axis')
    .call(
      d3.axisLeft(y)
        .ticks(4)
        .tickFormat(d => formatNum(d))
    )
    .select('.domain').remove();

  // provides a legend to show the type of offence based on the color
  const legend = document.getElementById('fines-offence-legend');
  if (legend) {
    legend.innerHTML = `
      <div class="leg"><div class="leg-sq" style=
      "background:var(--pink-bar)"></div>Camera</div>
      <div class="leg"><div class="leg-sq" style=
      "background:var(--orange)"></div>Police Issued</div>
    `;
  }
}

// displays a short description of the attribute 

function getCameraInfo(metric) {
  const info = {
    'speed_fines':           'Mobile, fixed, and average speed cameras combined.',
    'mobile_phone_use':      'Camera detection not yet widely deployed for mobile phones.',
    'non_wearing_seatbelts': 'Seatbelt detection is not camera-based.',
    'unlicensed_driving':    'Cannot be detected by camera — police only.',
  };
  return info[metric] || '';
}

function getPoliceInfo(metric) {
  const info = {
    'speed_fines':           'Primary method in regional areas where cameras are sparse.',
    'mobile_phone_use':      'All mobile phone fines in 2024 are police-issued.',
    'non_wearing_seatbelts': 'Almost all seatbelt fines are police-issued.',
    'unlicensed_driving':    'Often accompanied by arrests and charges.',
  };
  return info[metric] || '';
}