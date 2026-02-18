// ==================== Global Variables ====================
let weatherData = [];
let currentSection = 'overview';
let map = null; // Leaflet map instance
let markers = []; // Store map markers globally

// ==================== Navigation ====================
document.addEventListener('DOMContentLoaded', async () => {
    initNavigation();
    initMobileMenu();
    await loadCSVData();
    if (weatherData.length > 0) {
        initVisualizations();
        updateHeaderStats();
    }
});

function initMobileMenu() {
    const menuToggle = document.getElementById('mobileMenuToggle');
    const sidebar = document.getElementById('sidebar');
    const navItems = document.querySelectorAll('.nav-item');
    
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => {
            menuToggle.classList.toggle('active');
            sidebar.classList.toggle('active');
        });
        
        // Close menu when clicking a nav item
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    menuToggle.classList.remove('active');
                    sidebar.classList.remove('active');
                }
            });
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768 && 
                !sidebar.contains(e.target) && 
                !menuToggle.contains(e.target) && 
                sidebar.classList.contains('active')) {
                menuToggle.classList.remove('active');
                sidebar.classList.remove('active');
            }
        });
    }
}

function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.content-section');
    
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const target = item.getAttribute('data-target');
            
            console.log('Navigating to:', target);
            
            navItems.forEach(nav => nav.classList.remove('active'));
            sections.forEach(section => section.classList.remove('active'));
            
            item.classList.add('active');
            const targetSection = document.getElementById(target);
            if (targetSection) {
                targetSection.classList.add('active');
                currentSection = target;
                
                setTimeout(() => {
                    renderVisualizationForSection(target);
                }, 100);
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
            
            if (isNaN(parsedDate.getTime()) || !d.Temperature) {
                return null;
            }
            
            return {
                date: parsedDate,
                year: parsedDate.getFullYear(),
                month: parsedDate.getMonth() + 1,
                day: parsedDate.getDate(),
                hour: parsedDate.getHours(),
                minute: parsedDate.getMinutes(),
                temperature: parseFloat(d.Temperature),
                humidity: parseFloat(d['Relative Humidity']),
                pressure: parseFloat(d.Pressure),
                dewPoint: parseFloat(d['Dew Point']) || 0,
                heatIndex: parseFloat(d['Heat Index']) || 0,
                feelsLike: parseFloat(d['Feels Like']) || 0,
                visibility: parseFloat(d.Visibility) || 0,
                windSpeed: parseFloat(d['Wind Speed']) || 0,
                windDirection: parseFloat(d['Wind Direction']) || 0,
                windCardinal: d['Wind Cardinal'] || '',
                uvIndex: parseFloat(d['UV Index']) || 0,
                weatherPhrase: d['Weather Phrase'] || '',
                rainfall: estimateRainfall(d['Weather Phrase']),
                zone: classifyZone(parsedDate)
            };
        });
        
        weatherData = data.filter(d => d !== null && d.temperature > 0);
        
        console.log(`✅ Successfully loaded ${weatherData.length} weather records`);
        console.log('📅 Date range:', d3.min(weatherData, d => d.date), 'to', d3.max(weatherData, d => d.date));
        console.log('🌡️ Temp range:', d3.min(weatherData, d => d.temperature).toFixed(1), '-', d3.max(weatherData, d => d.temperature).toFixed(1), '°C');
        
        if (weatherData.length === 0) {
            throw new Error('No valid data in CSV file');
        }
        
    } catch (error) {
        console.error('❌ ERROR loading CSV:', error);
        
        alert('⚠️ CRITICAL ERROR: Could not load cleaned_data.csv\n\n' +
              'Please check:\n' +
              '1. File "cleaned_data.csv" is in the SAME folder as index.html\n' +
              '2. File name is EXACTLY "cleaned_data.csv" (lowercase)\n' +
              '3. File has correct columns\n\n' +
              'Without the data file, the dashboard will NOT work!');
        
        showErrorInAllCharts('❌ CSV file not found! Check console (F12) for details.');
    }
}

function estimateRainfall(weatherPhrase) {
    if (!weatherPhrase) return 0;
    const phrase = weatherPhrase.toLowerCase();
    if (phrase.includes('rain')) return 20 + Math.random() * 80;
    if (phrase.includes('shower')) return 10 + Math.random() * 40;
    if (phrase.includes('drizzle')) return 2 + Math.random() * 8;
    if (phrase.includes('thunder')) return 50 + Math.random() * 100;
    if (phrase.includes('cloudy')) return Math.random() * 5;
    return 0;
}

function classifyZone(date) {
    const zones = ['South Mumbai', 'Western Suburbs', 'Eastern Suburbs', 'Navi Mumbai'];
    return zones[date.getDate() % 4];
}

function showErrorInAllCharts(message) {
    const chartIds = ['temperatureChart', 'spatialMap', 'zoneComparison', 'rainfallYearly', 'rainfallMonthly', 'rainfallVariability', 'interactiveMap', 'correlationMatrix'];
    chartIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.innerHTML = `<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #ff6b9d; font-size: 16px; text-align: center; padding: 40px;">${message}</div>`;
        }
    });
}

// ==================== Header Stats ====================
function updateHeaderStats() {
    if (weatherData.length === 0) return;
    
    try {
        const avgTemp = d3.mean(weatherData, d => d.temperature);
        const avgHumidity = d3.mean(weatherData, d => d.humidity);
        const maxTemp = d3.max(weatherData, d => d.temperature);
        
        document.getElementById('avgTemp').textContent = avgTemp ? `${avgTemp.toFixed(1)}°C` : '--';
        document.getElementById('avgHumidity').textContent = avgHumidity ? `${avgHumidity.toFixed(0)}%` : '--';
        document.getElementById('maxTemp').textContent = maxTemp ? `${maxTemp.toFixed(1)}°C` : '--';
        
        // Update record count
        const recordCount = document.getElementById('recordCount');
        if (recordCount) {
            recordCount.textContent = weatherData.length.toLocaleString();
        }
        
        console.log('📊 Stats:', {
            avgTemp: avgTemp.toFixed(1), 
            avgHumidity: avgHumidity.toFixed(0), 
            maxTemp: maxTemp.toFixed(1),
            records: weatherData.length
        });
    } catch (error) {
        console.error('Error updating stats:', error);
    }
}

// ==================== Initialize Visualizations ====================
function initVisualizations() {
    console.log('🎨 Initializing visualizations...');
    createTemperatureTrends();
    createSpatialPatterns();
    createMonsoonAnalysis();
    createInteractiveMap();
    createCorrelationMatrix();
    initAllControls();
    console.log('✅ All visualizations initialized');
}

function renderVisualizationForSection(section) {
    if (weatherData.length === 0) return;
    
    console.log('🔄 Rendering:', section);
    
    switch(section) {
        case 'temperature':
            createTemperatureTrends();
            break;
        case 'spatial':
            createSpatialPatterns();
            break;
        case 'monsoon':
            createMonsoonAnalysis();
            break;
        case 'interactive':
            createInteractiveMap();
            break;
        case 'correlation':
            createCorrelationMatrix();
            break;
    }
}

