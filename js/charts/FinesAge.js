function renderFinesAgeChart(selectedAge) {

    const container = document.getElementById('fines-age-chart');
    if (!container) return;
    container.innerHTML = '';

    const margin = {top: 20, right: 10, bottom: 40, left: 55};
    const width = container.clientWidth - margin.left - margin.right;
    const height = 180 - margin.top - margin.bottom;

    const svg = d3.select('#fines-age-chart')
    .append('svg')
    .attr('class', 'char-svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

    let data = finesData2024;
    if(filters.fines.state !== 'ALL') {
        data = data.filter(d => d.JURISDICTION === filters.fines.state);
    }


    const ageOrder = ['12-16', '17-25', '26-39', '40-54','55-64', '65 and over'];

    const ageData = ageOrder.map(age => {
        const rows = data.filter(d => d.AGE_GROUP === age);
        return {
            age: age,
            label: age === '65 and over' ? '65+' : age,
            fines: d3.sum(rows, d => d.FINES),
            arrests: d3.sum(rows, d => d.ARRESTS),
            charges: d3.sum(rows, d => d.CHARGES),
        };
    });

    const x = d3.scaleBand()
    .domain(ageData.map(d => d.label))
    .range([0, width])
    .padding(0.25);

    const maxVal = d3.max(ageData, d => d.fines);

    const y = d3.scaleLinear()
    .domain([0, maxVal * 1.1])
    .range([height,0]);


svg.append('g')
    .attr('class', 'grid')
    .call(
        d3.axisLeft(y)
        .tickSize(-width)
        .tickFormat('')
        .ticks(4)
    );

svg.selectAll('.age-bar')
    .data(ageData)
    .enter()
    .append('rect')
    .attr('class' , d => {
        const isSelected = selectedAge !== 'ALL' && selectedAge === d.age;
        const isDimmed = selectedAge !== 'ALL' && selectedAge !== d.age;
        let cls = 'bar-rect age-bar';
        if(isDimmed) cls += ' dimmed';
        return cls; 
    })

    .attr('x', d => x(d.label))
    .attr('y', d => y(d.fines))
    .attr('width', x.bandwidth())
    .attr('height', d => height - y(d.fines))
    .attr('fill', d => {
        const isSelected = selectAge !== 'ALL' && selectedAge === d.age;
        return isSelected ? 'var(--amber)' : 'var(--orange)';
    })

    .on('click', function(event, d) {
        event.stopPropagation();

        if(filters.fines.age === d.age) {
            applyFinesAgeFilter('ALL');
            closeInfo();
            return;
        }

        applyFinesAgeFilter(d.age);
        showInfo(
            'Age Group',
            d.label,
            formatNum(d.fines) + 'fines',
            getAgeInfo(d.age),
            'Police-issued fines - fines_2024.csv',
            true
        );
    });


svg.selectAll('.age-label')
    .data(ageData)
    .enter()
    .append('text')
    .attr('class', 'age-label')
    .attr('x', d => x(d.label) + x.bandwidth() / 2)
    .attr('y', d => y(d.fines) - 5)
    .attr('text-anchor', 'middle')
    .attr('fill', 'var(--text-dim)')
    .attr('font-size', '9px')
    .attr('font-family', 'JetBrains Mono, monospace')
    .text(d => formatNum(d.fines));


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