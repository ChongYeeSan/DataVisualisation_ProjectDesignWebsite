/* ═══════════════════════════════════════════
   finesState.js
   Horizontal bar list — Fines by state
   Total fines · 2024
═══════════════════════════════════════════ */

function renderFinesStateBars(selectedState) {

 
  const container = document.getElementById('fines-state-bars');
  if (!container) return;


  container.innerHTML = '';


  // reuse shared tooltip if it already exists
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


  // aggregate fines arrests and charges per state from real CSV data
  const stateMap = d3.rollup(
    finesData2024,
    rows => ({
      fines:   d3.sum(rows, d => d.FINES),
      arrests: d3.sum(rows, d => d.ARRESTS),
      charges: d3.sum(rows, d => d.CHARGES),
    }),
    d => d.JURISDICTION
  );

  // convert map to array and sort by fines descending
  const stateData = Array.from(stateMap, ([code, vals]) => ({
    code,
    fines:   vals.fines,
    arrests: vals.arrests,
    charges: vals.charges,
  })).sort((a, b) => b.fines - a.fines);

  // find the max fines value to calculate bar widths as percentages
  const maxFines = stateData[0].fines;

  function showTooltip(event, d) {
    tooltip.innerHTML = `
      <div style="font-weight:700; margin-bottom:3px; color:#f5e6d0;">${d.code}</div>
      <div style="font-size:15px; font-weight:800; color:#d4621a;">${formatNum(d.fines)} fines</div>
      <div style="font-size:10px; color:#c4956a; margin-top:3px;">
        Arrests: ${formatNum(d.arrests)} · Charges: ${formatNum(d.charges)}
      </div>
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

  // build each state row as an HTML element
  stateData.forEach(d => {


    const isSelected = selectedState === d.code;

    // calculate bar width as a percentage of the max state
    const pct = (d.fines / maxFines) * 100;


    const row = document.createElement('div');
    row.className = `state-row${isSelected ? ' selected' : ''}`;
    row.style.cursor = 'pointer';


    row.innerHTML = `
      <span class="state-name">${d.code}</span>
      <div class="state-bar-track">
        <div class="state-bar" style="width:${pct}%;${isSelected ? 'background:var(--amber)' : ''}"></div>
      </div>
      <span class="state-val">${formatNum(d.fines)}</span>
    `;

    row.addEventListener('mousemove', e => showTooltip(e, d));
    row.addEventListener('mouseleave', hideTooltip);

    // click and unclick button to filter and reset
    row.addEventListener('click', e => {
      e.stopPropagation();
      if (filters.fines.state === d.code) {
        applyFinesStateFilter('ALL');
      } else {
        applyFinesStateFilter(d.code);
      }
    });

    container.appendChild(row);
  });
}


// short description per state shown in tooltip
function getStateInfo(code) {
  const info = {
    VIC: 'Victoria has the highest total fines in 2024 driven by its extensive speed camera network.',
    QLD: 'Queensland records high fines due to its large road network and expanding camera coverage.',
    NSW: 'NSW has a large population and extensive camera enforcement particularly on major highways.',
    WA:  'WA records high arrests and charges relative to fines suggesting serious offence enforcement.',
    SA:  'South Australia has strong police-issued enforcement particularly for unlicensed driving.',
    ACT: 'ACT has a smaller population but significant camera-based speed enforcement.',
    TAS: 'Tasmania has a smaller program with mostly police-issued fines in regional areas.',
    NT:  'NT records the highest arrest rate per fine — serious offences are common in remote areas.',
  };
  return info[code] || '';
}