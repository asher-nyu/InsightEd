import { Box, Button, Typography } from "@mui/material";
import { Navigate, Route, Routes, Link as RouterLink, useNavigate } from "react-router-dom";
import { ProjectDetail } from "./projects/ProjectDetail";
import { ProjectsIndex } from "./projects/ProjectsIndex";
import { glassPanelSx } from "./theme";
import { EducationExpenditureView } from "./views/EducationExpenditureView";
import { PredictiveAnalysisView } from "./views/PredictiveAnalysisView";
import { StudentPerformanceDashboardView } from "./views/StudentPerformanceDashboardView";
import { UserReviewsView } from "./views/UserReviewsView";

const sections = [
  {
    icon: "🌎",
    path: "/education-expenditure",
    slug: "education-expenditure",
    title: "Education Expenditure",
    description: "This map highlights global education spending.",
    View: EducationExpenditureView,
  },
  {
    icon: "📚",
    path: "/performance-dashboard",
    slug: "performance-dashboard",
    title: "Performance Dashboard",
    description: "A dashboard that visualizes student performance data.",
    View: StudentPerformanceDashboardView,
  },
  {
    icon: "📈",
    path: "/predictive-analysis",
    slug: "predictive-analysis",
    title: "Predictive Analysis",
    description: "Model performance, predictions, and feature importance.",
    View: PredictiveAnalysisView,
  },
  {
    icon: "🧐",
    path: "/user-reviews",
    slug: "user-reviews",
    title: "User Reviews",
    description: "Feedback on dashboard usability and key metric clarity.",
    View: UserReviewsView,
  },
];

function InsightEdDashboard({ activeSection }: { activeSection: string }) {
  const navigate = useNavigate();
  const currentIndex = Math.max(1, sections.findIndex((section) => section.slug === activeSection) + 1);
  const ActiveView = sections[currentIndex - 1].View;

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", lg: "minmax(260px, 0.95fr) minmax(0, 4fr)" },
        gridTemplateRows: "auto minmax(0, 1fr)",
        gap: { xs: 2, lg: 2.5 },
        p: { xs: 2, lg: 2.5 },
        background: "linear-gradient(180deg, #f7f9fc 0%, #edf3f8 100%)",
        minHeight: "100dvh",
        height: "100dvh",
        overflow: "hidden",
        containerType: "inline-size",
      }}
    >
      <Box
        sx={{
          ...glassPanelSx,
          gridColumn: "1 / -1",
          gridRow: 1,
          minHeight: { xs: 92, lg: 104 },
          px: { xs: 2, md: 3, xl: 4 },
          py: { xs: 2, md: 2.5 },
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          textAlign: "center",
          position: "relative",
          userSelect: "none",
          gap: 2,
        }}
      >
        <Typography
          component="h1"
          sx={{
            flex: 1,
            fontSize: "clamp(1.15rem, 2.25cqi, 2.15rem)",
            fontWeight: 800,
            letterSpacing: 0,
            lineHeight: 1.15,
            m: 0,
          }}
        >
          Interactive Data Visualizations of Global Education Expenditure &amp; Academic Success Factors
        </Typography>
        <Button component={RouterLink} to="/projects" variant="outlined" sx={{ flexShrink: 0 }}>
          Projects
        </Button>
      </Box>

      <Box
        id="sections-container"
        sx={{
          gridColumn: { xs: "1 / -1", lg: 1 },
          gridRow: 2,
          ...glassPanelSx,
          p: 1.25,
          display: "flex",
          flexDirection: "column",
          gap: 1.25,
          minHeight: 0,
          overflow: "hidden",
          userSelect: "none",
          containerType: "inline-size",
        }}
      >
        {sections.map((section, index) => {
          const sectionIndex = index + 1;
          const isActive = currentIndex === sectionIndex;

          return (
            <Box
              className="section"
              data-index={sectionIndex}
              key={section.title}
              onClick={() => {
                if (!isActive) {
                  navigate(section.path);
                }
              }}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.25,
                p: "clamp(10px, 3cqi, 16px)",
                borderRadius: "8px",
                backgroundColor: isActive ? "#eff6ff" : "#ffffff",
                border: `1px solid ${isActive ? "#9dc4ff" : "#e2e8f0"}`,
                cursor: "pointer",
                transition: "background-color 0.2s, border-color 0.2s, box-shadow 0.2s, transform 0.2s",
                flex: "1 1 0",
                minHeight: 0,
                position: "relative",
                boxShadow: isActive ? "inset 3px 0 0 #2563eb, 0 10px 24px rgba(37, 99, 235, 0.10)" : "0 1px 2px rgba(15, 23, 42, 0.04)",
                "&:hover": {
                  backgroundColor: isActive ? "#eff6ff" : "#f8fafc",
                  borderColor: isActive ? "#9dc4ff" : "#cbd5e1",
                },
              }}
            >
              <Box
                sx={{
                  width: "clamp(42px, 12cqi, 56px)",
                  height: "clamp(42px, 12cqi, 56px)",
                  flexShrink: 0,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  background: isActive ? "#dbeafe" : "#f1f5f9",
                  borderRadius: "50%",
                  boxShadow: isActive ? "0 8px 18px rgba(37, 99, 235, 0.18)" : "inset 0 0 0 1px #e2e8f0",
                  fontSize: "clamp(1.15rem, 5cqi, 1.55rem)",
                  color: isActive ? "#2563eb" : "#5b6575",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease",
                  ".section:hover &": {
                    boxShadow: isActive ? "0 8px 18px rgba(37, 99, 235, 0.18)" : "inset 0 0 0 1px #cbd5e1",
                    background: isActive ? "#dbeafe" : "#e8eef6",
                    color: isActive ? "#2563eb" : "#111827",
                  },
                }}
              >
                <span>{section.icon}</span>
              </Box>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, flexShrink: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: "clamp(0.92rem, 3.8cqi, 1.08rem)", fontWeight: 800, flexShrink: 0, lineHeight: 1.2 }}>{section.title}</Typography>
                <Typography
                  sx={{
                    color: "text.secondary",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    textOverflow: "ellipsis",
                    flexShrink: 1,
                    fontSize: "clamp(0.8rem, 3cqi, 0.95rem)",
                    lineHeight: 1.35,
                  }}
                >
                  {section.description}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>

      <Box
        sx={{
          gridColumn: { xs: "1 / -1", lg: 2 },
          gridRow: 2,
          ...glassPanelSx,
          p: { xs: 1.5, md: 2 },
          minHeight: 0,
          overflow: "auto",
          display: "flex",
          flexDirection: "column",
          justifyContent: "start",
          alignItems: "stretch",
          position: "relative",
          containerType: "inline-size",
        }}
      >
        <ActiveView />
      </Box>
    </Box>
  );
}

export function App() {
  return (
    <Routes>
      <Route element={<Navigate replace to="/performance-dashboard" />} path="/" />
      {sections.map((section) => (
        <Route element={<InsightEdDashboard activeSection={section.slug} />} key={section.slug} path={section.path} />
      ))}
      <Route element={<ProjectsIndex />} path="/projects" />
      <Route element={<ProjectDetail />} path="/projects/:slug/:variant" />
      <Route element={<ProjectDetail />} path="/projects/:slug" />
    </Routes>
  );
}
