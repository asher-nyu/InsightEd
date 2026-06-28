import { Box, Button, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { formControlSx, glassPanelSx } from "../theme";
import { renderStudentPerformanceDashboard } from "../visualizations/studentPerformanceDashboard";
import { ViewFrame } from "./ViewFrame";

const metrics = [
  ["Average Student Age", "16 Years"],
  ["Average Travel Time", "93 Minutes"],
  ["Access to Internet", "76.6%"],
  ["Average Study time", "115.8 Minutes"],
];

const chartIds = [
  "barChart",
  "lineChart",
  "internetBoxPlot",
  "groupedBarChart",
  "distanceBoxPlot",
  "scatterAbsences",
  "boxAbsences",
];

export function StudentPerformanceDashboardView() {
  const [openRecommendations, setOpenRecommendations] = useState<Record<string, boolean>>({});

  useEffect(() => renderStudentPerformanceDashboard(), []);

  return (
    <ViewFrame title="Student Performance Dashboard">
      <Box
        component="section"
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))", lg: "repeat(4, minmax(0, 1fr))" },
          gap: 2,
          mb: 3,
          containerType: "inline-size",
        }}
      >
        {metrics.map(([label, value]) => (
          <Box
            key={label}
            sx={{
              ...glassPanelSx,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              textAlign: "center",
              color: "#fff",
              fontWeight: 700,
              background: "linear-gradient(135deg, #2563eb, #0f766e)",
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
              p: 3,
              height: "100%",
              "&:hover": {
                transform: "translateY(-2px)",
                boxShadow: "0 18px 40px rgba(15, 23, 42, 0.16)",
              },
            }}
          >
            <Typography component="h5" sx={{ fontSize: "clamp(0.95rem, 1.4cqi, 1.2rem)", fontWeight: 700, m: 0, mb: 1 }}>
              {label}
            </Typography>
            <Typography component="h5" sx={{ fontSize: "clamp(1.15rem, 1.8cqi, 1.45rem)", fontWeight: 800, m: 0 }}>
              {value}
            </Typography>
          </Box>
        ))}
      </Box>

      <Box
        component="section"
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))", lg: "repeat(4, minmax(0, 1fr))" },
          gap: 2,
          mb: 3,
        }}
      >
        <Box sx={{ ...glassPanelSx, color: "#333", fontWeight: 700, p: 3 }}>
          <Box component="label" htmlFor="filter1" sx={{ display: "block", mb: 1 }}>
            Category Filter
          </Box>
          <Box component="select" id="filter1" sx={formControlSx}>
            <option value="">All</option>
            <option value="gender">Gender</option>
            <option value="studytime">Study Time</option>
            <option value="internet">Internet Access</option>
            <option value="distance">Distance</option>
            <option value="absence">Absence</option>
          </Box>
        </Box>

        <Box sx={{ ...glassPanelSx, color: "#333", fontWeight: 700, p: 3 }}>
          <Box component="label" htmlFor="searchBox" sx={{ display: "block", mb: 1 }}>
            Search
          </Box>
          <Box component="input" type="text" id="searchBox" placeholder="Search keyword" sx={formControlSx} />
        </Box>
      </Box>

      <Box id="tooltip" sx={{ opacity: 0, position: "absolute", zIndex: 1000, pointerEvents: "none" }} />

      <Box sx={{ p: 0 }}>
        <Box id="chartRow" sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", xl: "repeat(2, minmax(0, 1fr))" }, gap: 2, m: 0 }}>
          {chartIds.map((id) => (
            <Box
              className="chart-container"
              id={id}
              key={id}
              sx={{
                ...glassPanelSx,
                minHeight: { xs: 320, xl: 360 },
                p: 1.5,
                position: "relative",
                "& svg": {
                  width: "100%",
                },
              }}
            />
          ))}
        </Box>
      </Box>

      <Box
        component="section"
        sx={{
          ...glassPanelSx,
          fontSize: "1rem",
          lineHeight: 1.5,
          overflow: "auto",
          transition: "all 0.3s ease-in-out",
          p: 4,
          mt: 4,
          boxShadow: "0 1px 1px rgba(0, 0, 0, 0.1)",
        }}
      >
        <Typography component="h4" sx={{ fontSize: "clamp(1.2rem, 2cqi, 1.55rem)", fontWeight: 800, mb: 2, mt: 0 }}>
          Statistical Observation and Insights
        </Typography>
        <Box component="ul" sx={{ pl: 3, m: 0 }}>
          <Box component="li" sx={{ mb: 2 }}>
            Guardians identified as &quot;mother&quot; account for the majority of the total &quot;health&quot; at 70.28%. This indicates that
            mothers play a significant role or have a strong influence in the health-related dimension under study.{" "}
            <Button
              onClick={() => setOpenRecommendations((current) => ({ ...current, recommendation1: !current.recommendation1 }))}
              sx={{ minWidth: 0, p: 0, textTransform: "none", verticalAlign: "baseline" }}
              variant="text"
            >
              View Recommendation
            </Button>
            {openRecommendations.recommendation1 ? (
              <Typography sx={{ mt: 1 }}>
                Focus on creating health initiatives or programs that engage and support mothers, leveraging their significant role in
                health-related matters to maximize impact.
              </Typography>
            ) : null}
          </Box>

          <Box component="li">
            Students with parents living apart (Pstatus = A) have a slightly lower average final grade (Mean G3 = 12.04) compared to those
            whose parents are living together (Pstatus = T) with a Mean G3 = 12.39.{" "}
            <Button
              onClick={() => setOpenRecommendations((current) => ({ ...current, recommendation2: !current.recommendation2 }))}
              sx={{ minWidth: 0, p: 0, textTransform: "none", verticalAlign: "baseline" }}
              variant="text"
            >
              View Recommendation
            </Button>
            {openRecommendations.recommendation2 ? (
              <Typography sx={{ mt: 1 }}>
                This shows that parents living together has a better impact on the overall academics of their children, thus indicating a
                healthy environment for learning and growing.
              </Typography>
            ) : null}
          </Box>
        </Box>
      </Box>
    </ViewFrame>
  );
}
