// @ts-nocheck
import { Box } from "@mui/material";
import * as d3 from "d3";
import L from "leaflet";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { addNearestHoverLayer, hideFloatingTooltip, showFloatingTooltip } from "../visualizations/proximityHover";

type ProjectRoute = {
  slug: string;
  variant?: string;
};

const projectAsset = (path: string) => `/data/${path}`;

const baseProjectSx = {
  cursor: "default !important",
  fontFamily: "system-ui",
  height: "100dvh",
  minHeight: "100dvh",
  p: "clamp(14px, 1.4cqi, 28px)",
  userSelect: "none",
  WebkitTouchCallout: "none",
  background: "linear-gradient(180deg, #f7f9fc 0%, #edf3f8 100%)",
  containerType: "inline-size",
  "& *": {
    boxSizing: "border-box",
    cursor: "default !important",
    userSelect: "none",
    WebkitTouchCallout: "none",
  },
  "& svg": {
    height: "auto",
    maxWidth: "100%",
    width: "auto",
  },
};

const panelSx = {
  backgroundColor: "rgba(255, 255, 255, 0.94)",
  border: "1px solid rgba(148, 163, 184, 0.28)",
  borderRadius: "8px",
  boxShadow: "0 18px 44px rgba(15, 23, 42, 0.08)",
};

function ensureStylesheet(id: string, href: string) {
  if (document.getElementById(id)) return;

  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}

/*
 * Adapted from Leaflet.TileLayer.NoGap.
 * "THE BEER-WARE LICENSE":
 * <ivan@sanchezortega.es> wrote this file. As long as you retain this notice you
 * can do whatever you want with this stuff. If we meet some day, and you think
 * this stuff is worth it, you can buy me a beer in return.
 */
const StitchedTileLayer = L.TileLayer.extend({
  _onCreateLevel(level) {
    level.canvas = L.DomUtil.create("canvas", "leaflet-tile-container leaflet-zoom-animated", this._container);
    level.canvas.setAttribute("aria-hidden", "true");
    level.context = level.canvas.getContext("2d");
    this._resetCanvasSize(level);
  },

  _onUpdateLevel(zoom) {
    const level = this._levels[zoom];
    if (level?.canvas) level.canvas.style.zIndex = `${this.options.maxZoom - Math.abs(this._tileZoom - zoom)}`;
  },

  _onRemoveLevel(zoom) {
    const canvas = this._levels[zoom]?.canvas;
    if (canvas) L.DomUtil.remove(canvas);
  },

  _setZoomTransform(level, center, zoom) {
    L.GridLayer.prototype._setZoomTransform.call(this, level, center, zoom);
    this._setCanvasZoomTransform(level, center, zoom);
  },

  _setCanvasZoomTransform(level, center, zoom) {
    if (!level.canvasOrigin) return;

    const scale = this._map.getZoomScale(zoom, level.zoom);
    const translate = level.canvasOrigin
      .multiplyBy(scale)
      .subtract(this._map._getNewPixelOrigin(center, zoom))
      .round();

    if (L.Browser.any3d) L.DomUtil.setTransform(level.canvas, translate, scale);
    else L.DomUtil.setPosition(level.canvas, translate);
  },

  _resetCanvasSize(level) {
    const buffer = this.options.keepBuffer;
    const pixelBounds = this._getTiledPixelBounds(this._map.getCenter());
    const tileRange = this._pxBoundsToTileRange(pixelBounds);
    const tileSize = this.getTileSize();

    tileRange.min = tileRange.min.subtract([buffer, buffer]);
    tileRange.max = tileRange.max.add([buffer + 1, buffer + 1]);

    const pixelRange = L.bounds(
      tileRange.min.scaleBy(tileSize),
      tileRange.max.add([1, 1]).scaleBy(tileSize),
    );
    const neededSize = pixelRange.max.subtract(pixelRange.min);

    if (neededSize.x > level.canvas.width || neededSize.y > level.canvas.height) {
      const previous = document.createElement("canvas");
      previous.width = level.canvas.width;
      previous.height = level.canvas.height;
      previous.getContext("2d")?.drawImage(level.canvas, 0, 0);

      level.canvas.width = Math.max(neededSize.x, level.canvas.width);
      level.canvas.height = Math.max(neededSize.y, level.canvas.height);
      level.canvas.style.width = `${level.canvas.width}px`;
      level.canvas.style.height = `${level.canvas.height}px`;
      level.context = level.canvas.getContext("2d");
      level.context.drawImage(previous, 0, 0);
    }

    if (level.canvasRange) {
      const offset = level.canvasRange.min.subtract(tileRange.min).scaleBy(tileSize);
      const previous = document.createElement("canvas");
      previous.width = level.canvas.width;
      previous.height = level.canvas.height;
      previous.getContext("2d")?.drawImage(level.canvas, 0, 0);
      level.context.clearRect(0, 0, level.canvas.width, level.canvas.height);
      level.context.drawImage(previous, offset.x, offset.y);
    }

    level.canvasRange = tileRange;
    level.canvasOrigin = pixelRange.min;
    this._setCanvasZoomTransform(level, this._map.getCenter(), this._map.getZoom());
  },

  _drawTile(coords, image) {
    const level = this._levels[coords.z];
    if (!level?.canvasRange) return false;
    if (!level.canvasRange.contains(coords)) this._resetCanvasSize(level);

    const tileSize = this.getTileSize();
    const offset = L.point(coords.x, coords.y).subtract(level.canvasRange.min).scaleBy(tileSize);
    level.context.drawImage(image, offset.x, offset.y, tileSize.x, tileSize.y);
    return true;
  },

  _tileReady(coords, error, tile) {
    L.TileLayer.prototype._tileReady.call(this, coords, error, tile);
    if (error) return;

    const storedTile = this._tiles[this._tileCoordsToKey(coords)];
    if (!storedTile) return;

    try {
      if (this._drawTile(coords, storedTile.el)) storedTile.el.style.visibility = "hidden";
    } catch {
      storedTile.el.style.visibility = "inherit";
    }
  },

  _removeTile(key) {
    const tile = this._tiles[key];
    const level = tile && this._levels[tile.coords.z];
    if (level?.canvasRange) {
      const tileSize = this.getTileSize();
      const offset = L.point(tile.coords.x, tile.coords.y).subtract(level.canvasRange.min).scaleBy(tileSize);
      level.context.clearRect(offset.x, offset.y, tileSize.x, tileSize.y);
    }
    L.GridLayer.prototype._removeTile.call(this, key);
  },
});

export function EqualSpacingProject() {
  return (
    <Box
      sx={{
        ...baseProjectSx,
        background: "#d8e2ee",
        display: "grid",
        gap: "20px",
        gridTemplateColumns: "1fr 1fr",
        gridTemplateRows: "auto 1fr",
      }}
    >
      <Box sx={{ backgroundColor: "#0f2742", gridColumn: "1 / span 2", gridRow: 1, height: "350px", width: "100%" }} />
      <Box sx={{ backgroundColor: "#2563eb", gridColumn: 1, gridRow: 2, height: "100%", width: "100%" }} />
      <Box sx={{ backgroundColor: "#38bdf8", gridColumn: 2, gridRow: 2, height: "100%", width: "100%" }} />
    </Box>
  );
}

