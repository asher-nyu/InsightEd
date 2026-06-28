import { Box } from "@mui/material";
import { useEffect } from "react";
import { glassPanelSx } from "../theme";
import { renderPredictiveAnalysisCharts } from "../visualizations/predictiveAnalysisCharts";
import { ViewFrame } from "./ViewFrame";

const predictionCharts = [
  "modelPerformanceChart",
  "scatterPlot-Linear Regression",
  "scatterPlot-Random Forest",
  "scatterPlot-Support Vector Machine",
];

export function PredictiveAnalysisView() {
  useEffect(() => renderPredictiveAnalysisCharts(), []);

  return (
    <ViewFrame title="Predictive Analysis">
      <Box
        id="metricFilterContainer"
        sx={{
          ...glassPanelSx,
          alignItems: "center",
          display: "flex",
          mb: 2,
          minHeight: 56,
          px: 2,
          py: 1,
          "& select": {
            border: "1px solid #d7dee8",
            borderRadius: "8px",
            color: "#111827",
            fontFamily: "inherit",
            minHeight: 36,
            px: 1,
          },
        }}
      />
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", xl: "repeat(2, minmax(0, 1fr))" }, gap: 2 }}>
        {predictionCharts.map((id) => (
          <Box className="chart-container" id={id} key={id} sx={{ ...glassPanelSx, minHeight: { xs: 320, xl: 370 }, p: 1.5, position: "relative" }} />
        ))}
        <Box
          className="chart-container"
          id="featureImportanceChart"
          sx={{ ...glassPanelSx, gridColumn: "1 / -1", minHeight: { xs: 420, xl: 520 }, p: 1.5, position: "relative" }}
        />
      </Box>
    </ViewFrame>
  );
}
