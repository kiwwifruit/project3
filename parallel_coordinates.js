document.addEventListener("DOMContentLoaded", function () {
    const margin = { top: 50, right: 50, bottom: 50, left: 50 },
          width = 1100 - margin.left - margin.right,
          height = 600 - margin.top - margin.bottom;
    
    const sliderIds = ["slider1", "slider2", "slider3", "slider4"];
    const valueIds = ["value1", "value2", "value3", "value4"];
    let featureValues = [0, 0, 0, 0]; // Initialize sliders at 0
    
    const svg = d3.select("svg")
    .attr("width", width + margin.left + margin.right + 10) 
    .attr("height", height + margin.top + margin.bottom + 60) 
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

    const coefficients = [2.9036, -2.5664, 8.7647, 7.1487];
    const intercept = 0;

    // Load data from CSV
    d3.csv("final_plot.csv").then(data => {
        const dimensions = Object.keys(data[0]).filter(d => d !== "Label Category");

        // Convert numerical values
        data.forEach(d => {
            dimensions.forEach(dim => {
                d[dim] = +d[dim];
            });
        });

        // Create scales
        const yScales = {};
        dimensions.forEach(dim => {
            const globalMin = d3.min(dimensions, dim => d3.min(data, d => d[dim]));
            const globalMax = d3.max(dimensions, dim => d3.max(data, d => d[dim]));
            const globalPadding = (globalMax - globalMin) * 0.1; // 10% padding

            yScales[dim] = d3.scaleLinear()
                .domain([Math.min(0, globalMin - globalPadding), Math.max(0, globalMax + 2 * globalPadding)])
                .range([height, 0]);
        });

        // X scale
        const xScale = d3.scalePoint()
                        .domain(dimensions)
                        .range([0, width]);

        // Color scale
        const colorScale = d3.scaleOrdinal()
                            .domain(["High", "Medium", "Low", "Very Low"])
                            .range(["#d45050", "#FADADD", "#ADD8E6", "#3186d5"]);
        // Legend position
        // Create the legend container on the left
        const legend = svg.append("g")
    .attr("transform", `translate(${(width) / 2 - 270}, ${height + 50})`); // Move below and center

        // Add background rectangle for the legend
        legend.append("rect")
        .attr("x", -25)
        .attr("y", -20)
        .attr("width", 600) // Adjust width to fit labels
        .attr("height", 40) // Adjust height for spacing
        .attr("fill", "#edecec") // Light grey background
        .attr("stroke", "grey")
        .attr("rx", 10)
        .attr("ry", 10)
        .lower(); // Send the background behind text

        // Define legend categories
        const legendData = ["High", "Medium", "Low", "Very Low", "Prediction"];

        legend.selectAll("legend-dots")
        .data(legendData)
        .enter().append("circle")
        .attr("cx", (d, i) => i * 120) // Position each circle horizontally
        .attr("cy", 0) // Align in a row
        .attr("r", 8)
        .style("fill", d => d === "Prediction" ? "green" : colorScale(d));

        legend.selectAll("legend-labels")
        .data(legendData)
        .enter().append("text")
        .attr("x", (d, i) => i * 120 + 15) // Match horizontal position with circles
        .attr("y", 5) // Slightly offset for alignment
        .style("fill", "black")
        .style("font-size", "14px")
        .text(d => d);

        // Line generator
        const path = d => d3.line()(dimensions.map(p => {
            return d[p] !== undefined && !isNaN(d[p]) ? [xScale(p), yScales[p](d[p])] : null;
        }).filter(d => d !== null));  // Remove null points to avoid broken paths
        
        // Draw lines
        svg.selectAll("path")
           .data(data)
           .enter().append("path")
           .attr("class", "line")
           .attr("d", path)
           .style("stroke", d => colorScale(d["Label Category"]))
           .style("fill", "none")
           .style("stroke-width", 1.5)
           .style("opacity", 0.7);
        // Draw the movable prediction line
        // Draw the movable prediction line with a highlighted shadow
        let movableLineGroup = svg.append("g").attr("class", "movable-line-group");
        
        let initialLineData = {};
        dimensions.forEach((dim, i) => {
            initialLineData[dim] = i < 4 ? 0 : intercept; // Features start at 0, prediction at intercept
        });
        // Add shadow effect
        movableLineGroup.append("path")
                .datum(initialLineData)
                .attr("class", "movable-line-shadow")
                .attr("d", path)
                .style("stroke", "rgb(213, 235, 193)")  // Light shadow color
                .style("stroke-width", 10)
                .style("fill", "none");

        // Draw movable line initially at (0,0,0,0)
        let movableLine = movableLineGroup.append("path")
                                        .datum(initialLineData)
                                        .attr("class", "movable-line")
                                        .attr("d", path)
                                        .style("stroke", "green")
                                        .style("stroke-width", 3)
                                        .style("fill", "none");
        // Add the actual bold movable line
        function updatePrediction() {
            let predictedGrade = intercept;
            for (let i = 0; i < 4; i++) {
            featureValues[i] = parseFloat(document.getElementById(sliderIds[i]).value) || 0;
            document.getElementById(valueIds[i]).textContent = featureValues[i];
            predictedGrade += featureValues[i] * coefficients[i];
            }
            predictedGrade = Math.max(-3, Math.min(3, predictedGrade));

            let scaledPredictedGrade = (predictedGrade * scaleFactors["Predicted Grade(%)"]) + addFactors["Predicted Grade(%)"];
            document.getElementById("predicted-score").textContent = scaledPredictedGrade.toFixed(2);

        let newLineData = {};
        dimensions.forEach((dim, i) => {
            newLineData[dim] = i < 4 ? featureValues[i] : predictedGrade;
        });

            // Update the shadow line
            movableLineGroup.select(".movable-line-shadow")
                            .datum(newLineData)
                            .transition()
                            .duration(300)
                            .attr("d", path);

            // Update the bold movable line
            movableLine.datum(newLineData)
                    .transition()
                    .duration(300)
                    .attr("d", path);
        }
        const scaleFactors = { 
            "ACC(g)": 0.14270464592483886, 
            "EDA(μS)": 0.2103479494358205, 
            "HR(bpm)": 14.972807995059702, 
            "TEMP(°C)": 3.577973304894227,
            "Predicted Grade(%)": 7.04112564211788
        };  // Multiplication factors
        
        const addFactors = { 
            "ACC(g)": 9.891585443886743, 
            "EDA(μS)": 0.3780802288827161, 
            "HR(bpm)": 97.57604506172838, 
            "TEMP(°C)": 29.48904200617284,
            "Predicted Grade(%)": 75.25000000000001
        };

        // Add event listeners for sliders
        sliderIds.forEach(id => {
        document.getElementById(id).addEventListener("input", updatePrediction);});

        // Addition factors
        // Draw axes
        svg.selectAll(".axis")
           .data(dimensions)
           .enter().append("g")
           .attr("class", "axis")
           .attr("transform", d => `translate(${xScale(d)},0)`)
           .each(function(d) { 
            d3.select(this).call(d3.axisLeft(yScales[d])
                .ticks(6)
                .tickFormat(value => d3.format(".2f")((value * (scaleFactors[d] || 1)) + (addFactors[d] || 0))));})
           .append("text")
           .attr("y", -10)
           .attr("text-anchor", "middle")
           .style("font-size", "12px")
           .text(d => d)
           .style("fill", "black");
    });
});