export function SunshineHoursProject() {
  const graphRef = useRef<HTMLDivElement | null>(null);
  const legendRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const graphTooltipRef = useRef<HTMLDivElement | null>(null);
  const mapTooltipRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    ensureStylesheet("leaflet-css", "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css");

    const graphContainer = graphRef.current;
    const legendContainer = legendRef.current;
    const mapContainer = mapRef.current;
    if (!graphContainer || !legendContainer || !mapContainer) return;

    d3.select(graphContainer).selectAll("*").remove();
    d3.select(legendContainer).selectAll(".legend-item").remove();

    const graphContainerWidth = graphContainer.clientWidth;
    const graphContainerHeight = graphContainer.clientHeight;
    const graphContainerMargin = { top: 50, right: 0, bottom: 50, left: 50 };
    const rangeLength = graphContainerWidth - graphContainerMargin.left - graphContainerMargin.right;
    const rangeHeight = graphContainerHeight - graphContainerMargin.top - graphContainerMargin.bottom;

    const svg = d3
      .select(graphContainer)
      .append("svg")
      .attr("width", graphContainerWidth)
      .attr("height", graphContainerHeight)
      .append("g")
      .attr("transform", `translate(${graphContainerMargin.left},${graphContainerMargin.top})`);

    const xAxis = d3.scaleBand().domain(["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]).range([0, rangeLength]);
    const map = L.map(mapContainer, {
      center: [39.8282, -98.5796],
      zoom: 4,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      minZoom: 3,
    }).addTo(map);

    d3.csv(projectAsset("sunshine-climate.csv")).then((data) => {
      data.forEach((d) => {
        d.sunshine = +d.sunshine;
        d.lat = +d.lat;
        d.lon = +d.lon;
      });

      const allCities = d3.group(data, (d) => d.city);
      const yMax = Math.ceil(d3.max(data, (d) => d.sunshine) / 50) * 50;
      const y = d3.scaleLinear().domain([0, yMax]).range([rangeHeight, 0]);
      const lineGraph = d3.line().x((d) => xAxis(d.month) + xAxis.bandwidth() / 2).y((d) => y(d.sunshine));
      const lineGraphColor = d3.scaleOrdinal(d3.schemeCategory10);
      const cityNames = [...allCities.keys()];

      svg.append("g").attr("transform", `translate(0,${rangeHeight})`).call(d3.axisBottom(xAxis));
      svg.select(".domain").remove();
      svg.append("g").call(d3.axisLeft(y));
      svg.select(".domain").remove();
      svg.append("text").attr("text-anchor", "middle").attr("transform", `translate(-35, ${rangeHeight / 2}) rotate(-90)`).text("→ sunshine (hours)");
      svg.append("g").call(d3.axisLeft(y).tickSize(-rangeLength).tickFormat("")).selectAll("line").style("stroke", "lightgray");
      svg.select(".domain").remove();

      const graphLegend = d3.select(legendContainer);
      const mapTooltip = d3.select(mapTooltipRef.current);
      const mapMarkers: Record<string, L.CircleMarker> = {};

      [...allCities.entries()].forEach(([city, cityData], i) => {
        svg.append("path").datum(cityData).attr("fill", "none").attr("stroke", lineGraphColor(city)).attr("class", `city-line-${i}`).attr("d", lineGraph).attr("stroke-width", 2);

        svg
          .selectAll(`.dot-city-${i}`)
          .data(cityData)
          .enter()
          .append("circle")
          .attr("class", `dot-city-${i}`)
          .attr("r", 3)
          .attr("cx", (d) => xAxis(d.month) + xAxis.bandwidth() / 2)
          .attr("cy", (d) => y(d.sunshine))
          .attr("fill", lineGraphColor(city));

        const legendItems = graphLegend
          .append("div")
          .attr("class", "legend-item")
          .style("display", "flex")
          .style("align-items", "center")
          .style("justify-content", "center")
          .style("margin-left", "60px")
          .style("margin-right", "60px");

        legendItems
          .append("input")
          .attr("type", "checkbox")
          .attr("checked", true)
          .on("change", function (event) {
            const checked = event.target.checked;
            d3.selectAll(`.city-line-${i}`).style("display", checked ? null : "none");
            d3.selectAll(`.dot-city-${i}`).style("display", checked ? null : "none");
            if (checked) mapMarkers[city].addTo(map);
            else map.removeLayer(mapMarkers[city]);
          });

        const legendSvg = legendItems.append("svg").attr("width", 50).attr("height", 20);
        legendSvg.append("line").attr("x1", 5).attr("x2", 45).attr("y1", 10).attr("y2", 10).attr("stroke", lineGraphColor(city)).attr("stroke-width", 2);
        legendSvg.append("circle").attr("cx", 25).attr("cy", 10).attr("r", 5).attr("fill", lineGraphColor(city));
        legendItems.append("span").style("margin-left", "10px").text(city);

        const cityLatitude = cityData[0].lat;
        const cityLongitude = cityData[0].lon;
        const mapMarker = L.circleMarker([cityLatitude, cityLongitude], {
          color: lineGraphColor(city),
          fillOpacity: 1,
          radius: 6,
        }).addTo(map);
        mapMarkers[city] = mapMarker;

        mapMarker
          .on("mouseover", (event) => {
            mapTooltip.transition().duration(200).style("opacity", 0.9);
            mapTooltip
              .html(`City: ${city}<br>Latitude: ${cityLatitude}<br>Longitude: ${cityLongitude}`)
              .style("left", `${event.originalEvent.pageX + 10}px`)
              .style("top", `${event.originalEvent.pageY - 28}px`);
          })
          .on("mouseout", () => {
            mapTooltip.transition().duration(500).style("opacity", 0);
          })
          .on("mousemove", (event) => {
            mapTooltip.style("left", `${event.originalEvent.pageX + 10}px`).style("top", `${event.originalEvent.pageY - 28}px`);
          });
      });

      map.on("mousemove", (event) => {
        const visibleMarkers = [...allCities.entries()]
          .map(([city, cityData]) => ({
            city,
            lat: cityData[0].lat,
            lon: cityData[0].lon,
            marker: mapMarkers[city],
          }))
          .filter((item) => map.hasLayer(item.marker));
        const nearest = d3.least(visibleMarkers, (item) => {
          const point = map.latLngToContainerPoint(item.marker.getLatLng());
          return (point.x - event.containerPoint.x) ** 2 + (point.y - event.containerPoint.y) ** 2;
        });

        Object.entries(mapMarkers).forEach(([city, marker]) => {
          marker.setStyle({ color: lineGraphColor(city) });
          marker.setRadius(6);
        });

        if (!nearest) return;

        const point = map.latLngToContainerPoint(nearest.marker.getLatLng());
        const distance = Math.sqrt((point.x - event.containerPoint.x) ** 2 + (point.y - event.containerPoint.y) ** 2);

        nearest.marker.setStyle({ color: "orange" });
        nearest.marker.setRadius(9);
        mapTooltip
          .style("opacity", 0.9)
          .html(`City: ${nearest.city}<br>Latitude: ${nearest.lat}<br>Longitude: ${nearest.lon}`)
          .style("left", `${event.originalEvent.pageX + 10}px`)
          .style("top", `${event.originalEvent.pageY - 28}px`);
      });

      map.on("mouseout", () => {
        Object.entries(mapMarkers).forEach(([city, marker]) => {
          marker.setStyle({ color: lineGraphColor(city) });
          marker.setRadius(6);
        });
        mapTooltip.transition().duration(200).style("opacity", 0);
      });

      const graphTooltip = d3.select(graphTooltipRef.current);
      svg
        .selectAll("circle")
        .on("mouseover", (event, d) => {
          graphTooltip.transition().duration(200).style("opacity", 0.9);
          graphTooltip.html(`City: ${d.city}<br/>Month: ${d.month}<br/>Sunshine: ${d.sunshine} hours`).style("left", `${event.pageX + 10}px`).style("top", `${event.pageY - 28}px`);
        })
        .on("mouseout", () => {
          graphTooltip.transition().duration(500).style("opacity", 0);
        });

      addNearestHoverLayer({
        data,
        height: graphContainerHeight,
        html: (d) => `City: ${d.city}<br/>Month: ${d.month}<br/>Sunshine: ${d.sunshine} hours`,
        layer: svg,
        tooltip: graphTooltip,
        width: graphContainerWidth,
        x0: -graphContainerMargin.left,
        y0: -graphContainerMargin.top,
        x: (d) => xAxis(d.month) + xAxis.bandwidth() / 2,
        y: (d) => y(d.sunshine),
        filter: (d) => d3.select(`.city-line-${cityNames.indexOf(d.city)}`).style("display") !== "none",
        clear: () => {
          cityNames.forEach((city, index) => {
            svg.selectAll(`.city-line-${index}`).attr("opacity", 1).attr("stroke-width", 2);
            svg.selectAll(`.dot-city-${index}`).attr("opacity", 1).attr("r", 3).attr("fill", lineGraphColor(city));
          });
        },
        highlight: (d) => {
          const cityIndex = cityNames.indexOf(d.city);
          cityNames.forEach((city, index) => {
            svg.selectAll(`.city-line-${index}`).attr("opacity", index === cityIndex ? 1 : 0.15).attr("stroke-width", index === cityIndex ? 4 : 2);
            svg.selectAll(`.dot-city-${index}`).attr("opacity", index === cityIndex ? 1 : 0.15).attr("r", 3).attr("fill", lineGraphColor(city));
          });
          svg.selectAll(`.dot-city-${cityIndex}`).filter((point) => point.month === d.month).attr("r", 8).attr("fill", "orange");
        },
      });
    });

    return () => {
      map.remove();
      d3.select(graphContainer).selectAll("*").remove();
      d3.select(legendContainer).selectAll(".legend-item").remove();
    };
  }, []);

  return (
    <Box
      sx={{
        ...baseProjectSx,
        display: "grid",
        gap: "clamp(14px, 1.4cqi, 22px)",
        gridTemplateColumns: "1fr 1fr",
        gridTemplateRows: "auto minmax(0, 1fr)",
        "& h1": { display: "block", fontSize: "clamp(1.25rem, 2.2cqi, 2rem)", lineHeight: 1.15, m: 0, textAlign: "center", width: "100%" },
      }}
    >
      <Box ref={legendRef} sx={{ ...panelSx, alignItems: "center", display: "flex", flexWrap: "wrap", gridColumn: "1 / span 2", gridRow: 1, minHeight: "clamp(120px, 10cqi, 170px)", justifyContent: "center", p: 2, width: "100%" }}>
        <h1>Average Monthly Hours of Sunshine from 1981 to 2010 in Six Major U.S. Cities</h1>
      </Box>
      <Box ref={graphRef} sx={{ ...panelSx, display: "flex", flexWrap: "wrap", gridColumn: 1, gridRow: 2, height: "100%", justifyContent: "center", minHeight: 0, p: 1.5, width: "100%", "& > svg": { height: "100%", width: "100%" } }} />
      <Box ref={mapRef} sx={{ ...panelSx, gridColumn: 2, gridRow: 2, height: "100%", overflow: "hidden", width: "100%" }} />
      <Box ref={graphTooltipRef} sx={{ backgroundColor: "#fff", border: "1px solid #ccc", borderRadius: "5px", opacity: 0, p: "5px", pointerEvents: "none", position: "absolute", transition: "opacity 0.2s", zIndex: 1000 }} />
      <Box ref={mapTooltipRef} sx={{ backgroundColor: "#fff", border: "1px solid #ccc", borderRadius: "5px", opacity: 0, p: "5px", pointerEvents: "none", position: "absolute", transition: "opacity 0.2s", zIndex: 1000 }} />
    </Box>
  );
}

