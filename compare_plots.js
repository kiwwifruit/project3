document.addEventListener('DOMContentLoaded', function () {
    const featureSelect = document.getElementById('featureSelect');
    featureSelect.addEventListener('change', function() {
        updateCharts(this.value);
    });

    updateCharts('acc'); // Initialize with 'hr'

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
                updateGraphData(chartDataSets, feature);
            }
        });
    }
    function getDescriptionForFeature(feature) {
        switch (feature) {
            case 'hr':
                return "* Heart rate (HR) indicates both physical stress and cognitive engagement. \
                S7 exhibits frequent heart rate spikes throughout the exam, suggesting difficulty managing \
                stress. In contrast, S5 maintains a generally elevated yet stable heart rate, suggesting \
                sustained cognitive effort and focus.\
                <br><br> * Higher heart rates, when consistent rather than erratic, are associated with improved \
                concentration and better exam performance. Rapid and unpredictable fluctuations may indicate \
                stress-related distraction and hinder cognitive performance.";
            case 'temp':
                return "* Skin temperature (TEMP) changes can indicate stress-related physiological responses, \
                such as blood vessel constriction. S7 shows significant fluctuations with lower baseline \
                temperatures, suggesting stress responses at various stages of the exam or disengagement. \
                In contrast, S8 maintains a stable, slightly elevated temperature throughout the exam, \
                indicating calmness and sustained focus. \
                <br><br> * Consistent body temperature suggests better stress management and a higher potential for good performance.";
            case 'eda':
                return "* Electrodermal Activity (EDA) measures skin electrical conductance as a quantitative indicator of how much you sweat, \
                serving as a direct measurement of emotional stress. S2 shows a brief spike at the beginning—likely \
                due to initial nervousness—followed by a calm, stable pattern. In contrast, S4 experiences high, \
                sustained EDA early on, reflecting ongoing stress. \
                <br><br> * Higher grades are associated with quick recovery from initial anxiety. \
                Students who manage to calm down shortly after starting the exam generally perform better.";
            case 'acc':
                return "* The accelerometer records acceleration (ACC) as a measurement of body movement, which can \
                reflect cognitive engagement or attempts to manage stress. S3 shows elevated movement levels \
                throughout the exam, especially during the early stages, suggesting active thinking and \
                problem-solving. In contrast, S7 maintains low movement for most of the exam, possibly indicating \
                passivity. However, there is a notable spike near the end, which may represent growing discomfort, \
                rushed attempts to complete remaining questions, or late-stage stress. \
                <br><br> * Higher movement values appear to correlate with better performance, potentially reflecting cognitive effort. However, constant fidgeting or sudden movement spikes can be signs of stress-related distraction, potentially leading to lower scores.";
        }
    }
    function updateGraphData(chartDataSets, feature) {
        const pairContainer = d3.select(".pair-graph-container");
    
        pairContainer.selectAll(".pair-graph").each(function (_, index) {
            const container = d3.select(this);
            const svg = container.select("svg g");
            
            if (!chartDataSets[index]) return; // Prevent errors if missing data
    
            const width = 550 - 60 - 40;
            const height = 300 - 40 - 60;
            
            
            const xScale = d3.scaleLinear().domain([0, 180]).range([0, width]);
            const yScale = d3.scaleLinear()
                .domain([chartDataSets[index].alignedMinY, chartDataSets[index].alignedMaxY])
                .range([height, 0]);
    
            // **Update the Title Dynamically**
            container.select(".pair-graph-title")
                .html(chartDataSets[index].label);
    
            // **Update Axis Labels**
            svg.select(".x-axis-label")
                .transition()
                .duration(750)
                .text("Minutes");
    
            svg.select(".y-axis-label")
                .transition()
                .duration(750)
                .text(chartDataSets[index].yLabel);
    
            // **Update the y-axis**
            const yAxis = d3.axisLeft(yScale).tickValues(d3.ticks(chartDataSets[index].alignedMinY, chartDataSets[index].alignedMaxY, 7));
            svg.select(".y-axis")
                .transition()
                .duration(750)
                .call(yAxis);
    
            // **Update the x-axis**
            const xAxis = d3.axisBottom(xScale).tickValues(d3.range(0, 181, 20));
            svg.select(".x-axis")
                .transition()
                .duration(750)
                .call(xAxis);
    
            // **Update the data line**
            const line = d3.line()
                .defined(d => d !== null)
                .x((_, i) => xScale(i))
                .y(d => yScale(d))
                .curve(d3.curveMonotoneX);
    
            svg.select(".data-line")
                .datum(chartDataSets[index].data)
                .transition()
                .duration(750)
                .attr("d", line);
    
            // **Update the average line**
            svg.select(".avg-line")
                .transition()
                .duration(750)
                .attr("y1", yScale(chartDataSets[index].average))
                .attr("y2", yScale(chartDataSets[index].average));
    
            // **Ensure each graph has its own tooltip**
            d3.select(`.tooltip-box-${index}`).remove(); // Remove previous tooltip
            const tooltip = d3.select("body")
                .append("div")
                .attr("class", `tooltip-box tooltip-box-${index}`)
                .style("opacity", 0);
    
            // **Update the tooltip and hover area**
            svg.selectAll(".avg-hover-area").remove(); // Remove old hover area
            svg.append("rect")
                .attr("x", 0)
                .attr("y", yScale(chartDataSets[index].average) - 10) // Adjusted for better detection
                .attr("width", width)
                .attr("height", 20) // Increased size for better hovering
                .attr("fill", "transparent")
                .attr("class", "avg-hover-area")
                .style("cursor", "pointer")
                .on("mouseover", function (event) {
                    d3.select(`.tooltip-box-${index}`)
                        .style("opacity", 1)
                        .html(`Avg: ${chartDataSets[index].average}`);
                })
                .on("mousemove", function (event) {
                    d3.select(`.tooltip-box-${index}`)
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 20) + "px");
                })
                .on("mouseout", function () {
                    d3.select(`.tooltip-box-${index}`).style("opacity", 0);
                });
        });
        d3.select(".graph-pair-description")
                .transition()
                .duration(500)
                .style("opacity", 0) // Fade out
                .on("end", function() {
                    d3.select(this)
                        .html(getDescriptionForFeature(feature))
                        .transition()
                        .duration(500)
                        .style("opacity", 1); // Fade in with new text
                });
    }
    
    function getFilePathsForFeature(feature) {
        switch (feature) {
            case 'hr': return ['hr/hr_S7_Midterm2.csv', 'hr/hr_S5_Midterm2.csv'];
            case 'temp': return ['temp/temp_S7_Final.csv', 'temp/temp_S8_Final.csv'];
            case 'eda': return ['eda/eda_S2_Final.csv', 'eda/eda_S4_Final.csv'];
            case 'acc': return ['acc/acc_S7_Midterm2.csv', 'acc/acc_S3_Midterm2.csv'];
            default: return [];
        }
    }

    function prepareChartData(csvData, filename) {
        const rows = csvData.split('\n'); // Get all rows
        const labels = Array.from({ length: 181 }, (_, i) => i);
        const data = new Array(181).fill(null);
        const headers = rows[0].split(',');  // Extract column headers

        // Extract the Y-axis label (real column name)
        const yLabel = headers[1].trim(); // Assuming the second column is the Y-axis data
    
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
            label: `${filename.match(/S\d+/)?.[0]} - ${yLabel} vs. Minutes - Grade: ${grade}`,
            yLabel,  // Extract "S6" from filename
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
    
        chartDataSets.forEach((chartData, index) => {
            const container = document.createElement('div');
            container.className = "pair-graph";
            container.innerHTML = `
            <h2 class="pair-graph-title">${chartData.label}</h2>
            <div class="legend">
                <svg width="20" height="10">
                    <line x1="0" y1="5" x2="20" y2="5" stroke="#d63d25" stroke-width="3.5" stroke-dasharray="5,3"></line>
                </svg>
                <span>Average Value</span>
            </div>`;
            pairContainer.appendChild(container);
    
            const svgWidth = 550, svgHeight = 300, margin = { top: 40, right: 40, bottom: 60, left: 70 };
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
    
            svg.append("text")
                .attr("x", width / 2)
                .attr("y", height + 45)
                .attr("text-anchor", "middle")
                .attr("class", "x-axis-label axis-label")
                .text("Minutes");
    
            svg.append("text")
                .attr("transform", "rotate(-90)")
                .attr("x", -height / 2)
                .attr("y", -50)
                .attr("text-anchor", "middle")
                .attr("class", "y-axis-label axis-label")
                .text(chartDataSets[index].yLabel);
    
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
    
            d3.select(`.tooltip-box-${index}`).remove();
            const tooltip = d3.select("body")
                .append("div")
                .attr("class", `tooltip-box tooltip-box-${index}`)
                .style("opacity", 0);
    
            svg.append("rect")
                .attr("x", 0)
                .attr("y", yScale(chartData.average) - 15)
                .attr("width", width)
                .attr("height", 30)
                .attr("fill", "transparent")
                .attr("class", "avg-hover-area")
                .style("cursor", "pointer")
                .on("mouseover", function (event) {
                    tooltip.style("opacity", 1)
                        .html(`Avg: ${chartData.average}`);
                })
                .on("mousemove", function (event) {
                    tooltip.style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 20) + "px");
                })
                .on("mouseout", function () {
                    tooltip.style("opacity", 0);
                });
        });
        const descriptionBox = document.createElement('p');
        descriptionBox.className = "graph-pair-description";
        descriptionBox.innerHTML = getDescriptionForFeature(feature);
        pairContainer.appendChild(descriptionBox);
    }
});
