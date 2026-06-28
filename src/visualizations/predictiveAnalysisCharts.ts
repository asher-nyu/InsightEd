// @ts-nocheck
import * as d3 from "d3";
import { addNearestHoverLayer } from "./proximityHover";

export function renderPredictiveAnalysisCharts() {
document.querySelectorAll("body > .MLTooltip").forEach((element) => element.remove());

// Load model performance metrics
d3.json("/data/model_results.json").then((results) => {
    const performanceData = Object.keys(results).map((model) => ({
        model,
        mse: results[model].MSE,
        r2: results[model]["R2 Score"],
    }));

    // Draw the metric filter dropdown
    const metricOptions = ["mse", "r2"];
    createDropdownFilter("metricFilterContainer", metricOptions, (selectedMetric) => {
        drawBarChart(
            "modelPerformanceChart",
            performanceData.map((d) => ({
                model: d.model,
                value: d[selectedMetric],
            })),
            "Model",
            "Value",
            `Model Performance - ${selectedMetric.toUpperCase()}`
        );
    });

    // Draw initial chart with default metric (MSE)
    drawBarChart(
        "modelPerformanceChart",
        performanceData.map((d) => ({ model: d.model, value: d.mse })),
        "Model",
        "Value",
        "Model Performance - MSE"
    );
});

// Load predictions data
d3.json("/data/predictions.json").then((predictions) => {
    Object.keys(predictions).forEach((model) => {
        drawScatterPlot(
            `scatterPlot-${model}`,
            predictions[model],
            "Actual",
            "Predicted",
            `${model} Predictions`
        );
    });
});

// Load feature importance data
d3.json("/data/feature_importance.json").then((data) => {
    drawFeatureImportanceChart(
        "featureImportanceChart",
        data,
        "Features",
        "Coefficient Value",
        "Feature Contributions (Linear Regression)"
    );
});

// Function to draw the bar chart
function drawBarChart(containerId, data, xLabel, yLabel, title) {
    const container = document.getElementById(containerId);
    const { width, height } = getDimensions(container);
    d3.select(container).selectAll("*").remove();

    const svg = d3
        .select(container)
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`);

    const margin = { top: 40, right: 20, bottom: 50, left: 60 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const x = d3
        .scaleBand()
        .domain(data.map((d) => d.model))
        .range([0, chartWidth])
        .padding(0.3);

    const y = d3
        .scaleLinear()
        .domain([0, d3.max(data, (d) => d.value)])
        .range([chartHeight, 0]);

    const g = svg
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const MLTooltip = createTooltip();

    // X-axis
    g.append("g")
        .attr("transform", `translate(0,${chartHeight})`)
        .transition()
        .duration(1000)
        .call(d3.axisBottom(x));
    g
        .select(".domain")
        .remove();

    // Y-axis
    g.append("g")
        .transition()
        .duration(1000)
        .call(d3.axisLeft(y));
    g
        .select(".domain")
        .remove();

    // Add gridlines
    g.append("g")
        // .attr("transform", `translate(${margin.left}, 0)`)
        .call(d3.axisLeft(y)
            .tickSize(-chartWidth)
            .tickFormat(""))
        .selectAll("line")
        .style("stroke", "lightgray")
        .style("opacity", 0)
        .transition()
        .duration(1000)
        .style("opacity", 1);
    g
        .select(".domain")
        .remove();

    // Bars
    const bars = g.selectAll(".bar")
        .data(data)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", (d) => x(d.model))
        .attr("y", (d) => y(0))
        .attr("width", x.bandwidth())
        .attr("height",0)
        .attr("fill", "steelblue");

    bars.transition()
        .duration(d => {
            const barHeight2 = Math.abs(y(d.value) - y(0));
            return (barHeight2 / d3.max(data, d => Math.abs(y(d.value) - y(0)))) * 1000; // Scale duration, capped at 1000ms
        })
        .ease(d3.easeBackOut) // Overshoot effect
        .attr("y", d => (d.value > 0 ? y(d.value) : y(0)))
        .attr("height", d => Math.abs(y(d.value) - y(0)))

    ;

    addNearestHoverLayer({
        data,
        height,
        html: (d) => `<strong>${d.model}</strong><br>Value: ${d.value.toFixed(2)}`,
        layer: g,
        tooltip: MLTooltip,
        width,
        x0: -margin.left,
        y0: -margin.top,
        x: (d) => x(d.model) + x.bandwidth() / 2,
        clear: () => bars.attr("fill", "steelblue").attr("stroke", "none"),
        highlight: (d) => bars.filter((barDatum) => barDatum === d).attr("fill", "orange").attr("stroke", "black").attr("stroke-width", 2),
    });

    // Chart title and labels
    addChartLabels(svg, width, height, margin, title, xLabel, yLabel);
}

// Function to draw scatter plots
function drawScatterPlot(containerId, data, xLabel, yLabel, title) {
    const container = document.getElementById(containerId);
    const { width, height } = getDimensions(container);
    d3.select(container).selectAll("*").remove();

    const svg = d3
        .select(container)
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`);

    const margin = { top: 40, right: 20, bottom: 50, left: 60 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const x = d3
        .scaleLinear()
        .domain([0, d3.max(data, (d) => d.actual)])
        .range([0, chartWidth]);

    const y = d3
        .scaleLinear()
        .domain([0, d3.max(data, (d) => d.predicted)])
        .range([chartHeight, 0]);

    const g = svg
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const MLTooltip = createTooltip();

    // X-axis
    g.append("g")
        .attr("transform", `translate(0,${chartHeight})`)
        .transition() // Add transition
        .duration(1000)
        .call(d3.axisBottom(x));
    g
        .select(".domain")
        .remove();

    // Y-axis
    g.append("g")
        .transition() // Add transition
        .duration(1000)
        .call(d3.axisLeft(y));
    g
        .select(".domain")
        .remove();

    // Add gridlines
    g.append("g")
        // .attr("transform", `translate(${margin.left}, 0)`)
        .call(d3.axisLeft(y)
            .tickSize(-chartWidth)
            .tickFormat(""))
        .selectAll("line")
        .style("stroke", "lightgray")
        .style("opacity", 0)
        .transition()
        .duration(1000)
        .style("opacity", 1);
    g
        .select(".domain")
        .remove();

    // Points
    const dots = g.selectAll(".dot")
        .data(data)
        .enter()
        .append("circle")
        .attr("class", "dot")
        .attr("cx", (d) => x(d.actual))
        .attr("cy", (d) => y(d.predicted))
        .attr("r", 0)
        .attr("fill", "steelblue");

    dots.transition()
        .duration(1000)
        .ease(d3.easeBackOut)
        .attr("r", 5)


    ;

    addNearestHoverLayer({
        data,
        height,
        html: (d) => `<strong>Actual:</strong> ${d.actual.toFixed(2)}<br><strong>Predicted:</strong> ${d.predicted.toFixed(2)}`,
        layer: g,
        tooltip: MLTooltip,
        width,
        x0: -margin.left,
        y0: -margin.top,
        x: (d) => x(d.actual),
        y: (d) => y(d.predicted),
        clear: () => dots.attr("fill", "steelblue").attr("r", 5),
        highlight: (d) => dots.filter((dotDatum) => dotDatum === d).attr("fill", "orange").attr("r", 8),
    });

    // Chart title and labels
    addChartLabels(svg, width, height, margin, title, xLabel, yLabel);
}

// Function to draw feature importance chart
function drawFeatureImportanceChart(containerId, data, xLabel, yLabel, title) {
    const filteredData = data.filter((d) => d.feature && !isNaN(+d.coefficient));
    filteredData.forEach((d) => {
        d.coefficient = +d.coefficient;
    });

    const container = document.getElementById(containerId);
    const { width, height } = getDimensions(container);
    d3.select(container).selectAll("*").remove();

    const svg = d3
        .select(container)
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`);

    const margin = { top: 50, right: 20, bottom: 100, left: 60 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const x = d3
        .scaleBand()
        .domain(filteredData.map((d) => d.feature))
        .range([0, chartWidth])
        .padding(0.3);

    const y = d3
        .scaleLinear()
        .domain([
            d3.min(filteredData, (d) => d.coefficient) * 1.1,
            d3.max(filteredData, (d) => d.coefficient) * 1.1,
        ])
        .range([chartHeight, 0]);

    const g = svg
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const MLTooltip = createTooltip();

    // X-axis
    g.append("g")
        .attr("transform", `translate(0,${chartHeight})`)
        .transition() // Add transition
        .duration(1000)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end");
    g
        .select(".domain")
        .remove();

    // Y-axis
    g.append("g")
        .transition() // Add transition
        .duration(1000)
        .call(d3.axisLeft(y));
    g
        .select(".domain")
        .remove();

    // Add gridlines
    g.append("g")
        // .attr("transform", `translate(${margin.left}, 0)`)
        .call(d3.axisLeft(y)
            .tickSize(-chartWidth)
            .tickFormat(""))
        .selectAll("line")
        .style("stroke", "lightgray")
        .style("opacity", 0)
        .transition()
        .duration(1000)
        .style("opacity", 1);
    g
        .select(".domain")
        .remove();

    // Bars
    const bars = g.selectAll(".bar")
        .data(filteredData)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", (d) => x(d.feature))
        .attr("y", (d) => y(0))
        .attr("width", x.bandwidth())
        .attr("height",0)
        .attr("fill", (d) => (d.coefficient >= 0 ? "steelblue" : "green"));

    bars.transition()
        .duration(d => {
            const barHeight2 = Math.abs(y(d.coefficient) - y(0));
            return (barHeight2 / d3.max(filteredData, d => Math.abs(y(d.coefficient) - y(0)))) * 1000; // Scale duration, capped at 1000ms
        })
        .ease(d3.easeBackOut) // Overshoot effect
        .attr("y", d => (d.coefficient > 0 ? y(d.coefficient) : y(0)))
        .attr("height", d => Math.abs(y(d.coefficient) - y(0)))



    ;

    addNearestHoverLayer({
        data: filteredData,
        height,
        html: (d) => `<strong>${d.feature}</strong><br>Coefficient: ${d.coefficient.toFixed(2)}`,
        layer: g,
        tooltip: MLTooltip,
        width,
        x0: -margin.left,
        y0: -margin.top,
        x: (d) => x(d.feature) + x.bandwidth() / 2,
        clear: () => bars.attr("fill", (d) => (d.coefficient >= 0 ? "steelblue" : "green")).attr("stroke", "none"),
        highlight: (d) => bars.filter((barDatum) => barDatum === d).attr("fill", "orange").attr("stroke", "black").attr("stroke-width", 2),
    });

    // Chart title and labels
    addChartLabels(svg, width, height, margin, title, xLabel, yLabel);
}

// Utility functions
function createTooltip() {
    return d3
        .select("body")
        .append("div")
        .attr("class", "MLTooltip")
        .style("position", "absolute")
        .style("background", "#ffffff")
        .style("border", "1px solid #ddd")
        .style("padding", "8px 12px")
        .style("box-shadow", "0 4px 6px rgba(0,0,0,0.1)")
        .style("pointer-events", "none")
        .style("display", "none");
}

function positionTooltip(event, MLTooltip) {
    MLTooltip
        .style("left", `${event.pageX + 10}px`)
        .style("top", `${event.pageY - 20}px`);
}

function addChartLabels(svg, width, height, margin, title, xLabel, yLabel) {
    svg
        .append("text")
        .attr("x", width / 2)
        .attr("y", margin.top / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .attr("opacity", 0)

        .text(title)
        .transition()
        .duration(1000)
        .ease(d3.easeCubicInOut)
        .attr("opacity", 1);

    svg
        .append("text")
        .attr("x", width / 2)
        .attr("y", height - margin.bottom / 4)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .attr("opacity", 0)

        .text(xLabel)
        .transition()
        .duration(1000)
        .ease(d3.easeCubicInOut)
        .attr("opacity", 1);

    svg
        .append("text")
        .attr("x", -(height / 2))
        .attr("y", margin.left / 4)
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .style("font-size", "14px")
        .attr("opacity", 0)

        .text(yLabel)
        .transition()
        .duration(1000)
        .ease(d3.easeCubicInOut)
        .attr("opacity", 1);
}

// Utility function for responsive chart dimensions
function getDimensions(container) {
    const width = container.offsetWidth;
    const height = width * 0.6;
    return { width, height };
}

// Create dropdown filter
function createDropdownFilter(containerId, options, onChangeCallback) {
    const container = d3
        .select(`#${containerId}`)
        .append("div")
        .attr("class", "filter-container")
        .style("margin-bottom", "10px");

    container
        .append("label")
        .text("Select Metric: ")
        .style("margin-right", "10px");

    const select = container
        .append("select")
        .on("change", function () {
            onChangeCallback(this.value);
        });

    select
        .selectAll("option")
        .data(options)
        .enter()
        .append("option")
        .attr("value", (d) => d)
        .text((d) => d.toUpperCase());
}

return () => {
    document.querySelectorAll(".chart-container").forEach((container) => {
        d3.select(container).selectAll("*").interrupt().remove();
    });
    document.querySelectorAll("body > .MLTooltip").forEach((element) => element.remove());
};
}
