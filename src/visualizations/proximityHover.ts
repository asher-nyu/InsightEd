// @ts-nocheck
import * as d3 from "d3";

export function positionFloatingTooltip(event, tooltip) {
  const tooltipNode = tooltip.node();
  const tooltipWidth = tooltipNode?.offsetWidth ?? 0;
  const tooltipHeight = tooltipNode?.offsetHeight ?? 0;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  let x = event.pageX + 10;
  let y = event.pageY - 20;

  if (x + tooltipWidth > viewportWidth) {
    x = event.pageX - tooltipWidth - 10;
  }

  if (y + tooltipHeight > viewportHeight) {
    y = event.pageY - tooltipHeight - 10;
  }

  tooltip.style("left", `${x}px`).style("top", `${y}px`);
}

export function hideFloatingTooltip(tooltip) {
  tooltip.style("display", "none").style("opacity", 0);
}

export function showFloatingTooltip(event, tooltip, html) {
  tooltip.style("display", "block").style("opacity", 1).html(html);
  positionFloatingTooltip(event, tooltip);
}

export function addNearestHoverLayer({
  className = "nearest-hover-layer",
  clear,
  data,
  height,
  highlight,
  html,
  filter,
  layer,
  maxDistance = Infinity,
  tooltip,
  width,
  x,
  x0 = 0,
  y,
  y0 = 0,
}) {
  const maxDistanceSquared = Number.isFinite(maxDistance) ? maxDistance * maxDistance : Infinity;

  const svgRoot = layer.node().ownerSVGElement ?? (layer.node().tagName?.toLowerCase() === "svg" ? layer.node() : null);
  const eventTarget = svgRoot?.parentElement ?? svgRoot ?? layer.node();

  layer
    .append("rect")
    .attr("class", className)
    .attr("x", x0)
    .attr("y", y0)
    .attr("width", width)
    .attr("height", height)
    .attr("fill", "transparent")
    .attr("pointer-events", "all");

  d3.select(eventTarget)
    .on(`mousemove.${className}`, function (event) {
      const [mouseX, mouseY] = d3.pointer(event, layer.node());
      const candidates = filter ? data.filter(filter) : data;
      const nearest = d3.least(candidates, (datum) => {
        const dx = x(datum) - mouseX;
        const dy = (y ? y(datum) : mouseY) - mouseY;
        return dx * dx + dy * dy;
      });

      if (!nearest) return;

      const dx = x(nearest) - mouseX;
      const dy = (y ? y(nearest) : mouseY) - mouseY;
      const distanceSquared = dx * dx + dy * dy;

      if (distanceSquared > maxDistanceSquared) {
        clear?.();
        hideFloatingTooltip(tooltip);
        return;
      }

      clear?.();
      highlight?.(nearest);
      showFloatingTooltip(event, tooltip, html(nearest));
    })
    .on(`mouseout.${className}`, () => {
      clear?.();
      hideFloatingTooltip(tooltip);
    });
}
