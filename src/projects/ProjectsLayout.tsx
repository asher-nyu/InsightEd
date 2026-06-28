import { Box, Button, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import type { ReactNode } from "react";
import { glassPanelSx } from "../theme";

type ProjectsLayoutProps = {
  children: ReactNode;
  subtitle?: string;
  title: string;
};

export function ProjectsLayout({ children, subtitle, title }: ProjectsLayoutProps) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
        minHeight: "100vh",
        overflow: "hidden",
        p: { xs: 2, lg: 2.5 },
        background: "linear-gradient(180deg, #f7f9fc 0%, #edf3f8 100%)",
        fontFamily: "system-ui",
        containerType: "inline-size",
      }}
    >
      <Box
        component="header"
        sx={{
          ...glassPanelSx,
          flex: "0 0 auto",
          minHeight: { xs: 96, xl: 116 },
          p: { xs: 2, md: 3 },
          mb: 2.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          flexWrap: "wrap",
        }}
      >
        <Box>
          <Typography component="h1" sx={{ fontSize: "clamp(1.35rem, 2.4cqi, 2.35rem)", fontWeight: 800, letterSpacing: 0, m: 0 }}>
            {title}
          </Typography>
          {subtitle ? (
            <Typography sx={{ color: "text.secondary", fontSize: "clamp(0.95rem, 1.2cqi, 1.08rem)", mt: 1 }}>
              {subtitle}
            </Typography>
          ) : null}
        </Box>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <Button component={RouterLink} to="/" variant="outlined">
            InsightEd
          </Button>
          <Button component={RouterLink} to="/projects" variant="contained">
            Projects
          </Button>
        </Box>
      </Box>
      <Box sx={{ display: "flex", flex: 1, minHeight: 0 }}>
        {children}
      </Box>
    </Box>
  );
}
