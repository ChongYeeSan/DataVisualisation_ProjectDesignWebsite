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