function InternetUsageProject({ mode }: { mode: "people" | "percentage" }) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const legendRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const svgNode = svgRef.current;
    const legendNode = legendRef.current;
    if (!svgNode || !legendNode) return;

    d3.select(svgNode).selectAll("*").remove();
    d3.select(legendNode).selectAll("*").remove();

    const margin = { top: 40, right: 60, bottom: 40, left: 60 };
    const width = 1400 - margin.left - margin.right;
    const height = 750 - margin.top - margin.bottom;

    const totalWidth = width + margin.left + margin.right;
    const totalHeight = height + margin.top + margin.bottom;
    const svg = d3
      .select(svgNode)
      .attr("width", totalWidth)
      .attr("height", totalHeight)
      .attr("viewBox", `0 0 ${totalWidth} ${totalHeight}`)
      .attr("preserveAspectRatio", "xMidYMid meet")
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    const x = d3.scaleLinear().domain([1990, 2020]).range([0, width]);
    const y = mode === "people" ? d3.scaleLinear().domain([0, 1050000000]).range([height, 0]) : d3.scaleLinear().domain([0, 100]).range([height, 0]);
    const xAxis = d3.axisBottom(x).tickFormat(d3.format("d"));
    const yAxis = mode === "people" ? d3.axisLeft(y).tickFormat(d3.format(".1s")) : d3.axisLeft(y);

    svg.append("g").attr("transform", `translate(0,${height})`).call(xAxis);
    svg.select(".domain").remove();
    svg.append("g").call(yAxis);
    svg.select(".domain").remove();

    const color = d3.scaleOrdinal(d3.schemeCategory10);
    const tooltip = d3
      .select(document.body)
      .append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("background-color", "#fff")
      .style("border", "1px solid #d3d3d3")
      .style("border-radius", "5px")
      .style("box-shadow", "0 2px 10px rgba(0, 0, 0, 0.12)")
      .style("display", "none")
      .style("font-size", "12px")
      .style("opacity", 0)
      .style("padding", "5px")
      .style("pointer-events", "none")
      .style("z-index", 10000);

    d3.csv(projectAsset("internet-usage.csv"))
      .then((data) => {
        const countries = ["Canada", "China", "India", "United States"];
        const reshapedData = countries.map((country) => ({
          country,
          values: Object.keys(data[0])
            .filter((key) => key.includes("internet_usage"))
            .map((year) => {
              const countryRow = data.find((d) => d["Country Name"] === country);
              const usage = +countryRow[year];
              return {
                year: +year.split("_")[0],
                value: mode === "people" ? (usage / 100) * +countryRow[year.replace("internet_usage", "population")] : usage,
              };
            }),
        }));
        const allPoints = reshapedData.flatMap((series) => series.values.map((point) => ({ ...point, country: series.country })));

        const legend = d3.select(legendNode).selectAll(".legend-item").data(countries).enter().append("div").attr("class", "legend-item");
        legend
          .append("input")
          .attr("type", "checkbox")
          .attr("class", "legend-checkbox")
          .attr("id", (d) => `checkbox-${d}`)
          .attr("checked", true)
          .on("change", function (event, d) {
            const checked = event.target.checked;
            d3.selectAll(`.line-${d.replace(/\s/g, "")}`).style("display", checked ? null : "none");
            d3.selectAll(`.dot-${d.replace(/\s/g, "")}`).style("display", checked ? null : "none");
          });

        legend
          .append("svg")
          .attr("width", 50)
          .attr("height", 20)
          .append("g")
          .attr("transform", "translate(0,10)")
          .each(function (d) {
            d3.select(this).append("line").attr("x1", 5).attr("x2", 45).attr("y1", 0).attr("y2", 0).attr("stroke", color(d)).attr("stroke-width", 2);
            d3.select(this).append("circle").attr("cx", 25).attr("cy", 0).attr("r", 5).attr("fill", color(d));
          });

        legend.append("label").attr("for", (d) => `checkbox-${d}`).text((d) => d).style("color", "black");

        const line = d3.line().x((d) => x(d.year)).y((d) => y(d.value));

        svg.append("g").call(d3.axisLeft(y).tickSize(-width).tickFormat("")).selectAll("line").style("stroke", "Gainsboro");
        svg.select(".domain").remove();

        svg
          .selectAll(".line")
          .data(reshapedData)
          .enter()
          .append("path")
          .attr("class", (d) => `line-${d.country.replace(/\s/g, "")}`)
          .attr("d", (d) => line(d.values))
          .attr("stroke", (d) => color(d.country))
          .attr("stroke-width", 2)
          .attr("fill", "none");

        reshapedData.forEach((country) => {
          svg
            .selectAll(`.dot-${country.country.replace(/\s/g, "")}`)
            .data(country.values)
            .enter()
            .append("circle")
            .attr("class", `dot-${country.country.replace(/\s/g, "")}`)
            .attr("cx", (d) => x(d.year))
            .attr("cy", (d) => y(d.value))
            .attr("r", 5)
            .attr("fill", color(country.country))
            .on("mouseover", (event, d) => {
              tooltip.style("display", "block").transition().duration(200).style("opacity", 0.9);
              tooltip
                .html(mode === "people" ? `${country.country}<br>Year: ${d.year}<br>Users: ${d3.format(",")(Math.round(d.value))}` : `${country.country}<br>Year: ${d.year}<br>Usage: ${d.value}%`)
                .style("left", `${event.pageX + 5}px`)
                .style("top", `${event.pageY - 28}px`);
            })
            .on("mouseout", () => {
              tooltip.transition().duration(500).style("opacity", 0).on("end", () => tooltip.style("display", "none"));
            });
        });

        addNearestHoverLayer({
          data: allPoints,
          height: height + margin.top + margin.bottom,
          html: (d) => (mode === "people" ? `${d.country}<br>Year: ${d.year}<br>Users: ${d3.format(",")(Math.round(d.value))}` : `${d.country}<br>Year: ${d.year}<br>Usage: ${d.value}%`),
          layer: svg,
          tooltip,
          width: width + margin.left + margin.right,
          x0: -margin.left,
          y0: -margin.top,
          x: (d) => x(d.year),
          y: (d) => y(d.value),
          filter: (d) => d3.select(`.line-${d.country.replace(/\s/g, "")}`).style("display") !== "none",
          clear: () => {
            reshapedData.forEach((series) => {
              svg.selectAll(`.line-${series.country.replace(/\s/g, "")}`).attr("stroke-width", 2).attr("opacity", 1);
              svg.selectAll(`.dot-${series.country.replace(/\s/g, "")}`).attr("opacity", 1).attr("r", 5).attr("fill", color(series.country));
            });
          },
          highlight: (d) => {
            reshapedData.forEach((series) => {
              const isActive = series.country === d.country;
              svg.selectAll(`.line-${series.country.replace(/\s/g, "")}`).attr("opacity", isActive ? 1 : 0.15).attr("stroke-width", isActive ? 4 : 2);
              svg.selectAll(`.dot-${series.country.replace(/\s/g, "")}`).attr("opacity", isActive ? 1 : 0.15).attr("r", 5).attr("fill", color(series.country));
            });
            svg.selectAll(`.dot-${d.country.replace(/\s/g, "")}`).filter((point) => point.year === d.year).attr("r", 9).attr("fill", "orange");
          },
        });

        svg.append("text").attr("x", width / 2).attr("y", -10).attr("text-anchor", "middle").style("font-size", "16px").text("Trends in Internet Usage Among Major Countries (1990-2020)");
        svg
          .append("text")
          .attr("x", -height / 2)
          .attr("y", -40)
          .attr("transform", "rotate(-90)")
          .attr("text-anchor", "middle")
          .style("font-size", "12px")
          .text(mode === "people" ? "Number of People Using the Internet" : "% of Population Using the Internet");
        svg.append("text").attr("x", width / 2).attr("y", height + 40).attr("text-anchor", "middle").style("font-size", "12px").text("Year");
      })
      .catch((error) => {
        console.error("Error loading the CSV file:", error);
      });

    return () => {
      tooltip.remove();
      d3.select(svgNode).selectAll("*").remove();
      d3.select(legendNode).selectAll("*").remove();
    };
  }, [mode]);

  return (
    <Box
      sx={{
        ...baseProjectSx,
        display: "grid",
        gap: "clamp(14px, 1.4cqi, 22px)",
        gridTemplateColumns: "1fr",
        gridTemplateRows: "auto minmax(0, 1fr)",
        "& h1": { display: "block", fontSize: "clamp(1.25rem, 2.2cqi, 2.1rem)", lineHeight: 1.15, m: 0, textAlign: "center", width: "100%" },
        "& .UpperContainer": { ...panelSx, alignItems: "center", display: "flex", gridColumn: 1, gridRow: 1, minHeight: "clamp(96px, 8cqi, 130px)", justifyContent: "center", p: 2, width: "100%" },
        "& .LowerContainer": { ...panelSx, alignItems: "stretch", display: "flex", flexDirection: "column", gridColumn: 1, height: "100%", justifyContent: "flex-start", minHeight: 0, p: "clamp(14px, 1.4cqi, 24px)", width: "100%" },
        "& .graph": { alignItems: "flex-start", display: "flex", flex: 1, justifyContent: "center", minHeight: 0, width: "100%" },
        "& .graph > svg": { flex: "1 1 auto", height: "auto", maxHeight: "100%", width: "100%" },
        "& .legend": { flex: "0 0 auto", ml: "clamp(10px, 1cqi, 18px)" },
        "& .legend-item": { alignItems: "center", display: "flex", mb: "5px" },
        "& .legend-checkbox": { mr: "5px" },
        "& .tooltip": { backgroundColor: "white", border: "1px solid #d3d3d3", fontSize: "12px", p: "5px", pointerEvents: "none", position: "absolute" },
      }}
    >
      <div className="UpperContainer">
        <h1>{mode === "people" ? "How Has China Surged in Internet Usage Over the Past Three Decades?" : "How Has the U. S. Dominated in Internet Usage Over the Past Three Decades?"}</h1>
      </div>
      <div className="LowerContainer" id="TheLowerContainer">
        <div className="graph">
          <svg ref={svgRef} />
          <div className="legend" ref={legendRef} />
        </div>
      </div>
    </Box>
  );
}

