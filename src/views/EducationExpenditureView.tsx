import { Box } from "@mui/material";
import { useEffect } from "react";
import { glassPanelSx } from "../theme";
import { renderEducationExpenditureMap } from "../visualizations/educationExpenditureMap";
import { ViewFrame } from "./ViewFrame";

export function EducationExpenditureView() {
  useEffect(() => renderEducationExpenditureMap(), []);

  return (
    <ViewFrame title="Global Education Expenditure (2021)">
      <Box
        id="chart"
        sx={{
          ...glassPanelSx,
          flex: 1,
          minHeight: "clamp(720px, calc(100dvh - 245px), 1120px)",
          p: 1.5,
          "& svg": {
            height: "100%",
            width: "100%",
          },
        }}
      >
        <Box component="svg" sx={{ height: "100%" }} />
      </Box>
    </ViewFrame>
  );
}
