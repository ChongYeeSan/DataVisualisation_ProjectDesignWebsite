/* ═══════════════════════════════════════════
   finesDetect.js
   Progress bar list — Fines by detection method
   All fines · 2024
═══════════════════════════════════════════ */

function renderFinesDetectBars() {

  
  const container = document.getElementById('fines-detect-bars');
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


  // group camera types together for cleaner display
  // Fixed or mobile camera, Mobile camera, Fixed camera,
  const groups = [
    {
      label: 'Fixed or Mobile Camera',
      methods: ['Fixed or mobile camera'],
      color: 'var(--orange)',
    },
    {
      label: 'Police Issued',
      methods: ['Police issued'],
      color: 'var(--amber)',
    },
    {
      label: 'Mobile Camera',
      methods: ['Mobile camera'],
      color: 'var(--pink-bar)',
    },
    {
      label: 'Fixed Camera',
      methods: ['Fixed camera'],
      color: '#a07040',
    },
    {
      label: 'Red Light Camera',
      methods: ['Red light camera', 'Average speed camera'],
      color: '#7a5030',
    },
  ];

  // for each group sum up fines from matching detection methods
  const detectData = groups.map(g => {
    const total = d3.sum(
      finesData2024.filter(d => g.methods.includes(d.DETECTION_METHOD)),
      d => d.FINES
    );
    return {
      label:  g.label,
      fines:  total,
      color:  g.color,
      info:   getDetectInfo(g.label),
    };
  });


  const totalFines = d3.sum(detectData, d => d.fines);


  detectData.sort((a, b) => b.fines - a.fines);

  // ── TOOLTIP HELPERS ────────────────────────────────
  function showTooltip(event, d, pct) {
    tooltip.innerHTML = `
      <div style="font-weight:700; margin-bottom:3px; color:#f5e6d0;">${d.label}</div>
      <div style="font-size:15px; font-weight:800; color:#d4621a;">${formatNum(d.fines)} fines</div>
      <div style="font-size:10px; color:#c4956a; margin-top:3px;">${pct}% of all fines · ${d.info}</div>
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


  // build each detection method as a progress bar row
  detectData.forEach(d => {

    
    const pct = totalFines > 0 ? Math.round((d.fines / totalFines) * 100) : 0;

    
    const item = document.createElement('div');
    item.className = 'prog-item';
    item.style.cursor = 'default';

    
    item.innerHTML = `
      <div class="prog-row">
        <span class="prog-label">${d.label}</span>
        <span class="prog-val">${pct}%</span>
      </div>
      <div class="prog-track">
        <div class="prog-fill" style="width:${pct}%; background:${d.color};"></div>
      </div>
    `;

    // hover — show tooltip with fines count and description
    item.addEventListener('mousemove', e => showTooltip(e, d, pct));
    item.addEventListener('mouseleave', hideTooltip);

    container.appendChild(item);
  });
}

// short description for each detection method shown in tooltip
function getDetectInfo(label) {
  const info = {
    'Fixed or Mobile Camera': 'Largest category — covers both fixed roadside and deployable mobile cameras.',
    'Police Issued':           'Only method that captures full age and location data. Primary in regional areas.',
    'Mobile Camera':           'Cameras mounted in vehicles and deployed flexibly across the road network.',
    'Fixed Camera':            'Permanently installed cameras at known high-risk locations.',
    'Red Light Camera':        'Detects both red light running and speeding at intersections.',
  };
  return info[label] || '';
}