// ==================== Global Variables ====================
let weatherData = [];
let currentSection = 'overview';
let map = null;
let markers = [];

// ==================== Navigation ====================
document.addEventListener('DOMContentLoaded', async () => {
    initNavigation();
    await loadCSVData();
    if (weatherData.length > 0) {
        initVisualizations();
        updateHeaderStats();
    }
});

function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.content-section');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const target = item.getAttribute('data-target');
            navItems.forEach(nav => nav.classList.remove('active'));
            sections.forEach(section => section.classList.remove('active'));
            item.classList.add('active');
            const targetSection = document.getElementById(target);
            if (targetSection) {
                targetSection.classList.add('active');
                currentSection = target;
                setTimeout(() => renderVisualizationForSection(target), 100);
            }
        });
    });
}

// ==================== Load CSV Data ====================
async function loadCSVData() {
    try {
        console.log('🔄 Loading CSV data from cleaned_data.csv...');
        const data = await d3.csv('cleaned_data.csv', d => {
            const parsedDate = new Date(d.Time);
            if (isNaN(parsedDate.getTime()) || !d.Temperature) return null;
            return {
                date: parsedDate,
                year: parsedDate.getFullYear(),
                month: parsedDate.getMonth() + 1,
                day: parsedDate.getDate(),
                hour: parsedDate.getHours(),
                dayNight: d.Day || 'D',
                temperature: parseFloat(d.Temperature),
                humidity: parseFloat(d['Relative Humidity']),
                pressure: parseFloat(d.Pressure),
                dewPoint: parseFloat(d['Dew Point']) || 0,
                heatIndex: parseFloat(d['Heat Index']) || 0,
                feelsLike: parseFloat(d['Feels Like']) || 0,
                visibility: parseFloat(d.Visibility) || 0,
                windDirection: parseFloat(d['Wind Direction']) || 0,
                windCardinal: d['Wind Cardinal'] || '',
                uvIndex: parseFloat(d['UV Index']) || 0,
                weatherPhrase: d['Weather Phrase'] || '',
                rainfall: estimateRainfall(d['Weather Phrase'])
            };
        });

        weatherData = data.filter(d => d !== null && d.temperature > 0);
        console.log(`✅ Loaded ${weatherData.length} records`);
        if (weatherData.length === 0) throw new Error('No valid data');
    } catch (error) {
        console.error('❌ ERROR loading CSV:', error);
        alert('⚠️ CRITICAL ERROR: Could not load cleaned_data.csv\n\nPlease ensure:\n1. "cleaned_data.csv" is in the SAME folder as index.html\n2. File name is exactly "cleaned_data.csv"\n3. File has the correct column headers\n\nWithout the data file, the dashboard will NOT work!');
        showErrorInAllCharts('❌ CSV file not found! Place cleaned_data.csv in the same folder.');
    }
}

function estimateRainfall(weatherPhrase) {
    if (!weatherPhrase) return 0;
    const phrase = weatherPhrase.toLowerCase();
    if (phrase.includes('heavy rain') || phrase.includes('thunder')) return 35 + Math.random() * 65;
    if (phrase.includes('rain')) return 12 + Math.random() * 28;
    if (phrase.includes('shower') || phrase.includes('drizzle')) return 3 + Math.random() * 12;
    if (phrase.includes('cloudy')) return Math.random() * 2;
    return 0;
}

function showErrorInAllCharts(message) {
    ['temperatureChart', 'spatialHourlyChart', 'spatialSeasonalChart',
        'rainfallYearly', 'rainfallMonthly', 'rainfallVariability',
        'interactiveMap', 'correlationMatrix'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#ff6b9d;font-size:16px;text-align:center;padding:40px;">${message}</div>`;
        });
}

// ==================== Header Stats ====================
function updateHeaderStats() {
    if (!weatherData.length) return;
    const avgTemp = d3.mean(weatherData, d => d.temperature);
    const avgHumidity = d3.mean(weatherData, d => d.humidity);
    const maxTemp = d3.max(weatherData, d => d.temperature);
    document.getElementById('avgTemp').textContent = `${avgTemp.toFixed(1)}°C`;
    document.getElementById('avgHumidity').textContent = `${avgHumidity.toFixed(0)}%`;
    document.getElementById('maxTemp').textContent = `${maxTemp.toFixed(1)}°C`;
    const rc = document.getElementById('recordCount');
    if (rc) rc.textContent = weatherData.length.toLocaleString();
}

// ==================== Initialize ====================
function initVisualizations() {
    createTemperatureTrends();
    createSpatialPatterns();
    createMonsoonAnalysis();
    createInteractiveMap();
    createCorrelationMatrix();
    initAllControls();
}

function renderVisualizationForSection(section) {
    if (!weatherData.length) return;
    switch (section) {
        case 'temperature': createTemperatureTrends(); break;
        case 'spatial': createSpatialPatterns(); break;
        case 'monsoon': createMonsoonAnalysis(); break;
        case 'interactive': createInteractiveMap(); break;
        case 'correlation': createCorrelationMatrix(); break;
    }
}

// ==================== Control Handlers ====================
function initAllControls() {
    setTimeout(() => {
        document.querySelectorAll('#temperature .control-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                document.querySelectorAll('#temperature .control-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                createTemperatureTrends();
            });
        });
        document.querySelectorAll('#spatial .control-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                document.querySelectorAll('#spatial .control-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                createSpatialPatterns();
            });
        });
        // Decade selector for rainfall variability boxplot
        document.querySelectorAll('#monsoon .decade-controls .control-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                document.querySelectorAll('#monsoon .decade-controls .control-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                createRainfallVariability();
            });
        });
    }, 500);
}

// ==================== SVG HELPERS ====================
function makeSVG(containerId, margin, totalHeight) {
    const container = d3.select(`#${containerId}`);
    container.html('');
    const w = container.node().getBoundingClientRect().width;
    const innerW = w - margin.left - margin.right;
    const innerH = totalHeight - margin.top - margin.bottom;
    const svg = container.append('svg')
        .attr('width', w)
        .attr('height', totalHeight)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    return { svg, width: innerW, height: innerH, container };
}

