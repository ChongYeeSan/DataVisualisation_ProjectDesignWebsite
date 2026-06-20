/* ═══════════════════════════════════════════
   deathMain.js
   Road Deaths page — data loading, filters,
   KPIs and chart triggers
   for Deaths by age group & speed zone only took 2024 
   because wanted to match the fines page 
═══════════════════════════════════════════ */

let deathData = [];

let deathFilters = {
  state: 'ALL',
  user:  'ALL',
};

let deathChartsRendered = false;

const DEATH_YEAR = 2024;

// ── DATA LOADING ──────────────────────────────────────
async function loadDeathData() {
  try {
    deathData = await d3.csv('data/road_deaths_cleaned.csv');

    // convert numeric columns from strings to numbers
    deathData.forEach(d => {
      d.Year        = +d.Year;
      d.Month       = +d.Month;
      d.Age         = +d.Age;
      d.Speed_Limit = +d.Speed_Limit;
    });

    // update the KPI cards on load
    updateDeathKPIs();

  } catch (err) {
    console.error('Error loading road deaths data:', err);
  }
}

//  returns data for the snapshot year, filtered
function getDeathSnapshot() {

  let data = deathData.filter(d => d.Year === DEATH_YEAR);

  // apply state filter
  if (deathFilters.state !== 'ALL') {
    data = data.filter(d => d.State === deathFilters.state);
  }

  if (deathFilters.user !== 'ALL') {
    data = data.filter(d => d.Road_User === deathFilters.user);
  }
  return data;
}


function updateDeathKPIs() {
  const data = getDeathSnapshot();

  const total   = data.length;
  const drivers = data.filter(d => d.Road_User === 'Driver').length;
  const moto    = data.filter(d => d.Road_User === 'Motorcycle rider').length;
  const peds    = data.filter(d => d.Road_User === 'Pedestrian').length;

  document.getElementById('dt-total').textContent   = total.toLocaleString();
  document.getElementById('dt-drivers').textContent = drivers.toLocaleString();
  document.getElementById('dt-moto').textContent    = moto.toLocaleString();
  document.getElementById('dt-ped').textContent     = peds.toLocaleString();

  // work out each road user type as a percentage of total deaths
  // and show it in the small badge on each KPI card
  const pct = (part) => total > 0 ? Math.round((part / total) * 100) + '%' : '0%';

  document.getElementById('dt-drivers-badge').textContent = pct(drivers);
  document.getElementById('dt-moto-badge').textContent    = pct(moto);
  document.getElementById('dt-ped-badge').textContent     = pct(peds);
}


function renderAllDeathCharts() {
  renderDeathTrend();
  renderDeathStateBars(deathFilters.state);
  renderDeathUserBars();
  renderDeathAgeBars();
  renderDeathSpeedBars();
}


function applyDeathStateFilter(state) {
  // toggle — click the same state again to reset
  if (deathFilters.state === state && state !== 'ALL') {
    resetDeathFilter();
    return;
  }
  deathFilters.state = state;
  document.getElementById('death-state-sel').value = state;

  updateDeathKPIs();
  renderDeathStateBars(state);
  renderDeathUserBars();
  renderDeathAgeBars();
  renderDeathSpeedBars();

  updateDeathFilterBar();
}

function applyDeathsUserFilter(user) {
  deathFilters.user = user;
  document.getElementById('death-user-sel').value = user;

  updateDeathKPIs();
  renderDeathStateBars(deathFilters.state);
  renderDeathUserBars();
  renderDeathAgeBars();
  renderDeathSpeedBars();

  updateDeathFilterBar();
}

function resetDeathFilter() {
  deathFilters = { state: 'ALL', user: 'ALL' };
  document.getElementById('death-state-sel').value = 'ALL';
  document.getElementById('death-user-sel').value  = 'ALL';

  updateDeathKPIs();
  renderAllDeathCharts();
  updateDeathFilterBar();
}


function updateDeathFilterBar() {
  const bar = document.getElementById('death-filter-bar');
  const tag = document.getElementById('death-filter-tag');
  if (!bar || !tag) return;

  const labels = [];
  if (deathFilters.state !== 'ALL') labels.push(`State: ${deathFilters.state}`);
  if (deathFilters.user  !== 'ALL') labels.push(`User: ${deathFilters.user}`);

  if (labels.length) {
    bar.classList.add('visible');
    tag.innerHTML = `${labels.join(' · ')} <button onclick="resetDeathFilter()">✕</button>`;
  } else {
    bar.classList.remove('visible');
  }
}

let deathResizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(deathResizeTimer);
  deathResizeTimer = setTimeout(() => {
    const page = document.getElementById('page-death');
    if (page && page.classList.contains('active') && deathChartsRendered) {
      renderAllDeathCharts();
    }
  }, 200);
});

// fetch death page once it calls the HTML page
document.addEventListener('DOMContentLoaded', loadDeathData);