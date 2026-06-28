import { Box, Button, Chip, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { glassPanelSx } from "../theme";
import { miniProjects } from "./projectCatalog";
import { ProjectsLayout } from "./ProjectsLayout";

const projectMeta: Record<string, { accent: string; category: string; index: string }> = {
  "equal-spacing-layout": { accent: "#f59e0b", category: "Layout", index: "01" },
  "expository-visualization": { accent: "#0f766e", category: "Map + Line", index: "02" },
  "misleading-visualization": { accent: "#dc2626", category: "Comparison", index: "03" },
  "interactive-visualization": { accent: "#2563eb", category: "Interactive", index: "04" },
  "data-visualization-for-advocacy": { accent: "#7c3aed", category: "Story", index: "05" },
};

export function ProjectsIndex() {
  return (
    <ProjectsLayout title="Projects" subtitle="Interactive visualization routes converted into the React app.">
      <Box
        sx={{
          ...glassPanelSx,
          display: "flex",
          flex: 1,
          flexDirection: "column",
          gap: 0,
          minHeight: 0,
          overflow: "hidden",
          p: 0,
          containerType: "inline-size",
          width: "100%",
        }}
      >
        {miniProjects.map((project) => (
          <Box
            key={project.slug}
            sx={{
              background: `linear-gradient(90deg, ${projectMeta[project.slug].accent}0f 0%, #ffffff 18%, #ffffff 100%)`,
              borderBottom: "1px solid #e5eaf1",
              display: "grid",
              flex: "1 1 0",
              gap: { xs: 2, md: 3.5, xl: 5 },
              gridTemplateColumns: { xs: "1fr", md: "112px minmax(0, 1fr) minmax(220px, 0.34fr)" },
              minHeight: { xs: 180, md: 0 },
              p: { xs: 2, md: 3.25, xl: 4 },
              position: "relative",
              transition: "background 0.2s ease",
              "&:before": {
                backgroundColor: projectMeta[project.slug].accent,
                content: '""',
                height: "100%",
                left: 0,
                position: "absolute",
                top: 0,
                width: 4,
              },
              "&:last-of-type": {
                borderBottom: 0,
              },
              "&:hover": {
                background: `linear-gradient(90deg, ${projectMeta[project.slug].accent}18 0%, #f8fbff 22%, #ffffff 100%)`,
              },
            }}
          >
            <Box
              sx={{
                alignItems: "center",
                alignSelf: "stretch",
                backgroundColor: "#f8fafc",
                border: `1px solid ${projectMeta[project.slug].accent}26`,
                borderRadius: "8px",
                color: projectMeta[project.slug].accent,
                display: "flex",
                fontSize: "clamp(1.35rem, 2.6cqi, 2rem)",
                fontWeight: 900,
                justifyContent: "center",
                letterSpacing: 0,
                minHeight: { xs: 64, md: "auto" },
              }}
            >
              {projectMeta[project.slug].index}
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column", gap: { xs: 1.25, xl: 2 }, justifyContent: "center", minWidth: 0 }}>
              <Box sx={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 1 }}>
                <Typography component="h2" sx={{ fontSize: "clamp(1.45rem, 2.4cqi, 2.25rem)", fontWeight: 850, lineHeight: 1.1, m: 0 }}>
                  {project.title}
                </Typography>
                <Chip
                  label={projectMeta[project.slug].category}
                  size="small"
                  sx={{
                    backgroundColor: `${projectMeta[project.slug].accent}14`,
                    border: `1px solid ${projectMeta[project.slug].accent}33`,
                    color: projectMeta[project.slug].accent,
                    fontWeight: 800,
                    height: { xs: 24, xl: 30 },
                  }}
                />
              </Box>
              <Typography sx={{ color: "text.secondary", fontSize: "clamp(1rem, 1.2cqi, 1.2rem)", lineHeight: 1.55, maxWidth: 980 }}>
                {project.description}
              </Typography>
            </Box>

            <Box sx={{ alignItems: "stretch", display: "flex", flexDirection: "column", gap: 1.25, justifyContent: "center", minWidth: { md: 220 } }}>
              {project.variants ? (
                project.variants.map((variant) => (
                  <Button component={RouterLink} key={variant.path} to={`/projects/${project.slug}/${variant.path}`} variant="contained" fullWidth sx={{ minHeight: { xs: 42, xl: 50 } }}>
                    {variant.label}
                  </Button>
                ))
              ) : (
                <Button component={RouterLink} to={`/projects/${project.slug}`} variant="contained" fullWidth sx={{ minHeight: { xs: 42, xl: 50 } }}>
                  Open Project
                </Button>
              )}
            </Box>
          </Box>
        ))}
      </Box>
    </ProjectsLayout>
  );
}