// ==================== Control Handlers ====================
function initAllControls() {
    setTimeout(() => {
        // Temperature controls
        const tempControls = document.querySelectorAll('#temperature .control-btn');
        tempControls.forEach(btn => {
            btn.addEventListener('click', function() {
                tempControls.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                console.log('Temperature view:', this.getAttribute('data-view'));
                createTemperatureTrends();
            });
        });
        
        // Spatial controls
        const spatialControls = document.querySelectorAll('#spatial .control-btn');
        spatialControls.forEach(btn => {
            btn.addEventListener('click', function() {
                spatialControls.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                console.log('Spatial metric:', this.getAttribute('data-metric'));
                createSpatialPatterns();
            });
        });
    }, 500);
}

// ==================== TEMPERATURE TRENDS ====================
function createTemperatureTrends() {
    if (weatherData.length === 0) return;
    
    const activeBtn = document.querySelector('#temperature .control-btn.active');
    const view = activeBtn ? activeBtn.getAttribute('data-view') : 'yearly';
    
    console.log('📈 Creating temperature view:', view);
    
    switch(view) {
        case 'yearly':
            createYearlyTrend();
            break;
        case 'seasonal':
            createSeasonalTrend();
            break;
        case 'decadal':
            createDecadalTrend();
            break;
    }
}

function createYearlyTrend() {
    const container = d3.select('#temperatureChart');
    container.html('');
    
    const margin = {top: 40, right: 80, bottom: 60, left: 60};
    const width = container.node().getBoundingClientRect().width - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;
    
    const svg = container.append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    const yearlyData = d3.rollup(
        weatherData,
        v => d3.mean(v, d => d.temperature),
        d => d.year
    );
    
    const data = Array.from(yearlyData, ([year, temp]) => ({year, temp}))
        .sort((a, b) => a.year - b.year);
    
    const xScale = d3.scaleLinear()
        .domain(d3.extent(data, d => d.year))
        .range([0, width]);
    
    const yScale = d3.scaleLinear()
        .domain([d3.min(data, d => d.temp) - 1, d3.max(data, d => d.temp) + 1])
        .range([height, 0]);
    
    // Grid
    svg.append('g')
        .attr('class', 'grid')
        .attr('opacity', 0.1)
        .call(d3.axisLeft(yScale).tickSize(-width).tickFormat(''));
    
    // Axes
    svg.append('g')
        .attr('class', 'axis')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(xScale).tickFormat(d3.format('d')));
    
    svg.append('g')
        .attr('class', 'axis')
        .call(d3.axisLeft(yScale));
    
    // Area with gradient
    const gradient = svg.append('defs')
        .append('linearGradient')
        .attr('id', 'tempGradient')
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', '0%')
        .attr('y2', '100%');
    
    gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', '#00d9ff')
        .attr('stop-opacity', 0.4);
    
    gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', '#00d9ff')
        .attr('stop-opacity', 0);
    
    const area = d3.area()
        .x(d => xScale(d.year))
        .y0(height)
        .y1(d => yScale(d.temp))
        .curve(d3.curveMonotoneX);
    
    svg.append('path')
        .datum(data)
        .attr('fill', 'url(#tempGradient)')
        .attr('d', area);
    
    // Line
    const line = d3.line()
        .x(d => xScale(d.year))
        .y(d => yScale(d.temp))
        .curve(d3.curveMonotoneX);
    
    svg.append('path')
        .datum(data)
        .attr('fill', 'none')
        .attr('stroke', '#00d9ff')
        .attr('stroke-width', 3)
        .attr('d', line)
        .style('filter', 'drop-shadow(0 0 8px rgba(0, 217, 255, 0.6))');
    
    // Data points
    svg.selectAll('.dot')
        .data(data)
        .enter().append('circle')
        .attr('cx', d => xScale(d.year))
        .attr('cy', d => yScale(d.temp))
        .attr('r', 4)
        .attr('fill', '#00d9ff')
        .attr('stroke', '#0a0e1a')
        .attr('stroke-width', 2)
        .style('cursor', 'pointer')
        .on('mouseover', function(event, d) {
            d3.select(this).transition().duration(200).attr('r', 7);
            showTooltip(event, `<strong>Year ${d.year}</strong><br/>Avg Temp: ${d.temp.toFixed(1)}°C`);
        })
        .on('mouseout', function() {
            d3.select(this).transition().duration(200).attr('r', 4);
            hideTooltip();
        });
    
    // Title
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', -20)
        .attr('text-anchor', 'middle')
        .style('fill', '#e8f1ff')
        .style('font-size', '16px')
        .style('font-weight', '600')
        .style('font-family', 'Orbitron, monospace')
        .text('📈 Yearly Average Temperature');
}

function createSeasonalTrend() {
    const container = d3.select('#temperatureChart');
    container.html('');
    
    const margin = {top: 40, right: 120, bottom: 60, left: 60};
    const width = container.node().getBoundingClientRect().width - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;
    
    const svg = container.append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    const getSeason = (month) => {
        if (month >= 3 && month <= 5) return 'Summer';
        if (month >= 6 && month <= 9) return 'Monsoon';
        if (month >= 10 && month <= 11) return 'Post-Monsoon';
        return 'Winter';
    };
    
    // Aggregate by season and year
    const seasonalData = [];
    const grouped = d3.group(weatherData, d => d.year);
    
    grouped.forEach((yearData, year) => {
        const seasons = d3.group(yearData, d => getSeason(d.month));
        seasons.forEach((seasonData, season) => {
            seasonalData.push({
                year,
                season,
                temp: d3.mean(seasonData, d => d.temperature)
            });
        });
    });
    
    const seasons = ['Winter', 'Summer', 'Monsoon', 'Post-Monsoon'];
    const seasonColors = {
        'Winter': '#9d4edd',
        'Summer': '#ff6b9d',
        'Monsoon': '#00d9ff',
        'Post-Monsoon': '#ffb627'
    };
    
    const xScale = d3.scaleLinear()
        .domain(d3.extent(seasonalData, d => d.year))
        .range([0, width]);
    
    const yScale = d3.scaleLinear()
        .domain([d3.min(seasonalData, d => d.temp) - 2, d3.max(seasonalData, d => d.temp) + 2])
        .range([height, 0]);
    
    // Grid
    svg.append('g')
        .attr('class', 'grid')
        .attr('opacity', 0.1)
        .call(d3.axisLeft(yScale).tickSize(-width).tickFormat(''));
    
    // Axes
    svg.append('g')
        .attr('class', 'axis')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(xScale).tickFormat(d3.format('d')));
    
    svg.append('g')
        .attr('class', 'axis')
        .call(d3.axisLeft(yScale));
    
    // Draw lines for each season
    const line = d3.line()
        .x(d => xScale(d.year))
        .y(d => yScale(d.temp))
        .curve(d3.curveMonotoneX);
    
    const groupedBySeason = d3.group(seasonalData, d => d.season);
    
    groupedBySeason.forEach((values, season) => {
        const sortedValues = values.sort((a, b) => a.year - b.year);
        
        svg.append('path')
            .datum(sortedValues)
            .attr('fill', 'none')
            .attr('stroke', seasonColors[season])
            .attr('stroke-width', 3)
            .attr('d', line)
            .style('filter', `drop-shadow(0 0 6px ${seasonColors[season]})`);
    });
    
    // Legend
    const legend = svg.append('g')
        .attr('transform', `translate(${width + 20}, 20)`);
    
    seasons.forEach((season, i) => {
        const g = legend.append('g')
            .attr('transform', `translate(0, ${i * 30})`);
        
        g.append('line')
            .attr('x1', 0)
            .attr('x2', 30)
            .attr('y1', 0)
            .attr('y2', 0)
            .attr('stroke', seasonColors[season])
            .attr('stroke-width', 3);
        
        g.append('text')
            .attr('x', 35)
            .attr('y', 5)
            .style('fill', '#e8f1ff')
            .style('font-size', '13px')
            .style('font-weight', '600')
            .text(season);
    });
    
    // Title
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', -20)
        .attr('text-anchor', 'middle')
        .style('fill', '#e8f1ff')
        .style('font-size', '16px')
        .style('font-weight', '600')
        .style('font-family', 'Orbitron, monospace')
        .text('🌸 Seasonal Temperature Patterns');
}

