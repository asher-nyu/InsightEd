// @ts-nocheck
import * as d3 from "d3";
import { addNearestHoverLayer } from "./proximityHover";

export function renderStudentPerformanceDashboard() {
document.querySelectorAll("body > #tooltip, body > .MLTooltip").forEach((element) => element.remove());

// Load CSV data and process
// Declare global variables for the datasets
let studentData = [];
let studyTimeData = [];
let internetData = [];
let genderData = [];
let distanceData = [];
let absencesData = [];

d3.dsv(";", "/data/student-por.csv")
    .then((loadedStudentData) => {
        studentData = loadedStudentData;
        console.log("Raw Data Loaded:", studentData);

        // Process data for study time
        const studyTimeGroups = d3.group(studentData, (d) => +d.studytime);
        studyTimeData = Array.from(studyTimeGroups, ([studyTime, group]) => ({
            studyTime: +studyTime,
            avgGrade: d3.mean(group, (d) => (+d.G1 + +d.G2 + +d.G3) / 3),
        }));
        studyTimeData.sort((a, b) => a.studyTime - b.studyTime);

        // Process data for internet access
        const internetGroups = d3.group(studentData, (d) => d.internet.trim());
        internetData = Array.from(internetGroups, ([internet, group]) => ({
            internet,
            grades: group.map((d) => (+d.G1 + +d.G2 + +d.G3) / 3),
        }));

        // Process data for gender
        const genderGroups = d3.group(studentData, (d) => d.sex.trim());
        genderData = Array.from(genderGroups, ([sex, group]) => ({
            sex,
            G1: d3.mean(group, (d) => +d.G1),
            G2: d3.mean(group, (d) => +d.G2),
            G3: d3.mean(group, (d) => +d.G3),
        }));

        // Process data for travel time (distance)
        const distanceGroups = d3.group(studentData, (d) => +d.traveltime);
        distanceData = Array.from(distanceGroups, ([distance, group]) => ({
            distance,
            grades: group.flatMap((d) => [+d.G1, +d.G2, +d.G3]),
        }));

        studentData.forEach((d) => {
            d.absences = +d.absences; // Ensure absences is numeric
            d.G1 = +d.G1;
            d.G2 = +d.G2;
            d.G3 = +d.G3;
        });

        const absenceGroups = d3.group(studentData, (d) => {
            if (d.absences === 0) return "0 days";
            else if (d.absences <= 3) return "1-3 days";
            else if (d.absences <= 7) return "4-7 days";
            else return ">7 days";
        });

        absencesData = Array.from(absenceGroups, ([absence, group]) => ({
            absence,
            grades: group.flatMap((d) => [+d.G1, +d.G2, +d.G3]),
        }));

        // Log processed data for debugging
        console.log("Processed Study Time Data:", studyTimeData);
        console.log("Processed Internet Data:", internetData);
        console.log("Processed Gender Data:", genderData);
        console.log("Processed Distance Data:", distanceData);

        // Draw all charts
        drawBarChart("barChart", studyTimeData);
        drawLineChart("lineChart", studyTimeData);
        drawBoxPlot("internetBoxPlot", internetData);
        drawGroupedBarChart("groupedBarChart", genderData);
        drawDistanceBoxPlot("distanceBoxPlot", distanceData);
        drawAbsencesScatterPlot("scatterAbsences", studentData);
        drawAbsencesBoxPlot("boxAbsences", absencesData);

        // Apply zoom and pan to all charts
        // addZoomAndPan("#barChart");
        // addZoomAndPan("#lineChart");
        // addZoomAndPan("#internetBoxPlot");
        // addZoomAndPan("#groupedBarChart");
        // addZoomAndPan("#distanceBoxPlot");
    })
    .catch((error) => console.error("Error loading CSV:", error));

// Utility Functions

// Tooltip
function createTooltip() {
    return d3
        .select("body")
        .append("div")
        .attr("id", "tooltip")
        .style("position", "absolute")
        .style("background", "white")
        .style("border", "1px solid #ccc")
        .style("padding", "5px")
        .style("border-radius", "5px")
        .style("pointer-events", "none")
        .style("opacity", 0);
}

const tooltip = createTooltip();

// Get container dimensions
function getDimensions(container) {
    const width = container.offsetWidth;
    const height = width * 0.6;
    return { width, height };
}

function clearChart(containerId) {
    const container = document.getElementById(containerId);
    d3.select(container).selectAll("*").remove();
}

// Draw bar chart
function drawBarChart(containerId, data) {
    console.log("Rendering Bar Chart", containerId);
    clearChart(containerId);
    const container = document.getElementById(containerId);
    const { width, height } = getDimensions(container);
    d3.select(container).selectAll("*").remove();

    const margin = { top: 20, right: 20, bottom: 50, left: 50 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const svg = d3
        .select(container)
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`);

    const chartGroup = svg
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3
        .scaleBand()
        .domain(data.map((d) => d.studyTime))
        .range([0, chartWidth])
        .padding(0.2);

    const y = d3.scaleLinear().domain([0, 20]).range([chartHeight, 20]);

    chartGroup
        .append("g")
        .attr("transform", `translate(0,${chartHeight})`)
        .transition()
        .duration(1000)
        .call(d3.axisBottom(x));
    chartGroup
        .select(".domain")
        .remove();

    chartGroup.append("g").transition()
        .duration(1000)
        .call(d3.axisLeft(y));
    chartGroup
        .select(".domain")
        .remove();

    // Add gridlines
    chartGroup.append("g")
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
    chartGroup
        .select(".domain")
        .remove();

    chartGroup
        .selectAll(".bar")
        .data(data)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", (d) => x(d.studyTime))
        .attr("y", (d) => y(0))
        .attr("width", x.bandwidth())
        .attr("height", 0)
        .attr("fill", "steelblue")

        .transition()
        .duration(d => {
            const barHeight = Math.abs(y(d.avgGrade) - y(0));
            return (barHeight / d3.max(data, d => Math.abs(y(d.avgGrade) - y(0)))) * 1000; // Scale duration, capped at 1000ms
        })
        .ease(d3.easeBackOut) // Overshoot effect
        .attr("y", d => (d.avgGrade > 0 ? y(d.avgGrade) : y(0)))
        .attr("height", d => Math.abs(y(d.avgGrade) - y(0)));

    chartGroup
        .selectAll(".bar")
        .on("mouseover", (event, d) => {
            tooltip
                .style("opacity", 1)
                .html(
                    `<strong>Study Time:</strong> ${d.studyTime}<br>
               <strong>Average Grade:</strong> ${d.avgGrade.toFixed(2)}`
                )
                .style("left", `${event.pageX + 10}px`)
                .style("top", `${event.pageY - 20}px`);

            // Highlight the hovered bar
            d3.select(event.target)
                .attr("fill", "orange") // Change color on hover
                .attr("stroke", "black") // Add a border to highlight the bar
                .attr("stroke-width", 2); // Add a border width to highlight
        })
        .on("mousemove", (event) => {
            tooltip
                .style("left", `${event.pageX + 10}px`)
                .style("top", `${event.pageY - 20}px`);
        })
        .on("mouseout", (event) => {
            tooltip.style("opacity", 0);

            // Reset the color when mouse leaves
            d3.select(event.target).attr("fill", "steelblue").attr("stroke", "none"); // Remove the border
        });

    addNearestHoverLayer({
        data,
        height,
        html: (d) => `<strong>Study Time:</strong> ${d.studyTime}<br><strong>Average Grade:</strong> ${d.avgGrade.toFixed(2)}`,
        layer: chartGroup,
        tooltip,
        width,
        x0: -margin.left,
        y0: -margin.top,
        x: (d) => x(d.studyTime) + x.bandwidth() / 2,
        clear: () => chartGroup.selectAll(".bar").attr("fill", "steelblue").attr("stroke", "none"),
        highlight: (d) => chartGroup.selectAll(".bar").filter((barDatum) => barDatum === d).attr("fill", "orange").attr("stroke", "black").attr("stroke-width", 2),
    });

    svg
        .append("text")
        .attr("x", chartWidth / 2 + margin.left)
        .attr("y", height - 10)
        .attr("text-anchor", "middle")
        .attr("opacity", 0)

        .text("Weekly Study Time (hours)")
        .transition()
        .duration(1000)
        .ease(d3.easeCubicInOut)
        .attr("opacity", 1);


    svg
        .append("text")
        .attr("x", -(chartHeight / 2 + margin.top))
        .attr("y", margin.left - 35)
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("opacity", 0)

        .text("→ Average Grade")
        .transition()
        .duration(1000)
        .ease(d3.easeCubicInOut)
        .attr("opacity", 1);




    svg
        .append("text")
        .attr("x", chartWidth / 2)
        .attr("y", 25)
        .attr("text-anchor", "middle")
        .attr("opacity", 0)
        .text("Impact of Study Time on Average Grade")
        .transition()
        .duration(1000)
        .ease(d3.easeCubicInOut)
        .attr("opacity", 1);
}

// Draw line chart
function drawLineChart(containerId, data) {
    console.log("Rendering Line Chart", containerId);
    clearChart(containerId);
    const container = document.getElementById(containerId);
    const { width, height } = getDimensions(container);
    d3.select(container).selectAll("*").remove();

    const margin = { top: 20, right: 20, bottom: 50, left: 50 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const svg = d3
        .select(container)
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3
        .scaleLinear()
        .domain([
            d3.min(data, (d) => d.studyTime),
            d3.max(data, (d) => d.studyTime),
        ])
        .range([0, chartWidth]);

    const y = d3.scaleLinear().domain([0, 20]).range([chartHeight, 20]);

    svg
        .append("g")
        .attr("transform", `translate(0,${chartHeight})`)
        .transition()
        .duration(1000)
        .call(d3.axisBottom(x));
    svg
        .select(".domain")
        .remove();

    svg.append("g").transition()
        .duration(1000)
        .call(d3.axisLeft(y));
    svg
        .select(".domain")
        .remove();

    // Add gridlines
    svg.append("g")
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
    svg
        .select(".domain")
        .remove();



    svg
        .append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 2)
        .attr(
            "d",
            d3
                .line()
                .x((d) => x(d.studyTime))
                .y((d) => y(d.avgGrade))
        ).attr("opacity", 0)
        .transition()
        .duration(1000)
        .ease(d3.easeCubicInOut)
        .attr("opacity", 1);

    svg
        .selectAll(".point")
        .data(data)
        .enter()
        .append("circle")
        .attr("class", "point")
        .attr("cx", (d) => x(d.studyTime))
        .attr("cy", (d) => y(d.avgGrade))
        .attr("r", 0)
        .attr("fill", "orange")


        .on("mouseover", (event, d) => {
            tooltip
                .style("opacity", 1)
                .html(
                    `<strong>Study Time:</strong> ${d.studyTime}<br>
               <strong>Average Grade:</strong> ${d.avgGrade.toFixed(2)}`
                )
                .style("left", `${event.pageX + 10}px`)
                .style("top", `${event.pageY - 20}px`);

            // Highlight the hovered point
            d3.select(event.target)
                .attr("r", 6) // Increase the radius of the circle
                .attr("fill", "red"); // Change the color to red on hover
        })
        .on("mousemove", (event) => {
            tooltip
                .style("left", `${event.pageX + 10}px`)
                .style("top", `${event.pageY - 20}px`);
        })
        .on("mouseout", (event) => {
            tooltip.style("opacity", 0);

            // Reset the circle size and color
            d3.select(event.target).attr("r", 4).attr("fill", "orange");
        })

        .transition()
        .duration(1000)
        .ease(d3.easeBackOut)
        .attr("r", 4)


    ;

    addNearestHoverLayer({
        data,
        height,
        html: (d) => `<strong>Study Time:</strong> ${d.studyTime}<br><strong>Average Grade:</strong> ${d.avgGrade.toFixed(2)}`,
        layer: svg,
        tooltip,
        width,
        x0: -margin.left,
        y0: -margin.top,
        x: (d) => x(d.studyTime),
        y: (d) => y(d.avgGrade),
        clear: () => svg.selectAll(".point").attr("r", 4).attr("fill", "orange"),
        highlight: (d) => svg.selectAll(".point").filter((pointDatum) => pointDatum === d).attr("r", 6).attr("fill", "red"),
    });

    svg
        .append("text")
        .attr("x", chartWidth / 2)
        .attr("y", chartHeight + 40)
        .attr("text-anchor", "middle")
        .attr("opacity", 0)
        .text("Weekly Study Time (hours)")
        .transition()
        .duration(1000)
        .ease(d3.easeCubicInOut)
        .attr("opacity", 1);



    svg
        .append("text")
        .attr("text-anchor", "middle")
        .attr("transform", `translate(-35, ${chartHeight / 2}) rotate(-90)`)
        .attr("opacity", 0)
        .text("→ Average Grade")
        .transition()
        .duration(1000)
        .ease(d3.easeCubicInOut)
        .attr("opacity", 1);

    svg
        .append("text")
        .attr("x", chartWidth / 2)
        .attr("y", 5)
        .attr("text-anchor", "middle")
        .attr("opacity", 0)
        .text("Trend of Average Grade by Study Time")
        .transition()
        .duration(1000)
        .ease(d3.easeCubicInOut)
        .attr("opacity", 1);
}

// Draw Box Plot (for Internet Access and Travel Time)
function drawBoxPlot(containerId, data) {
    console.log("Rendering Box plot", containerId);
    clearChart(containerId);
    const container = document.getElementById(containerId);
    const { width, height } = getDimensions(container);
    d3.select(container).selectAll("*").remove();

    const margin = { top: 20, right: 20, bottom: 50, left: 50 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const svg = d3
        .select(container)
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3
        .scaleBand()
        .domain(data.map((d) => d.internet)) // or d.distance if it's the Travel Time box plot
        .range([0, chartWidth])
        .padding(0.5);

    const allGrades = data.flatMap((d) => d.grades);
    const y = d3.scaleLinear().domain([0, 20]).range([chartHeight, 20]);

    svg
        .append("g")
        .attr("transform", `translate(0,${chartHeight})`)
        .transition()
        .duration(1000)
        .call(d3.axisBottom(x));
    svg
        .select(".domain")
        .remove();

    svg.append("g").transition()
        .duration(1000)
        .call(d3.axisLeft(y));
    svg
        .select(".domain")
        .remove();

    // Add gridlines
    svg.append("g")
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
    svg
        .select(".domain")
        .remove();

    const boxWidth = x.bandwidth() * 0.5;
    const boxStats = [];

    data.forEach((d) => {
        const grades = d.grades.sort(d3.ascending);
        const q1 = d3.quantile(grades, 0.25);
        const median = d3.quantile(grades, 0.5);
        const q3 = d3.quantile(grades, 0.75);
        const iqr = q3 - q1;
        const min = Math.max(d3.min(grades), q1 - 1.5 * iqr);
        const max = Math.min(d3.max(grades), q3 + 1.5 * iqr);
        boxStats.push({ ...d, label: d.internet, max, median, min, q1, q3 });




        // Box for the data
        const box = svg
            .append("rect")
            .attr("class", "nearest-boxplot-box")
            .attr("data-nearest-key", d.internet)
            .attr("x", x(d.internet) + boxWidth / 4) // Adjust to 'd.distance' for Travel Time
            .attr("y", y(q3))
            .attr("width", boxWidth)
            .attr("height", y(q1) - y(q3))
            .attr("fill", "steelblue")
            .on("mouseover", (event) => {
                tooltip
                    .style("opacity", 1)
                    .html(
                        `
            <strong>Internet:</strong> ${d.internet}<br>
            <strong>Q1:</strong> ${q1.toFixed(2)}<br>
            <strong>Median:</strong> ${median.toFixed(2)}<br>
            <strong>Q3:</strong> ${q3.toFixed(2)}`
                    )
                    .style("left", `${event.pageX + 10}px`)
                    .style("top", `${event.pageY - 20}px`);

                // Hover Highlight: Change color of the box on hover
                d3.select(event.target)
                    .attr("fill", "orange") // Change box color to orange on hover
                    .attr("stroke", "black") // Add a black border to highlight
                    .attr("stroke-width", 2); // Border width to highlight
            })
            .on("mousemove", (event) => {
                tooltip
                    .style("left", `${event.pageX + 10}px`)
                    .style("top", `${event.pageY - 20}px`);
            })
            .on("mouseout", () => {
                tooltip.style("opacity", 0);

                // Reset the color when mouse leaves
                d3.select(event.target)
                    .attr("fill", "steelblue") // Reset box color to original
                    .attr("stroke", "none"); // Remove the border
            })


            .attr("opacity", 0)
            .transition()
            .duration(1000)
            .ease(d3.easeLinear)
            .attr("opacity", 1)


        ;




        svg
            .append("line")
            .attr("class", "nearest-boxplot-whisker")
            .attr("data-nearest-key", d.internet)
            .attr("x1", x(d.internet) + boxWidth / 2) // Adjust for horizontal positioning
            .attr("x2", x(d.internet) + boxWidth / 2)
            .attr("y1", y(min))
            .attr("y2", y(max))
            .attr("stroke", "black")
            .attr("stroke-width", 2) // Make the line 5 times wider
            .attr("pointer-events", "stroke") // Ensure hover is detected on the stroke
            .on("mouseover", function (event) {
                // Show a simple popup for debugging


                tooltip
                    .style("opacity", 1)
                    .html(
                        `<strong>Internet:</strong> ${d.internet}<br>
         <strong>Min:</strong> ${min.toFixed(2)}<br>
         <strong>Max:</strong> ${max.toFixed(2)}`
                    )
                    .style("left", `${event.pageX + 10}px`)
                    .style("top", `${event.pageY - 20}px`);

                // Highlight the line
                d3.select(this)
                    .attr("stroke", "red") // Change to red on hover
                    .attr("stroke-width", 3); // Increase line width
            })
            .on("mousemove", function (event) {
                tooltip
                    .style("left", `${event.pageX + 10}px`)
                    .style("top", `${event.pageY - 20}px`);
            })
            .on("mouseout", function () {
                tooltip.style("opacity", 0);

                // Reset line color and width
                d3.select(this)
                    .attr("stroke", "black") // Reset to default color
                    .attr("stroke-width", 2); // Reset to default width
            })
            .attr("opacity", 0)
            .transition()
            .duration(1000)
            .ease(d3.easeLinear)
            .attr("opacity", 1);

    });

    addNearestHoverLayer({
        data: boxStats,
        height,
        html: (d) => `<strong>Internet:</strong> ${d.label}<br><strong>Min:</strong> ${d.min.toFixed(2)}<br><strong>Q1:</strong> ${d.q1.toFixed(2)}<br><strong>Median:</strong> ${d.median.toFixed(2)}<br><strong>Q3:</strong> ${d.q3.toFixed(2)}<br><strong>Max:</strong> ${d.max.toFixed(2)}`,
        layer: svg,
        tooltip,
        width,
        x0: -margin.left,
        y0: -margin.top,
        x: (d) => x(d.label) + x.bandwidth() / 2,
        clear: () => {
            svg.selectAll(".nearest-boxplot-box").attr("fill", "steelblue").attr("stroke", "none");
            svg.selectAll(".nearest-boxplot-whisker").attr("stroke", "black").attr("stroke-width", 2);
        },
        highlight: (d) => {
            svg.selectAll(".nearest-boxplot-box").filter(function () { return this.getAttribute("data-nearest-key") === d.label; }).attr("fill", "orange").attr("stroke", "black").attr("stroke-width", 2);
            svg.selectAll(".nearest-boxplot-whisker").filter(function () { return this.getAttribute("data-nearest-key") === d.label; }).attr("stroke", "red").attr("stroke-width", 3);
        },
    });

    // Add labels to the chart
    svg
        .append("text")
        .attr("x", chartWidth / 2)
        .attr("y", chartHeight + 40)
        .attr("text-anchor", "middle")
        .text(
            containerId === "internetBoxPlot"
                ? "Internet Access"
                : "Travel Time (distance categories)"
        );

    svg
        .append("text")
        .attr("x", -(chartHeight / 2))
        .attr("y", -35)
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("opacity", 0)
        .text("→ Grades")

        .transition()
        .duration(1000)
        .ease(d3.easeCubicInOut)
        .attr("opacity", 1);

    svg
        .append("text")
        .attr("x", chartWidth / 2)
        .attr("y", 5)
        .attr("text-anchor", "middle")
        .attr("opacity", 0)

        .text("Grade Distribution Based on Internet Access")
        .transition()
        .duration(1000)
        .ease(d3.easeCubicInOut)
        .attr("opacity", 1);
}

// Draw grouped bar chart
function drawGroupedBarChart(containerId, data) {
    console.log("Rendering Grouped Bar Chart", containerId);
    clearChart(containerId); // Clear container before drawing

    const container = document.getElementById(containerId);
    const { width, height } = getDimensions(container);
    d3.select(container).selectAll("*").remove();

    const margin = { top: 20, right: 20, bottom: 50, left: 50 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const svg = d3
        .select(container)
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const keys = ["G1", "G2", "G3"];
    const groups = data.map((d) => d.sex);

    const x0 = d3.scaleBand().domain(groups).range([0, chartWidth]).padding(0.2);

    const x1 = d3
        .scaleBand()
        .domain(keys)
        .range([0, x0.bandwidth()])
        .padding(0.1);

    const y = d3
        .scaleLinear()
        .domain([0, 12])
        .range([chartHeight, 20]);

    const color = d3
        .scaleOrdinal()
        .domain(keys)
        .range(["#1f77b4", "#ff7f0e", "#2ca02c"]);

    svg
        .append("g")
        .attr("transform", `translate(0,${chartHeight})`)
        .transition()
        .duration(1000)
        .call(d3.axisBottom(x0));
    svg
        .select(".domain")
        .remove();

    svg.append("g").transition()
        .duration(1000)
        .call(d3.axisLeft(y));
    svg
        .select(".domain")
        .remove();

    // Add gridlines
    svg.append("g")
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
    svg
        .select(".domain")
        .remove();

    svg
        .append("g")
        .selectAll("g")
        .data(data)
        .enter()
        .append("g")
        .attr("transform", (d) => `translate(${x0(d.sex)},0)`)
        .selectAll("rect")
        .data((d) => keys.map((key) => ({ key, sex: d.sex, value: d[key] })))
        .enter()
        .append("rect")
        .attr("class", "grouped-grade-bar")
        .attr("x", (d) => x1(d.key))
        .attr("y", y(0)) // Start at the top
        .attr("width", x1.bandwidth())
        .attr("height", 0) // Start with zero height
        .attr("fill", (d) => color(d.key))
        .transition()
        .duration((d) => {
            // Calculate bar height
            const barHeight = chartHeight - y(d.value);

            // Calculate maximum bar height across all groups and keys
            const maxBarHeight = Math.max(
                ...data.flatMap((group) => keys.map((key) => chartHeight - y(group[key])))
            );

            // Scale duration relative to the maximum bar height
            return (barHeight / maxBarHeight) * 1000; // Scale to 1000ms for the tallest bar
        })
        .ease(d3.easeBackOut) // Overshoot effect
        .attr("y", (d) => y(d.value)) // Animate to the final y position
        .attr("height", (d) => chartHeight - y(d.value)); // Animate to the final height




    // chartGroup
    //     .selectAll(".bar")
    //     .data(data)
    //     .enter()
    //     .append("rect")
    //     .attr("class", "bar")
    //     .attr("x", (d) => x(d.studyTime))
    //     .attr("y", (d) => y(0))
    //     .attr("width", x.bandwidth())
    //     .attr("height", 0)
    //     .attr("fill", "steelblue")
    //
    //     .transition()
    //     .duration(d => {
    //         const barHeight = Math.abs(y(d.avgGrade) - y(0));
    //         return (barHeight / d3.max(data, d => Math.abs(y(d.avgGrade) - y(0)))) * 1000; // Scale duration, capped at 1000ms
    //     })
    //     .ease(d3.easeBackOut) // Overshoot effect
    //     .attr("y", d => (d.avgGrade > 0 ? y(d.avgGrade) : y(0)))
    //     .attr("height", d => Math.abs(y(d.avgGrade) - y(0)));





    svg
        .selectAll("rect")
        .on("mouseover", (event, d) => {
            tooltip
                .style("opacity", 1)
                .html(`<strong>${d.key}:</strong> ${d.value.toFixed(2)}`)
                .style("left", `${event.pageX + 10}px`)
                .style("top", `${event.pageY - 20}px`);

            // Highlight the hovered bar
            d3.select(event.target)
                .attr("fill", "yellow") // Change color on hover
                .attr("stroke", "black") // Add a border to highlight the bar
                .attr("stroke-width", 2); // Add a border width to highlight
        })
        .on("mousemove", (event) => {
            tooltip
                .style("left", `${event.pageX + 10}px`)
                .style("top", `${event.pageY - 20}px`);
        })
        .on("mouseout", (event) => {
            tooltip.style("opacity", 0);

            // Reset the color when mouse leaves
            d3.select(event.target)
                .attr("fill", (d) => color(d.key)) // Reset color
                .attr("stroke", "none"); // Remove the border
        });

    const groupedBarData = data.flatMap((group) => keys.map((key) => ({ key, sex: group.sex, value: group[key] })));
    addNearestHoverLayer({
        data: groupedBarData,
        height,
        html: (d) => `<strong>Gender:</strong> ${d.sex}<br><strong>${d.key}:</strong> ${d.value.toFixed(2)}`,
        layer: svg,
        tooltip,
        width,
        x0: -margin.left,
        y0: -margin.top,
        x: (d) => x0(d.sex) + x1(d.key) + x1.bandwidth() / 2,
        clear: () => svg.selectAll(".grouped-grade-bar").attr("fill", (d) => color(d.key)).attr("stroke", "none"),
        highlight: (d) => svg.selectAll(".grouped-grade-bar").filter((barDatum) => barDatum.sex === d.sex && barDatum.key === d.key).attr("fill", "yellow").attr("stroke", "black").attr("stroke-width", 2),
    });

    svg
        .append("text")
        .attr("x", chartWidth / 2)
        .attr("y", chartHeight + 40)
        .attr("text-anchor", "middle")
        .attr("opacity", 0)

        .text("Gender")
        .transition()
        .duration(1000)
        .ease(d3.easeCubicInOut)
        .attr("opacity", 1);

    svg
        .append("text")
        .attr("text-anchor", "middle")
        .attr("transform", `translate(-35, ${chartHeight / 2}) rotate(-90)`)
        .attr("opacity", 0)

        .text("→ Average Grade")
        .transition()
        .duration(1000)
        .ease(d3.easeCubicInOut)
        .attr("opacity", 1);

    svg
        .append("text")
        .attr("x", chartWidth / 2)
        .attr("y", 5)
        .attr("text-anchor", "middle")
        .attr("opacity", 0)

        .text("Comparison of Grades Across Genders")
        .transition()
        .duration(1000)
        .ease(d3.easeCubicInOut)
        .attr("opacity", 1);
}

// Box Plot for Distance/Travel Time
function drawDistanceBoxPlot(containerId, data) {
    console.log("Rendering Distnace", containerId);
    const container = document.getElementById(containerId);
    const { width, height } = getDimensions(container);
    d3.select(container).selectAll("*").remove();

    const margin = { top: 20, right: 20, bottom: 50, left: 50 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const svg = d3
        .select(container)
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // X scale: Distance categories
    const x = d3
        .scaleBand()
        .domain(data.map((d) => d.distance))
        .range([0, chartWidth])
        .padding(0.5);

    // X-axis labels mapping
    const labels = {
        1: "0-15 min",
        2: "15-30 min",
        3: "30-60 min",
        4: ">60 min",
    };

    // Y scale: Grade range
    const allGrades = data.flatMap((d) => d.grades);
    const y = d3
        .scaleLinear()
        .domain([0, 20])
        .range([chartHeight, 20]);

    // Add X and Y axes
    svg
        .append("g")
        .attr("transform", `translate(0,${chartHeight})`)
        .transition()
        .duration(1000)
        .call(d3.axisBottom(x).tickFormat((d) => labels[d] || d));
    svg
        .select(".domain")
        .remove();

    svg.append("g").transition()
        .duration(1000)
        .call(d3.axisLeft(y));
    svg
        .select(".domain")
        .remove();

    // Add gridlines
    svg.append("g")
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
    svg
        .select(".domain")
        .remove();

    const boxWidth = x.bandwidth() * 0.6;
    const boxStats = [];

    data.forEach((d) => {
        const grades = d.grades.sort(d3.ascending);
        const q1 = d3.quantile(grades, 0.25);
        const median = d3.quantile(grades, 0.5);
        const q3 = d3.quantile(grades, 0.75);
        const iqr = q3 - q1;
        const min = Math.max(d3.min(grades), q1 - 1.5 * iqr);
        const max = Math.min(d3.max(grades), q3 + 1.5 * iqr);
        boxStats.push({ ...d, label: d.distance, max, median, min, q1, q3 });

        // Box
        const box = svg
            .append("rect")
            .attr("class", "nearest-boxplot-box")
            .attr("data-nearest-key", d.distance)
            .attr("x", x(d.distance) + boxWidth / 4)
            .attr("y", y(q3))
            .attr("width", boxWidth)
            .attr("height", y(q1) - y(q3))
            .attr("fill", "steelblue")
            .on("mouseover", (event) => {
                tooltip
                    .style("opacity", 1)
                    .html(
                        `
            <strong>Distance:</strong> ${labels[d.distance] || d.distance}<br>
            <strong>Q1:</strong> ${q1.toFixed(2)}<br>
            <strong>Median:</strong> ${median.toFixed(2)}<br>
            <strong>Q3:</strong> ${q3.toFixed(2)}`
                    )
                    .style("left", `${event.pageX + 10}px`)
                    .style("top", `${event.pageY - 20}px`);

                // Hover Highlight: Change color of the box on hover
                d3.select(event.target)
                    .attr("fill", "orange") // Change box color to orange on hover
                    .attr("stroke", "black") // Add a black border to highlight
                    .attr("stroke-width", 2); // Border width to highlight
            })
            .on("mousemove", (event) => {
                tooltip
                    .style("left", `${event.pageX + 10}px`)
                    .style("top", `${event.pageY - 20}px`);
            })
            .on("mouseout", () => {
                tooltip.style("opacity", 0);

                // Reset the color when mouse leaves
                d3.select(event.target)
                    .attr("fill", "steelblue") // Reset box color to original
                    .attr("stroke", "none"); // Remove the border
            })

            .attr("opacity", 0)
            .transition()
            .duration(1000)
            .ease(d3.easeLinear)
            .attr("opacity", 1)
        ;

        // Median Line
        svg
            .append("line")
            .attr("class", "nearest-boxplot-whisker")
            .attr("data-nearest-key", d.distance)
            .attr("x1", x(d.distance) + boxWidth / 2)
            .attr("x2", x(d.distance) + boxWidth / 2)
            .attr("y1", y(min))
            .attr("y2", y(max))
            .attr("stroke", "black")
            .attr("stroke-width", 2) // Make the line 5 times wider
            .attr("pointer-events", "stroke") // Ensure hover is detected on the stroke
            .on("mouseover", function (event) {
                // Show a simple popup for debugging


                tooltip
                    .style("opacity", 1)
                    .html(
                        `<strong>Internet:</strong> ${d.distance}<br>
         <strong>Min:</strong> ${min.toFixed(2)}<br>
         <strong>Max:</strong> ${max.toFixed(2)}`
                    )
                    .style("left", `${event.pageX + 10}px`)
                    .style("top", `${event.pageY - 20}px`);

                // Highlight the line
                d3.select(this)
                    .attr("stroke", "red") // Change to red on hover
                    .attr("stroke-width", 3); // Increase line width
            })
            .on("mousemove", function (event) {
                tooltip
                    .style("left", `${event.pageX + 10}px`)
                    .style("top", `${event.pageY - 20}px`);
            })
            .on("mouseout", function () {
                tooltip.style("opacity", 0);

                // Reset line color and width
                d3.select(this)
                    .attr("stroke", "black") // Reset to default color
                    .attr("stroke-width", 2); // Reset to default width
            })
            .attr("opacity", 0)
            .transition()
            .duration(1000)
            .ease(d3.easeLinear)
            .attr("opacity", 1);

    });

    addNearestHoverLayer({
        data: boxStats,
        height,
        html: (d) => `<strong>Distance:</strong> ${labels[d.label] || d.label}<br><strong>Min:</strong> ${d.min.toFixed(2)}<br><strong>Q1:</strong> ${d.q1.toFixed(2)}<br><strong>Median:</strong> ${d.median.toFixed(2)}<br><strong>Q3:</strong> ${d.q3.toFixed(2)}<br><strong>Max:</strong> ${d.max.toFixed(2)}`,
        layer: svg,
        tooltip,
        width,
        x0: -margin.left,
        y0: -margin.top,
        x: (d) => x(d.label) + x.bandwidth() / 2,
        clear: () => {
            svg.selectAll(".nearest-boxplot-box").attr("fill", "steelblue").attr("stroke", "none");
            svg.selectAll(".nearest-boxplot-whisker").attr("stroke", "black").attr("stroke-width", 2);
        },
        highlight: (d) => {
            svg.selectAll(".nearest-boxplot-box").filter(function () { return String(this.getAttribute("data-nearest-key")) === String(d.label); }).attr("fill", "orange").attr("stroke", "black").attr("stroke-width", 2);
            svg.selectAll(".nearest-boxplot-whisker").filter(function () { return String(this.getAttribute("data-nearest-key")) === String(d.label); }).attr("stroke", "red").attr("stroke-width", 3);
        },
    });

    // Add labels
    svg
        .append("text")
        .attr("x", chartWidth / 2)
        .attr("y", chartHeight + 40)
        .attr("text-anchor", "middle")
        .attr("opacity", 0)

        .text("Travel Time (distance categories)")
        .transition()
        .duration(1000)
        .ease(d3.easeCubicInOut)
        .attr("opacity", 1);

    svg
        .append("text")
        .attr("x", -(chartHeight / 2))
        .attr("y", -35)
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("opacity", 0)

        .text("→ Grades")
        .transition()
        .duration(1000)
        .ease(d3.easeCubicInOut)
        .attr("opacity", 1);

    svg
        .append("text")
        .attr("x", chartWidth / 2)
        .attr("y", 5)
        .attr("text-anchor", "middle")
        .attr("opacity", 0)

        .text("Grade Distribution by Travel Time")
        .transition()
        .duration(1000)
        .ease(d3.easeCubicInOut)
        .attr("opacity", 1);
}

function drawAbsencesScatterPlot(containerId, data) {
    const container = document.getElementById(containerId);
    const { width, height } = getDimensions(container);
    d3.select(container).selectAll("*").remove();

    const margin = { top: 20, right: 20, bottom: 50, left: 50 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const svg = d3
        .select(container)
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Scales
    const x = d3
        .scaleLinear()
        .domain([0, d3.max(data, (d) => d.absences)])
        .range([0, chartWidth]);
    const y = d3.scaleLinear().domain([0, 20]).range([chartHeight, 20]);

    // Axes
    svg
        .append("g")
        .attr("transform", `translate(0,${chartHeight})`)
        .transition()
        .duration(1000)
        .call(d3.axisBottom(x));
    svg
        .select(".domain")
        .remove();

    svg.append("g").transition()
        .duration(1000)
        .call(d3.axisLeft(y));
    svg
        .select(".domain")
        .remove();

    // Add gridlines
    svg.append("g")
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
    svg
        .select(".domain")
        .remove();

    // Plot points for G1, G2, and G3
    ["G1", "G2", "G3"].forEach((grade, index) => {
        svg
            .selectAll(`.point-${grade}`)
            .data(data)
            .enter()
            .append("circle")
            .attr("class", `absence-dot point-${grade}`)
            .attr("data-grade", grade)
            .attr("data-color", ["blue", "orange", "green"][index])
            .attr("cx", (d) => x(d.absences))
            .attr("cy", (d) => y(d[grade]))
            .attr("r", 0) // Default circle size
            .attr("fill", ["blue", "orange", "green"][index])
            .attr("opacity", 0.6)
            .on("mouseover", (event, d) => {
                tooltip
                    .style("opacity", 1)
                    .html(
                        `<strong>Absences:</strong> ${d.absences}<br>
             <strong>${grade} Grade:</strong> ${d[grade]}`
                    )
                    .style("left", `${event.pageX + 10}px`)
                    .style("top", `${event.pageY - 20}px`);

                // Highlight the point: Change color to red and increase size
                d3.select(event.target)
                    .attr("r", 8) // Increase the size of the circle
                    .attr("fill", "red"); // Change the color to red
            })
            .on("mousemove", (event) => {
                tooltip
                    .style("left", `${event.pageX + 10}px`)
                    .style("top", `${event.pageY - 20}px`);
            })
            .on("mouseout", (event) => {
                tooltip.style("opacity", 0);

                // Reset the circle size and color
                d3.select(event.target)
                    .attr("r", 4) // Reset to default size
                    .attr("fill", ["blue", "orange", "green"][index]); // Reset to original color
            })

            .transition()
            .duration(1000)
            .ease(d3.easeBackOut)
            .attr("r", 4)


        ;
    });

    const scatterMarks = svg.selectAll(".absence-dot").nodes().map((node) => ({
        color: node.getAttribute("data-color"),
        datum: d3.select(node).datum(),
        grade: node.getAttribute("data-grade"),
        node,
    }));

    addNearestHoverLayer({
        data: scatterMarks,
        height,
        html: (mark) => `<strong>Absences:</strong> ${mark.datum.absences}<br><strong>${mark.grade} Grade:</strong> ${mark.datum[mark.grade]}`,
        layer: svg,
        tooltip,
        width,
        x0: -margin.left,
        y0: -margin.top,
        x: (mark) => +d3.select(mark.node).attr("cx"),
        y: (mark) => +d3.select(mark.node).attr("cy"),
        clear: () => svg.selectAll(".absence-dot").attr("r", 4).attr("fill", function () { return this.getAttribute("data-color"); }),
        highlight: (mark) => d3.select(mark.node).attr("r", 8).attr("fill", "red"),
    });

    // Add labels
    svg
        .append("text")
        .attr("x", chartWidth / 2)
        .attr("y", chartHeight + 40)
        .attr("text-anchor", "middle")
        .attr("opacity", 0)

        .text("Absences")
        .transition()
        .duration(1000)
        .ease(d3.easeCubicInOut)
        .attr("opacity", 1);

    svg
        .append("text")
        .attr("x", -(chartHeight / 2))
        .attr("y", -35)
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("opacity", 0)

        .text("→ Grades")
        .transition()
        .duration(1000)
        .ease(d3.easeCubicInOut)
        .attr("opacity", 1);

    svg
        .append("text")
        .attr("x", chartWidth / 2)
        .attr("y", 5)
        .attr("text-anchor", "middle")
        .attr("opacity", 0)

        .text("Scatterplot of Grades by Absences")
        .transition()
        .duration(1000)
        .ease(d3.easeCubicInOut)
        .attr("opacity", 1);
}

// Box Plot: Absences Categories vs Grades
function drawAbsencesBoxPlot(containerId, data) {
    const container = document.getElementById(containerId);
    const { width, height } = getDimensions(container);
    d3.select(container).selectAll("*").remove();

    const margin = { top: 20, right: 20, bottom: 50, left: 50 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const svg = d3
        .select(container)
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Scales
    const x = d3
        .scaleBand()
        .domain(data.map((d) => d.absence))
        .range([0, chartWidth])
        .padding(0.5);
    const allGrades = data.flatMap((d) => d.grades);
    const y = d3
        .scaleLinear()
        .domain([0, 20])
        .range([chartHeight, 20]);

    // Axes
    svg
        .append("g")
        .attr("transform", `translate(0,${chartHeight})`)
        .transition()
        .duration(1000)
        .call(d3.axisBottom(x));
    svg
        .select(".domain")
        .remove();

    svg.append("g").transition()
        .duration(1000)
        .call(d3.axisLeft(y));
    svg
        .select(".domain")
        .remove();

    // Add gridlines
    svg.append("g")
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
    svg
        .select(".domain")
        .remove();

    const boxWidth = x.bandwidth() * 0.6;
    const boxStats = [];

    // Draw each box
    data.forEach((d) => {
        const grades = d.grades.sort(d3.ascending);
        const q1 = d3.quantile(grades, 0.25);
        const median = d3.quantile(grades, 0.5);
        const q3 = d3.quantile(grades, 0.75);
        const iqr = q3 - q1;
        const min = Math.max(d3.min(grades), q1 - 1.5 * iqr);
        const max = Math.min(d3.max(grades), q3 + 1.5 * iqr);
        boxStats.push({ ...d, label: d.absence, max, median, min, q1, q3 });

        // Box
        svg
            .append("rect")
            .attr("class", "nearest-boxplot-box")
            .attr("data-nearest-key", d.absence)
            .attr("x", x(d.absence) + boxWidth / 4)
            .attr("y", y(q3))
            .attr("width", boxWidth)
            .attr("height", y(q1) - y(q3))
            .attr("fill", "steelblue")
            .on("mouseover", (event) => {
                tooltip
                    .style("opacity", 1)
                    .html(
                        `<strong>Absence:</strong> ${d.absence}<br>
             <strong>Q1:</strong> ${q1.toFixed(2)}<br>
             <strong>Median:</strong> ${median.toFixed(2)}<br>
             <strong>Q3:</strong> ${q3.toFixed(2)}`
                    )
                    .style("left", `${event.pageX + 10}px`)
                    .style("top", `${event.pageY - 20}px`);

                // Highlight the box
                d3.select(event.target)
                    .attr("fill", "orange") // Change color to orange on hover
                    .attr("stroke", "black") // Add border
                    .attr("stroke-width", 2); // Set border width
            })
            .on("mousemove", (event) => {
                tooltip
                    .style("left", `${event.pageX + 10}px`)
                    .style("top", `${event.pageY - 20}px`);
            })
            .on("mouseout", (event) => {
                tooltip.style("opacity", 0);

                // Reset color and stroke
                d3.select(event.target)
                    .attr("fill", "steelblue")
                    .attr("stroke", "none");
            })

            .attr("opacity", 0)
            .transition()
            .duration(1000)
            .ease(d3.easeLinear)
            .attr("opacity", 1)
        ;

        // Median Line
        svg
            .append("line")
            .attr("class", "nearest-boxplot-whisker")
            .attr("data-nearest-key", d.absence)
            .attr("x1", x(d.absence) + boxWidth / 2)
            .attr("x2", x(d.absence) + boxWidth / 2)
            .attr("y1", y(min))
            .attr("y2", y(max))
            .attr("stroke", "black")
            .attr("stroke-width", 2) // Make the line 5 times wider
            .attr("pointer-events", "stroke") // Ensure hover is detected on the stroke
            .on("mouseover", function (event) {
                // Show a simple popup for debugging


                tooltip
                    .style("opacity", 1)
                    .html(
                        `<strong>Internet:</strong> ${d.absence}<br>
         <strong>Min:</strong> ${min.toFixed(2)}<br>
         <strong>Max:</strong> ${max.toFixed(2)}`
                    )
                    .style("left", `${event.pageX + 10}px`)
                    .style("top", `${event.pageY - 20}px`);

                // Highlight the line
                d3.select(this)
                    .attr("stroke", "red") // Change to red on hover
                    .attr("stroke-width", 3); // Increase line width
            })
            .on("mousemove", function (event) {
                tooltip
                    .style("left", `${event.pageX + 10}px`)
                    .style("top", `${event.pageY - 20}px`);
            })
            .on("mouseout", function () {
                tooltip.style("opacity", 0);

                // Reset line color and width
                d3.select(this)
                    .attr("stroke", "black") // Reset to default color
                    .attr("stroke-width", 2); // Reset to default width
            })
            .attr("opacity", 0)
            .transition()
            .duration(1000)
            .ease(d3.easeLinear)
            .attr("opacity", 1);

    });

    addNearestHoverLayer({
        data: boxStats,
        height,
        html: (d) => `<strong>Absence:</strong> ${d.label}<br><strong>Min:</strong> ${d.min.toFixed(2)}<br><strong>Q1:</strong> ${d.q1.toFixed(2)}<br><strong>Median:</strong> ${d.median.toFixed(2)}<br><strong>Q3:</strong> ${d.q3.toFixed(2)}<br><strong>Max:</strong> ${d.max.toFixed(2)}`,
        layer: svg,
        tooltip,
        width,
        x0: -margin.left,
        y0: -margin.top,
        x: (d) => x(d.label) + x.bandwidth() / 2,
        clear: () => {
            svg.selectAll(".nearest-boxplot-box").attr("fill", "steelblue").attr("stroke", "none");
            svg.selectAll(".nearest-boxplot-whisker").attr("stroke", "black").attr("stroke-width", 2);
        },
        highlight: (d) => {
            svg.selectAll(".nearest-boxplot-box").filter(function () { return this.getAttribute("data-nearest-key") === d.label; }).attr("fill", "orange").attr("stroke", "black").attr("stroke-width", 2);
            svg.selectAll(".nearest-boxplot-whisker").filter(function () { return this.getAttribute("data-nearest-key") === d.label; }).attr("stroke", "red").attr("stroke-width", 3);
        },
    });

    // Add labels
    svg
        .append("text")
        .attr("x", chartWidth / 2)
        .attr("y", chartHeight + 40)
        .attr("text-anchor", "middle")
        .attr("opacity", 0)

        .text("Absences")
        .transition()
        .duration(1000)
        .ease(d3.easeCubicInOut)
        .attr("opacity", 1);

    svg
        .append("text")
        .attr("x", -(chartHeight / 2))
        .attr("y", -35)
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("opacity", 0)

        .text("→ Grades")
        .transition()
        .duration(1000)
        .ease(d3.easeCubicInOut)
        .attr("opacity", 1);

    svg
        .append("text")
        .attr("x", chartWidth / 2)
        .attr("y", 5)
        .attr("text-anchor", "middle")
        .attr("opacity", 0)

        .text("Grade Distribution by Absences")
        .transition()
        .duration(1000)
        .ease(d3.easeCubicInOut)
        .attr("opacity", 1);
}

function reRenderCharts(selectedType) {
    // Clear all chart containers
    const chartContainers = document.querySelectorAll(".chart-container");
    chartContainers.forEach((container) => clearChart(container.id));

    // Data Mapping for Filters
    const chartMapping = {
        gender: ["groupedBarChart"],
        studytime: ["barChart", "lineChart"],
        internet: ["internetBoxPlot"],
        distance: ["distanceBoxPlot"],
        absence: ["scatterAbsences", "boxAbsences"],
    };

    // Get the relevant chart IDs for the selected filter
    const relevantCharts = chartMapping[selectedType] || [];

    // Render only the relevant charts
    if (selectedType === "gender") {
        drawGroupedBarChart("groupedBarChart", genderData);
    } else if (selectedType === "studytime") {
        drawBarChart("barChart", studyTimeData);
        drawLineChart("lineChart", studyTimeData);
    } else if (selectedType === "internet") {
        drawBoxPlot("internetBoxPlot", internetData);
    } else if (selectedType === "distance") {
        drawDistanceBoxPlot("distanceBoxPlot", distanceData);
    } else if (selectedType === "absence") {
        drawAbsencesScatterPlot("scatterAbsences", studentData);
        drawAbsencesBoxPlot("boxAbsences", absencesData);
    } else {
        // Render all charts when "All" is selected
        drawBarChart("barChart", studyTimeData);
        drawLineChart("lineChart", studyTimeData);
        drawBoxPlot("internetBoxPlot", internetData);
        drawGroupedBarChart("groupedBarChart", genderData);
        drawDistanceBoxPlot("distanceBoxPlot", distanceData);
        drawAbsencesScatterPlot("scatterAbsences", studentData);
        drawAbsencesBoxPlot("boxAbsences", absencesData);
    }
}

document.getElementById("filter1").addEventListener("change", (event) => {
    const selectedFilter = event.target.value;

    // Hide all charts initially
    document.querySelectorAll(".chart-container").forEach((container) => {
        container.style.display = "none";
    });

    // Show charts based on the selected filter
    switch (selectedFilter) {
        case "studytime":
            document.getElementById("barChart").style.display = "block";
            document.getElementById("lineChart").style.display = "block";
            drawBarChart("barChart", studyTimeData); // Re-render with filtered data
            drawLineChart("lineChart", studyTimeData); // Re-render with filtered data
            break;
        case "internet":
            document.getElementById("internetBoxPlot").style.display = "block";
            drawBoxPlot("internetBoxPlot", internetData); // Re-render with filtered data
            break;
        case "gender":
            document.getElementById("groupedBarChart").style.display = "block";
            drawGroupedBarChart("groupedBarChart", genderData); // Re-render with filtered data
            break;
        case "distance":
            document.getElementById("distanceBoxPlot").style.display = "block";
            drawDistanceBoxPlot("distanceBoxPlot", distanceData); // Re-render with filtered data
            break;
        case "absence":
            document.getElementById("scatterAbsences").style.display = "block";
            document.getElementById("boxAbsences").style.display = "block";
            drawAbsencesScatterPlot("scatterAbsences", studentData);
            drawAbsencesBoxPlot("boxAbsences", absencesData);
        default:
            // Show all charts if no filter is selected
            document.querySelectorAll(".chart-container").forEach((container) => {
                container.style.display = "block";
            });
    }
});



// Define metadata for visualizations
const visualizations = [
    { id: "barChart", title: "Impact of Study Time on Average Grade", axis: ["Weekly Study Time (hours)", "Average Grade"] },
    { id: "lineChart", title: "Trend of Average Grade by Study Time", axis: ["Weekly Study Time (hours)", "Average Grade"] },
    { id: "internetBoxPlot", title: "Grade Distribution Based on Internet Access", axis: ["Internet Access", "Grades"] },
    { id: "groupedBarChart", title: "Comparison of Grades Across Genders", axis: ["Gender", "Average Grade"] },
    { id: "distanceBoxPlot", title: "Grade Distribution by Travel Time", axis: ["Travel Time (distance categories)", "Grades"] },
    { id: "scatterAbsences", title: "Scatterplot of Grades by Absences", axis: ["Absences", "Grades"] },
    { id: "boxAbsences", title: "Grade Distribution by Absences", axis: ["Absences", "Grades"] },
];

// Handle search input
document.getElementById("searchBox").addEventListener("input", (event) => {
    const searchText = event.target.value.toLowerCase();

    // Filter visualizations based on search text
    const matchingVisualizations = visualizations.filter(
        (viz) =>
            viz.title.toLowerCase().includes(searchText) ||
            viz.axis.some((axis) => axis.toLowerCase().includes(searchText))
    );

    // Hide all visualizations initially
    document.querySelectorAll(".chart-container").forEach((container) => {
        container.style.display = "none";
    });

    // Show only matching visualizations
    matchingVisualizations.forEach((viz) => {
        const container = document.getElementById(viz.id);
        if (container) {
            container.style.display = "block";
        }
    });

    // If no match, show a "No Results" message
    if (matchingVisualizations.length === 0) {
        console.log("No matching visualizations found."); // Replace with UI feedback if needed
    }
});

return () => {
    document.querySelectorAll(".chart-container").forEach((container) => {
        d3.select(container).selectAll("*").interrupt().remove();
    });
    document.querySelectorAll("body > #tooltip, body > .MLTooltip").forEach((element) => element.remove());
};
}