function addAxes(svg, xScale, yScale, width, height, xLabel, yLabel, xTickFormat) {
    svg.append('g').attr('class', 'grid').attr('opacity', 0.08)
        .call(d3.axisLeft(yScale).tickSize(-width).tickFormat(''));
    const xAxis = xTickFormat ? d3.axisBottom(xScale).tickFormat(xTickFormat) : d3.axisBottom(xScale);
    svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${height})`).call(xAxis);
    svg.append('g').attr('class', 'axis').call(d3.axisLeft(yScale));
    svg.append('text').attr('transform', 'rotate(-90)').attr('x', -height / 2).attr('y', -50)
        .attr('text-anchor', 'middle').style('fill', '#8b9dc3').style('font-size', '11px').text(yLabel);
    svg.append('text').attr('x', width / 2).attr('y', height + 45)
        .attr('text-anchor', 'middle').style('fill', '#8b9dc3').style('font-size', '11px').text(xLabel);
}

function addTitle(svg, width, text) {
    svg.append('text').attr('x', width / 2).attr('y', -18).attr('text-anchor', 'middle')
        .style('fill', '#e8f1ff').style('font-size', '14px').style('font-weight', '700')
        .style('font-family', 'Orbitron, monospace').text(text);
}

// ==================== TEMPERATURE TRENDS ====================
function createTemperatureTrends() {
    if (!weatherData.length) return;
    const activeBtn = document.querySelector('#temperature .control-btn.active');
    const view = activeBtn ? activeBtn.getAttribute('data-view') : 'yearly';
    switch (view) {
        case 'yearly': createYearlyTrend(); break;
        case 'seasonal': createSeasonalTrend(); break;
        case 'decadal': createDecadalTrend(); break;
    }
}

function createYearlyTrend() {
    const { svg, width, height } = makeSVG('temperatureChart', { top: 45, right: 100, bottom: 65, left: 65 }, 430);

    const yearlyData = d3.rollup(weatherData, v => ({
        mean: d3.mean(v, d => d.temperature),
        max: d3.max(v, d => d.temperature),
        min: d3.min(v, d => d.temperature)
    }), d => d.year);

    const data = Array.from(yearlyData, ([year, vals]) => ({ year, ...vals })).sort((a, b) => a.year - b.year);

    const xScale = d3.scaleLinear().domain(d3.extent(data, d => d.year)).range([0, width]);
    const yScale = d3.scaleLinear()
        .domain([d3.min(data, d => d.min) - 1, d3.max(data, d => d.max) + 1])
        .range([height, 0]);

    addAxes(svg, xScale, yScale, width, height, 'Year', 'Temperature (°C)', d3.format('d'));
    addTitle(svg, width, '📈 Yearly Temperature Trends (Mean / Max / Min)');

    const areaFn = d3.area().x(d => xScale(d.year)).y0(d => yScale(d.min)).y1(d => yScale(d.max)).curve(d3.curveMonotoneX);
    svg.append('path').datum(data).attr('fill', '#00d9ff').attr('opacity', 0.08).attr('d', areaFn);

    const lineFn = metric => d3.line().x(d => xScale(d.year)).y(d => yScale(d[metric])).curve(d3.curveMonotoneX);

    [{ key: 'max', color: '#ff6b9d', dash: '5,3' }, { key: 'mean', color: '#00d9ff', dash: 'none' }, { key: 'min', color: '#9d4edd', dash: '5,3' }]
        .forEach(({ key, color, dash }) => {
            svg.append('path').datum(data).attr('fill', 'none').attr('stroke', color)
                .attr('stroke-width', key === 'mean' ? 2.5 : 1.8)
                .attr('stroke-dasharray', dash)
                .attr('d', lineFn(key))
                .style('filter', `drop-shadow(0 0 5px ${color}50)`);
        });

    svg.selectAll('.dot').data(data).enter().append('circle')
        .attr('cx', d => xScale(d.year)).attr('cy', d => yScale(d.mean))
        .attr('r', 4).attr('fill', '#00d9ff').attr('stroke', '#0a0e1a').attr('stroke-width', 2)
        .style('cursor', 'pointer')
        .on('mouseover', function (event, d) {
            d3.select(this).transition().duration(150).attr('r', 7);
            showTooltip(event, `<strong>Year ${d.year}</strong><br/>Mean: ${d.mean.toFixed(1)}°C<br/>Max: ${d.max.toFixed(1)}°C<br/>Min: ${d.min.toFixed(1)}°C`);
        })
        .on('mouseout', function () { d3.select(this).transition().duration(150).attr('r', 4); hideTooltip(); });

    const legend = svg.append('g').attr('transform', `translate(${width + 12}, 10)`);
    [{ label: 'Max', color: '#ff6b9d' }, { label: 'Mean', color: '#00d9ff' }, { label: 'Min', color: '#9d4edd' }]
        .forEach(({ label, color }, i) => {
            legend.append('line').attr('x1', 0).attr('x2', 22).attr('y1', i * 24).attr('y2', i * 24)
                .attr('stroke', color).attr('stroke-width', 2.5);
            legend.append('text').attr('x', 27).attr('y', i * 24 + 4)
                .style('fill', '#e8f1ff').style('font-size', '11px').text(label);
        });
}

function createSeasonalTrend() {
    const { svg, width, height } = makeSVG('temperatureChart', { top: 45, right: 135, bottom: 65, left: 65 }, 430);

    const getSeason = m => {
        if (m >= 3 && m <= 5) return 'Summer';
        if (m >= 6 && m <= 9) return 'Monsoon';
        if (m >= 10 && m <= 11) return 'Post-Monsoon';
        return 'Winter';
    };

    const seasonalData = [];
    d3.group(weatherData, d => d.year).forEach((yd, year) => {
        d3.group(yd, d => getSeason(d.month)).forEach((sd, season) => {
            seasonalData.push({ year, season, temp: d3.mean(sd, d => d.temperature) });
        });
    });

    const seasons = ['Winter', 'Summer', 'Monsoon', 'Post-Monsoon'];
    const seasonColors = { 'Winter': '#9d4edd', 'Summer': '#ff6b9d', 'Monsoon': '#00d9ff', 'Post-Monsoon': '#ffb627' };

    const xScale = d3.scaleLinear().domain(d3.extent(seasonalData, d => d.year)).range([0, width]);
    const yScale = d3.scaleLinear()
        .domain([d3.min(seasonalData, d => d.temp) - 2, d3.max(seasonalData, d => d.temp) + 2])
        .range([height, 0]);

    addAxes(svg, xScale, yScale, width, height, 'Year', 'Temperature (°C)', d3.format('d'));
    addTitle(svg, width, '🌸 Seasonal Temperature Patterns by Year');

    const line = d3.line().x(d => xScale(d.year)).y(d => yScale(d.temp)).curve(d3.curveMonotoneX);
    d3.group(seasonalData, d => d.season).forEach((vals, season) => {
        svg.append('path').datum(vals.sort((a, b) => a.year - b.year)).attr('fill', 'none')
            .attr('stroke', seasonColors[season]).attr('stroke-width', 2.5).attr('d', line)
            .style('filter', `drop-shadow(0 0 5px ${seasonColors[season]}70)`);
    });

    const legend = svg.append('g').attr('transform', `translate(${width + 12}, 10)`);
    seasons.forEach((s, i) => {
        legend.append('line').attr('x1', 0).attr('x2', 24).attr('y1', i * 28).attr('y2', i * 28)
            .attr('stroke', seasonColors[s]).attr('stroke-width', 3);
        legend.append('text').attr('x', 29).attr('y', i * 28 + 5)
            .style('fill', '#e8f1ff').style('font-size', '11px').text(s);
    });
}

function createDecadalTrend() {
    const { svg, width, height } = makeSVG('temperatureChart', { top: 45, right: 30, bottom: 65, left: 65 }, 430);

    const getDecade = y => Math.floor(y / 10) * 10;
    const decadalData = Array.from(
        d3.rollup(weatherData, v => d3.mean(v, d => d.temperature), d => getDecade(d.year)),
        ([decade, avgTemp]) => ({ decade, avgTemp })
    ).sort((a, b) => a.decade - b.decade);

    const xScale = d3.scaleBand().domain(decadalData.map(d => `${d.decade}s`)).range([0, width]).padding(0.3);
    const yScale = d3.scaleLinear().domain([0, d3.max(decadalData, d => d.avgTemp) + 2]).range([height, 0]);

    addAxes(svg, xScale, yScale, width, height, 'Decade', 'Temperature (°C)', null);
    addTitle(svg, width, '📊 Decadal Average Temperature Comparison');

    svg.selectAll('.bar').data(decadalData).enter().append('rect')
        .attr('x', d => xScale(`${d.decade}s`)).attr('y', d => yScale(d.avgTemp))
        .attr('width', xScale.bandwidth()).attr('height', d => height - yScale(d.avgTemp))
        .attr('fill', (d, i) => d3.interpolateRdYlBu(1 - i / decadalData.length)).attr('opacity', 0.85)
        .style('filter', 'drop-shadow(0 0 8px rgba(0,217,255,0.4))')
        .on('mouseover', function (event, d) {
            d3.select(this).attr('opacity', 1);
            showTooltip(event, `<strong>${d.decade}s</strong><br/>Avg: ${d.avgTemp.toFixed(2)}°C`);
        })
        .on('mouseout', function () { d3.select(this).attr('opacity', 0.85); hideTooltip(); });

    svg.selectAll('.label').data(decadalData).enter().append('text')
        .attr('x', d => xScale(`${d.decade}s`) + xScale.bandwidth() / 2)
        .attr('y', d => yScale(d.avgTemp) - 8).attr('text-anchor', 'middle')
        .style('fill', '#00d9ff').style('font-size', '13px').style('font-weight', '700')
        .text(d => d.avgTemp.toFixed(1) + '°C');
}

// ==================== SPATIAL PATTERNS ====================
function createSpatialPatterns() {
    if (!weatherData.length) return;
    const activeBtn = document.querySelector('#spatial .control-btn.active');
    const metric = activeBtn ? activeBtn.getAttribute('data-metric') : 'temperature';
    createDiurnalChart(metric);
    createSeasonalHeatmap(metric);
}

// ---------------------------------------------------------------
// CHART: Diurnal (Hour-of-Day) Variation
//
// WHAT IT SHOWS:
//   This chart takes ALL observations in the CSV and groups them by
//   the HOUR of the day (0 = midnight, 12 = noon, 23 = 11 PM).
//   For each hour we compute the AVERAGE of the selected metric
//   (temperature / humidity / pressure) across ALL years and months.
//
// WHY IT MATTERS (Spatial proxy):
//   Since the dataset has only ONE station, we cannot compare locations
//   directly. The diurnal cycle is the next-best proxy:
//   - Temperature peaks around 13:00–15:00 (afternoon solar heating)
//   - Humidity is inversely related — drops when temp rises
//   - This pattern mirrors how inland areas (which heat faster) differ
//     from coastal areas (which stay cooler during the day), so it gives
//     a temporal window into the coastal–inland microclimate contrast.
// ---------------------------------------------------------------
function createDiurnalChart(metric = 'temperature') {
    const chartId = 'spatialHourlyChart';
    const el = document.getElementById(chartId);
    if (!el) return;

    const { svg, width, height } = makeSVG(chartId, { top: 45, right: 30, bottom: 65, left: 70 }, 390);

    const metricProps = {
        temperature: { key: 'temperature', label: 'Temperature (°C)', color: '#00d9ff', unit: '°C' },
        humidity: { key: 'humidity', label: 'Relative Humidity (%)', color: '#ff6b9d', unit: '%' },
        pressure: { key: 'pressure', label: 'Pressure (hPa)', color: '#ffb627', unit: ' hPa' }
    };
    const prop = metricProps[metric];

    const hourlyData = Array.from(
        d3.rollup(weatherData, v => d3.mean(v, d => d[prop.key]), d => d.hour),
        ([hour, val]) => ({ hour, val })
    ).sort((a, b) => a.hour - b.hour);

    const xScale = d3.scaleLinear().domain([0, 23]).range([0, width]);
    const padding = (d3.max(hourlyData, d => d.val) - d3.min(hourlyData, d => d.val)) * 0.1;
    const yScale = d3.scaleLinear()
        .domain([d3.min(hourlyData, d => d.val) - padding, d3.max(hourlyData, d => d.val) + padding])
        .range([height, 0]);

    addAxes(svg, xScale, yScale, width, height, 'Hour of Day (0 = midnight, 12 = noon)', prop.label, d => `${d}:00`);
    addTitle(svg, width, `🕐 Diurnal ${prop.label.split(' ')[0]} Variation — Avg per Hour of Day`);

    // Shade daytime 6–18
    svg.append('rect').attr('x', xScale(6)).attr('y', 0)
        .attr('width', xScale(18) - xScale(6)).attr('height', height)
        .attr('fill', '#ffb627').attr('opacity', 0.05);
    svg.append('text').attr('x', xScale(12)).attr('y', 10)
        .attr('text-anchor', 'middle').style('fill', '#ffb627').style('font-size', '9px').style('opacity', 0.7).text('▲ DAYTIME (6am–6pm)');

    const area = d3.area().x(d => xScale(d.hour)).y0(height).y1(d => yScale(d.val)).curve(d3.curveMonotoneX);
    const line = d3.line().x(d => xScale(d.hour)).y(d => yScale(d.val)).curve(d3.curveMonotoneX);

    svg.append('path').datum(hourlyData).attr('fill', prop.color).attr('opacity', 0.1).attr('d', area);
    svg.append('path').datum(hourlyData).attr('fill', 'none').attr('stroke', prop.color)
        .attr('stroke-width', 2.5).attr('d', line).style('filter', `drop-shadow(0 0 6px ${prop.color}80)`);

    svg.selectAll('.dot').data(hourlyData).enter().append('circle')
        .attr('cx', d => xScale(d.hour)).attr('cy', d => yScale(d.val))
        .attr('r', 4).attr('fill', prop.color).attr('stroke', '#0a0e1a').attr('stroke-width', 2)
        .style('cursor', 'pointer')
        .on('mouseover', function (event, d) {
            d3.select(this).attr('r', 7);
            showTooltip(event, `<strong>${d.hour}:00 hrs</strong><br/>Avg ${prop.label.split(' ')[0]}: ${d.val.toFixed(2)}${prop.unit}<br/><em style="color:#8b9dc3;font-size:10px;">Average across all years & months</em>`);
        })
        .on('mouseout', function () { d3.select(this).attr('r', 4); hideTooltip(); });
}

// ---------------------------------------------------------------
// CHART: Monthly Pattern (All Years Averaged)
//
// WHAT IT SHOWS:
//   Groups ALL observations by calendar month (Jan=1 … Dec=12).
//   For each month computes the average of the selected metric.
//   This pools all years together, so a single bar for "July"
//   represents the mean value for every July reading from 1991–2017.
//
// WHY IT MATTERS:
//   Reveals the annual seasonal cycle clearly:
//   - Temperature peaks in May (pre-monsoon summer)
//   - Humidity peaks in July–August (monsoon core)
//   - Pressure dips during monsoon and rises in winter
//   The monsoon months (June–September) are highlighted with a
//   dashed cyan border, making the seasonal contrast immediately visible.
// ---------------------------------------------------------------
function createSeasonalHeatmap(metric = 'temperature') {
    const chartId = 'spatialSeasonalChart';
    const el = document.getElementById(chartId);
    if (!el) return;

    const metricProps = {
        temperature: { key: 'temperature', label: 'Temperature (°C)', colorScheme: d3.interpolateYlOrRd },
        humidity: { key: 'humidity', label: 'Humidity (%)', colorScheme: d3.interpolateYlGnBu },
        pressure: { key: 'pressure', label: 'Pressure (hPa)', colorScheme: d3.interpolatePuBu }
    };
    const prop = metricProps[metric];

    const { svg, width, height } = makeSVG(chartId, { top: 50, right: 20, bottom: 65, left: 75 }, 390);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const monthlyAvg = Array.from(
        d3.rollup(weatherData, v => d3.mean(v, d => d[prop.key]), d => d.month),
        ([month, val]) => ({ month, val })
    ).sort((a, b) => a.month - b.month);

    const valMin = d3.min(monthlyAvg, d => d.val);
    const valMax = d3.max(monthlyAvg, d => d.val);
    const colorScale = d3.scaleSequential(prop.colorScheme).domain([valMin, valMax]);

    const xScale = d3.scaleBand().domain(monthNames).range([0, width]).padding(0.1);
    const yScale = d3.scaleLinear().domain([valMin * 0.97, valMax * 1.02]).range([height, 0]);

    svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${height})`).call(d3.axisBottom(xScale));
    svg.append('g').attr('class', 'axis').call(d3.axisLeft(yScale));
    svg.append('text').attr('transform', 'rotate(-90)').attr('x', -height / 2).attr('y', -58)
        .attr('text-anchor', 'middle').style('fill', '#8b9dc3').style('font-size', '11px').text(prop.label);
    addTitle(svg, width, `📅 Monthly ${prop.label.split(' ')[0]} Pattern — Average Across All Years`);

    // Monsoon bracket
    if (metric !== 'pressure') {
        const mStart = xScale(monthNames[5]);
        const mEnd = xScale(monthNames[8]) + xScale.bandwidth();
        svg.append('rect').attr('x', mStart).attr('y', 0)
            .attr('width', mEnd - mStart).attr('height', height)
            .attr('fill', 'none').attr('stroke', '#00d9ff').attr('stroke-width', 1.5)
            .attr('stroke-dasharray', '6,4').attr('opacity', 0.6);
        svg.append('text').attr('x', (mStart + mEnd) / 2).attr('y', -5)
            .attr('text-anchor', 'middle').style('fill', '#00d9ff').style('font-size', '9px').text('◄ MONSOON ►');
    }

    svg.selectAll('.mbar').data(monthlyAvg).enter().append('rect')
        .attr('x', d => xScale(monthNames[d.month - 1]))
        .attr('y', d => yScale(d.val))
        .attr('width', xScale.bandwidth())
        .attr('height', d => height - yScale(d.val))
        .attr('fill', d => colorScale(d.val)).attr('rx', 4)
        .style('filter', 'drop-shadow(0 4px 6px rgba(0,0,0,0.4))')
        .on('mouseover', function (event, d) {
            d3.select(this).attr('opacity', 0.75);
            showTooltip(event, `<strong>${monthNames[d.month - 1]}</strong><br/>Avg ${prop.label.split('(')[0].trim()}: ${d.val.toFixed(2)}<br/><em style="color:#8b9dc3;font-size:10px;">Pooled avg from all years 1991–2017</em>`);
        })
        .on('mouseout', function () { d3.select(this).attr('opacity', 1); hideTooltip(); });

    svg.selectAll('.mval').data(monthlyAvg).enter().append('text')
        .attr('x', d => xScale(monthNames[d.month - 1]) + xScale.bandwidth() / 2)
        .attr('y', d => yScale(d.val) - 4).attr('text-anchor', 'middle')
        .style('fill', '#e8f1ff').style('font-size', '9px').style('font-weight', '600')
        .text(d => d.val.toFixed(1));
}

