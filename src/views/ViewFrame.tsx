import { Box, Typography } from "@mui/material";
import type { ReactNode } from "react";
import { headerPanelSx, pageRootSx } from "../theme";

type ViewFrameProps = {
  children: ReactNode;
  title: string;
};

export function ViewFrame({ children, title }: ViewFrameProps) {
  return (
    <Box sx={pageRootSx}>
      <Box component="header" sx={headerPanelSx}>
        <Typography
          className="animated-title"
          component="h1"
          sx={{
            animation: "fadeIn 0.7s ease-out",
            fontSize: "clamp(1.15rem, 2.5cqi, 2rem)",
            fontWeight: 800,
            lineHeight: 1.2,
            m: 0,
          }}
        >
          {title}
        </Typography>
      </Box>
      <Box component="main" sx={{ display: "flex", flex: 1, flexDirection: "column", minHeight: 0, py: { xs: 2, lg: 2.5 } }}>
        {children}
      </Box>
    </Box>
  );
}