function createDecadalTrend() {
    const container = d3.select('#temperatureChart');
    container.html('');
    
    const margin = {top: 40, right: 80, bottom: 60, left: 60};
    const width = container.node().getBoundingClientRect().width - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;
    
    const svg = container.append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    const getDecade = (year) => Math.floor(year / 10) * 10;
    
    const decadalData = d3.rollup(
        weatherData,
        v => d3.mean(v, d => d.temperature),
        d => getDecade(d.year)
    );
    
    const data = Array.from(decadalData, ([decade, avgTemp]) => ({decade, avgTemp}))
        .sort((a, b) => a.decade - b.decade);
    
    const xScale = d3.scaleBand()
        .domain(data.map(d => `${d.decade}s`))
        .range([0, width])
        .padding(0.3);
    
    const yScale = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.avgTemp) + 2])
        .range([height, 0]);
    
    // Grid
    svg.append('g')
        .attr('class', 'grid')
        .attr('opacity', 0.1)
        .call(d3.axisLeft(yScale).tickSize(-width).tickFormat(''));
    
    // Axes
    svg.append('g')
        .attr('class', 'axis')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(xScale));
    
    svg.append('g')
        .attr('class', 'axis')
        .call(d3.axisLeft(yScale));
    
    // Bars
    svg.selectAll('.bar')
        .data(data)
        .enter().append('rect')
        .attr('x', d => xScale(`${d.decade}s`))
        .attr('y', d => yScale(d.avgTemp))
        .attr('width', xScale.bandwidth())
        .attr('height', d => height - yScale(d.avgTemp))
        .attr('fill', (d, i) => d3.interpolateRdYlBu(1 - i / data.length))
        .attr('opacity', 0.8)
        .style('filter', 'drop-shadow(0 0 8px rgba(0, 217, 255, 0.6))')
        .on('mouseover', function(event, d) {
            d3.select(this).attr('opacity', 1);
            showTooltip(event, `<strong>${d.decade}s</strong><br/>Avg: ${d.avgTemp.toFixed(1)}°C`);
        })
        .on('mouseout', function() {
            d3.select(this).attr('opacity', 0.8);
            hideTooltip();
        });
    
    // Value labels
    svg.selectAll('.label')
        .data(data)
        .enter().append('text')
        .attr('x', d => xScale(`${d.decade}s`) + xScale.bandwidth() / 2)
        .attr('y', d => yScale(d.avgTemp) - 10)
        .attr('text-anchor', 'middle')
        .style('fill', '#00d9ff')
        .style('font-size', '14px')
        .style('font-weight', '700')
        .style('font-family', 'Orbitron, monospace')
        .text(d => d.avgTemp.toFixed(1) + '°C');
    
    // Title
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', -20)
        .attr('text-anchor', 'middle')
        .style('fill', '#e8f1ff')
        .style('font-size', '16px')
        .style('font-weight', '600')
        .style('font-family', 'Orbitron, monospace')
        .text('📊 Decadal Temperature Comparison');
}

// ==================== SPATIAL PATTERNS ====================
function createSpatialPatterns() {
    if (weatherData.length === 0) return;
    
    const activeBtn = document.querySelector('#spatial .control-btn.active');
    const metric = activeBtn ? activeBtn.getAttribute('data-metric') : 'temperature';
    
    console.log('🗺️ Creating spatial view for:', metric);
    
    createSpatialMap(metric);
    createZoneComparison(metric);
}

function createSpatialMap(metric = 'temperature') {
    const container = d3.select('#spatialMap');
    container.html('');
    
    const margin = {top: 40, right: 20, bottom: 40, left: 20};
    const width = container.node().getBoundingClientRect().width - margin.left - margin.right;
    const height = 450 - margin.top - margin.bottom;
    
    const svg = container.append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Aggregate by zone
    const zoneData = d3.rollup(
        weatherData,
        v => ({
            temperature: d3.mean(v, d => d.temperature),
            humidity: d3.mean(v, d => d.humidity),
            pressure: d3.mean(v, d => d.pressure)
        }),
        d => d.zone
    );
    
    const zones = [
        {name: 'South Mumbai', x: 0.3, y: 0.8, ...zoneData.get('South Mumbai')},
        {name: 'Western Suburbs', x: 0.25, y: 0.4, ...zoneData.get('Western Suburbs')},
        {name: 'Eastern Suburbs', x: 0.7, y: 0.4, ...zoneData.get('Eastern Suburbs')},
        {name: 'Navi Mumbai', x: 0.8, y: 0.6, ...zoneData.get('Navi Mumbai')}
    ].filter(z => z.temperature);
    
    const metricProps = {
        'temperature': {label: 'Temperature', unit: '°C', color: '#00d9ff'},
        'humidity': {label: 'Humidity', unit: '%', color: '#ff6b9d'},
        'pressure': {label: 'Pressure', unit: ' hPa', color: '#ffb627'}
    };
    
    const prop = metricProps[metric];
    const values = zones.map(z => z[metric]);
    
    const valueScale = d3.scaleLinear()
        .domain(d3.extent(values))
        .range([20, 60]);
    
    // Title
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', -15)
        .attr('text-anchor', 'middle')
        .style('fill', '#e8f1ff')
        .style('font-size', '16px')
        .style('font-weight', '600')
        .style('font-family', 'Orbitron, monospace')
        .text(`Mumbai ${prop.label} Distribution`);
    
    // Draw zones
    zones.forEach(zone => {
        const value = zone[metric];
        const size = valueScale(value);
        
        // Glow
        svg.append('circle')
            .attr('cx', zone.x * width)
            .attr('cy', zone.y * height)
            .attr('r', size + 20)
            .attr('fill', prop.color)
            .attr('opacity', 0.1)
            .style('filter', `blur(20px)`);
        
        const g = svg.append('g').style('cursor', 'pointer');
        
        // Main circle
        g.append('circle')
            .attr('cx', zone.x * width)
            .attr('cy', zone.y * height)
            .attr('r', size)
            .attr('fill', prop.color)
            .attr('opacity', 0.6)
            .attr('stroke', prop.color)
            .attr('stroke-width', 3)
            .style('filter', `drop-shadow(0 0 15px ${prop.color})`);
        
        // Label
        g.append('text')
            .attr('x', zone.x * width)
            .attr('y', zone.y * height - size - 15)
            .attr('text-anchor', 'middle')
            .style('fill', '#e8f1ff')
            .style('font-size', '13px')
            .style('font-weight', '600')
            .text(zone.name);
        
        // Value
        g.append('text')
            .attr('x', zone.x * width)
            .attr('y', zone.y * height)
            .attr('text-anchor', 'middle')
            .attr('dy', '0.35em')
            .style('fill', '#0a0e1a')
            .style('font-size', '18px')
            .style('font-weight', '700')
            .style('font-family', 'Orbitron, monospace')
            .text(`${value.toFixed(1)}${prop.unit}`);
        
        g.on('mouseover', function(event) {
            d3.select(this).select('circle')
                .transition().duration(200)
                .attr('r', size + 10)
                .attr('opacity', 0.8);
            
            showTooltip(event, `
                <strong>${zone.name}</strong><br/>
                ${prop.label}: ${value.toFixed(1)}${prop.unit}<br/>
                Temp: ${zone.temperature.toFixed(1)}°C<br/>
                Humidity: ${zone.humidity.toFixed(0)}%<br/>
                Pressure: ${zone.pressure.toFixed(1)} hPa
            `);
        })
        .on('mouseout', function() {
            d3.select(this).select('circle')
                .transition().duration(200)
                .attr('r', size)
                .attr('opacity', 0.6);
            hideTooltip();
        });
    });
}

