import { Box } from "@mui/material";
import { glassPanelSx } from "../theme";
import { ViewFrame } from "./ViewFrame";

export function UserReviewsView() {
  return (
    <ViewFrame title="User Reviews">
      <Box sx={{ ...glassPanelSx, flex: 1, minHeight: "clamp(760px, calc(100dvh - 240px), 1180px)", overflow: "hidden", p: 0 }}>
        <Box
          component="iframe"
          src="https://forms.gle/6rNzedQApA5wEA1q6"
          height="100%"
          frameBorder="0"
          marginHeight={0}
          marginWidth={0}
          title="User Reviews"
          sx={{ border: "none", display: "block", minHeight: "inherit", width: "100%" }}
        >
          Loading…
        </Box>
      </Box>
    </ViewFrame>
  );
}
