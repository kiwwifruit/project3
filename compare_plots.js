document.addEventListener('DOMContentLoaded', function () {
    const featureSelect = document.getElementById('featureSelect');
    featureSelect.addEventListener('change', function() {
        updateCharts(this.value);
    });

    updateCharts('hr'); // Initialize with 'hr'

    function updateCharts(feature) {
        const filePaths = getFilePathsForFeature(feature);
        const promises = filePaths.map(path =>
            fetch(path)
            .then(response => response.text())
            .then(data => prepareChartData(data, path.split('/').pop()))
        );
    
        Promise.all(promises).then(chartDataSets => {
            alignYAxis(chartDataSets);
            
            // Instead of clearing, update the charts smoothly
            if (d3.select(".pair-graph-container").empty()) {
                renderCharts(chartDataSets, feature);
            } else {
                updateGraphData(chartDataSets);
            }
        });
    }

    function updateGraphData(chartDataSets) {
        const pairContainer = d3.select(".pair-graph-container");
    
        chartDataSets.forEach((chartData, index) => {
            const container = pairContainer.selectAll(".pair-graph").nodes()[index];
            const svg = d3.select(container).select("svg g");
    
            const width = 550 - 60 - 40;
            const height = 300 - 40 - 60;
    
            const xScale = d3.scaleLinear().domain([0, 180]).range([0, width]);
            const yScale = d3.scaleLinear().domain([chartData.alignedMinY, chartData.alignedMaxY]).range([height, 0]);
    
            // **Update the Title Dynamically**
            d3.select(container).select(".pair-graph-title")
                .transition()
                .duration(750)
                .text(`${chartData.label} - Grade: ${chartData.grade}`);
    
            // **Update the y-axis scale**
            const yAxis = d3.axisLeft(yScale).tickValues(d3.ticks(chartData.alignedMinY, chartData.alignedMaxY, 7));
            svg.select(".y-axis")
                .transition()
                .duration(750)
                .call(yAxis);
    
            // **Update the x-axis scale**
            const xAxis = d3.axisBottom(xScale).tickValues(d3.range(0, 181, 20));
            svg.select(".x-axis")
                .transition()
                .duration(750)
                .call(xAxis);
    
            // **Update the data line with a transition**
            const line = d3.line()
                .defined(d => d !== null)
                .x((_, i) => xScale(i))
                .y(d => yScale(d))
                .curve(d3.curveMonotoneX);
    
            svg.select(".data-line")
                .datum(chartData.data)
                .transition()
                .duration(750)
                .attr("d", line);
    
            // **Update the average line with a transition**
            svg.select(".avg-line")
                .transition()
                .duration(750)
                .attr("y1", yScale(chartData.average))
                .attr("y2", yScale(chartData.average));
    
            // **Update the tooltip hover area**
            svg.select(".avg-hover-area")
                .transition()
                .duration(750)
                .attr("y", yScale(chartData.average) - 5);
        });
    }
    function getFilePathsForFeature(feature) {
        switch (feature) {
            case 'hr': return ['hr/hr_S7_Midterm2.csv', 'hr/hr_S5_Midterm2.csv'];
            case 'temp': return ['temp/temp_S7_Final.csv', 'temp/temp_S8_Final.csv'];
            case 'eda': return ['eda/eda_S1_Final.csv', 'eda/eda_S4_Final.csv'];
            case 'acc': return ['acc/acc_S7_Midterm2.csv', 'acc/acc_S3_Midterm2.csv'];
            default: return [];
        }
    }

    function prepareChartData(csvData, filename) {
        const rows = csvData.split('\n'); // Get all rows
        const labels = Array.from({ length: 181 }, (_, i) => i);
        const data = new Array(181).fill(null);
    
        // Extract the grade from the third column (assuming it's on the first row)
        const gradeRow = rows[1].split(','); 
        const grade = gradeRow.length === 3 ? gradeRow[2].trim() : "Unknown"; // Extract or default to "Unknown"
    
        // Process remaining rows (excluding the first row)
        rows.slice(1).forEach(row => {
            const parts = row.split(',');
            if (parts.length >= 2) {
                const minute = parseInt(parts[0], 10);
                const value = parseFloat(parts[1]);
                if (!isNaN(minute) && !isNaN(value) && minute <= 180) {
                    data[minute] = value;
                }
            }
        });
    
        const validData = data.filter(v => v !== null);
        const sum = validData.reduce((acc, val) => acc + val, 0);
        const average = validData.length > 0 ? sum / validData.length : 0;
    
        return {
            labels,
            data,
            label: filename.match(/S\d+/)?.[0],  // Extract "S6" from filename
            grade,  // Store extracted grade
            average: average.toFixed(2),
            minY: Math.min(...validData),
            maxY: Math.max(...validData)
        };
    }

    function alignYAxis(chartDataSets) {
        for (let i = 0; i < chartDataSets.length; i += 2) {
            let minY = Math.min(chartDataSets[i].minY, chartDataSets[i + 1]?.minY ?? chartDataSets[i].minY);
            let maxY = Math.max(chartDataSets[i].maxY, chartDataSets[i + 1]?.maxY ?? chartDataSets[i].maxY);
    
            // Apply buffer (10% of range) to prevent excessive stretching
            minY = Math.floor(minY); // Round down
            maxY = Math.ceil(maxY);  // Round up
    
            chartDataSets[i].alignedMinY = minY;
            chartDataSets[i].alignedMaxY = maxY;
            if (i + 1 < chartDataSets.length) {
                chartDataSets[i + 1].alignedMinY = minY;
                chartDataSets[i + 1].alignedMaxY = maxY;
            }
        }
    }

    function renderCharts(chartDataSets, feature) {
        const chartsContainer = document.getElementById('chartsContainer');
        chartsContainer.innerHTML = '';
    
        const pairContainer = document.createElement('div');
        pairContainer.className = "pair-graph-container";
        chartsContainer.appendChild(pairContainer);
    
        const tooltip = d3.select("body")
            .append("div")
            .attr("class", "tooltip-box");
    
        chartDataSets.forEach((chartData, index) => {
            const container = document.createElement('div');
            container.className = "pair-graph";
            container.innerHTML = `<h2 class="pair-graph-title">${chartData.label} - Grade: ${chartData.grade}</h2>`; // Title with correct class
            pairContainer.appendChild(container);
    
            const svgWidth = 550, svgHeight = 300, margin = { top: 40, right: 40, bottom: 60, left: 60 };
            const width = svgWidth - margin.left - margin.right;
            const height = svgHeight - margin.top - margin.bottom;
    
            const svg = d3.select(container)
                .append("svg")
                .attr("width", svgWidth)
                .attr("height", svgHeight)
                .append("g")
                .attr("transform", `translate(${margin.left},${margin.top})`);
    
            const xScale = d3.scaleLinear().domain([0, 180]).range([0, width]);
            const yScale = d3.scaleLinear().domain([chartData.alignedMinY, chartData.alignedMaxY]).range([height, 0]);
    
            const xAxis = d3.axisBottom(xScale).tickValues(d3.range(0, 181, 20));
            const yAxis = d3.axisLeft(yScale).tickValues(d3.ticks(chartData.alignedMinY, chartData.alignedMaxY, 7));
    
            svg.append("g")
                .attr("transform", `translate(0, ${height})`)
                .attr("class", "x-axis axis")
                .call(xAxis);
    
            svg.append("g")
                .attr("class", "y-axis axis")
                .call(yAxis);
    
            const line = d3.line()
                .defined(d => d !== null)
                .x((_, i) => xScale(i))
                .y(d => yScale(d))
                .curve(d3.curveMonotoneX);
    
            svg.append("path")
                .datum(chartData.data)
                .attr("class", "data-line")
                .attr("d", line);
    
            svg.append("line")
                .attr("x1", 0)
                .attr("x2", width)
                .attr("y1", yScale(chartData.average))
                .attr("y2", yScale(chartData.average))
                .attr("class", "avg-line");
    
            svg.append("rect")
                .attr("x", 0)
                .attr("y", yScale(chartData.average) - 5)
                .attr("width", width)
                .attr("height", 10)
                .attr("fill", "transparent")
                .attr("class", "avg-hover-area")
                .style("cursor", "pointer")
                .on("mouseover", function(event) {
                    tooltip.style("opacity", 1)
                        .html(`Avg: ${chartData.average}`);
                })
                .on("mousemove", function(event) {
                    tooltip.style("left", (event.pageX + 10) + "px")
                           .style("top", (event.pageY - 20) + "px");
                })
                .on("mouseout", function() {
                    tooltip.style("opacity", 0);
                });
        });
    }
});