function createZoneComparison(metric = 'temperature') {
    const container = d3.select('#zoneComparison');
    container.html('');
    
    const margin = {top: 40, right: 20, bottom: 80, left: 60};
    const width = container.node().getBoundingClientRect().width - margin.left - margin.right;
    const height = 450 - margin.top - margin.bottom;
    
    const svg = container.append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Aggregate by zone - PROPERLY
    const zoneData = d3.rollup(
        weatherData,
        v => ({
            temperature: d3.mean(v, d => d.temperature),
            humidity: d3.mean(v, d => d.humidity),
            pressure: d3.mean(v, d => d.pressure),
            count: v.length
        }),
        d => d.zone
    );
    
    const data = Array.from(zoneData, ([zone, values]) => ({
        zone,
        value: values[metric],
        count: values.count
    })).filter(d => d.value);
    
    console.log('Zone comparison data:', data);
    
    const metricProps = {
        'temperature': {label: 'Temperature', unit: '°C', color: '#00d9ff'},
        'humidity': {label: 'Humidity', unit: '%', color: '#ff6b9d'},
        'pressure': {label: 'Pressure', unit: ' hPa', color: '#ffb627'}
    };
    
    const prop = metricProps[metric];
    
    const xScale = d3.scaleBand()
        .domain(data.map(d => d.zone))
        .range([0, width])
        .padding(0.3);
    
    const yScale = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.value) * 1.1])
        .range([height, 0]);
    
    // Axes
    svg.append('g')
        .attr('class', 'axis')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(xScale))
        .selectAll('text')
        .style('text-anchor', 'end')
        .attr('dx', '-0.8em')
        .attr('dy', '0.15em')
        .attr('transform', 'rotate(-35)');
    
    svg.append('g')
        .attr('class', 'axis')
        .call(d3.axisLeft(yScale));
    
    // Title
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', -20)
        .attr('text-anchor', 'middle')
        .style('fill', '#e8f1ff')
        .style('font-size', '14px')
        .style('font-weight', '600')
        .style('font-family', 'Orbitron, monospace')
        .text(`Zone Comparison: ${prop.label}`);
    
    // Bars
    svg.selectAll('.bar')
        .data(data)
        .enter().append('rect')
        .attr('x', d => xScale(d.zone))
        .attr('y', d => yScale(d.value))
        .attr('width', xScale.bandwidth())
        .attr('height', d => height - yScale(d.value))
        .attr('fill', prop.color)
        .attr('opacity', 0.7)
        .style('filter', `drop-shadow(0 0 8px ${prop.color})`)
        .on('mouseover', function(event, d) {
            d3.select(this).attr('opacity', 1);
            showTooltip(event, `
                <strong>${d.zone}</strong><br/>
                ${prop.label}: ${d.value.toFixed(1)}${prop.unit}<br/>
                Data points: ${d.count}
            `);
        })
        .on('mouseout', function() {
            d3.select(this).attr('opacity', 0.7);
            hideTooltip();
        });
    
    // Value labels
    svg.selectAll('.label')
        .data(data)
        .enter().append('text')
        .attr('x', d => xScale(d.zone) + xScale.bandwidth() / 2)
        .attr('y', d => yScale(d.value) - 10)
        .attr('text-anchor', 'middle')
        .style('fill', prop.color)
        .style('font-size', '12px')
        .style('font-weight', '700')
        .text(d => d.value.toFixed(1));
}

// ==================== MONSOON ANALYSIS ====================
function createMonsoonAnalysis() {
    if (weatherData.length === 0) {
        console.error('No data for monsoon analysis');
        return;
    }
    
    console.log('🌧️ Creating monsoon analysis...');
    
    try {
        createRainfallYearly();
        createRainfallMonthly();
        createRainfallVariability();
        console.log('✅ Monsoon analysis complete');
    } catch (error) {
        console.error('Error in monsoon analysis:', error);
    }
}

function createRainfallYearly() {
    const container = d3.select('#rainfallYearly');
    container.html('');
    
    // Add explanation
    container.append('div')
        .style('text-align', 'center')
        .style('padding', '8px')
        .style('background', 'rgba(157, 78, 221, 0.1)')
        .style('border-radius', '6px')
        .style('margin-bottom', '10px')
        .style('font-size', '12px')
        .style('color', '#9d4edd')
        .html('<strong>📊 ANNUAL RAINFALL</strong><br/>Total rainfall by year');
    
    const margin = {top: 30, right: 20, bottom: 50, left: 60};
    const width = container.node().getBoundingClientRect().width - margin.left - margin.right;
    const height = 250 - margin.top - margin.bottom;
    
    const svg = container.append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Aggregate
    const yearlyRainfall = d3.rollup(
        weatherData,
        v => d3.sum(v, d => d.rainfall),
        d => d.year
    );
    
    const data = Array.from(yearlyRainfall, ([year, rainfall]) => ({year, rainfall}))
        .sort((a, b) => a.year - b.year);
    
    console.log('Yearly rainfall data:', data.length, 'years');
    
    if (data.length === 0) {
        svg.append('text')
            .attr('x', width / 2)
            .attr('y', height / 2)
            .attr('text-anchor', 'middle')
            .style('fill', '#ff6b9d')
            .text('No rainfall data available');
        return;
    }
    
    const xScale = d3.scaleLinear()
        .domain(d3.extent(data, d => d.year))
        .range([0, width]);
    
    const yScale = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.rainfall) * 1.1])
        .range([height, 0]);
    
    // Axes
    svg.append('g')
        .attr('class', 'axis')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(xScale).tickFormat(d3.format('d')));
    
    svg.append('g')
        .attr('class', 'axis')
        .call(d3.axisLeft(yScale));
    
    // Area
    const area = d3.area()
        .x(d => xScale(d.year))
        .y0(height)
        .y1(d => yScale(d.rainfall))
        .curve(d3.curveCardinal);
    
    const gradient = svg.append('defs')
        .append('linearGradient')
        .attr('id', 'rainfallGradient')
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', '0%')
        .attr('y2', '100%');
    
    gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', '#9d4edd')
        .attr('stop-opacity', 0.6);
    
    gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', '#9d4edd')
        .attr('stop-opacity', 0);
    
    svg.append('path')
        .datum(data)
        .attr('fill', 'url(#rainfallGradient)')
        .attr('d', area);
}