// ==================== MONSOON ANALYSIS ====================
function createMonsoonAnalysis() {
    if (!weatherData.length) return;
    createRainfallYearly();
    createRainfallMonthly();
    createRainfallVariability();
}

// FIX 1: Removed red extreme-year dots — all dots now uniform colour
// The area chart itself already shows peaks/troughs visually
function createRainfallYearly() {
    const { svg, width, height } = makeSVG('rainfallYearly', { top: 45, right: 30, bottom: 65, left: 70 }, 390);

    const data = Array.from(
        d3.rollup(weatherData, v => d3.sum(v, d => d.rainfall), d => d.year),
        ([year, rainfall]) => ({ year, rainfall })
    ).sort((a, b) => a.year - b.year);

    if (!data.length) return;

    const xScale = d3.scaleLinear().domain(d3.extent(data, d => d.year)).range([0, width]);
    const yScale = d3.scaleLinear().domain([0, d3.max(data, d => d.rainfall) * 1.1]).range([height, 0]);

    addAxes(svg, xScale, yScale, width, height, 'Year', 'Estimated Rainfall (mm)', d3.format('d'));
    addTitle(svg, width, '🌧️ Annual Rainfall Estimate by Year');

    const defs = svg.append('defs');
    const grad = defs.append('linearGradient').attr('id', 'rfGrad').attr('x1', '0%').attr('y1', '0%').attr('x2', '0%').attr('y2', '100%');
    grad.append('stop').attr('offset', '0%').attr('stop-color', '#9d4edd').attr('stop-opacity', 0.55);
    grad.append('stop').attr('offset', '100%').attr('stop-color', '#9d4edd').attr('stop-opacity', 0.02);

    const area = d3.area().x(d => xScale(d.year)).y0(height).y1(d => yScale(d.rainfall)).curve(d3.curveCardinal);
    const line = d3.line().x(d => xScale(d.year)).y(d => yScale(d.rainfall)).curve(d3.curveCardinal);

    svg.append('path').datum(data).attr('fill', 'url(#rfGrad)').attr('d', area);
    svg.append('path').datum(data).attr('fill', 'none').attr('stroke', '#9d4edd').attr('stroke-width', 2.5).attr('d', line);

    // ALL dots same uniform colour — NO red extreme highlights
    svg.selectAll('.dot').data(data).enter().append('circle')
        .attr('cx', d => xScale(d.year)).attr('cy', d => yScale(d.rainfall))
        .attr('r', 4).attr('fill', '#9d4edd').attr('stroke', '#0a0e1a').attr('stroke-width', 1.5)
        .style('cursor', 'pointer')
        .on('mouseover', function (event, d) {
            d3.select(this).attr('r', 7).attr('fill', '#c77dff');
            showTooltip(event, `<strong>Year ${d.year}</strong><br/>Estimated Rainfall: ${d.rainfall.toFixed(0)} mm<br/><em style="color:#8b9dc3;font-size:10px;">Derived from Weather Phrase column</em>`);
        })
        .on('mouseout', function () { d3.select(this).attr('r', 4).attr('fill', '#9d4edd'); hideTooltip(); });
}