export function RenewableEnergyProject() {
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const sliderStackRef = useRef<HTMLDivElement | null>(null);
  const startYearRef = useRef<HTMLInputElement | null>(null);
  const endYearRef = useRef<HTMLInputElement | null>(null);
  const rangeDisplayRef = useRef<HTMLDivElement | null>(null);
  const legendRef = useRef<HTMLDivElement | null>(null);
  const searchBoxRef = useRef<HTMLInputElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const startYearInput = startYearRef.current;
    const endYearInput = endYearRef.current;
    const sliderStack = sliderStackRef.current;
    const rangeDisplay = rangeDisplayRef.current;
    const legendNode = legendRef.current;
    const searchBox = searchBoxRef.current;
    const dropdown = dropdownRef.current;
    const chart = chartRef.current;
    const svgNode = svgRef.current;
    const tooltipNode = tooltipRef.current;
    if (!sliderStack || !startYearInput || !endYearInput || !rangeDisplay || !legendNode || !searchBox || !dropdown || !chart || !svgNode || !tooltipNode) return;

    d3.select(svgNode).selectAll("*").remove();
    d3.select(legendNode).selectAll("*").remove();
    dropdown.innerHTML = "";

    const checkboxState: Record<string, boolean> = {};
    const tooltip = d3.select(tooltipNode);
    const placeholderText = "🔍 Search for a country...";
    const countryMapping = {
      "🇨🇦 Canada": "Canada",
      "🇫🇷 France": "France",
      "🇩🇪 Germany": "Germany",
      "🇮🇹 Italy": "Italy",
      "🇯🇵 Japan": "Japan",
      "🇬🇧 United Kingdom": "United Kingdom",
      "🇺🇸 United States": "United States",
    };
    const countries = Object.keys(countryMapping);
    const countrySlugs = Object.fromEntries(
      countries.map((displayName) => [displayName, countryMapping[displayName].toLowerCase().replace(/\s+/g, "-")]),
    );
    const knownCountrySlugs = new Set(Object.values(countrySlugs));

    function readRenewableUrlState() {
      const params = new URLSearchParams(window.location.search);
      const clampYear = (value: string | null, fallback: number) => {
        if (value === null || value.trim() === "") return fallback;
        const parsed = Number(value);
        return Number.isInteger(parsed) ? Math.min(2021, Math.max(1990, parsed)) : fallback;
      };
      let startYear = clampYear(params.get("from"), 1990);
      let endYear = clampYear(params.get("to"), 2021);

      if (startYear > endYear) {
        [startYear, endYear] = [endYear, startYear];
      }

      const countriesParam = params.get("countries");
      const selectedCountrySlugs = countriesParam === null
        ? new Set(Object.values(countrySlugs))
        : new Set(countriesParam.split(",").filter((slug) => knownCountrySlugs.has(slug)));

      return { endYear, selectedCountrySlugs, startYear };
    }

    function applyRenewableUrlState() {
      const { endYear, selectedCountrySlugs, startYear } = readRenewableUrlState();
      startYearInput.value = String(startYear);
      endYearInput.value = String(endYear);
      countries.forEach((displayName) => {
        checkboxState[displayName] = selectedCountrySlugs.has(countrySlugs[displayName]);
      });
    }

    function updateRenewableUrl(replace = false) {
      const selectedCountries = countries.filter((displayName) => checkboxState[displayName]).map((displayName) => countrySlugs[displayName]);
      const { endYear, startYear } = getSelectedYears();
      const queryParts = [];

      if (selectedCountries.length !== countries.length) {
        queryParts.push(`countries=${selectedCountries.join(",")}`);
      }
      if (startYear !== 1990) queryParts.push(`from=${startYear}`);
      if (endYear !== 2021) queryParts.push(`to=${endYear}`);

      navigate(
        {
          pathname: "/projects/interactive-visualization",
          search: queryParts.length > 0 ? `?${queryParts.join("&")}` : "",
        },
        { replace },
      );
    }

    applyRenewableUrlState();

    let updateRangeChart = () => {};
    let applyUrlStateFromHistory: (() => void) | null = null;

    function getSelectedYears(changedInput?: HTMLInputElement) {
      let startYear = Number(startYearInput.value);
      let endYear = Number(endYearInput.value);

      if (startYear > endYear) {
        if (changedInput === startYearInput) {
          endYear = startYear;
          endYearInput.value = String(endYear);
        } else {
          startYear = endYear;
          startYearInput.value = String(startYear);
        }
      }

      rangeDisplay.textContent = `${startYear} - ${endYear}`;
      const minYear = Number(endYearInput.min);
      const maxYear = Number(endYearInput.max);
      const startProgress = (startYear - minYear) / (maxYear - minYear);
      const endProgress = (endYear - minYear) / (maxYear - minYear);
      const thumbInset = 12;
      const startLeft = thumbInset + (sliderStack.clientWidth - thumbInset * 2) * startProgress;
      const endLeft = thumbInset + (sliderStack.clientWidth - thumbInset * 2) * endProgress;
      sliderStack.style.setProperty("--start-left", `${startLeft}px`);
      sliderStack.style.setProperty("--end-left", `${endLeft}px`);
      return { startYear, endYear };
    }

    const onYearInput = (event: Event) => {
      getSelectedYears(event.currentTarget as HTMLInputElement);
      updateRangeChart();
      updateRenewableUrl(true);
    };

    startYearInput.addEventListener("input", onYearInput);
    endYearInput.addEventListener("input", onYearInput);
    getSelectedYears();
    const rangeResizeObserver = new ResizeObserver(() => getSelectedYears());
    rangeResizeObserver.observe(sliderStack);

    d3.csv(projectAsset("renewable-energy.csv"))
      .then((data) => {
        const filteredData = data
          .filter((d) => Object.values(countryMapping).includes(d["Country Name"]) && !Number.isNaN(+d.Value))
          .map((d) => ({ country: d["Country Name"], year: +d.Year, value: +d.Value }));

        const margin = { top: 20, right: 30, bottom: 60, left: 60 };
        const width = chart.clientWidth - margin.left - margin.right;
        const height = chart.clientHeight - margin.top - margin.bottom;
        const svg = d3.select(svgNode).attr("width", width + margin.left + margin.right).attr("height", height + margin.top + margin.bottom).append("g").attr("transform", `translate(${margin.left}, ${margin.top})`);
        const x = d3.scaleLinear().domain([1990, 2021]).range([0, width]);
        const y = d3.scaleLinear().domain([0, d3.max(filteredData, (d) => d.value)]).nice().range([height, 0]);
        const color = d3.scaleOrdinal(d3.schemeCategory10).domain(countries);
        const xAxis = svg.append("g").attr("transform", `translate(0, ${height})`).call(d3.axisBottom(x).ticks(10).tickFormat(d3.format("d")));

        const yAxis = svg.append("g").call(d3.axisLeft(y));
        const xAxisLabel = svg.append("text").attr("x", width / 2).attr("y", height + margin.bottom - 10).attr("text-anchor", "middle").text("Year");
        svg.select(".domain").remove();
        const yAxisLabel = svg.append("text").attr("x", -(height / 2)).attr("y", -margin.left + 15).attr("text-anchor", "middle").attr("transform", "rotate(-90)").text("→ Percentage of Total Energy Consumption (%)");
        svg.select(".domain").remove();
        const gridLines = svg.append("g").call(d3.axisLeft(y).tickSize(-width).tickFormat("")).selectAll("line").style("stroke", "lightgray");
        svg.select(".domain").remove();

        function animateChartScaffold() {
          if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

          const entrance = d3.transition().duration(1000).ease(d3.easeCubicInOut);
          yAxis.attr("opacity", 0).transition(entrance).attr("opacity", 1);
          xAxisLabel.attr("opacity", 0).transition(entrance).attr("opacity", 1);
          yAxisLabel.attr("opacity", 0).transition(entrance).attr("opacity", 1);
          gridLines.style("opacity", 0).transition(entrance).style("opacity", 1);
        }

        const legend = d3
          .select(legendNode)
          .selectAll(".legend-item")
          .data(countries)
          .enter()
          .append("div")
          .attr("class", "legend-item")
          .on("click", function (event, d) {
            if (event.target.tagName !== "INPUT") {
              const checkbox = document.getElementById(`checkbox-${d}`);
              checkbox.checked = !checkbox.checked;
              checkboxState[d] = checkbox.checked;
              updateChart();
              updateRenewableUrl();
              checkSearchBoxPlaceholder();
            }
          });

        legend
          .append("input")
          .attr("type", "checkbox")
          .attr("class", "legend-checkbox")
          .attr("id", (d) => `checkbox-${d}`)
          .property("checked", (d) => checkboxState[d])
          .on("change", function (event, d) {
            event.stopPropagation();
            checkboxState[d] = event.target.checked;
            updateChart();
            updateRenewableUrl();
            checkSearchBoxPlaceholder();
          });

        legend
          .append("svg")
          .attr("width", 50)
          .attr("height", 20)
          .append("g")
          .attr("transform", "translate(0,10)")
          .each(function (d) {
            d3.select(this).append("line").attr("x1", 5).attr("x2", 45).attr("y1", 0).attr("y2", 0).attr("stroke", color(d)).attr("stroke-width", 2);
            d3.select(this).append("circle").attr("cx", 25).attr("cy", 0).attr("r", 5).attr("fill", color(d));
          });

        legend
          .append("label")
          .attr("for", (d) => `checkbox-${d}`)
          .text((d) => d)
          .style("margin-left", "5px")
          .on("click", function (_event, d) {
            const checkbox = document.getElementById(`checkbox-${d}`);
            checkbox.checked = !checkbox.checked;
            checkboxState[d] = checkbox.checked;
            updateChart();
            updateRenewableUrl();
            checkSearchBoxPlaceholder();
          });

        const line = d3.line().x((d) => x(d.year)).y((d) => y(d.value));

        function highlightCountry(countryClass: string, nearestPoint?: { country: string; year: number }) {
          svg.selectAll(".line").attr("opacity", 0.1).attr("stroke-width", 2);
          svg.selectAll(".dot").attr("opacity", 0.1).attr("r", 4);
          countries.forEach((displayName) => {
            const actualName = countryMapping[displayName];
            svg.selectAll(`.dot-${actualName.replace(/\s/g, "")}`).attr("fill", color(displayName));
          });
          svg.select(`.${countryClass}`).attr("opacity", 1).attr("stroke-width", 4);
          svg.selectAll(`.dot-${countryClass.replace("line-", "")}`).attr("opacity", 1);

          if (nearestPoint) {
            svg.selectAll(`.dot-${nearestPoint.country.replace(/\s/g, "")}`)
              .filter((point) => point.year === nearestPoint.year)
              .attr("r", 8)
              .attr("fill", "orange");
          }
        }

        function resetHighlight() {
          svg.selectAll(".line").attr("opacity", 1).attr("stroke-width", 2);
          svg.selectAll(".dot").attr("opacity", 1).attr("r", 4);
          countries.forEach((displayName) => {
            const actualName = countryMapping[displayName];
            svg.selectAll(`.dot-${actualName.replace(/\s/g, "")}`).attr("fill", color(displayName));
          });
        }

        function updateChart(animate = false) {
          const { startYear, endYear } = getSelectedYears();
          const shouldAnimate = animate && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

          x.domain([startYear, endYear]);
          const numTicks = startYear === endYear ? 1 : Math.min(endYear - startYear, 10);
          const nextXAxis = d3.axisBottom(x).ticks(numTicks).tickFormat(d3.format("d"));

          xAxis.interrupt();
          if (shouldAnimate) {
            xAxis.attr("opacity", 0).call(nextXAxis).transition().duration(1000).ease(d3.easeCubicInOut).attr("opacity", 1);
          } else {
            xAxis.attr("opacity", 1).transition().duration(500).call(nextXAxis);
          }

          svg.selectAll(".line").remove();
          svg.selectAll("circle").remove();

          countries.forEach((displayName) => {
            const actualName = countryMapping[displayName];
            if (checkboxState[displayName]) {
              const countryData = filteredData.filter((d) => d.country === actualName && d.year >= startYear && d.year <= endYear);
              const countryLine = svg
                .append("path")
                .datum(countryData)
                .attr("class", `line line-${actualName.replace(/\s/g, "")}`)
                .attr("d", line)
                .attr("stroke", color(displayName))
                .attr("stroke-width", 2)
                .attr("fill", "none")
                .on("mouseover", () => highlightCountry(`line-${actualName.replace(/\s/g, "")}`))
                .on("mouseout", resetHighlight);

              if (shouldAnimate) {
                countryLine.attr("opacity", 0).transition().duration(1000).ease(d3.easeCubicInOut).attr("opacity", 1);
              }

              const countryDots = svg
                .selectAll(`.dot-${actualName.replace(/\s/g, "")}`)
                .data(countryData)
                .enter()
                .append("circle")
                .attr("class", `dot dot-${actualName.replace(/\s/g, "")}`)
                .attr("cx", (d) => x(d.year))
                .attr("cy", (d) => y(d.value))
                .attr("r", shouldAnimate ? 0 : 4)
                .attr("fill", color(displayName))
                .on("mouseover", (event, d) => {
                  highlightCountry(`line-${d.country.replace(/\s/g, "")}`, d);
                  tooltip.style("display", "block").html(`${displayName}<br>Year: ${d.year}<br>Value: ${d3.format(".2f")(d.value)}%`).style("left", `${event.pageX - 100}px`).style("top", `${event.pageY - 15}px`);
                })
                .on("mouseout", () => {
                  resetHighlight();
                  tooltip.style("display", "none");
                });

              if (shouldAnimate) {
                countryDots.transition().duration(1000).ease(d3.easeBackOut).attr("r", 4);
              }
            }
          });
        }

        function handleNearestRenewablePoint(event: MouseEvent) {
          const [mouseX, mouseY] = d3.pointer(event, svg.node());
          let nearestCountry = null;
          let nearestDistance = Infinity;
          let nearestDataPoint = null;
          countries.forEach((displayName) => {
            const actualName = countryMapping[displayName];
            if (checkboxState[displayName]) {
              const countryData = filteredData.filter((d) => d.country === actualName && d.year >= x.domain()[0] && d.year <= x.domain()[1]);
              countryData.forEach((d) => {
                const xPos = x(d.year);
                const yPos = y(d.value);
                const distance = Math.sqrt((xPos - mouseX) ** 2 + (yPos - mouseY) ** 2);
                if (distance < nearestDistance) {
                  nearestDistance = distance;
                  nearestCountry = displayName;
                  nearestDataPoint = d;
                }
              });
            }
          });

          if (nearestCountry) {
            highlightCountry(`line-${countryMapping[nearestCountry].replace(/\s/g, "")}`, nearestDataPoint);
            tooltip
              .style("display", "block")
              .html(`${nearestCountry}<br>Year: ${nearestDataPoint.year}<br>Value: ${d3.format(".2f")(nearestDataPoint.value)}%`)
              .style("left", `${event.pageX - 100}px`)
              .style("top", `${event.pageY - 15}px`);
          }
        }

        function clearNearestRenewablePoint() {
          resetHighlight();
          tooltip.style("display", "none");
        }

        svg
          .append("rect")
          .attr("x", -margin.left)
          .attr("y", -margin.top)
          .attr("width", width + margin.left + margin.right)
          .attr("height", height + margin.top + margin.bottom)
          .attr("fill", "none")
          .attr("pointer-events", "all")
          .on("mousemove", handleNearestRenewablePoint)
          .on("mouseout", clearNearestRenewablePoint);

        d3.select(chart)
          .on("mousemove.renewable-nearest", handleNearestRenewablePoint)
          .on("mouseout.renewable-nearest", clearNearestRenewablePoint);

        function populateDropdown(countryList: string[]) {
          dropdown.innerHTML = "";
          countryList.forEach((country) => {
            const item = document.createElement("div");
            item.className = "dropdown-item";
            item.textContent = country;
            item.addEventListener("click", () => {
              searchBox.value = country;
              dropdown.style.display = "none";
              updateLegendForSelectedCountry(country);
              updateChart();
              updateRenewableUrl();
            });
            dropdown.appendChild(item);
          });
        }

        function updateLegendForSelectedCountry(selectedCountry: string) {
          countries.forEach((displayName) => {
            const checkbox = document.getElementById(`checkbox-${displayName}`);
            checkbox.checked = displayName === selectedCountry;
            checkboxState[displayName] = displayName === selectedCountry;
          });
        }

        function checkSearchBoxPlaceholder() {
          const checkedCountries = countries.filter((country) => checkboxState[country]);
          if (checkedCountries.length > 1) {
            searchBox.value = "";
            searchBox.placeholder = placeholderText;
          }
        }

        const onSearchInput = () => {
          const searchText = searchBox.value.toLowerCase();
          dropdown.innerHTML = "";
          if (searchText === "") {
            populateDropdown(countries);
            dropdown.style.display = "block";
          } else {
            const filteredCountries = countries.filter((country) => country.toLowerCase().includes(searchText));
            if (filteredCountries.length > 0) populateDropdown(filteredCountries);
            else {
              const noResults = document.createElement("div");
              noResults.className = "no-results";
              noResults.textContent = "No results found";
              dropdown.appendChild(noResults);
            }
            dropdown.style.display = "block";
          }
        };

        const onFocus = () => {
          searchBox.placeholder = "";
          if (searchBox.value === "") {
            populateDropdown(countries);
            dropdown.style.display = "block";
          }
        };

        const onBlur = () => {
          if (searchBox.value === "") searchBox.placeholder = placeholderText;
        };

        const onDocumentClick = (event: MouseEvent) => {
          if (!(event.target as Element).closest(".search-container")) dropdown.style.display = "none";
        };

        searchBox.addEventListener("input", onSearchInput);
        searchBox.addEventListener("focus", onFocus);
        searchBox.addEventListener("blur", onBlur);
        document.addEventListener("click", onDocumentClick);

        applyUrlStateFromHistory = () => {
          applyRenewableUrlState();
          d3.select(legendNode).selectAll(".legend-checkbox").property("checked", (displayName) => checkboxState[displayName]);
          searchBox.value = "";
          getSelectedYears();
          updateChart();
          checkSearchBoxPlaceholder();
        };
        window.addEventListener("popstate", applyUrlStateFromHistory);

        animateChartScaffold();
        updateChart(true);
        updateRangeChart = updateChart;
      })
      .catch((error) => {
        console.error("Error loading or processing data:", error);
      });

    return () => {
      startYearInput.removeEventListener("input", onYearInput);
      endYearInput.removeEventListener("input", onYearInput);
      rangeResizeObserver.disconnect();
      if (applyUrlStateFromHistory) window.removeEventListener("popstate", applyUrlStateFromHistory);
      d3.select(chart).on(".renewable-nearest", null);
      d3.select(svgNode).selectAll("*").remove();
      d3.select(legendNode).selectAll("*").remove();
    };
  }, []);

  return (
    <Box
      ref={rootRef}
      sx={{
        ...baseProjectSx,
        "--base-font-size": "clamp(14px, 1.12cqi, 17px)",
        "--control-gap": "clamp(14px, 1.35cqi, 22px)",
        display: "grid",
        fontSize: "var(--base-font-size)",
        gap: "clamp(14px, 1.4cqi, 22px)",
        gridTemplateColumns: "1fr 2fr",
        gridTemplateRows: "auto minmax(0, 1fr)",
        "& .top": { ...panelSx, alignItems: "center", display: "flex", gridColumn: "1 / span 2", gridRow: 1, minHeight: "clamp(96px, 9cqi, 142px)", justifyContent: "center", p: 2, textAlign: "center" },
        "& .top h1": { fontSize: "clamp(1.15rem, 2cqi, 2rem) !important", lineHeight: 1.15, m: 0 },
        "& .left": { ...panelSx, display: "flex", flexDirection: "column", gap: "var(--control-gap)", gridColumn: 1, gridRow: 2, minHeight: 0, overflow: "hidden", p: "clamp(16px, 1.55cqi, 26px)" },
        "& .right": { ...panelSx, gridColumn: 2, gridRow: 2, minHeight: 0, p: 1.5, position: "relative" },
        "& .search-container": { flex: "0 0 auto", position: "relative" },
        "& .search-input": { border: "1px solid #d7dee8", borderRadius: "8px", boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)", fontSize: "var(--base-font-size)", minHeight: "clamp(44px, 3.2cqi, 56px)", outline: "none", p: "0 clamp(12px, 1.1cqi, 16px)", transition: "border-color 0.2s ease, box-shadow 0.2s ease", width: "100%", "&:focus": { borderColor: "#2563eb", boxShadow: "0 0 0 3px rgba(37, 99, 235, 0.14)" } },
        "& .dropdown": { backgroundColor: "white", border: "1px solid #d7dee8", borderRadius: "8px", display: "none", maxHeight: "150px", overflowY: "auto", position: "relative", top: "5px", zIndex: 1000 },
        "& .dropdown-item": { p: "8px", "&:hover": { backgroundColor: "#f0f0f0" } },
        "& .no-results": { color: "#888", p: "8px" },
        "& .legend": { border: "1px solid #d7dee8", borderRadius: "8px", display: "flex", flex: "1 1 auto", flexDirection: "column", gap: "clamp(8px, 0.85cqi, 12px)", justifyContent: "space-evenly", minHeight: 0, overflowY: "auto", p: "clamp(10px, 1cqi, 16px)" },
        "& .legend-item": { alignItems: "center", backgroundColor: "#fff", border: "1px solid #edf1f6", borderRadius: "8px", display: "flex", flex: "1 1 0", gap: "clamp(6px, 0.75cqi, 10px)", mb: 0, minHeight: "clamp(42px, 4cqi, 64px)", px: "clamp(8px, 0.9cqi, 14px)", transition: "background-color 0.2s ease, border-color 0.2s ease", "&:hover": { backgroundColor: "#f8fafc", borderColor: "#cbd5e1" }, "& label": { flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, "& svg": { flexShrink: 0 } },
        "& .legend-checkbox": { mr: "5px" },
        "& .slider-container": { alignItems: "stretch", backgroundColor: "#fff", border: "1px solid #d7dee8", borderRadius: "8px", display: "flex", flex: "0 0 auto", flexDirection: "column", gap: "10px", m: 0, p: "clamp(10px, 1cqi, 16px)", width: "100%" },
        "& .range-display": { fontWeight: 800, textAlign: "center" },
        "& .native-range-row": { color: "#5b6575", display: "grid", gap: 1 },
        "& .native-range-stack": { height: 30, position: "relative" },
        "& .native-range": { background: "transparent", inset: 0, m: 0, opacity: 0, pointerEvents: "none", position: "absolute", width: "100%" },
        "& .native-range-start": { accentColor: "#dedede", zIndex: 4 },
        "& .native-range-end": { accentColor: "#dedede", zIndex: 3 },
        "& .native-range-start::-webkit-slider-runnable-track, & .native-range-end::-webkit-slider-runnable-track": { background: "transparent", opacity: 0 },
        "& .native-range-start::-moz-range-track, & .native-range-end::-moz-range-track": { background: "transparent", opacity: 0 },
        "& .native-range-start::-webkit-slider-thumb": { opacity: 0 },
        "& .native-range-start::-moz-range-thumb": { opacity: 0 },
        "& .native-range-end::-webkit-slider-thumb": { opacity: 0 },
        "& .native-range-end::-moz-range-thumb": { opacity: 0 },
        "& .native-range::-webkit-slider-thumb": { pointerEvents: "auto" },
        "& .native-range::-moz-range-thumb": { pointerEvents: "auto" },
        "& .range-track": { borderRadius: "999px", height: 8, pointerEvents: "none", position: "absolute", top: "50%", transform: "translateY(-50%)", zIndex: 1 },
        "& .range-track-before": { backgroundColor: "#d7dde6", left: 0, width: "var(--start-left, 12px)" },
        "& .range-track-active": { backgroundColor: "#3FB8AF", boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.26)", left: "var(--start-left, 12px)", right: "calc(100% - var(--end-left, calc(100% - 12px)))" },
        "& .range-track-after": { backgroundColor: "#d7dde6", left: "var(--end-left, calc(100% - 12px))", right: 0 },
        "& .range-start-handle": { backgroundColor: "#fff", border: "1px solid #d9dde4", borderRadius: "999px", boxShadow: "0 1px 2px rgba(15, 23, 42, 0.12)", height: 18, left: "var(--start-left, 12px)", pointerEvents: "none", position: "absolute", top: "50%", transform: "translate(-50%, -50%)", width: 26, zIndex: 5 },
        "& .range-end-handle": { backgroundColor: "#fff", border: "1px solid #d9dde4", borderRadius: "999px", boxShadow: "0 1px 2px rgba(15, 23, 42, 0.12)", height: 18, left: "var(--end-left, calc(100% - 12px))", pointerEvents: "none", position: "absolute", top: "50%", transform: "translate(-50%, -50%)", width: 26, zIndex: 5 },
        "& .native-range-labels": { display: "flex", justifyContent: "space-between" },
        "& #chart": { height: "100%", width: "100%" },
        "& #chart svg": { height: "100%", width: "100%" },
        "& .tooltip": { backgroundColor: "#fff", border: "1px solid #d7dee8", borderRadius: "8px", boxShadow: "0 14px 30px rgba(15, 23, 42, 0.16)", display: "none", p: "8px", pointerEvents: "none", position: "fixed", zIndex: 10000 },
      }}
    >
      <div className="top">
        <div><h1 style={{ fontSize: "2em" }}>How has the percentage of renewable energy consumption changed over time for the selected countries?</h1></div>
      </div>
      <div className="left">
        <div className="search-container">
          <input ref={searchBoxRef} className="search-input" id="searchBox" placeholder="🔍 Search for a country..." type="text" />
          <div className="dropdown" id="dropdown" ref={dropdownRef} />
        </div>
        <div className="legend" id="legend" ref={legendRef} />
        <div className="slider-container">
          <div className="range-display" id="rangeDisplay" ref={rangeDisplayRef} />
          <div className="native-range-row" aria-label="Year range">
            <div className="native-range-stack" ref={sliderStackRef}>
              <span className="range-track range-track-before" aria-hidden="true" />
              <span className="range-track range-track-active" aria-hidden="true" />
              <span className="range-track range-track-after" aria-hidden="true" />
              <input ref={startYearRef} aria-label="Start year" className="native-range native-range-start" defaultValue={1990} max={2021} min={1990} step={1} type="range" />
              <input ref={endYearRef} aria-label="End year" className="native-range native-range-end" defaultValue={2021} max={2021} min={1990} step={1} type="range" />
              <span className="range-start-handle" aria-hidden="true" />
              <span className="range-end-handle" aria-hidden="true" />
            </div>
            <div className="native-range-labels">
              <span>1990</span>
              <span>2021</span>
            </div>
          </div>
        </div>
      </div>
      <div className="right" id="chart" ref={chartRef}>
        <svg ref={svgRef} />
        <div className="tooltip" id="tooltip" ref={tooltipRef} />
      </div>
    </Box>
  );
}