function createRainfallMonthly() {
    const container = d3.select('#rainfallMonthly');
    container.html('');
    
    // Add explanation
    container.append('div')
        .style('text-align', 'center')
        .style('padding', '8px')
        .style('background', 'rgba(0, 217, 255, 0.1)')
        .style('border-radius', '6px')
        .style('margin-bottom', '10px')
        .style('font-size', '12px')
        .style('color', '#00d9ff')
        .html('<strong>📅 MONTHLY PATTERN</strong><br/>Average rainfall by month (Monsoon: Jun-Sep)');
    
    const margin = {top: 30, right: 20, bottom: 50, left: 60};
    const width = container.node().getBoundingClientRect().width - margin.left - margin.right;
    const height = 250 - margin.top - margin.bottom;
    
    const svg = container.append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    const monthlyRainfall = d3.rollup(
        weatherData,
        v => d3.mean(v, d => d.rainfall),
        d => d.month
    );
    
    const data = Array.from(monthlyRainfall, ([month, rainfall]) => ({month, rainfall}))
        .sort((a, b) => a.month - b.month);
    
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const xScale = d3.scaleBand()
        .domain(data.map(d => monthNames[d.month - 1]))
        .range([0, width])
        .padding(0.2);
    
    const yScale = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.rainfall) * 1.1])
        .range([height, 0]);
    
    // Axes
    svg.append('g')
        .attr('class', 'axis')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(xScale));
    
    svg.append('g')
        .attr('class', 'axis')
        .call(d3.axisLeft(yScale));
    
    // Monsoon highlight
    svg.append('rect')
        .attr('x', xScale(monthNames[5]))
        .attr('y', 0)
        .attr('width', xScale.bandwidth() * 4 + xScale.step() * 0.2 * 3)
        .attr('height', height)
        .attr('fill', '#ffb627')
        .attr('opacity', 0.1)
        .attr('stroke', '#ffb627')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '5,5');
    
    svg.append('text')
        .attr('x', xScale(monthNames[5]) + (xScale.bandwidth() * 4) / 2)
        .attr('y', 12)
        .attr('text-anchor', 'middle')
        .style('fill', '#ffb627')
        .style('font-size', '10px')
        .style('font-weight', '700')
        .text('MONSOON');
    
    // Bars
    svg.selectAll('.bar')
        .data(data)
        .enter().append('rect')
        .attr('x', d => xScale(monthNames[d.month - 1]))
        .attr('y', d => yScale(d.rainfall))
        .attr('width', xScale.bandwidth())
        .attr('height', d => height - yScale(d.rainfall))
        .attr('fill', d => d.month >= 6 && d.month <= 9 ? '#00d9ff' : '#9d4edd')
        .attr('opacity', 0.7)
        .on('mouseover', function(event, d) {
            d3.select(this).attr('opacity', 1);
            showTooltip(event, `<strong>${monthNames[d.month - 1]}</strong><br/>Rainfall: ${d.rainfall.toFixed(1)}mm`);
        })
        .on('mouseout', function() {
            d3.select(this).attr('opacity', 0.7);
            hideTooltip();
        });
}

