/* ═══════════════════════════════════════════
   finesAge.js
   Bar chart — Fines by age group
   Police-issued fines · 2024
═══════════════════════════════════════════ */

function renderFinesAgeBars(selectedAge) {

  // find the div in index.html where this chart will be drawn
  // if it doesnt exist, stop the function early
  const container = document.getElementById('fines-age-chart');
  if (!container) return;

  container.innerHTML = '';


  // create a floating tooltip div attached to the page body
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

    // attach to body so it can appear anywhere on screen
    document.body.appendChild(tooltip);
  }

  // margin creates space around the chart for axes and labels
  const margin = { top: 20, right: 10, bottom: 40, left: 55 };


  const width  = container.clientWidth - margin.left - margin.right;

  const height = 180 - margin.top - margin.bottom;

  // create the svg element inside the chart div
  const svg = d3.select('#fines-age-chart')
    .append('svg')
    .attr('class', 'chart-svg')
    .attr('width',  width  + margin.left + margin.right)
    .attr('height', height + margin.top  + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);


  let data = finesData2024;

  if (filters.fines.state !== 'ALL') {
    data = data.filter(d => d.JURISDICTION === filters.fines.state);
  }

  const ageOrder = ['12-16', '17-25', '26-39', '40-64', '65 and over'];

  // for each age group, filter the rows and sum up the fines/arrests/charges
  const ageData = ageOrder.map(age => {
    const rows = data.filter(d => d.AGE_GROUP === age);
    return {
      age:     age,
      label:   age === '65 and over' ? '65+' : age,  // cleaner display label
      fines:   d3.sum(rows, d => d.FINES),
      arrests: d3.sum(rows, d => d.ARRESTS),
      charges: d3.sum(rows, d => d.CHARGES),
    };
  });


  // x scale — maps age group labels to horizontal positions
  const x = d3.scaleBand()
    .domain(ageData.map(d => d.label))
    .range([0, width])
    .padding(0.25);

  // find the highest fines value across all age groups
  const maxVal = d3.max(ageData, d => d.fines);
  const y = d3.scaleLinear()
    .domain([0, maxVal * 1.15])
    .range([height, 0]);


  // horizontal grid lines drawn across the full chart width
  svg.append('g')
    .attr('class', 'grid')
    .call(
      d3.axisLeft(y)
        .tickSize(-width)
        .tickFormat('')
        .ticks(4)
    );


  // show the tooltip near the cursor with the bar's data
  function showTooltip(event, d) {
    tooltip.innerHTML = `
      <div style="font-weight:700; margin-bottom:3px; color:#f5e6d0;">${d.label} age group</div>
      <div style="font-size:15px; font-weight:800; color:#d4621a;">${formatNum(d.fines)} fines</div>
      <div style="font-size:10px; color:#c4956a; margin-top:3px;">${getAgeInfo(d.age)}</div>
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

  // hide the tooltip when cursor leaves the bar
  function hideTooltip() {
    tooltip.style.opacity = '0';
  }

  // create a bar chart to show age
  svg.selectAll('.age-bar')
    .data(ageData)
    .enter()
    .append('rect')
    .attr('class', d => {
      const isDimmed = selectedAge !== 'ALL' && selectedAge !== d.age;
      return `bar-rect age-bar${isDimmed ? ' dimmed' : ''}`;
    })

    .attr('x', d => x(d.label))
    .attr('y', d => y(d.fines))
    .attr('width', x.bandwidth())
    .attr('height', d => height - y(d.fines))
    .attr('rx', 3)
    .attr('fill', d => {
      const isSelected = selectedAge !== 'ALL' && selectedAge === d.age;
      return isSelected ? 'var(--amber)' : 'var(--orange)';
    })

    // show tooltip when hovering
    .on('mousemove', function(event, d) {
      showTooltip(event, d);
    })

    .on('mouseleave', hideTooltip)

    .on('click', function(event, d) {
      event.stopPropagation();
      if (filters.fines.age === d.age) {
        applyFinesAgeFilter('ALL');
      } else {
        applyFinesAgeFilter(d.age);
      }
    });


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
}

// returns a short description for each age group
function getAgeInfo(age) {
  const info = {
    '12-16':       'Mainly unlicensed or learner drivers detected in regional areas.',
    '17-25':       'Overrepresented relative to licence share. Speeding is most common.',
    '26-39':       'Second highest group. High daily travel exposure from commuting.',
    '40-64':       'Highest fines of any age group, particularly for speeding.',
    '65 and over': 'Lower proportional fines. Seatbelt and low-level speeding most common.',
  };
  return info[age] || '';
}