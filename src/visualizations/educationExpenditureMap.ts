// @ts-nocheck
import * as d3 from "d3";
import { hideFloatingTooltip, showFloatingTooltip } from "./proximityHover";

export function renderEducationExpenditureMap() {
document.querySelectorAll(".myTooltip").forEach((element) => element.remove());

const svg = d3.select("#chart svg");

const margin = {top: 0, right: 30, bottom: 60, left: 30};

const chartDiv = document.querySelector('#chart');
const width = chartDiv.clientWidth - margin.left - margin.right;
const height = chartDiv.clientHeight - margin.top - margin.bottom;

const padding = {top: 30, right: 0, bottom: 0, left: 30};

svg.attr("viewBox", `-${padding.left} -${padding.top} ${width + padding.left + padding.right} ${height + padding.top + padding.bottom}`)
    .attr("preserveAspectRatio", "xMinYMin meet");

d3.csv("/data/Expenditure.csv").then(data => {
    const validData = data
        .map(d => ({
            country: d["Country"],
            Expenditure: +d["Expenditure"],
            latitude: +d["Latitude"],
            longitude: +d["Longitude"]
        }))
        .filter(d => !isNaN(d.Expenditure) && !isNaN(d.latitude) && !isNaN(d.longitude))
        .sort((a, b) => b.Expenditure - a.Expenditure)
        .map((d, index) => ({
            ...d,
            rank: index + 1
        }));

    if (validData.length === 0) {
        console.error("No valid data to render. Check your CSV file structure and data.");
        return;
    }

    // Define map projection
    const projection = d3.geoMercator()
        .scale(150)
        .translate([width / 2, height / 1.5]);

    const path = d3.geoPath().projection(projection);

    // Create groups for map and bubbles
    const mapGroup = svg.append("g");
    const bubbleGroup = svg.append("g");

    const nameMapping = {
        "United States of America": "USA",
        "United Kingdom": "England"
    };

    const displayNameMapping = {
        "USA": "United States",
        "England": "United Kingdom"
    };

    // Define the zoom behavior
    const zoom = d3.zoom()
        .scaleExtent([1, 8]) // Set zoom limits
        .translateExtent([[0, 0], [width, height]]) // Restrict panning to the map's boundaries
        .filter(event => {
            // Mouse wheel, pinch, and buttons
            return event.type !== 'wheel';
        })
        .on("zoom", (event) => {
            if (event.transform.k === 1) {
                // Disable panning at scale 1 (default zoom)
                event.transform.x = 0;
                event.transform.y = 0;
            }
            mapGroup.attr("transform", event.transform);
            bubbleGroup.attr("transform", event.transform);
        });

    svg.call(zoom);

    // Add zoom control buttons
    const zoomControls = svg.append("g")
        .attr("class", "zoom-controls")
        .attr("transform", `translate(10, 10)`); // Top-left corner

    // Add "🌐" button for reset
    const resetGroup = zoomControls.append("g")
        .attr("class", "zoom-reset")
        .attr("transform", "translate(0, 0)")
        .style("cursor", "pointer") // Ensure the entire group has pointer cursor
        .on("click", () => {
            svg.transition().duration(500).call(
                zoom.transform,
                d3.zoomIdentity.translate(0, 0).scale(1) // Reset zoom
            );
        });
    resetGroup.append("rect") // Background for "🌐"
        .attr("x", -15)
        .attr("y", -15)
        .attr("width", 30)
        .attr("height", 30)
        .attr("rx", 5)
        .attr("ry", 5)
        .style("fill", "#eaeaea")
        .style("stroke", "#666")
        .style("stroke-width", 1);
    resetGroup.append("text")
        .attr("x", 0)
        .attr("y", 0)
        .attr("dy", "0.35em")
        .style("text-anchor", "middle")
        .text("🌐");

    // Zoom in button
    const zoomInGroup = zoomControls.append("g")
        .attr("class", "zoom-in")
        .attr("transform", "translate(0, 40)")
        .style("cursor", "pointer")
        .on("click", () => {
            const currentZoom = svg.node().__zoom.k; // Get current zoom level
            const newZoom = currentZoom * 1.2; // Zoom in by 20%
            // Ensure zoom doesn't exceed max zoom limit (8)
            if (newZoom <= 8) {
                svg.transition().duration(500).call(zoom.scaleBy, 1.2);
            }
        });
    zoomInGroup.append("rect") // Background for "➕"
        .attr("x", -15)
        .attr("y", -15)
        .attr("width", 30)
        .attr("height", 30)
        .attr("rx", 5)
        .attr("ry", 5)
        .style("fill", "#eaeaea")
        .style("stroke", "#666")
        .style("stroke-width", 1);
    zoomInGroup.append("text")
        .attr("x", 0)
        .attr("y", 0)
        .attr("dy", "0.35em")
        .style("text-anchor", "middle")
        .text("➕");

    // Zoom out button
    const zoomOutGroup = zoomControls.append("g")
        .attr("class", "zoom-out")
        .attr("transform", "translate(0, 80)")
        .style("cursor", "pointer")
        .on("click", () => {
            const currentZoom = svg.node().__zoom.k; // Get current zoom level
            const newZoom = currentZoom * 0.8; // Zoom out by 20%
            // Ensure zoom doesn't go below 1 (100% view)
            if (newZoom >= 1) {
                svg.transition().duration(500).call(zoom.scaleBy, 0.8);
            }
        });
    zoomOutGroup.append("rect") // Background for "➖"
        .attr("x", -15)
        .attr("y", -15)
        .attr("width", 30)
        .attr("height", 30)
        .attr("rx", 5)
        .attr("ry", 5)
        .style("fill", "#eaeaea")
        .style("stroke", "#666")
        .style("stroke-width", 1);
    zoomOutGroup.append("text")
        .attr("x", 0)
        .attr("y", 0)
        .attr("dy", "0.35em")
        .style("text-anchor", "middle")
        .text("➖");


    // Load world GeoJSON data with D3
    d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson")
        .then(world => {
            mapGroup.selectAll("path")
                .data(world.features)
                .enter()
                .append("path")
                .attr("d", path)
                .attr("fill", "#e0e0e0")
                .attr("stroke", "#888888")
                .attr("stroke-width", 0.5)
                .on("mouseover", (event, d) => {
                    const countryName = nameMapping[d.properties.name] || d.properties.name;

                    // Change country color
                    d3.select(event.currentTarget).attr("fill", "#ffcccb");

                    // Find the corresponding bubble and change its color
                    const countryData = validData.find(country => country.country === countryName);
                    if (countryData) {
                        d3.select(`#bubble-${countryData.country.replace(/\s/g, "-")}`).attr("fill", "orange");

                        myTooltip.style("display", "block")
                            .html(`
                                    #${countryData.rank} ${displayNameMapping[countryData.country] || countryData.country}<br>
Expenditure: ${
                                countryData.Expenditure >= 1_000_000_000_000
                                    ? `$${(countryData.Expenditure / 1_000_000_000_000).toFixed(2)} Trillion`
                                    : countryData.Expenditure >= 1_000_000_000
                                        ? `$${(countryData.Expenditure / 1_000_000_000).toFixed(2)} Billion`
                                        : `$${(countryData.Expenditure / 1_000_000).toFixed(2)} Million`
                            }
                                `);
                    }
                })

                .on("mousemove", event => {
                    const myTooltipWidth = myTooltip.node().offsetWidth;
                    const viewportWidth = window.innerWidth;

                    let myTooltipX = event.pageX + 10;
                    let myTooltipY = event.pageY + 10;

                    if (myTooltipX + myTooltipWidth > viewportWidth) {
                        myTooltipX = event.pageX - myTooltipWidth - 10;
                    }

                    myTooltip.style("left", `${myTooltipX}px`).style("top", `${myTooltipY}px`);
                })

                .on("mouseout", (event, d) => {
                    d3.select(event.currentTarget).attr("fill", "#e0e0e0");

                    // Reset the bubble color to black
                    const countryName = nameMapping[d.properties.name] || d.properties.name;
                    const countryData = validData.find(country => country.country === countryName);
                    if (countryData) {
                        d3.select(`#bubble-${countryData.country.replace(/\s/g, "-")}`).attr("fill", "black");
                    }

                    myTooltip.style("display", "none");
                });

            const maxRadius = 30;

            const scale = d3.scaleSqrt()
                .domain([0, d3.max(validData, d => d.Expenditure)])
                .range([0, maxRadius]);


            bubbleGroup.selectAll("circle")
                .data(validData)
                .enter()
                .append("circle")
                .attr("id", d => `bubble-${d.country.replace(/\s/g, "-")}`)
                .attr("cx", d => projection([d.longitude, d.latitude])[0])
                .attr("cy", d => projection([d.longitude, d.latitude])[1])
                .attr("r", 0) // Start with radius 0
                .attr("fill", "black")
                .attr("opacity", 0.6)
                .transition()
                .duration(1000)
                .ease(d3.easeBackOut)
                .attr("r", d => scale(d.Expenditure))
                .on("end", function () {

                    // Reattach event listeners after the transition
                    d3.select(this)
                        .on("mouseover", function (event, d) {

                            d3.select(this).attr("fill", "orange");

                            // Find and highlight the corresponding country
                            const countryPath = mapGroup.selectAll("path")
                                .filter(pathData => {
                                    const countryName = nameMapping[pathData.properties.name] || pathData.properties.name;
                                    return countryName === d.country;
                                });

                            countryPath.attr("fill", "#ffcccb"); // Highlight the country

                            // Tooltip setup
                            const myTooltip = d3.select(".myTooltip");
                            myTooltip
                                .style("display", "block")
                                .html(`
            #${d.rank} ${displayNameMapping[d.country] || d.country}<br>
  Expenditure: ${
                                    d.Expenditure >= 1_000_000_000_000
                                        ? `$${(d.Expenditure / 1_000_000_000_000).toFixed(2)} Trillion`
                                        : d.Expenditure >= 1_000_000_000
                                            ? `$${(d.Expenditure / 1_000_000_000).toFixed(2)} Billion`
                                            : `$${(d.Expenditure / 1_000_000).toFixed(2)} Million`
                                }          `)
                                .style("left", `${event.pageX + 10}px`)
                                .style("top", `${event.pageY + 10}px`);
                        })
                        .on("mousemove", function (event) {

                            // Move the myTooltip
                            d3.select(".myTooltip")
                                .style("left", `${event.pageX + 10}px`)
                                .style("top", `${event.pageY + 10}px`);
                        })

                        .on("mouseout", function (event, d) {
                            // Reset the bubble color
                            d3.select(this).attr("fill", "black");

                            // Reset the country color
                            mapGroup.selectAll("path")
                                .attr("fill", "#e0e0e0"); // Reset all countries to the default color

                            // Hide the myTooltip
                            d3.select(".myTooltip").style("display", "none");
                        });
                });

            const myTooltip = d3.select("body")
                .append("div")
                .attr("class", "myTooltip")
                .style("position", "absolute")
                .style("background-color", "#fff")
                .style("border", "1px solid #ccc")
                .style("padding", "5px")
                .style("border-radius", "5px")
                .style("pointer-events", "none")
                .style("display", "none");

            svg
                .on("mousemove.nearest-bubble", function (event) {
                    if ((event.target as Element).closest?.(".zoom-controls")) return;

                    const [mouseX, mouseY] = d3.pointer(event, svg.node());
                    const transform = d3.zoomTransform(bubbleGroup.node());
                    const nearest = d3.least(validData, (datum) => {
                        const point = transform.apply(projection([datum.longitude, datum.latitude]) ?? [0, 0]);
                        return (point[0] - mouseX) ** 2 + (point[1] - mouseY) ** 2;
                    });
                    if (!nearest) return;

                    const nearestPoint = transform.apply(projection([nearest.longitude, nearest.latitude]) ?? [0, 0]);
                    const distance = Math.sqrt((nearestPoint[0] - mouseX) ** 2 + (nearestPoint[1] - mouseY) ** 2);

                    mapGroup.selectAll("path").attr("fill", "#e0e0e0");
                    bubbleGroup.selectAll("circle").attr("fill", "black");
                    mapGroup.selectAll("path").filter((pathData) => {
                        const countryName = nameMapping[pathData.properties.name] || pathData.properties.name;
                        return countryName === nearest.country;
                    }).attr("fill", "#ffcccb");
                    d3.select(`#bubble-${nearest.country.replace(/\s/g, "-")}`).attr("fill", "orange");
                    showFloatingTooltip(
                        event,
                        myTooltip,
                        `#${nearest.rank} ${displayNameMapping[nearest.country] || nearest.country}<br>
  Expenditure: ${
                            nearest.Expenditure >= 1_000_000_000_000
                                ? `$${(nearest.Expenditure / 1_000_000_000_000).toFixed(2)} Trillion`
                                : nearest.Expenditure >= 1_000_000_000
                                    ? `$${(nearest.Expenditure / 1_000_000_000).toFixed(2)} Billion`
                                    : `$${(nearest.Expenditure / 1_000_000).toFixed(2)} Million`
                        }`
                    );
                })
                .on("mouseout.nearest-bubble", () => {
                    mapGroup.selectAll("path").attr("fill", "#e0e0e0");
                    bubbleGroup.selectAll("circle").attr("fill", "black");
                    hideFloatingTooltip(myTooltip);
                });


            // // Chart Title
            svg.append("text")
                .attr("x", width / 2)
                .attr("y", margin.top / 2)
                .attr("text-anchor", "middle")
                .attr("opacity", 0)
                .text("Which countries are leading in education funding, and how do their expenditures compare?")
                .transition()
                .duration(1000)
                .ease(d3.easeCubicInOut)
                .attr("opacity", 1);

        })

        .catch(error => console.error("Error loading world map data:", error));
}).catch(error => console.error("Error loading Section 3 CSV data:", error));

return () => {
    svg.selectAll("*").interrupt().remove();
    document.querySelectorAll(".myTooltip").forEach((element) => element.remove());
};
}
