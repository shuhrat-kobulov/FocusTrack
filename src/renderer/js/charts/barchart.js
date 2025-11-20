// Bar Chart Implementation for Application Usage Time
let barChartData = [];
let barChartInterval;
let barChart;

// Initialize bar chart when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
    initBarChart();

    // Add event listener for refresh button
    const refreshBtn = document.getElementById('refresh-bar-chart');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            updateBarChart();
        });
    }
});

// Auto-update bar chart when tracking starts
document.getElementById('start-btn').addEventListener('click', () => {
    if (barChartInterval) {
        clearInterval(barChartInterval);
    }
    barChartInterval = setInterval(() => {
        updateBarChart();
    }, 2000);
});

// Stop auto-update when tracking stops
document.getElementById('stop-btn').addEventListener('click', () => {
    if (barChartInterval) {
        clearInterval(barChartInterval);
    }
});

// Stop auto-update when reset button is clicked
document.getElementById('reset-btn').addEventListener('click', () => {
    if (barChartInterval) {
        clearInterval(barChartInterval);
    }
    // Clear the chart after reset
    setTimeout(() => {
        barChartData = [];
        updateBarChart();
    }, 100);
});

function initBarChart() {
    // Set dimensions and margins for the horizontal bar chart
    const margin = { top: 40, right: 60, bottom: 40, left: 120 };
    const width = 600 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    // Create SVG container
    const svg = d3
        .select('#bar-chart')
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom);

    // Create chart group
    barChart = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Add chart title
    svg.append('text')
        .attr('class', 'chart-title')
        .attr('x', (width + margin.left + margin.right) / 2)
        .attr('y', 25)
        .attr('text-anchor', 'middle')
        .style('font-size', '16px')
        .style('font-weight', 'bold')
        .text('Application Usage Time');

    // Add X-axis label
    svg.append('text')
        .attr('class', 'x-axis-label')
        .attr('x', (width + margin.left + margin.right) / 2)
        .attr('y', height + margin.top + margin.bottom - 10)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .text('Usage Time (minutes)');

    // Add Y-axis label
    svg.append('text')
        .attr('class', 'y-axis-label')
        .attr('transform', 'rotate(-90)')
        .attr('x', -(height + margin.top) / 2)
        .attr('y', 20)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .text('Applications');

    // Create initial empty scales and axes
    const xScale = d3.scaleLinear().range([0, width]);

    const yScale = d3.scaleBand().range([0, height]).padding(0.1);

    // Add X-axis
    barChart
        .append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0,${height})`);

    // Add Y-axis
    barChart.append('g').attr('class', 'y-axis');

    // Initial render with empty data
    updateBarChart();
}

function prepareBarChartData() {
    if (!history || history.length === 0) {
        return [];
    }

    // Convert history data to bar chart format
    const appUsageData = [];

    // Get unique applications from history
    const uniqueApps = [...new Set(history)];

    uniqueApps.forEach((appName) => {
        const timeElement = document.getElementById(appName);
        if (timeElement) {
            const timeText = timeElement.textContent;
            const timeInMinutes = convertTimeToMinutes(timeText);

            if (timeInMinutes > 0) {
                appUsageData.push({
                    application: appName,
                    usageTime: timeInMinutes,
                    displayTime: timeText,
                });
            }
        }
    });

    // Sort by usage time (highest to lowest)
    appUsageData.sort((a, b) => b.usageTime - a.usageTime);

    return appUsageData;
}

function convertTimeToMinutes(timeString) {
    // Parse time string in format "HH:MM:SS" or "MM:SS"
    const parts = timeString.split(':').map((num) => parseInt(num, 10));

    if (parts.length === 3) {
        // HH:MM:SS format
        return parts[0] * 60 + parts[1] + parts[2] / 60;
    } else if (parts.length === 2) {
        // MM:SS format
        return parts[0] + parts[1] / 60;
    } else if (parts.length === 1) {
        // SS format
        return parts[0] / 60;
    }

    return 0;
}

function updateBarChart() {
    barChartData = prepareBarChartData();

    if (!barChart) {
        console.warn('Bar chart not initialized');
        return;
    }

    // Set dimensions
    const width = 480;
    const height = 320;

    if (barChartData.length === 0) {
        // Clear chart and show empty message
        barChart.selectAll('.bar').remove();
        barChart.selectAll('.bar-label').remove();

        // Update axes with empty domains
        const xScale = d3.scaleLinear().range([0, width]);
        const yScale = d3.scaleBand().range([0, height]).padding(0.1);

        barChart
            .select('.x-axis')
            .transition()
            .duration(500)
            .call(d3.axisBottom(xScale));

        barChart
            .select('.y-axis')
            .transition()
            .duration(500)
            .call(d3.axisLeft(yScale));

        // Show empty state message
        let emptyMessage = barChart.select('.empty-message');
        if (emptyMessage.empty()) {
            emptyMessage = barChart
                .append('text')
                .attr('class', 'empty-message')
                .attr('text-anchor', 'middle')
                .style('font-size', '14px')
                .style('fill', 'var(--text-muted)');
        }

        emptyMessage
            .attr('x', width / 2)
            .attr('y', height / 2)
            .text('Start tracking to see application usage data');

        return;
    }

    // Remove empty message if it exists
    barChart.select('.empty-message').remove();

    // Update scales for horizontal bars
    const xScale = d3
        .scaleLinear()
        .domain([0, d3.max(barChartData, (d) => d.usageTime) * 1.1])
        .range([0, width]);

    const yScale = d3
        .scaleBand()
        .domain(barChartData.map((d) => d.application))
        .range([0, height])
        .padding(0.1);

    // Color scale for different bars
    const colorScale = d3.scaleOrdinal(d3.schemeCategory20);

    // Update axes
    barChart
        .select('.x-axis')
        .transition()
        .duration(500)
        .call(d3.axisBottom(xScale).tickFormat((d) => `${Math.round(d)}m`));

    barChart
        .select('.y-axis')
        .transition()
        .duration(500)
        .call(d3.axisLeft(yScale))
        .selectAll('text')
        .style('font-size', '11px');

    // Create tooltip
    const tooltip = d3.select('body').selectAll('.tooltip').data([0]);

    const tooltipEnter = tooltip
        .enter()
        .append('div')
        .attr('class', 'tooltip')
        .style('position', 'absolute')
        .style('visibility', 'hidden')
        .style('background', 'rgba(0, 0, 0, 0.8)')
        .style('color', 'white')
        .style('padding', '8px')
        .style('border-radius', '4px')
        .style('font-size', '12px')
        .style('z-index', '1000');

    const tooltipMerged = tooltipEnter.merge(tooltip);

    // Bind data to bars (horizontal)
    const bars = barChart
        .selectAll('.bar')
        .data(barChartData, (d) => d.application);

    // Remove old bars
    bars.exit().transition().duration(500).attr('width', 0).remove();

    // Add new bars (horizontal)
    const barsEnter = bars
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', 0)
        .attr('y', (d) => yScale(d.application))
        .attr('width', 0)
        .attr('height', yScale.bandwidth())
        .attr('fill', (d, i) => colorScale(i))
        .style('cursor', 'pointer');

    // Merge and update all bars
    const barsUpdate = barsEnter.merge(bars);

    barsUpdate
        .transition()
        .duration(500)
        .attr('x', 0)
        .attr('y', (d) => yScale(d.application))
        .attr('width', (d) => xScale(d.usageTime))
        .attr('height', yScale.bandwidth())
        .attr('fill', (d, i) => colorScale(i));

    // Add hover effects
    barsUpdate
        .on('mouseover', function (d) {
            d3.select(this).transition().duration(200).style('opacity', 0.7);

            tooltipMerged.style('visibility', 'visible').html(`
                    <strong>${d.application}</strong><br/>
                    Usage Time: ${d.displayTime}<br/>
                    (${Math.round(d.usageTime * 10) / 10} minutes)
                `);
        })
        .on('mousemove', function () {
            tooltipMerged
                .style('top', d3.event.pageY - 10 + 'px')
                .style('left', d3.event.pageX + 10 + 'px');
        })
        .on('mouseout', function () {
            d3.select(this).transition().duration(200).style('opacity', 1);

            tooltipMerged.style('visibility', 'hidden');
        });

    // Add value labels at the end of bars (horizontal)
    const labels = barChart
        .selectAll('.bar-label')
        .data(barChartData, (d) => d.application);

    labels.exit().remove();

    const labelsEnter = labels
        .enter()
        .append('text')
        .attr('class', 'bar-label')
        .attr('text-anchor', 'start')
        .style('font-size', '10px')
        .style('font-weight', 'bold')
        .style('alignment-baseline', 'middle');

    const labelsUpdate = labelsEnter.merge(labels);

    labelsUpdate
        .transition()
        .duration(500)
        .attr('x', (d) => xScale(d.usageTime) + 5)
        .attr('y', (d) => yScale(d.application) + yScale.bandwidth() / 2)
        .text((d) => d.displayTime);
}

// Function to manually refresh bar chart
function refreshBarChart() {
    updateBarChart();
}

// Export function for external use
window.refreshBarChart = refreshBarChart;