export const advocacySections = [
  { icon: "📈", path: "co2-levels", title: "CO₂ Levels Over Time", description: "Annual mean CO₂ concentration has increased continuously from 1959 to 2023, signaling the growing impact of industrialization." },
  { icon: "🌎", path: "major-co2-contributors", title: "Major Contributors to CO₂ Emissions", description: "Major countries that emit CO₂ are responsible for the largest shares of global emissions, driving the rise in atmospheric concentrations." },
  { icon: "🔥", path: "temperature-anomalies", title: "Increasing CO₂ → Global Land and Ocean Temperature Anomalies", description: "As the greenhouse gas CO₂ increases, global land and ocean temperature anomalies show a clear warming trend." },
  { icon: "🌊", path: "sea-level-rise", title: "Rising Temperatures → Sea Levels", description: "Higher temperatures have led to melting ice and thermal expansion, causing sea levels to rise and threatening coastal regions." },
  { icon: "⚡", path: "energy-mix", title: "Dependence on Fossil Fuels → The Energy Challenge", description: "The world still depends heavily on fossil fuels for energy. Renewables and nuclear remain small players in the energy mix." },
];

export function AdvocacyProject({ sectionPath }: { sectionPath?: string }) {
  const navigate = useNavigate();
  const currentIndex = Math.max(0, advocacySections.findIndex((section) => section.path === sectionPath));
  const rightRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const mapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const right = rightRef.current;
    const svgNode = svgRef.current;
    const mapNode = mapRef.current;
    if (!right || !svgNode || !mapNode) return;

    const svg = d3.select(svgNode);
    svg.selectAll("*").remove();
    d3.selectAll(".advocacy-tooltip").remove();
    svg.style("display", currentIndex === 1 ? "none" : "block");
    mapNode.style.display = currentIndex === 1 ? "block" : "none";

    let leafletMap: L.Map | null = null;
    let bubbleAnimationFallback: number | null = null;
    const bubbleAnimations: Animation[] = [];
    let disposed = false;

    const margin = { top: 0, right: 30, bottom: 60, left: 30 };
    const width = right.clientWidth - margin.left - margin.right;
    const height = right.clientHeight - margin.top - margin.bottom;
    const padding = { top: 30, right: 0, bottom: 0, left: 30 };

    svg.attr("viewBox", `-${padding.left} -${padding.top} ${width + padding.left + padding.right} ${height + padding.top + padding.bottom}`).attr("preserveAspectRatio", "xMinYMin meet");

    const addTooltip = () =>
      d3
        .select(document.body)
        .append("div")
        .attr("class", "advocacy-tooltip tooltip")
        .style("position", "absolute")
        .style("background-color", "#fff")
        .style("border", "1px solid #ccc")
        .style("padding", "5px")
        .style("border-radius", "5px")
        .style("pointer-events", "none")
        .style("display", "none")
        .style("z-index", "10000");

    function renderLineChart(csvPath: string, mapRow: (d: Record<string, string>) => { label: number; value: number }, domain: [number, number] | null, yDomainStart: number, title: string, yLabel: string, stroke: string, tooltipLabel: string) {
      d3.csv(csvPath).then((data) => {
        const validData = data.map(mapRow).filter((d) => !Number.isNaN(d.label) && !Number.isNaN(d.value));
        const xScale = d3.scaleLinear().domain(domain ?? (d3.extent(validData, (d) => d.label) as [number, number])).range([margin.left, width - margin.right]);
        const yScale = d3.scaleLinear().domain([yDomainStart, d3.max(validData, (d) => d.value) + 5]).range([height - margin.bottom, margin.top]);
        const tickValues = domain ? d3.range(domain[0] + 1, domain[1] + 2, 5) : d3.range(d3.min(validData, (d) => d.label), d3.max(validData, (d) => d.label) + 1, 2);

        svg.append("g").attr("transform", `translate(0, ${height - margin.bottom})`).transition().duration(1000).call(d3.axisBottom(xScale).tickValues(tickValues).tickFormat(d3.format("d")));
        svg.append("text").attr("x", width / 2).attr("y", height - margin.bottom + 40).attr("text-anchor", "middle").attr("opacity", 0).text("Year").transition().duration(1000).ease(d3.easeCubicInOut).attr("opacity", 1);
        svg.select(".domain").remove();

        svg.append("g").attr("transform", `translate(${margin.left}, 0)`).transition().duration(1000).call(d3.axisLeft(yScale));
        svg.append("text").attr("x", -height / 2).attr("y", margin.left - 40).attr("text-anchor", "middle").attr("transform", "rotate(-90)").attr("opacity", 0).text(yLabel).transition().duration(1000).ease(d3.easeCubicInOut).attr("opacity", 1);
        svg.select(".domain").remove();

        svg.append("g").attr("transform", `translate(${margin.left}, 0)`).call(d3.axisLeft(yScale).tickSize(-width).tickFormat("")).selectAll("line").style("stroke", "lightgray").style("opacity", 0).transition().duration(1000).ease(d3.easeCubicInOut).style("opacity", 1);
        svg.select(".domain").remove();
        svg.append("text").attr("x", width / 2).attr("y", margin.top / 2).attr("text-anchor", "middle").attr("opacity", 0).text(title).transition().duration(1000).ease(d3.easeCubicInOut).attr("opacity", 1);

        const line = d3.line().x((d) => xScale(d.label)).y((d) => yScale(d.value));
        svg.append("path").datum(validData).attr("fill", "none").attr("stroke", stroke).attr("stroke-width", 2).attr("d", line).attr("opacity", 0).transition().duration(1000).ease(d3.easeCubicInOut).attr("opacity", 1);
        svg.selectAll("circle").data(validData).enter().append("circle").attr("cx", (d) => xScale(d.label)).attr("cy", (d) => yScale(d.value)).attr("r", 0).attr("fill", stroke).transition().duration(1000).ease(d3.easeBackOut).attr("r", 4);

        const tooltip = addTooltip();
        svg
          .append("rect")
          .attr("x", -padding.left)
          .attr("y", -padding.top)
          .attr("width", width + padding.left + padding.right)
          .attr("height", height + padding.top + padding.bottom)
          .attr("fill", "none")
          .attr("pointer-events", "all")
          .on("mousemove", function (event) {
            const [mouseX] = d3.pointer(event, svg.node());
            const tooltipWidth = tooltip.node().offsetWidth;
            const viewportWidth = window.innerWidth;
            const hoveredYear = Math.round(xScale.invert(mouseX));
            const nearestData = validData.reduce((prev, curr) => (Math.abs(curr.label - hoveredYear) < Math.abs(prev.label - hoveredYear) ? curr : prev));
            let tooltipX = event.pageX + 10;
            let tooltipY = event.pageY + 10;
            if (tooltipX + tooltipWidth > viewportWidth) tooltipX = event.pageX - tooltipWidth - 10;
            tooltip.style("display", "block").html(`Year: ${nearestData.label}<br>${tooltipLabel}: ${nearestData.value.toFixed(tooltipLabel === "CO₂" ? 0 : 2)}${tooltipLabel === "CO₂" ? " ppm" : tooltipLabel.includes("Sea") ? " mm" : ""}`).style("left", `${tooltipX}px`).style("top", `${tooltipY}px`);
            svg.selectAll("circle").attr("fill", (d) => (d.label === nearestData.label ? "orange" : stroke)).attr("r", (d) => (d.label === nearestData.label ? 6 : 4));
          })
          .on("mouseout", () => {
            tooltip.style("display", "none");
            svg.selectAll("circle").attr("fill", stroke).attr("r", 4);
          });
      });
    }

    if (currentIndex === 0) {
      renderLineChart(projectAsset("advocacy-section1.csv"), (d) => ({ label: +d.year, value: +d.mean }), [1959, 2023], 300, "Global Atmospheric CO₂ Levels Over Time", "→ CO₂ Concentration (ppm)", "red", "CO₂");
    } else if (currentIndex === 1) {
      ensureStylesheet("leaflet-css", "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css");

      Promise.all([
        d3.csv(projectAsset("advocacy-section2.csv")),
        d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson"),
      ])
        .then(([data, world]) => {
          if (disposed) return;

          const validData = data
            .map((d) => ({ country: d.Country, emissions: +d["MtCO₂"], latitude: +d.Latitude, longitude: +d.Longitude }))
            .filter((d) => !Number.isNaN(d.emissions) && !Number.isNaN(d.latitude) && !Number.isNaN(d.longitude))
            .sort((a, b) => b.emissions - a.emissions)
            .map((d, index) => ({ ...d, rank: index + 1 }));
          const nameMapping = { "United States of America": "USA", "United Kingdom": "England" };
          const displayNameMapping = { USA: "United States", England: "United Kingdom" };
          const countryStyle = { color: "#888888", fillColor: "transparent", fillOpacity: 0, weight: 0.5 };
          const bubbleScale = d3.scaleSqrt().domain([0, d3.max(validData, (d) => d.emissions)]).range([0, 30]);
          const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          const tooltip = addTooltip();

          leafletMap = L.map(mapNode, {
            attributionControl: true,
            boxZoom: true,
            doubleClickZoom: false,
            fadeAnimation: false,
            maxBoundsViscosity: 1,
            scrollWheelZoom: true,
            zoomAnimation: true,
            zoomControl: false,
            zoomDelta: Math.log2(1.2),
            zoomSnap: 0,
          });

          new StitchedTileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19,
          }).addTo(leafletMap);
          leafletMap.attributionControl.setPrefix(false);

          const countryLayers = new Map();
          L.geoJSON(world, {
            interactive: false,
            style: () => countryStyle,
            onEachFeature: (feature, layer) => {
              const sourceName = feature.properties?.name;
              const countryName = nameMapping[sourceName] || sourceName;
              if (validData.some((country) => country.country === countryName)) {
                countryLayers.set(countryName, layer);
              }
            },
          }).addTo(leafletMap);

          leafletMap.fitBounds(
            [
              [-58, -180],
              [85, 180],
            ],
            { animate: false, padding: [0, 0] },
          );
          const initialCenter = leafletMap.getCenter();
          const initialZoom = leafletMap.getZoom();
          leafletMap.setMinZoom(initialZoom);
          leafletMap.setMaxZoom(initialZoom + 3);
          leafletMap.setMaxBounds([
            [-85, -180],
            [85, 180],
          ]);

          const title = L.DomUtil.create("div", "advocacy-map-title", mapNode);
          title.textContent = "Top 20 Global CO₂ Emitters in 2023";
          if (reducedMotion) title.classList.add("visible");
          else requestAnimationFrame(() => title.classList.add("visible"));

          const controls = L.DomUtil.create("div", "zoom-controls advocacy-map-controls", mapNode);
          L.DomEvent.disableClickPropagation(controls);
          L.DomEvent.disableScrollPropagation(controls);
          [
            ["🌐", "Reset map", () => leafletMap?.setView(initialCenter, initialZoom, { animate: true, duration: 0.5 })],
            ["➕", "Zoom in", () => leafletMap?.zoomIn(Math.log2(1.2), { animate: true })],
            ["➖", "Zoom out", () => leafletMap?.zoomOut(Math.log2(1.25), { animate: true })],
          ].forEach(([label, ariaLabel, handler]) => {
            const button = L.DomUtil.create("button", "advocacy-map-control", controls);
            button.type = "button";
            button.setAttribute("aria-label", ariaLabel);
            button.textContent = label;
            L.DomEvent.on(button, "click", handler);
          });

          const bubbleMarkers = new Map();
          let highlightedCountry = null;

          const zoomFactor = () => 2 ** (leafletMap.getZoom() - initialZoom);
          const updateBubbleRadii = () => {
            const factor = zoomFactor();
            validData.forEach((datum) => {
              bubbleMarkers.get(datum.country)?.setRadius(bubbleScale(datum.emissions) * factor);
            });
          };
          const clearHighlight = () => {
            if (!highlightedCountry) return;
            countryLayers.get(highlightedCountry)?.setStyle(countryStyle);
            bubbleMarkers.get(highlightedCountry)?.setStyle({ fillColor: "black" });
            highlightedCountry = null;
          };
          const highlight = (datum) => {
            if (highlightedCountry === datum.country) return;
            clearHighlight();
            highlightedCountry = datum.country;
            countryLayers.get(datum.country)?.setStyle({ color: "#888888", fillColor: "#ffcccb", fillOpacity: 1, weight: 0.5 });
            const marker = bubbleMarkers.get(datum.country);
            marker?.setStyle({ fillColor: "orange" });
            marker?.bringToFront();
          };
          const tooltipHtml = (datum) => `#${datum.rank} ${displayNameMapping[datum.country] || datum.country}<br>Emissions: ${datum.emissions.toFixed(2)} MtCO₂`;

          validData.forEach((datum) => {
            const marker = L.circleMarker([datum.latitude, datum.longitude], {
              bubblingMouseEvents: true,
              fillColor: "black",
              fillOpacity: 0.6,
              radius: bubbleScale(datum.emissions),
              stroke: false,
            }).addTo(leafletMap);
            bubbleMarkers.set(datum.country, marker);

            const markerElement = marker.getElement();
            if (!reducedMotion && markerElement) {
              markerElement.style.transformBox = "fill-box";
              markerElement.style.transformOrigin = "center";
              markerElement.style.willChange = "transform";
              const animation = markerElement.animate(
                [{ transform: "scale(0)" }, { transform: "scale(1)" }],
                { duration: 1000, easing: "cubic-bezier(0.34, 1.56, 0.64, 1)", fill: "both" },
              );
              animation.onfinish = () => {
                markerElement.style.willChange = "";
              };
              bubbleAnimations.push(animation);
            }
          });

          leafletMap.on("zoom", updateBubbleRadii);
          leafletMap.on("mousemove", (event) => {
            const nearest = d3.least(validData, (datum) => {
              const point = leafletMap.latLngToContainerPoint([datum.latitude, datum.longitude]);
              return (point.x - event.containerPoint.x) ** 2 + (point.y - event.containerPoint.y) ** 2;
            });
            if (!nearest) return;

            highlight(nearest);
            showFloatingTooltip(event.originalEvent, tooltip, tooltipHtml(nearest));
          });

          const onMapLeave = () => {
            clearHighlight();
            hideFloatingTooltip(tooltip);
          };
          mapNode.addEventListener("mouseleave", onMapLeave);
          leafletMap.once("unload", () => mapNode.removeEventListener("mouseleave", onMapLeave));

          if (!reducedMotion) {
            bubbleAnimationFallback = window.setTimeout(() => {
              if (disposed) return;
              bubbleAnimations.forEach((animation) => {
                if (animation.playState === "running" || animation.playState === "pending") animation.finish();
              });
              title.classList.add("visible");
            }, 1100);
          }

          requestAnimationFrame(() => leafletMap?.invalidateSize({ animate: false }));
        })
        .catch((error) => console.error("Error loading OpenStreetMap data:", error));
    } else if (currentIndex === 2) {
      d3.csv(projectAsset("advocacy-section3.csv")).then((data) => {
        const validData = data.map((d) => ({ year: +d.Year, anomaly: (+d.Anomaly * 9) / 5 })).filter((d) => !Number.isNaN(d.year) && !Number.isNaN(d.anomaly));
        const xScale = d3.scaleBand().domain(validData.map((d) => d.year)).range([margin.left, width - margin.right]).padding(0.1);
        const yScale = d3.scaleLinear().domain([-0.4, d3.max(validData, (d) => d.anomaly) + 0.05]).range([height - margin.bottom, margin.top]);
        svg.append("g").attr("transform", `translate(0, ${height - margin.bottom})`).transition().duration(1000).call(d3.axisBottom(xScale).tickValues(d3.range(1960, 2025, 5)).tickFormat(d3.format("d")));
        svg.append("text").attr("x", width / 2).attr("y", height - margin.bottom + 40).attr("text-anchor", "middle").attr("opacity", 0).text("Year").transition().duration(1000).ease(d3.easeCubicInOut).attr("opacity", 1);
        svg.select(".domain").remove();
        svg.append("g").attr("transform", `translate(${margin.left}, 0)`).call(d3.axisLeft(yScale)).attr("opacity", 0).transition().duration(1000).ease(d3.easeCubicInOut).attr("opacity", 1);
        svg.append("text").attr("x", -height / 2).attr("y", margin.left - 40).attr("text-anchor", "middle").attr("transform", "rotate(-90)").attr("opacity", 0).text("→ Temperature Anomaly (°F)").transition().duration(1000).ease(d3.easeCubicInOut).attr("opacity", 1);
        svg.select(".domain").remove();
        svg.append("g").attr("transform", `translate(${margin.left}, 0)`).call(d3.axisLeft(yScale).tickSize(-width).tickFormat("")).selectAll("line").style("stroke", "lightgray").style("opacity", 0).transition().duration(1000).style("opacity", 1);
        svg.select(".domain").remove();
        svg.append("text").attr("x", width / 2).attr("y", margin.top / 2).attr("text-anchor", "middle").attr("opacity", 0).text("Global Land and Ocean Temperature Anomalies").transition().duration(1000).ease(d3.easeCubicInOut).attr("opacity", 1);
        const maxHeight = d3.max(validData, (d) => Math.abs(yScale(d.anomaly) - yScale(0)));
        svg.selectAll(".bar").data(validData).enter().append("rect").attr("class", "temperature-bar").attr("x", (d) => xScale(d.year)).attr("y", yScale(0)).attr("width", xScale.bandwidth()).attr("height", 0).attr("fill", (d) => (d.anomaly > 0 ? "red" : "blue")).transition().duration((d) => (Math.abs(yScale(d.anomaly) - yScale(0)) / maxHeight) * 1000).ease(d3.easeBackOut).attr("y", (d) => (d.anomaly > 0 ? yScale(d.anomaly) : yScale(0))).attr("height", (d) => Math.abs(yScale(d.anomaly) - yScale(0)));

        const tooltip = addTooltip();
        svg.append("rect").attr("x", -padding.left).attr("y", -padding.top).attr("width", width + padding.left + padding.right).attr("height", height + padding.top + padding.bottom).attr("fill", "none").attr("pointer-events", "all").on("mousemove", function (event) {
          const [mouseX] = d3.pointer(event, svg.node());
          const hoveredYear = Math.round(xScale.domain().reduce((prev, curr) => (Math.abs(xScale(curr) + xScale.bandwidth() / 2 - mouseX) < Math.abs(xScale(prev) + xScale.bandwidth() / 2 - mouseX) ? curr : prev)));
          const nearestData = validData.find((d) => d.year === hoveredYear);
          if (nearestData) {
            tooltip.style("display", "block").html(`Year: ${nearestData.year}<br>Temperature Anomaly: ${nearestData.anomaly.toFixed(2)}°F`).style("left", `${event.pageX + 10}px`).style("top", `${event.pageY + 10}px`);
            svg.selectAll(".temperature-bar").attr("fill", (d) => (d.year === nearestData.year ? "orange" : d.anomaly > 0 ? "red" : "blue"));
          }
        }).on("mouseout", () => {
          tooltip.style("display", "none");
          svg.selectAll(".temperature-bar").attr("fill", (d) => (d.anomaly > 0 ? "red" : "blue"));
        });
      });
    } else if (currentIndex === 3) {
      d3.csv(projectAsset("advocacy-section4.csv")).then((data) => {
        const groupedData = d3.groups(data, (d) => +d.Year).map(([year, values]) => ({ label: year, value: d3.mean(values, (d) => +d["NASA (mm)"]) })).filter((d) => !Number.isNaN(d.label) && !Number.isNaN(d.value));
        const xScale = d3.scaleLinear().domain(d3.extent(groupedData, (d) => d.label)).range([margin.left, width - margin.right]);
        const yScale = d3.scaleLinear().domain([-30, d3.max(groupedData, (d) => d.value) + 5]).range([height - margin.bottom, margin.top]);
        svg.append("g").attr("transform", `translate(0, ${height - margin.bottom})`).transition().duration(1000).call(d3.axisBottom(xScale).tickValues(d3.range(d3.min(groupedData, (d) => d.label), d3.max(groupedData, (d) => d.label) + 1, 2)).tickFormat(d3.format("d")));
        svg.append("text").attr("x", width / 2).attr("y", height - margin.bottom + 40).attr("text-anchor", "middle").attr("opacity", 0).text("Year").transition().duration(1000).ease(d3.easeCubicInOut).attr("opacity", 1);
        svg.select(".domain").remove();
        svg.append("g").attr("transform", `translate(${margin.left}, 0)`).transition().duration(1000).call(d3.axisLeft(yScale));
        svg.append("text").attr("x", -height / 2).attr("y", margin.left - 40).attr("text-anchor", "middle").attr("transform", "rotate(-90)").attr("opacity", 0).text("→ Sea Level Change (mm)").transition().duration(1000).ease(d3.easeCubicInOut).attr("opacity", 1);
        svg.select(".domain").remove();
        svg.append("text").attr("x", width / 2).attr("y", margin.top / 2).attr("text-anchor", "middle").attr("opacity", 0).text("Yearly Sea Level Change").transition().duration(1000).ease(d3.easeCubicInOut).attr("opacity", 1);
        svg.append("g").attr("transform", `translate(${margin.left}, 0)`).call(d3.axisLeft(yScale).tickSize(-width).tickFormat("")).selectAll("line").style("stroke", "lightgray").style("opacity", 0).transition().duration(1000).style("opacity", 1);
        svg.select(".domain").remove();
        const line = d3.line().x((d) => xScale(d.label)).y((d) => yScale(d.value));
        svg.append("path").datum(groupedData).attr("fill", "none").attr("stroke", "blue").attr("stroke-width", 2).attr("d", line).attr("opacity", 0).transition().duration(1000).ease(d3.easeCubicInOut).attr("opacity", 1);
        svg.selectAll("circle").data(groupedData).enter().append("circle").attr("cx", (d) => xScale(d.label)).attr("cy", (d) => yScale(d.value)).attr("r", 0).attr("fill", "blue").transition().duration(1000).ease(d3.easeBackOut).attr("r", 4);
        const tooltip = addTooltip();
        svg
          .append("rect")
          .attr("x", -padding.left)
          .attr("y", -padding.top)
          .attr("width", width + padding.left + padding.right)
          .attr("height", height + padding.top + padding.bottom)
          .attr("fill", "none")
          .attr("pointer-events", "all")
          .on("mousemove", function (event) {
            const [mouseX] = d3.pointer(event, svg.node());
            const tooltipWidth = tooltip.node().offsetWidth;
            const viewportWidth = window.innerWidth;
            const hoveredYear = Math.round(xScale.invert(mouseX));
            const nearestData = groupedData.reduce((prev, curr) => (Math.abs(curr.label - hoveredYear) < Math.abs(prev.label - hoveredYear) ? curr : prev));
            let tooltipX = event.pageX + 10;
            let tooltipY = event.pageY + 10;

            if (tooltipX + tooltipWidth > viewportWidth) {
              tooltipX = event.pageX - tooltipWidth - 10;
            }

            tooltip
              .style("display", "block")
              .html(`Year: ${nearestData.label}<br>Sea Level Change: ${nearestData.value.toFixed(2)} mm`)
              .style("left", `${tooltipX}px`)
              .style("top", `${tooltipY}px`);

            svg.selectAll("circle").attr("fill", (d) => (d.label === nearestData.label ? "orange" : "blue")).attr("r", (d) => (d.label === nearestData.label ? 6 : 4));
          })
          .on("mouseout", () => {
            tooltip.style("display", "none");
            svg.selectAll("circle").attr("fill", "blue").attr("r", 4);
          });
      });
    } else {
      d3.csv(projectAsset("advocacy-section5.csv")).then((data) => {
        const filteredData = data.filter((d) => d.YYYYMM === "202313");
        const categories = [
          { name: "Coal", value: parseFloat(filteredData.find((d) => d.Description.includes("Coal Consumption"))?.Value || 0), parent: "Fossil Fuels" },
          { name: "Natural Gas", value: parseFloat(filteredData.find((d) => d.Description.includes("Natural Gas Consumption"))?.Value || 0), parent: "Fossil Fuels" },
          { name: "Petroleum", value: parseFloat(filteredData.find((d) => d.Description.includes("Petroleum Consumption"))?.Value || 0), parent: "Fossil Fuels" },
          { name: "Nuclear Electric Power", value: parseFloat(filteredData.find((d) => d.Description.includes("Nuclear Electric Power"))?.Value || 0), parent: "Nuclear" },
          { name: "Hydroelectric Power", value: parseFloat(filteredData.find((d) => d.Description.includes("Hydroelectric Power"))?.Value || 0), parent: "Renewables" },
          { name: "Geothermal Energy", value: parseFloat(filteredData.find((d) => d.Description.includes("Geothermal Energy"))?.Value || 0), parent: "Renewables" },
          { name: "Solar Energy", value: parseFloat(filteredData.find((d) => d.Description.includes("Solar Energy"))?.Value || 0), parent: "Renewables" },
          { name: "Wind Energy", value: parseFloat(filteredData.find((d) => d.Description.includes("Wind Energy"))?.Value || 0), parent: "Renewables" },
          { name: "Biomass Energy", value: parseFloat(filteredData.find((d) => d.Description.includes("Biomass Energy"))?.Value || 0), parent: "Renewables" },
        ];
        const totalEnergy = categories.reduce((sum, d) => sum + d.value, 0);
        const bigCategoryColors = { "Fossil Fuels": "#fc8d59", Nuclear: "#91bfdb", Renewables: "#99d594" };
        const radius = Math.min(width, height) / 2 - 10;
        const color = d3.scaleOrdinal().domain(categories.map((d) => d.name)).range(categories.map((d) => bigCategoryColors[d.parent]));
        const pie = d3.pie().value((d) => d.value)(categories);
        const arc = d3.arc().innerRadius(0).outerRadius(radius);
        const chartGroup = svg.append("g").attr("transform", `translate(${width / 2}, ${height / 2})`);
        chartGroup.selectAll("path").data(pie).enter().append("path").attr("fill", (d) => color(d.data.name)).attr("stroke", "#fff").style("stroke-width", "2px").style("opacity", 0.8).attr("class", (d) => `slice ${d.data.parent.replace(/\s/g, "-")}`).transition().duration(1000).ease(d3.easeCubicOut).attrTween("d", function (d) {
          const interpolate = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
          return (t) => arc(interpolate(t));
        });
        const tooltip = addTooltip();
        chartGroup.selectAll("path").on("mouseover", function (event, d) {
          d3.select(this).attr("fill", "orange").style("opacity", 1);
          tooltip.style("display", "block").html(`Energy Source: ${d.data.name}<br>Share of Total Energy: ${((d.data.value / totalEnergy) * 100).toFixed(2)}%<br>Consumption: ${d.data.value} Quadrillion Btu`).style("left", `${event.pageX + 10}px`).style("top", `${event.pageY + 10}px`);
        }).on("mouseout", function (_event, d) {
          d3.select(this).attr("fill", color(d.data.name)).style("opacity", 0.8);
          tooltip.style("display", "none");
        });
        chartGroup
          .append("rect")
          .attr("x", -width / 2 - padding.left)
          .attr("y", -height / 2 - padding.top)
          .attr("width", width + padding.left + padding.right)
          .attr("height", height + padding.top + padding.bottom)
          .attr("fill", "transparent")
          .attr("pointer-events", "all")
          .on("mousemove", function (event) {
            const [mouseX, mouseY] = d3.pointer(event, chartGroup.node());
            let angle = Math.atan2(mouseX, -mouseY);
            if (angle < 0) angle += Math.PI * 2;

            const nearestSlice = pie.find((slice) => angle >= slice.startAngle && angle < slice.endAngle);
            if (!nearestSlice) return;

            chartGroup.selectAll(".slice").attr("fill", (d) => color(d.data.name)).style("opacity", 0.8);
            chartGroup.selectAll(".slice").filter((slice) => slice === nearestSlice).attr("fill", "orange").style("opacity", 1);
            showFloatingTooltip(event, tooltip, `Energy Source: ${nearestSlice.data.name}<br>Share of Total Energy: ${((nearestSlice.data.value / totalEnergy) * 100).toFixed(2)}%<br>Consumption: ${nearestSlice.data.value} Quadrillion Btu`);
          })
          .on("mouseout", () => {
            chartGroup.selectAll(".slice").attr("fill", (d) => color(d.data.name)).style("opacity", 0.8);
            hideFloatingTooltip(tooltip);
          });
        const legendGroup = svg.append("g").attr("transform", `translate(${width - 200}, ${20})`).style("opacity", 0);
        Object.entries(bigCategoryColors).forEach(([key, colorValue], i) => {
          const legendItem = legendGroup.append("g").attr("transform", `translate(0, ${i * 20})`).attr("class", key.replace(/\s/g, "-"));
          legendItem.append("rect").attr("width", 15).attr("height", 15).attr("fill", colorValue);
          legendItem.append("text").attr("x", 20).attr("y", 7.5).attr("dy", "0.35em").text(key);
        });
        legendGroup.transition().duration(1000).ease(d3.easeCubicInOut).style("opacity", 1);
        svg.append("text").attr("x", width / 2).attr("y", margin.top / 2).attr("text-anchor", "middle").attr("opacity", 0).text("Energy Consumption by Source in 2023").transition().duration(1000).ease(d3.easeCubicInOut).attr("opacity", 1);
      });
    }

    return () => {
      disposed = true;
      if (bubbleAnimationFallback !== null) window.clearTimeout(bubbleAnimationFallback);
      bubbleAnimations.forEach((animation) => animation.cancel());
      leafletMap?.remove();
      mapNode.replaceChildren();
      mapNode.className = "advocacy-leaflet-map";
      svg.selectAll("*").remove();
      d3.selectAll(".advocacy-tooltip").remove();
    };
  }, [currentIndex]);

  return (
    <Box
      sx={{
        ...baseProjectSx,
        "--base-font-size": "clamp(13px, 1.05cqi, 16px)",
        "--gap-between-sections": "clamp(8px, 0.9cqi, 14px)",
        "--section-count": "5",
        "--section-height": "calc((100% - (var(--section-count) - 1) * var(--gap-between-sections)) / var(--section-count))",
        display: "grid",
        fontSize: "var(--base-font-size)",
        gap: "clamp(14px, 1.4cqi, 22px)",
        gridTemplateColumns: "1fr 2fr",
        gridTemplateRows: "auto minmax(0, 1fr)",
        "& .top": { ...panelSx, alignItems: "center", display: "flex", gridColumn: "1 / span 2", gridRow: 1, minHeight: "clamp(86px, 7.5cqi, 120px)", justifyContent: "center", p: 2, textAlign: "center" },
        "& .top strong": { fontSize: "clamp(1.2rem, 2.1cqi, 2rem) !important", lineHeight: 1.15 },
        "& .left": { ...panelSx, display: "flex", flexDirection: "column", gap: "var(--gap-between-sections)", gridColumn: 1, gridRow: 2, minHeight: 0, p: "clamp(10px, 1.1cqi, 16px)" },
        "& .section": { alignItems: "center", backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", display: "flex", gap: "clamp(8px, 0.9cqi, 12px)", height: "var(--section-height)", overflow: "hidden", p: "clamp(8px, 1cqi, 14px)", position: "relative", transition: "background-color 0.2s, border-color 0.2s, box-shadow 0.2s", "&:hover": { backgroundColor: "#f8fafc", borderColor: "#cbd5e1" } },
        "& .section.active": { backgroundColor: "#eff6ff", borderColor: "#9dc4ff", boxShadow: "inset 3px 0 0 #2563eb" },
        "& .section-image": { alignItems: "center", background: "#f1f5f9", borderRadius: "50%", boxShadow: "inset 0 0 0 1px #e2e8f0", color: "#5b6575", display: "flex", flexShrink: 0, fontSize: "clamp(1.1rem, 1.7cqi, 1.55rem)", height: "clamp(42px, 4cqi, 56px)", justifyContent: "center", transition: "transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease", width: "clamp(42px, 4cqi, 56px)" },
        "& .section.active .section-image": { background: "#dbeafe", boxShadow: "0 8px 18px rgba(37, 99, 235, 0.18)", color: "#2563eb" },
        "& .section-text": { display: "flex", flexDirection: "column", flexShrink: 1, gap: "5px", minWidth: 0, overflow: "hidden" },
        "& .section-title": { flexShrink: 0, fontSize: "clamp(0.9rem, 1.05cqi, 1.05rem)", fontWeight: 800, lineHeight: 1.15 },
        "& .section-description": { color: "#5b6575", display: "-webkit-box", flexShrink: 1, fontSize: "clamp(0.78rem, 0.88cqi, 0.95rem)", lineHeight: 1.35, overflow: "hidden", textOverflow: "ellipsis", WebkitBoxOrient: "vertical", WebkitLineClamp: 2 },
        "& .right": { ...panelSx, gridColumn: 2, gridRow: 2, minHeight: 0, p: "clamp(14px, 1.4cqi, 24px)" },
        "& .right.map-active": { overflow: "hidden", p: 0 },
        "& #chart": { height: "100%", overflow: "hidden", position: "relative", width: "100%" },
        "& #chart > svg, & .advocacy-leaflet-map": { height: "100%", width: "100%" },
        "& .advocacy-leaflet-map": { background: "#fff", overflow: "hidden" },
        "& .advocacy-leaflet-map .leaflet-pane > svg": { height: "auto", maxWidth: "none", width: "auto" },
        "& .advocacy-map-title": { fontSize: "1em", left: "50%", opacity: 0, pointerEvents: "none", position: "absolute", textAlign: "center", top: 0, transform: "translateX(-50%)", transition: "opacity 1s ease-in-out", whiteSpace: "nowrap", zIndex: 1000 },
        "& .advocacy-map-title.visible": { opacity: 1 },
        "& .advocacy-map-controls": { display: "flex", flexDirection: "column", gap: "10px", left: "10px", position: "absolute", top: "10px", zIndex: 1000 },
        "& .advocacy-map-control": { alignItems: "center", appearance: "none", background: "#eaeaea", border: "1px solid #666", borderRadius: "5px", color: "#000", display: "flex", fontFamily: "system-ui", fontSize: "16px", height: "30px", justifyContent: "center", lineHeight: 1, margin: 0, p: 0, width: "30px" },
      }}
    >
      <div className="top"><strong style={{ fontSize: "20px" }}>What Role Do CO₂ and Energy Play in Shaping Our Planet’s Future?</strong></div>
      <div className="left" id="sections-container">
        {advocacySections.map((section, index) => (
          <div
            className={`section${currentIndex === index ? " active" : ""}`}
            data-index={index}
            key={section.title}
            onClick={() => {
              if (currentIndex !== index) {
                navigate(`/projects/data-visualization-for-advocacy/${section.path}`);
              }
            }}
          >
            <div className="section-image"><span>{section.icon}</span></div>
            <div className="section-text">
              <div className="section-title">{section.title}</div>
              <div className="section-description">{section.description}</div>
            </div>
          </div>
        ))}
      </div>
      <div className={`right${currentIndex === 1 ? " map-active" : ""}`} ref={rightRef}>
        <div id="chart">
          <svg ref={svgRef} />
          <div className="advocacy-leaflet-map" ref={mapRef} />
        </div>
      </div>
    </Box>
  );
}

export function ConvertedMiniProject({ slug, variant }: ProjectRoute) {
  if (slug === "equal-spacing-layout") return <EqualSpacingProject />;
  if (slug === "expository-visualization") return <SunshineHoursProject />;
  if (slug === "misleading-visualization") return <InternetUsageProject mode={variant === "us-internet-usage" ? "percentage" : "people"} />;
  if (slug === "interactive-visualization") return <RenewableEnergyProject />;
  if (slug === "data-visualization-for-advocacy") return <AdvocacyProject sectionPath={variant} />;
  return null;
}