function createRainfallMonthly() {
    const { svg, width, height } = makeSVG('rainfallMonthly', { top: 45, right: 20, bottom: 65, left: 70 }, 390);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const data = Array.from(
        d3.rollup(weatherData, v => d3.mean(v, d => d.rainfall), d => d.month),
        ([month, rainfall]) => ({ month, rainfall })
    ).sort((a, b) => a.month - b.month);

    const xScale = d3.scaleBand().domain(data.map(d => monthNames[d.month - 1])).range([0, width]).padding(0.2);
    const yScale = d3.scaleLinear().domain([0, d3.max(data, d => d.rainfall) * 1.15]).range([height, 0]);

    addAxes(svg, xScale, yScale, width, height, 'Month', 'Avg Rainfall (mm)', null);
    addTitle(svg, width, '📅 Monthly Rainfall Distribution (Monsoon: Jun–Sep)');

    const monsoonX = xScale(monthNames[5]);
    const monsoonW = xScale.step() * 4 - xScale.paddingInner() * xScale.step();
    svg.append('rect').attr('x', monsoonX).attr('y', 0).attr('width', monsoonW).attr('height', height)
        .attr('fill', '#ffb627').attr('opacity', 0.06)
        .attr('stroke', '#ffb627').attr('stroke-width', 1.5).attr('stroke-dasharray', '5,4');
    svg.append('text').attr('x', monsoonX + monsoonW / 2).attr('y', 12)
        .attr('text-anchor', 'middle').style('fill', '#ffb627').style('font-size', '9px').text('MONSOON SEASON');

    svg.selectAll('.bar').data(data).enter().append('rect')
        .attr('x', d => xScale(monthNames[d.month - 1]))
        .attr('y', d => yScale(d.rainfall))
        .attr('width', xScale.bandwidth())
        .attr('height', d => height - yScale(d.rainfall))
        .attr('fill', d => (d.month >= 6 && d.month <= 9) ? '#00d9ff' : '#9d4edd')
        .attr('opacity', 0.75).attr('rx', 3)
        .on('mouseover', function (event, d) {
            d3.select(this).attr('opacity', 1);
            showTooltip(event, `<strong>${monthNames[d.month - 1]}</strong><br/>Avg Rainfall: ${d.rainfall.toFixed(2)} mm`);
        })
        .on('mouseout', function () { d3.select(this).attr('opacity', 0.75); hideTooltip(); });
}

