document.addEventListener('DOMContentLoaded', function () {
    const featureSelect = document.getElementById('featureSelect');
    featureSelect.addEventListener('change', function() {
        updateCharts(this.value);
    });

    // // Initialize charts with the default feature 'hr'
    // updateCharts('hr');

    function updateCharts(feature) {
        const filePaths = getFilePathsForFeature(feature);
        const promises = filePaths.map(path =>
            fetch(path)
            .then(response => response.text())
            .then(data => prepareChartData(data, path.split('/').pop()))
        );
        Promise.all(promises).then(chartDataSets => {
            renderCharts(chartDataSets, feature);
        });
    }

    function getFilePathsForFeature(feature) {
        switch (feature) {
            case 'hr':
                return ['hr/hr_S5_Midterm2.csv', 'hr/hr_S7_Midterm2.csv'];
            case 'temp':
                return ['temp/temp_S7_Final.csv', 'temp/temp_S8_Final.csv'];
            case 'eda':
                return ['eda/eda_S6_Midterm1.csv', 'eda/eda_S10_Midterm1.csv'];
            case 'acc':
                return ['acc/acc_S3_Midterm2.csv', 'acc/acc_S7_Midterm2.csv'];
            default:
                return []; // Default case to handle unknown features
        }
    }

    function prepareChartData(csvData, filename) {
        const rows = csvData.split('\n').slice(1); // Skip header
        const labels = [];
        const data = [];
    
        rows.forEach(row => {
            const parts = row.split(',');
            if (parts.length === 2) {
                const minute = parseFloat(parts[0]);
                const value = parseFloat(parts[1]);
                if (!isNaN(minute) && !isNaN(value)) {
                    labels.push(minute);
                    data.push(value);
                }
            }
        });
    
        const sum = data.reduce((acc, val) => acc + val, 0);
        const average = sum / data.length; // Calculate average
    
        return {
            labels,
            datasets: [{
                label: filename.replace('.csv', '').replace(/_/g, ' '),
                data,
                borderColor: 'blue',
                backgroundColor: 'rgba(0, 0, 255, 0.1)',
                fill: false,
                borderWidth: 2
            }],
            average: average.toFixed(2) // Round to two decimal places
        };
    }
    

    function renderCharts(chartDataSets, feature) {
        const chartsContainer = document.getElementById('chartsContainer');
        chartsContainer.innerHTML = ''; // Clear previous charts
    
        chartDataSets.forEach((chartData, index) => {
            const canvasId = `featureChart${index + 1}`;
            const chartContainer = document.createElement('div');
            chartContainer.style.width = '48%';
            chartContainer.style.marginTop = '20px';
            chartContainer.innerHTML = `<h2>${chartData.datasets[0].label} - Average: ${chartData.average}</h2><canvas id="${canvasId}"></canvas>`;
            chartsContainer.appendChild(chartContainer);
    
            const ctx = document.getElementById(canvasId).getContext('2d');
            new Chart(ctx, {
                type: 'line',
                data: chartData,
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: `${feature.toUpperCase()} Data Visualization for ${chartData.datasets[0].label}`
                        }
                    },
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: 'Minutes since start'
                            },
                            beginAtZero: true
                        },
                        y: {
                            title: {
                                display: true,
                                text: 'Value'
                            }
                        }
                    },
                    annotation: {
                        annotations: {
                            line1: {
                                type: 'line',
                                yMin: chartData.average,
                                yMax: chartData.average,
                                borderColor: 'red',
                                borderWidth: 2,
                                label: {
                                    content: `Avg: ${chartData.average}`,
                                    enabled: true,
                                    position: 'start'
                                }
                            }
                        }
                    }
                }
            });
        });
    }
    
});