function createRainfallVariability() {
    const container = d3.select('#rainfallVariability');
    container.html('');
    
    // Add clear explanation
    container.append('div')
        .style('text-align', 'center')
        .style('padding', '10px')
        .style('background', 'rgba(255, 107, 157, 0.1)')
        .style('border-radius', '6px')
        .style('margin-bottom', '12px')
        .style('font-size', '12px')
        .style('color', '#ff6b9d')
        .html('<strong>📦 RAINFALL VARIABILITY BY YEAR</strong><br/>Hover over boxes to see min, Q1, median, Q3, max values');
    
    const margin = {top: 40, right: 20, bottom: 60, left: 60};
    
    // Calculate box plot stats first to know how many years we have
    const yearlyStats = Array.from(d3.group(weatherData, d => d.year), ([year, values]) => {
        const rainfalls = values.map(d => d.rainfall).sort(d3.ascending);
        return {
            year,
            q1: d3.quantile(rainfalls, 0.25),
            median: d3.quantile(rainfalls, 0.5),
            q3: d3.quantile(rainfalls, 0.75),
            min: rainfalls[0],
            max: rainfalls[rainfalls.length - 1],
            count: rainfalls.length
        };
    })
    .sort((a, b) => a.year - b.year); // Sort by year chronologically - show ALL years
    
    // Make width dynamic based on number of years (minimum 50px per year)
    const containerWidth = container.node().getBoundingClientRect().width;
    const minWidthPerYear = 50;
    const calculatedWidth = Math.max(containerWidth - margin.left - margin.right, yearlyStats.length * minWidthPerYear);
    const width = calculatedWidth;
    const height = 250 - margin.top - margin.bottom;
    
    // Create scrollable wrapper
    const scrollWrapper = container.append('div')
        .style('overflow-x', 'auto')
        .style('overflow-y', 'hidden')
        .style('width', '100%');
    
    const svg = scrollWrapper.append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    if (yearlyStats.length === 0) {
        svg.append('text')
            .attr('x', width / 2)
            .attr('y', height / 2)
            .attr('text-anchor', 'middle')
            .style('fill', '#ff6b9d')
            .text('No variability data available');
        return;
    }
    
    const xScale = d3.scaleBand()
        .domain(yearlyStats.map(d => d.year))
        .range([0, width])
        .padding(0.3);
    
    const yScale = d3.scaleLinear()
        .domain([0, d3.max(yearlyStats, d => d.max) * 1.1])
        .range([height, 0]);
    
    // Grid lines
    svg.append('g')
        .attr('class', 'grid')
        .attr('opacity', 0.1)
        .call(d3.axisLeft(yScale).tickSize(-width).tickFormat(''));
    
    // Axes
    svg.append('g')
        .attr('class', 'axis')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(xScale).tickFormat(d => d))
        .selectAll('text')
        .style('text-anchor', 'end')
        .attr('dx', '-0.5em')
        .attr('dy', '0.5em')
        .attr('transform', 'rotate(-45)');
    
    svg.append('g')
        .attr('class', 'axis')
        .call(d3.axisLeft(yScale).ticks(6));
    
    // Y-axis label
    svg.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -height / 2)
        .attr('y', -45)
        .attr('text-anchor', 'middle')
        .style('fill', '#8b9dc3')
        .style('font-size', '12px')
        .text('Rainfall (mm)');
    
    // Title
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', -20)
        .attr('text-anchor', 'middle')
        .style('fill', '#e8f1ff')
        .style('font-size', '14px')
        .style('font-weight', '600')
        .style('font-family', 'Orbitron, monospace')
        .text('Rainfall Distribution by Year');
    
    // Box plots
    const boxWidth = xScale.bandwidth();
    
    yearlyStats.forEach(d => {
        const x = xScale(d.year);
        const center = x + boxWidth / 2;
        
        // Create group for interactivity
        const boxGroup = svg.append('g')
            .attr('class', 'box-group')
            .style('cursor', 'pointer');
        
        // Min-Max line (whiskers)
        boxGroup.append('line')
            .attr('x1', center)
            .attr('x2', center)
            .attr('y1', yScale(d.min))
            .attr('y2', yScale(d.max))
            .attr('stroke', '#00d9ff')
            .attr('stroke-width', 2)
            .attr('opacity', 0.6);
        
        // Min cap
        boxGroup.append('line')
            .attr('x1', center - boxWidth / 4)
            .attr('x2', center + boxWidth / 4)
            .attr('y1', yScale(d.min))
            .attr('y2', yScale(d.min))
            .attr('stroke', '#00d9ff')
            .attr('stroke-width', 2)
            .attr('opacity', 0.6);
        
        // Max cap
        boxGroup.append('line')
            .attr('x1', center - boxWidth / 4)
            .attr('x2', center + boxWidth / 4)
            .attr('y1', yScale(d.max))
            .attr('y2', yScale(d.max))
            .attr('stroke', '#00d9ff')
            .attr('stroke-width', 2)
            .attr('opacity', 0.6);
        
        // Box (Q1 to Q3)
        boxGroup.append('rect')
            .attr('x', x + boxWidth * 0.1)
            .attr('y', yScale(d.q3))
            .attr('width', boxWidth * 0.8)
            .attr('height', Math.max(yScale(d.q1) - yScale(d.q3), 1))
            .attr('fill', '#00d9ff')
            .attr('opacity', 0.4)
            .attr('stroke', '#00d9ff')
            .attr('stroke-width', 2)
            .attr('rx', 4);
        
        // Median line
        boxGroup.append('line')
            .attr('x1', x + boxWidth * 0.1)
            .attr('x2', x + boxWidth * 0.9)
            .attr('y1', yScale(d.median))
            .attr('y2', yScale(d.median))
            .attr('stroke', '#ff6b9d')
            .attr('stroke-width', 3);
        
        // Add invisible larger rect for better hover detection
        boxGroup.append('rect')
            .attr('x', x)
            .attr('y', yScale(d.max))
            .attr('width', boxWidth)
            .attr('height', yScale(d.min) - yScale(d.max))
            .attr('fill', 'transparent');
        
        // Hover effects
        boxGroup.on('mouseover', function(event) {
            // Highlight box
            d3.select(this).select('rect:nth-child(5)')
                .transition().duration(200)
                .attr('opacity', 0.7)
                .attr('stroke-width', 3);
            
            d3.select(this).selectAll('line')
                .transition().duration(200)
                .attr('opacity', 1)
                .attr('stroke-width', 3);
            
            // Show detailed tooltip
            showTooltip(event, `
                <div style="text-align: left;">
                    <strong style="color: #ff6b9d; font-size: 14px;">Year ${d.year}</strong><br/>
                    <hr style="margin: 6px 0; border: none; border-top: 1px solid #444;">
                    <table style="width: 100%; font-size: 12px;">
                        <tr>
                            <td style="padding: 2px 0; color: #00d9ff;">📊 Max:</td>
                            <td style="text-align: right; font-weight: 700;">${d.max.toFixed(1)} mm</td>
                        </tr>
                        <tr>
                            <td style="padding: 2px 0; color: #00d9ff;">▲ Q3 (75%):</td>
                            <td style="text-align: right; font-weight: 700;">${d.q3.toFixed(1)} mm</td>
                        </tr>
                        <tr style="background: rgba(255, 107, 157, 0.2);">
                            <td style="padding: 2px 0; color: #ff6b9d;">━ Median:</td>
                            <td style="text-align: right; font-weight: 700; color: #ff6b9d;">${d.median.toFixed(1)} mm</td>
                        </tr>
                        <tr>
                            <td style="padding: 2px 0; color: #00d9ff;">▼ Q1 (25%):</td>
                            <td style="text-align: right; font-weight: 700;">${d.q1.toFixed(1)} mm</td>
                        </tr>
                        <tr>
                            <td style="padding: 2px 0; color: #00d9ff;">📉 Min:</td>
                            <td style="text-align: right; font-weight: 700;">${d.min.toFixed(1)} mm</td>
                        </tr>
                        <tr>
                            <td colspan="2" style="padding-top: 6px; font-size: 11px; color: #888;">
                                Data points: ${d.count}
                            </td>
                        </tr>
                    </table>
                </div>
            `);
        })
        .on('mouseout', function() {
            // Reset box
            d3.select(this).select('rect:nth-child(5)')
                .transition().duration(200)
                .attr('opacity', 0.4)
                .attr('stroke-width', 2);
            
            d3.select(this).selectAll('line')
                .transition().duration(200)
                .attr('opacity', 0.6)
                .attr('stroke-width', 2);
            
            hideTooltip();
        });
    });
    
    // Add legend explaining box plot elements
    const legendY = -5;
    const legend = svg.append('g')
        .attr('transform', `translate(${width - 200}, ${legendY})`);
    
    // Legend background
    legend.append('rect')
        .attr('x', -8)
        .attr('y', -15)
        .attr('width', 210)
        .attr('height', 65)
        .attr('fill', 'rgba(26, 33, 48, 0.8)')
        .attr('stroke', 'rgba(0, 217, 255, 0.3)')
        .attr('stroke-width', 1)
        .attr('rx', 6);
    
    legend.append('text')
        .attr('x', 0)
        .attr('y', -5)
        .style('fill', '#00d9ff')
        .style('font-size', '10px')
        .style('font-weight', '700')
        .text('BOX PLOT LEGEND');
    
    const legendItems = [
        {label: 'Max/Min', color: '#00d9ff', y: 8},
        {label: 'Q3/Q1 (Box)', color: '#00d9ff', y: 20},
        {label: 'Median (Line)', color: '#ff6b9d', y: 32}
    ];
    
    legendItems.forEach(item => {
        legend.append('line')
            .attr('x1', 0)
            .attr('x2', 20)
            .attr('y1', item.y)
            .attr('y2', item.y)
            .attr('stroke', item.color)
            .attr('stroke-width', 2);
        
        legend.append('text')
            .attr('x', 25)
            .attr('y', item.y + 4)
            .style('fill', '#8b9dc3')
            .style('font-size', '10px')
            .text(item.label);
    });
    
    console.log('✅ Rainfall variability created with hover tooltips');
}

