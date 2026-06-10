/* ═══════════════════════════════════════════
   main.js
   Shared logic — data loading, page switching,
   fines filters, KPIs, info panel
═══════════════════════════════════════════ */

// holds the loaded CSV data once D3 reads them
let finesData2024 = [];   // fines_2024.csv

let filters = {
  fines: {
    state: 'ALL',
    age:   'ALL',
  }
};

let finesChartsRendered = false;

// page switching
function showPage(name, el) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  el.classList.add('active');
  closeInfo();

  if (name === 'fines' && !finesChartsRendered) {
    renderFinesOffenceChart(null);
    renderFinesStateBars('ALL');
    renderFinesDetectBars();
    renderFinesAgeBars('ALL');
    renderFinesMonthlyChart();
    if (typeof renderCrossDatasetChart === 'function') renderCrossDatasetChart();
    finesChartsRendered = true;
  }
}


function showInfoPanel(chip, title, value, body, showFilter) {
  document.getElementById('infoChip').textContent  = chip;
  document.getElementById('infoTitle').textContent = title;
  document.getElementById('infoValue').textContent = value;
  document.getElementById('infoBody').textContent  = body;
  const fn = document.getElementById('infoFilterNote');
  if (fn) fn.style.display = showFilter ? 'block' : 'none';
  const panel = document.getElementById('infoPanel');
  if (panel) panel.classList.add('visible');
}

function closeInfo() {
  const panel = document.getElementById('infoPanel');
  if (panel) panel.classList.remove('visible');
}


// turns big numbers into short readable form (e.g. 2895712 → 2.9M)
function formatNum(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000)    return (n / 1000).toFixed(1) + 'K';
  return n.toLocaleString();
}

// shows the orange tag below the header when a filter is active
function updateFinesFilterBar(label) {
  const bar = document.getElementById('fine-filter-bar');
  const tag = document.getElementById('fines-filter-tag');
  if (!bar || !tag) return;
  if (label) {
    bar.classList.add('visible');
    tag.innerHTML = `${label} <button onclick="resetFinesFilter()">✕</button>`;
  } else {
    bar.classList.remove('visible');
  }
}

function buildFinesFilterLabel() {
  const labels = [];
  if (filters.fines.state !== 'ALL') labels.push(`State: ${filters.fines.state}`);
  if (filters.fines.age   !== 'ALL') labels.push(`Age: ${filters.fines.age}`);
  return labels.join(' · ');
}

// DIM / UNDIM HELPERS - for filtering buttons
function dimAll(containerId) {
  document.querySelectorAll(`#${containerId} .bar-rect`).forEach(b => b.classList.add('dimmed'));
}
function undimAll(containerId) {
  document.querySelectorAll(`#${containerId} .bar-rect`).forEach(b => b.classList.remove('dimmed'));
}

// ── FINES FILTERS ─────────────────────────────────────

function applyFinesStateFilter(state) {
  // toggle — clicking the same state again resets
  if (filters.fines.state === state && state !== 'ALL') {
    resetFinesFilter();
    return;
  }

  filters.fines.state = state;
  document.getElementById('fines-state-filter').value = state;

  updateFinesKPIs();

  // redraw all fines charts with the new filter applied
  renderFinesOffenceChart(null);
  renderFinesStateBars(state);
  renderFinesDetectBars();
  renderFinesAgeBars(filters.fines.age);
  renderFinesMonthlyChart();
  if (typeof renderCrossDatasetChart === 'function') renderCrossDatasetChart();

  updateFinesFilterBar(buildFinesFilterLabel());
}

function applyFinesAgeFilter(age) {
  filters.fines.age = age;
  document.getElementById('fines-age-filter').value = age;

  updateFinesKPIs();


  renderFinesAgeBars(age);
  renderFinesOffenceChart(null);
  renderFinesMonthlyChart();

  updateFinesFilterBar(buildFinesFilterLabel());
}

function resetFinesFilter() {
  filters.fines = { state: 'ALL', age: 'ALL' };
  document.getElementById('fines-state-filter').value = 'ALL';
  document.getElementById('fines-age-filter').value   = 'ALL';

  updateFinesKPIs();


  renderFinesOffenceChart(null);
  renderFinesStateBars('ALL');
  renderFinesDetectBars();
  renderFinesAgeBars('ALL');
  renderFinesMonthlyChart();
  if (typeof renderCrossDatasetChart === 'function') renderCrossDatasetChart();

  updateFinesFilterBar('');
  closeInfo();
}


function updateFinesKPIs() {
  let data = finesData2024;

  // apply current filters
  if (filters.fines.state !== 'ALL') {
    data = data.filter(d => d.JURISDICTION === filters.fines.state);
  }
  if (filters.fines.age !== 'ALL') {
    data = data.filter(d => d.AGE_GROUP === filters.fines.age);
  }

  // calculate totals
  const totalFines = d3.sum(data, d => d.FINES);
  const speedFines = d3.sum(data.filter(d => d.METRIC === 'speed_fines'), d => d.FINES);
  const totalArr   = d3.sum(data, d => d.ARRESTS);
  const totalChg   = d3.sum(data, d => d.CHARGES);

  // update the KPI cards in the DOM
  document.getElementById('f-kpi-fines').textContent   = formatNum(totalFines);
  document.getElementById('f-kpi-speed').textContent   = formatNum(speedFines);
  document.getElementById('f-kpi-arrests').textContent = formatNum(totalArr);
  document.getElementById('f-kpi-charges').textContent = formatNum(totalChg);
}

// loads CSV file then initialises charts
async function loadData() {
  try {
    // load fines_2024.csv
    finesData2024 = await d3.csv('data/fines_2024.csv');
    finesData2024 = finesData2024.filter(d =>
      d.AGE_GROUP !== 'All ages' && d.LOCATION !== 'All regions'
    );

    // convert numeric columns from strings to numbers
    const finesNums = ['FINES', 'ARRESTS', 'CHARGES'];
    finesData2024.forEach(d => finesNums.forEach(c => d[c] = +d[c] || 0));


    updateFinesKPIs();

    // ── INITIALISE FINES PAGE ──
    // updateFinesKPIs();
    // renderFinesOffenceChart(null);
    // renderFinesStateBars('ALL');
    // renderFinesDetectBars();
    // renderFinesAgeBars('ALL');
    // renderFinesMonthlyChart();
    // if (typeof renderCrossDatasetChart === 'function') renderCrossDatasetChart();

  } catch (err) {
    console.error('Error loading data:', err);
  }
}

document.addEventListener('DOMContentLoaded', loadData);