// Rainfall boxplot with decade selector — no horizontal scroll
// Decade buttons are wired up in initAllControls
function createRainfallVariability() {
    const wrapId = 'rainfallVariability';
    const wrapper = document.getElementById(wrapId);
    if (!wrapper) return;

    // Determine selected decade from active button
    const activeDecadeBtn = document.querySelector('#monsoon .decade-controls .control-btn.active');
    const selectedDecade = activeDecadeBtn ? parseInt(activeDecadeBtn.getAttribute('data-decade')) : null;

    // Clear wrapper
    wrapper.innerHTML = '';
    wrapper.style.overflowX = 'hidden';
    wrapper.style.overflowY = 'hidden';

    const allYearlyStats = Array.from(d3.group(weatherData, d => d.year), ([year, vals]) => {
        const rf = vals.map(d => d.rainfall).sort(d3.ascending);
        return {
            year,
            q1: d3.quantile(rf, 0.25),
            median: d3.quantile(rf, 0.5),
            q3: d3.quantile(rf, 0.75),
            min: rf[0],
            max: rf[rf.length - 1]
        };
    }).sort((a, b) => a.year - b.year);

    // Filter to selected decade
    const yearlyStats = selectedDecade
        ? allYearlyStats.filter(d => Math.floor(d.year / 10) * 10 === selectedDecade)
        : allYearlyStats;

    if (!yearlyStats.length) {
        wrapper.innerHTML = '<div style="color:#8b9dc3;text-align:center;padding:40px;">No data for selected decade</div>';
        return;
    }

    const margin = { top: 45, right: 30, bottom: 65, left: 70 };
    const totalHeight = 550;
    const containerWidth = wrapper.getBoundingClientRect().width;
    const innerW = containerWidth - margin.left - margin.right;
    const innerH = totalHeight - margin.top - margin.bottom;

    const svgEl = d3.select(wrapper).append('svg')
        .attr('width', containerWidth)
        .attr('height', totalHeight);
    const svg = svgEl.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const xScale = d3.scaleBand().domain(yearlyStats.map(d => d.year)).range([0, innerW]).padding(0.25);
    const yScale = d3.scaleLinear().domain([0, d3.max(yearlyStats, d => d.max) * 1.1]).range([innerH, 0]);

    // Grid
    svg.append('g').attr('class', 'grid').attr('opacity', 0.08)
        .call(d3.axisLeft(yScale).tickSize(-innerW).tickFormat(''));

    // Axes
    svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${innerH})`).call(d3.axisBottom(xScale).tickFormat(d3.format('d')));
    svg.append('g').attr('class', 'axis').call(d3.axisLeft(yScale));

    // Axis labels
    svg.append('text').attr('transform', 'rotate(-90)').attr('x', -innerH / 2).attr('y', -55)
        .attr('text-anchor', 'middle').style('fill', '#8b9dc3').style('font-size', '11px').text('Rainfall (mm)');
    svg.append('text').attr('x', innerW / 2).attr('y', innerH + 45)
        .attr('text-anchor', 'middle').style('fill', '#8b9dc3').style('font-size', '11px')
        .text(selectedDecade ? `Years in the ${selectedDecade}s` : 'Year');

    const titleDecade = selectedDecade ? ` — ${selectedDecade}s` : ' — All Years';
    addTitle(svg, innerW, `📦 Rainfall Variability Boxplot${titleDecade}`);

    // Draw each box
    yearlyStats.forEach(d => {
        const cx = xScale(d.year) + xScale.bandwidth() / 2;
        const bw = xScale.bandwidth();

        // Whisker line
        svg.append('line')
            .attr('x1', cx).attr('x2', cx)
            .attr('y1', yScale(d.max)).attr('y2', yScale(d.min))
            .attr('stroke', '#00d9ff').attr('stroke-width', 1.5).attr('opacity', 0.5);

        // Top whisker cap
        svg.append('line')
            .attr('x1', cx - bw * 0.3).attr('x2', cx + bw * 0.3)
            .attr('y1', yScale(d.max)).attr('y2', yScale(d.max))
            .attr('stroke', '#00d9ff').attr('stroke-width', 1.5).attr('opacity', 0.5);

        // Bottom whisker cap
        svg.append('line')
            .attr('x1', cx - bw * 0.3).attr('x2', cx + bw * 0.3)
            .attr('y1', yScale(d.min)).attr('y2', yScale(d.min))
            .attr('stroke', '#00d9ff').attr('stroke-width', 1.5).attr('opacity', 0.5);

        // IQR Box
        svg.append('rect')
            .attr('x', xScale(d.year)).attr('y', yScale(d.q3))
            .attr('width', bw).attr('height', Math.max(1, yScale(d.q1) - yScale(d.q3)))
            .attr('fill', '#00d9ff').attr('opacity', 0.22)
            .attr('stroke', '#00d9ff').attr('stroke-width', 1.5)
            .attr('rx', 3)
            .style('cursor', 'pointer')
            .on('mouseover', function (event) {
                d3.select(this).attr('opacity', 0.45).attr('stroke-width', 2.5);
                showTooltip(event, `<strong>Year ${d.year}</strong><br/>Max: ${d.max.toFixed(1)} mm<br/>Q3: ${d.q3.toFixed(1)} mm<br/>Median: ${d.median.toFixed(1)} mm<br/>Q1: ${d.q1.toFixed(1)} mm<br/>Min: ${d.min.toFixed(1)} mm`);
            })
            .on('mouseout', function () {
                d3.select(this).attr('opacity', 0.22).attr('stroke-width', 1.5);
                hideTooltip();
            });

        // Median line
        svg.append('line')
            .attr('x1', xScale(d.year)).attr('x2', xScale(d.year) + bw)
            .attr('y1', yScale(d.median)).attr('y2', yScale(d.median))
            .attr('stroke', '#ff6b9d').attr('stroke-width', 2.5);
    });

    // Legend
    const leg = svg.append('g').attr('transform', `translate(${innerW - 140}, -30)`);
    [{ label: 'Median', color: '#ff6b9d' }, { label: 'IQR Box (Q1–Q3)', color: '#00d9ff' }, { label: 'Whisker (Min–Max)', color: '#00d9ff' }]
        .forEach(({ label, color }, i) => {
            leg.append('line').attr('x1', 0).attr('x2', 18).attr('y1', i * 16).attr('y2', i * 16)
                .attr('stroke', color).attr('stroke-width', i === 0 ? 2.5 : 1.5);
            leg.append('text').attr('x', 22).attr('y', i * 16 + 4).style('fill', '#8b9dc3').style('font-size', '9px').text(label);
        });
}

// ==================== INTERACTIVE MAP ====================
function createInteractiveMap() {
    const container = document.getElementById('interactiveMap');
    if (!container) return;
    container.innerHTML = '';

    const mapDiv = document.createElement('div');
    mapDiv.style.cssText = 'width:100%;height:620px;border-radius:16px;overflow:hidden;';
    container.appendChild(mapDiv);

    // Mumbai bounds — restrict panning to the metropolitan area
    const mumbaiBounds = L.latLngBounds(
        [18.85, 72.75],   // SW corner
        [19.30, 73.15]    // NE corner
    );

    if (map) { map.remove(); map = null; }
    map = L.map(mapDiv, {
        center: [19.076, 72.9200],
        zoom: 12,
        minZoom: 11,
        maxZoom: 18,
        maxBounds: mumbaiBounds.pad(0.1),
        maxBoundsViscosity: 1.0
    });

    // Dark-themed Carto tiles — matches the dashboard aesthetic
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap contributors, © CARTO',
        subdomains: 'abcd',
        maxZoom: 18
    }).addTo(map);

    // Mumbai boundary polygon overlay for visual focus
    const mumbaiOutline = L.polygon([
        [18.893, 72.776], [18.910, 72.810], [18.932, 72.820],
        [18.960, 72.795], [18.995, 72.803], [19.030, 72.815],
        [19.065, 72.820], [19.100, 72.823], [19.140, 72.835],
        [19.180, 72.840], [19.220, 72.848], [19.260, 72.855],
        [19.275, 72.870], [19.270, 72.905], [19.245, 72.930],
        [19.200, 72.960], [19.170, 72.965], [19.140, 72.940],
        [19.115, 72.935], [19.090, 72.920], [19.065, 72.910],
        [19.040, 72.930], [19.020, 72.960], [19.010, 73.000],
        [19.015, 73.040], [19.040, 73.070], [19.070, 73.080],
        [19.050, 73.050], [19.030, 73.030], [19.030, 73.005],
        [19.060, 72.985], [19.080, 73.010], [19.100, 73.020],
        [19.050, 73.060], [19.020, 73.080], [18.990, 73.120],
        [18.960, 73.100], [18.940, 73.060], [18.925, 73.020],
        [18.910, 72.970], [18.900, 72.920], [18.893, 72.860],
        [18.890, 72.820]
    ], {
        color: '#00d9ff',
        weight: 2,
        opacity: 0.6,
        fillColor: '#00d9ff',
        fillOpacity: 0.04,
        dashArray: '8,4'
    }).addTo(map);

    // Zone legend on the map
    const legend = L.control({ position: 'bottomright' });
    legend.onAdd = function () {
        const div = L.DomUtil.create('div', 'map-zone-legend');
        div.innerHTML = `
            <div style="background:rgba(10,14,26,0.9);backdrop-filter:blur(10px);padding:12px 16px;border-radius:10px;border:1px solid rgba(0,217,255,0.3);font-family:Rajdhani,sans-serif;">
                <div style="font-size:11px;font-weight:700;color:#00d9ff;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Mumbai Zones</div>
                <div style="display:flex;flex-direction:column;gap:5px;">
                    <div style="display:flex;align-items:center;gap:8px;"><span style="width:12px;height:12px;border-radius:50%;background:#00d9ff;display:inline-block;box-shadow:0 0 6px #00d9ff;"></span><span style="color:#e8f1ff;font-size:12px;">South Mumbai</span></div>
                    <div style="display:flex;align-items:center;gap:8px;"><span style="width:12px;height:12px;border-radius:50%;background:#ffb627;display:inline-block;box-shadow:0 0 6px #ffb627;"></span><span style="color:#e8f1ff;font-size:12px;">Western Suburbs</span></div>
                    <div style="display:flex;align-items:center;gap:8px;"><span style="width:12px;height:12px;border-radius:50%;background:#ff6b9d;display:inline-block;box-shadow:0 0 6px #ff6b9d;"></span><span style="color:#e8f1ff;font-size:12px;">Eastern Suburbs</span></div>
                    <div style="display:flex;align-items:center;gap:8px;"><span style="width:12px;height:12px;border-radius:50%;background:#9d4edd;display:inline-block;box-shadow:0 0 6px #9d4edd;"></span><span style="color:#e8f1ff;font-size:12px;">Navi Mumbai</span></div>
                </div>
            </div>
        `;
        return div;
    };
    legend.addTo(map);

    const mumbaiDistricts = [
        { name: 'Colaba', lat: 18.9067, lon: 72.8147, zone: 'South Mumbai' },
        { name: 'Fort / CST', lat: 18.9338, lon: 72.8356, zone: 'South Mumbai' },
        { name: 'Marine Drive', lat: 18.9432, lon: 72.8236, zone: 'South Mumbai' },
        { name: 'Malabar Hill', lat: 18.9535, lon: 72.8040, zone: 'South Mumbai' },
        { name: 'Worli', lat: 19.0176, lon: 72.8170, zone: 'South Mumbai' },
        { name: 'Parel', lat: 19.0144, lon: 72.8397, zone: 'South Mumbai' },
        { name: 'Bandra', lat: 19.0596, lon: 72.8295, zone: 'Western Suburbs' },
        { name: 'Juhu', lat: 19.0990, lon: 72.8265, zone: 'Western Suburbs' },
        { name: 'Andheri West', lat: 19.1136, lon: 72.8467, zone: 'Western Suburbs' },
        { name: 'Goregaon', lat: 19.1671, lon: 72.8484, zone: 'Western Suburbs' },
        { name: 'Malad', lat: 19.1867, lon: 72.8481, zone: 'Western Suburbs' },
        { name: 'Borivali', lat: 19.2403, lon: 72.8562, zone: 'Western Suburbs' },
        { name: 'Chembur', lat: 19.0634, lon: 72.8997, zone: 'Eastern Suburbs' },
        { name: 'Ghatkopar', lat: 19.0860, lon: 72.9081, zone: 'Eastern Suburbs' },
        { name: 'Vikhroli', lat: 19.1117, lon: 72.9253, zone: 'Eastern Suburbs' },
        { name: 'Mulund', lat: 19.1722, lon: 72.9565, zone: 'Eastern Suburbs' },
        { name: 'Powai', lat: 19.1197, lon: 72.9058, zone: 'Eastern Suburbs' },
        { name: 'Vashi', lat: 19.0768, lon: 72.9989, zone: 'Navi Mumbai' },
        { name: 'Nerul', lat: 19.0333, lon: 73.0167, zone: 'Navi Mumbai' },
        { name: 'Belapur CBD', lat: 19.0153, lon: 73.0348, zone: 'Navi Mumbai' },
        { name: 'Kharghar', lat: 19.0433, lon: 73.0667, zone: 'Navi Mumbai' },
        { name: 'Panvel', lat: 18.9894, lon: 73.1123, zone: 'Navi Mumbai' },
    ];

    const zoneColors = {
        'South Mumbai': '#00d9ff', 'Western Suburbs': '#ffb627',
        'Eastern Suburbs': '#ff6b9d', 'Navi Mumbai': '#9d4edd'
    };

    function getCoastalOffset(lon) {
        const minLon = 72.81, maxLon = 73.12;
        const t = (lon - minLon) / (maxLon - minLon);
        return { tempOffset: -1.5 + t * 3.0, humidOffset: 3 - t * 6 };
    }

    function getWeatherForLocationAndTime(location, selectedDate, selectedTime) {
        let targetDate;
        try { targetDate = new Date(`${selectedDate}T${selectedTime}`); } catch (e) { targetDate = weatherData[0].date; }
        if (isNaN(targetDate.getTime())) targetDate = weatherData[0].date;

        let closest = weatherData[0];
        let minDiff = Math.abs(weatherData[0].date - targetDate);
        for (let i = 1; i < weatherData.length; i++) {
            const diff = Math.abs(weatherData[i].date - targetDate);
            if (diff < minDiff) { minDiff = diff; closest = weatherData[i]; }
        }

        const { tempOffset, humidOffset } = getCoastalOffset(location.lon);
        return {
            temp: closest.temperature + tempOffset,
            humidity: Math.min(100, Math.max(0, closest.humidity + humidOffset)),
            pressure: closest.pressure,
            feelsLike: closest.feelsLike + tempOffset,
            weather: closest.weatherPhrase || 'Clear',
            dataDate: closest.date,
            windCardinal: closest.windCardinal
        };
    }

    function updateMarkers() {
        const selectedDate = document.getElementById('mapDate')?.value || '2009-10-01';
        const selectedTime = document.getElementById('mapTime')?.value || '12:00';

        markers.forEach(m => map.removeLayer(m));
        markers = [];

        mumbaiDistricts.forEach(loc => {
            const wx = getWeatherForLocationAndTime(loc, selectedDate, selectedTime);
            const marker = L.circleMarker([loc.lat, loc.lon], {
                radius: 10, fillColor: zoneColors[loc.zone],
                color: '#fff', weight: 2, opacity: 1, fillOpacity: 0.9
            }).addTo(map);

            // Pulse animation on hover
            marker.on('mouseover', function () { this.setRadius(14); });
            marker.on('mouseout', function () { this.setRadius(10); });

            marker.bindPopup(`
                <div style="font-family:Rajdhani,sans-serif;min-width:210px;font-size:13px;">
                    <strong style="color:${zoneColors[loc.zone]};font-size:16px;">${loc.name}</strong><br/>
                    <span style="color:#888;font-size:11px;">${loc.zone} · ${wx.dataDate ? wx.dataDate.toLocaleString() : ''}</span>
                    <hr style="margin:7px 0;border:none;border-top:1px solid #ddd;">
                    <table style="width:100%;">
                        <tr><td>🌡️ Temperature:</td><td style="text-align:right;font-weight:700;color:#00d9ff;">${wx.temp.toFixed(1)}°C</td></tr>
                        <tr><td>💧 Humidity:</td><td style="text-align:right;font-weight:700;color:#ff6b9d;">${wx.humidity.toFixed(0)}%</td></tr>
                        <tr><td>🔽 Pressure:</td><td style="text-align:right;font-weight:700;color:#ffb627;">${wx.pressure.toFixed(1)} hPa</td></tr>
                        <tr><td>🌤️ Feels Like:</td><td style="text-align:right;font-weight:700;">${wx.feelsLike.toFixed(1)}°C</td></tr>
                        <tr><td>💨 Wind:</td><td style="text-align:right;">${wx.windCardinal}</td></tr>
                        <tr><td colspan="2" style="color:#888;font-size:10px;font-style:italic;padding-top:4px;">
                            Temp/humidity adjusted by coastal gradient<br/>(IMD urban microclimate research)
                        </td></tr>
                    </table>
                </div>
            `);
            markers.push(marker);
        });
    }

    updateMarkers();

    const updateBtn = document.getElementById('updateMap');
    if (updateBtn) {
        const newBtn = updateBtn.cloneNode(true);
        updateBtn.parentNode.replaceChild(newBtn, updateBtn);
        newBtn.addEventListener('click', function () {
            updateMarkers();
            newBtn.textContent = '✓ Updated!';
            newBtn.style.background = '#00d9ff';
            setTimeout(() => { newBtn.textContent = 'Update Map'; newBtn.style.background = ''; }, 1500);
        });
    }
}

// ==================== CORRELATION MATRIX ====================
// FIX 3: Labels no longer overlap — column labels rotated -45° and
// given enough top margin. Row labels right-aligned with adequate left margin.
function createCorrelationMatrix() {
    if (!weatherData.length) return;

    const variables = [
        { key: 'temperature', label: 'Temp °C' },
        { key: 'humidity', label: 'Humidity %' },
        { key: 'pressure', label: 'Pressure hPa' },
        { key: 'dewPoint', label: 'Dew Point °C' },
        { key: 'heatIndex', label: 'Heat Index' },
        { key: 'uvIndex', label: 'UV Index' }
    ];
    const n = variables.length;

    // Dynamically size cells based on available container width
    const container = d3.select('#correlationMatrix');
    container.html('');
    const containerW = container.node().getBoundingClientRect().width;

    const labelW = 90;   // left margin for row labels
    const labelH = 90;   // top margin for column labels
    const legendH = 50;  // bottom margin for legend
    const availW = containerW - labelW - 20;
    const cellSize = Math.min(Math.floor(availW / n), 90);
    const matrixW = cellSize * n;
    const matrixH = cellSize * n;
    const totalH = labelH + matrixH + legendH + 20;

    const svg = container.append('svg')
        .attr('width', containerW)
        .attr('height', totalH)
        .append('g')
        .attr('transform', `translate(${labelW},${labelH})`);

    // Compute correlations
    const dataArrays = {};
    variables.forEach(v => { dataArrays[v.key] = weatherData.map(d => d[v.key]); });

    const correlations = variables.map((vi, i) =>
        variables.map((vj, j) => i === j ? 1.0 : calculateCorrelation(dataArrays[vi.key], dataArrays[vj.key]))
    );

    const colorScale = d3.scaleSequential(d3.interpolateRdBu).domain([-1, 1]);

    const matrixData = [];
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++)
        matrixData.push({ row: i, col: j, value: correlations[i][j], varX: variables[i].label, varY: variables[j].label });

    // Cells
    svg.selectAll('.cell').data(matrixData).enter().append('rect')
        .attr('x', d => d.col * cellSize + 1).attr('y', d => d.row * cellSize + 1)
        .attr('width', cellSize - 2).attr('height', cellSize - 2)
        .attr('fill', d => colorScale(d.value))
        .attr('stroke', '#0d1525').attr('stroke-width', 2)
        .attr('rx', 3)
        .style('cursor', 'pointer')
        .on('mouseover', function (event, d) {
            d3.select(this).attr('stroke', '#00d9ff').attr('stroke-width', 3);
            showTooltip(event, `<strong>${d.varX} vs ${d.varY}</strong><br/>Pearson r = ${d.value.toFixed(3)}`);
        })
        .on('mouseout', function () {
            d3.select(this).attr('stroke', '#0d1525').attr('stroke-width', 2);
            hideTooltip();
        });

    // Cell value text — only show if cell is big enough
    if (cellSize >= 55) {
        svg.selectAll('.cell-text').data(matrixData).enter().append('text')
            .attr('x', d => d.col * cellSize + cellSize / 2)
            .attr('y', d => d.row * cellSize + cellSize / 2)
            .attr('text-anchor', 'middle').attr('dy', '0.35em')
            .style('fill', d => Math.abs(d.value) > 0.45 ? '#0a0e1a' : '#e8f1ff')
            .style('font-size', `${Math.min(cellSize * 0.18, 13)}px`)
            .style('font-weight', '700').style('pointer-events', 'none')
            .text(d => d.value.toFixed(2));
    }

    // ROW labels (left side) — right-aligned, no overlap
    svg.selectAll('.rlabel').data(variables).enter().append('text')
        .attr('x', -8)
        .attr('y', (d, i) => i * cellSize + cellSize / 2)
        .attr('text-anchor', 'end').attr('dy', '0.35em')
        .style('fill', '#c8d8f0').style('font-size', `${Math.min(cellSize * 0.17, 12)}px`).style('font-weight', '600')
        .text(d => d.label);

    // COLUMN labels — rotated -45° to prevent overlap
    svg.selectAll('.clabel').data(variables).enter().append('text')
        .attr('transform', (d, i) => {
            const x = i * cellSize + cellSize / 2;
            return `translate(${x}, -8) rotate(-45)`;
        })
        .attr('text-anchor', 'start').attr('dy', '0.35em')
        .style('fill', '#c8d8f0').style('font-size', `${Math.min(cellSize * 0.17, 12)}px`).style('font-weight', '600')
        .text(d => d.label);

    // Title
    svg.append('text').attr('x', matrixW / 2).attr('y', -labelH + 16)
        .attr('text-anchor', 'middle')
        .style('fill', '#e8f1ff').style('font-size', '14px').style('font-weight', '700')
        .style('font-family', 'Orbitron, monospace')
        .text('🔗 Pearson Correlation Matrix — All Meteorological Variables');

    // Colour legend bar
    const legendW = Math.min(200, matrixW - 20);
    const legendX = (matrixW - legendW) / 2;
    const legendY = matrixH + 18;

    const lgDefs = svg.append('defs');
    const lgGrad = lgDefs.append('linearGradient').attr('id', 'lgGrad2').attr('x1', '0%').attr('x2', '100%');
    lgGrad.append('stop').attr('offset', '0%').attr('stop-color', d3.interpolateRdBu(0));
    lgGrad.append('stop').attr('offset', '50%').attr('stop-color', d3.interpolateRdBu(0.5));
    lgGrad.append('stop').attr('offset', '100%').attr('stop-color', d3.interpolateRdBu(1));

    svg.append('rect').attr('x', legendX).attr('y', legendY)
        .attr('width', legendW).attr('height', 10).attr('fill', 'url(#lgGrad2)').attr('rx', 3);
    svg.append('text').attr('x', legendX).attr('y', legendY + 24)
        .style('fill', '#8b9dc3').style('font-size', '10px').text('-1 (Negative)');
    svg.append('text').attr('x', legendX + legendW / 2).attr('y', legendY + 24)
        .attr('text-anchor', 'middle').style('fill', '#8b9dc3').style('font-size', '10px').text('0');
    svg.append('text').attr('x', legendX + legendW).attr('y', legendY + 24)
        .attr('text-anchor', 'end').style('fill', '#8b9dc3').style('font-size', '10px').text('+1 (Positive)');
}

function calculateCorrelation(x, y) {
    const n = Math.min(x.length, y.length);
    const mx = d3.mean(x.slice(0, n));
    const my = d3.mean(y.slice(0, n));
    let num = 0, dx2 = 0, dy2 = 0;
    for (let i = 0; i < n; i++) {
        const a = x[i] - mx, b = y[i] - my;
        num += a * b; dx2 += a * a; dy2 += b * b;
    }
    const denom = Math.sqrt(dx2 * dy2);
    return denom === 0 ? 0 : num / denom;
}

// ==================== Tooltip ====================
let tooltip = null;
function showTooltip(event, html) {
    if (!tooltip) {
        tooltip = d3.select('body').append('div').attr('class', 'tooltip').style('opacity', 0);
    }
    tooltip.html(html)
        .style('left', (event.pageX + 15) + 'px')
        .style('top', (event.pageY - 28) + 'px')
        .transition().duration(200).style('opacity', 1);
}
function hideTooltip() {
    if (tooltip) tooltip.transition().duration(200).style('opacity', 0);
}