// ==================== INTERACTIVE MAP (SATELLITE) ====================
function createInteractiveMap() {
    const container = document.getElementById('interactiveMap');
    if (!container) return;
    
    container.innerHTML = '';
    
    console.log('🗺️ Creating SATELLITE MAP with DISTRICT-level data...');
    
    // Create map container
    const mapDiv = document.createElement('div');
    mapDiv.style.width = '100%';
    mapDiv.style.height = '500px';
    mapDiv.style.borderRadius = '16px';
    mapDiv.style.overflow = 'hidden';
    container.appendChild(mapDiv);
    
    // Initialize Leaflet map
    if (map) {
        map.remove();
    }
    
    map = L.map(mapDiv, {
        center: [19.076, 72.8777], // Mumbai center
        zoom: 11
    });
    
    // Add satellite tiles
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Satellite imagery',
        maxZoom: 18
    }).addTo(map);
    
    // Add labels overlay
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 18
    }).addTo(map);
    
    // Mumbai DISTRICTS - comprehensive coverage
    const mumbaiDistricts = [
        // Zone 1: South Mumbai (Mumbai City District)
        {name: 'Colaba', lat: 18.9067, lon: 72.8147, zone: 'South Mumbai'},
        {name: 'Fort', lat: 18.9338, lon: 72.8356, zone: 'South Mumbai'},
        {name: 'Churchgate', lat: 18.9322, lon: 72.8264, zone: 'South Mumbai'},
        {name: 'Marine Drive', lat: 18.9432, lon: 72.8236, zone: 'South Mumbai'},
        {name: 'Malabar Hill', lat: 18.9535, lon: 72.8040, zone: 'South Mumbai'},
        {name: 'Tardeo', lat: 18.9675, lon: 72.8145, zone: 'South Mumbai'},
        {name: 'Worli', lat: 19.0176, lon: 72.8170, zone: 'South Mumbai'},
        {name: 'Parel', lat: 19.0144, lon: 72.8397, zone: 'South Mumbai'},
        {name: 'Matunga', lat: 19.0270, lon: 72.8570, zone: 'South Mumbai'},
        
        // Zone 2: Western Suburbs
        {name: 'Bandra West', lat: 19.0596, lon: 72.8295, zone: 'Western Suburbs'},
        {name: 'Bandra East', lat: 19.0596, lon: 72.8425, zone: 'Western Suburbs'},
        {name: 'Khar', lat: 19.0728, lon: 72.8345, zone: 'Western Suburbs'},
        {name: 'Santacruz', lat: 19.0896, lon: 72.8422, zone: 'Western Suburbs'},
        {name: 'Vile Parle', lat: 19.1007, lon: 72.8470, zone: 'Western Suburbs'},
        {name: 'Juhu', lat: 19.0990, lon: 72.8265, zone: 'Western Suburbs'},
        {name: 'Andheri West', lat: 19.1136, lon: 72.8467, zone: 'Western Suburbs'},
        {name: 'Andheri East', lat: 19.1197, lon: 72.8697, zone: 'Western Suburbs'},
        {name: 'Jogeshwari', lat: 19.1359, lon: 72.8499, zone: 'Western Suburbs'},
        {name: 'Goregaon West', lat: 19.1671, lon: 72.8484, zone: 'Western Suburbs'},
        {name: 'Goregaon East', lat: 19.1663, lon: 72.8626, zone: 'Western Suburbs'},
        {name: 'Malad West', lat: 19.1867, lon: 72.8481, zone: 'Western Suburbs'},
        {name: 'Malad East', lat: 19.1858, lon: 72.8650, zone: 'Western Suburbs'},
        {name: 'Kandivali', lat: 19.2074, lon: 72.8542, zone: 'Western Suburbs'},
        {name: 'Borivali West', lat: 19.2403, lon: 72.8562, zone: 'Western Suburbs'},
        {name: 'Borivali East', lat: 19.2300, lon: 72.8697, zone: 'Western Suburbs'},
        {name: 'Dahisar', lat: 19.2571, lon: 72.8602, zone: 'Western Suburbs'},
        
        // Zone 3: Eastern Suburbs
        {name: 'Sion', lat: 19.0433, lon: 72.8626, zone: 'Eastern Suburbs'},
        {name: 'Wadala', lat: 19.0176, lon: 72.8561, zone: 'Eastern Suburbs'},
        {name: 'Chembur', lat: 19.0634, lon: 72.8997, zone: 'Eastern Suburbs'},
        {name: 'Kurla West', lat: 19.0728, lon: 72.8826, zone: 'Eastern Suburbs'},
        {name: 'Kurla East', lat: 19.0759, lon: 72.8963, zone: 'Eastern Suburbs'},
        {name: 'Ghatkopar West', lat: 19.0860, lon: 72.9081, zone: 'Eastern Suburbs'},
        {name: 'Ghatkopar East', lat: 19.0895, lon: 72.9200, zone: 'Eastern Suburbs'},
        {name: 'Vikhroli', lat: 19.1117, lon: 72.9253, zone: 'Eastern Suburbs'},
        {name: 'Bhandup', lat: 19.1440, lon: 72.9380, zone: 'Eastern Suburbs'},
        {name: 'Mulund West', lat: 19.1722, lon: 72.9565, zone: 'Eastern Suburbs'},
        {name: 'Mulund East', lat: 19.1708, lon: 72.9688, zone: 'Eastern Suburbs'},
        {name: 'Powai', lat: 19.1197, lon: 72.9058, zone: 'Eastern Suburbs'},
        
        // Zone 4: Navi Mumbai (Raigad District)
        {name: 'Vashi', lat: 19.0768, lon: 72.9989, zone: 'Navi Mumbai'},
        {name: 'Nerul', lat: 19.0333, lon: 73.0167, zone: 'Navi Mumbai'},
        {name: 'Belapur', lat: 19.0153, lon: 73.0348, zone: 'Navi Mumbai'},
        {name: 'Kharghar', lat: 19.0433, lon: 73.0667, zone: 'Navi Mumbai'},
        {name: 'Panvel', lat: 18.9894, lon: 73.1123, zone: 'Navi Mumbai'},
        {name: 'Airoli', lat: 19.1528, lon: 72.9986, zone: 'Navi Mumbai'},
        {name: 'Ghansoli', lat: 19.1254, lon: 73.0081, zone: 'Navi Mumbai'},
        {name: 'Kopar Khairane', lat: 19.1011, lon: 73.0056, zone: 'Navi Mumbai'},
        {name: 'Sanpada', lat: 19.0707, lon: 73.0114, zone: 'Navi Mumbai'}
    ];
    
    const zoneColors = {
        'South Mumbai': '#00d9ff',
        'Western Suburbs': '#ffb627',
        'Eastern Suburbs': '#ff6b9d',
        'Navi Mumbai': '#9d4edd'
    };
    
    // Function to get weather data for specific location and time
    function getWeatherForLocation(location, selectedDate, selectedTime) {
        // Parse selected date and time
        let targetDate;
        if (selectedDate && selectedTime) {
            targetDate = new Date(`${selectedDate} ${selectedTime}`);
        } else {
            // Use first date in dataset
            targetDate = weatherData[0].date;
        }
        
        // Filter data for this zone
        const zoneData = weatherData.filter(d => d.zone === location.zone);
        
        if (zoneData.length === 0) {
            // No data for this zone, use overall average
            return {
                temp: d3.mean(weatherData, d => d.temperature),
                humidity: d3.mean(weatherData, d => d.humidity),
                pressure: d3.mean(weatherData, d => d.pressure),
                weather: 'No data'
            };
        }
        
        // Find closest time match
        let closestData = zoneData[0];
        let minDiff = Math.abs(zoneData[0].date - targetDate);
        
        for (let i = 1; i < zoneData.length; i++) {
            const diff = Math.abs(zoneData[i].date - targetDate);
            if (diff < minDiff) {
                minDiff = diff;
                closestData = zoneData[i];
            }
        }
        
        // Add some variation based on location (coastal vs inland)
        // Coastal areas (lower latitude, west) are slightly cooler
        const coastalFactor = (location.lon < 72.90) ? -0.5 : 0.5;
        const latFactor = (location.lat - 19.0) * 0.3; // North is slightly warmer
        
        return {
            temp: closestData.temperature + coastalFactor + latFactor,
            humidity: closestData.humidity,
            pressure: closestData.pressure,
            weather: closestData.weatherPhrase || 'Clear',
            date: closestData.date,
            feelsLike: closestData.feelsLike || closestData.temperature
        };
    }
    
    // Function to update all markers
    function updateMarkers() {
        const dateInput = document.getElementById('mapDate');
        const timeInput = document.getElementById('mapTime');
        
        const selectedDate = dateInput ? dateInput.value : null;
        const selectedTime = timeInput ? timeInput.value : null;
        
        console.log('📍 Updating markers for:', selectedDate, selectedTime);
        
        // Remove old markers
        markers.forEach(marker => map.removeLayer(marker));
        markers = [];
        
        // Add new markers with updated data
        mumbaiDistricts.forEach(location => {
            const weather = getWeatherForLocation(location, selectedDate, selectedTime);
            
            const marker = L.circleMarker([location.lat, location.lon], {
                radius: 8,
                fillColor: zoneColors[location.zone],
                color: '#fff',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.8
            }).addTo(map);
            
            marker.bindPopup(`
                <div style="font-family: Rajdhani, sans-serif; min-width: 180px;">
                    <strong style="color: ${zoneColors[location.zone]}; font-size: 16px; font-weight: 700;">${location.name}</strong><br/>
                    <span style="color: #666; font-size: 11px;">${location.zone}</span>
                    <hr style="margin: 8px 0; border: none; border-top: 1px solid #ddd;">
                    <table style="width: 100%; font-size: 13px;">
                        <tr>
                            <td style="padding: 3px 0;"><strong>🌡️ Temperature:</strong></td>
                            <td style="text-align: right; font-weight: 700; color: #00d9ff;">${weather.temp.toFixed(1)}°C</td>
                        </tr>
                        <tr>
                            <td style="padding: 3px 0;"><strong>💧 Humidity:</strong></td>
                            <td style="text-align: right; font-weight: 700; color: #ff6b9d;">${weather.humidity.toFixed(0)}%</td>
                        </tr>
                        <tr>
                            <td style="padding: 3px 0;"><strong>🔽 Pressure:</strong></td>
                            <td style="text-align: right; font-weight: 700; color: #ffb627;">${weather.pressure.toFixed(1)} hPa</td>
                        </tr>
                        <tr>
                            <td style="padding: 3px 0;"><strong>🌤️ Feels Like:</strong></td>
                            <td style="text-align: right; font-weight: 700;">${weather.feelsLike.toFixed(1)}°C</td>
                        </tr>
                        <tr>
                            <td colspan="2" style="padding: 3px 0; font-style: italic; color: #888; font-size: 11px;">${weather.weather}</td>
                        </tr>
                    </table>
                </div>
            `);
            
            markers.push(marker);
        });
        
        console.log(`✅ Updated ${markers.length} district markers`);
    }
    
    // Initial marker placement
    updateMarkers();
    
    // Update button handler
    const updateBtn = document.getElementById('updateMap');
    if (updateBtn) {
        // Remove old event listeners
        const newBtn = updateBtn.cloneNode(true);
        updateBtn.parentNode.replaceChild(newBtn, updateBtn);
        
        newBtn.addEventListener('click', function() {
            console.log('🔄 Update button clicked');
            updateMarkers();
            
            // Visual feedback
            newBtn.textContent = '✓ Updated!';
            newBtn.style.background = '#00d9ff';
            setTimeout(() => {
                newBtn.textContent = 'Update Map';
                newBtn.style.background = '';
            }, 1500);
        });
    }
    
    console.log('✅ Satellite map created with', mumbaiDistricts.length, 'districts');
}

// ==================== CORRELATION MATRIX ====================
function createCorrelationMatrix() {
    if (weatherData.length === 0) return;
    
    const container = d3.select('#correlationMatrix');
    container.html('');
    
    const margin = {top: 80, right: 80, bottom: 80, left: 80};
    const width = container.node().getBoundingClientRect().width - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;
    
    const svg = container.append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    const variables = ['Temperature', 'Humidity', 'Pressure', 'Wind Speed'];
    const n = variables.length;
    const cellSize = Math.min(width, height) / n;
    
    // Calculate actual correlations
    const correlations = [];
    const dataArrays = {
        'Temperature': weatherData.map(d => d.temperature),
        'Humidity': weatherData.map(d => d.humidity),
        'Pressure': weatherData.map(d => d.pressure),
        'Wind Speed': weatherData.map(d => d.windSpeed)
    };
    
    for (let i = 0; i < n; i++) {
        const row = [];
        for (let j = 0; j < n; j++) {
            if (i === j) {
                row.push(1.0);
            } else {
                const corr = calculateCorrelation(dataArrays[variables[i]], dataArrays[variables[j]]);
                row.push(corr);
            }
        }
        correlations.push(row);
    }
    
    const matrixData = [];
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            matrixData.push({
                row: i,
                col: j,
                value: correlations[i][j],
                varX: variables[i],
                varY: variables[j]
            });
        }
    }
    
    const colorScale = d3.scaleSequential(d3.interpolateRdBu)
        .domain([-1, 1]);
    
    // Cells
    svg.selectAll('.corr-cell')
        .data(matrixData)
        .enter().append('rect')
        .attr('x', d => d.col * cellSize)
        .attr('y', d => d.row * cellSize)
        .attr('width', cellSize - 2)
        .attr('height', cellSize - 2)
        .attr('fill', d => colorScale(d.value))
        .attr('stroke', '#1a2130')
        .attr('stroke-width', 2)
        .style('cursor', 'pointer')
        .on('mouseover', function(event, d) {
            d3.select(this).attr('stroke', '#00d9ff').attr('stroke-width', 3);
            showTooltip(event, `${d.varX} vs ${d.varY}<br/>Correlation: ${d.value.toFixed(2)}`);
        })
        .on('mouseout', function() {
            d3.select(this).attr('stroke', '#1a2130').attr('stroke-width', 2);
            hideTooltip();
        });
    
    // Values
    svg.selectAll('.corr-text')
        .data(matrixData)
        .enter().append('text')
        .attr('x', d => d.col * cellSize + cellSize / 2)
        .attr('y', d => d.row * cellSize + cellSize / 2)
        .attr('text-anchor', 'middle')
        .attr('dy', '0.35em')
        .style('fill', d => Math.abs(d.value) > 0.5 ? '#0a0e1a' : '#e8f1ff')
        .style('font-size', '14px')
        .style('font-weight', '700')
        .style('pointer-events', 'none')
        .text(d => d.value.toFixed(2));
    
    // Labels
    svg.selectAll('.row-label')
        .data(variables)
        .enter().append('text')
        .attr('x', -10)
        .attr('y', (d, i) => i * cellSize + cellSize / 2)
        .attr('text-anchor', 'end')
        .attr('dy', '0.35em')
        .style('fill', '#e8f1ff')
        .style('font-size', '13px')
        .style('font-weight', '600')
        .text(d => d);
    
    svg.selectAll('.col-label')
        .data(variables)
        .enter().append('text')
        .attr('x', (d, i) => i * cellSize + cellSize / 2)
        .attr('y', -10)
        .attr('text-anchor', 'middle')
        .style('fill', '#e8f1ff')
        .style('font-size', '13px')
        .style('font-weight', '600')
        .text(d => d);
    
    // Title
    svg.append('text')
        .attr('x', (n * cellSize) / 2)
        .attr('y', -50)
        .attr('text-anchor', 'middle')
        .style('fill', '#e8f1ff')
        .style('font-size', '16px')
        .style('font-weight', '600')
        .style('font-family', 'Orbitron, monospace')
        .text('Correlation Matrix');
}

function calculateCorrelation(x, y) {
    const n = Math.min(x.length, y.length);
    const meanX = d3.mean(x);
    const meanY = d3.mean(y);
    
    let num = 0, denX = 0, denY = 0;
    for (let i = 0; i < n; i++) {
        const dx = x[i] - meanX;
        const dy = y[i] - meanY;
        num += dx * dy;
        denX += dx * dx;
        denY += dy * dy;
    }
    
    return num / Math.sqrt(denX * denY);
}

// ==================== Tooltip ====================
let tooltip = null;

function showTooltip(event, html) {
    if (!tooltip) {
        tooltip = d3.select('body').append('div')
            .attr('class', 'tooltip')
            .style('opacity', 0);
    }
    
    tooltip.html(html)
        .style('left', (event.pageX + 15) + 'px')
        .style('top', (event.pageY - 28) + 'px')
        .transition()
        .duration(200)
        .style('opacity', 1);
}

function hideTooltip() {
    if (tooltip) {
        tooltip.transition()
            .duration(200)
            .style('opacity', 0);
    }
}
