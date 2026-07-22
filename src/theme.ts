import type { SxProps, Theme } from "@mui/material";
import { createTheme } from "@mui/material/styles";

export const appTheme = createTheme({
  palette: {
    background: {
      default: "#f4f7fb",
      paper: "#ffffff",
    },
    primary: {
      main: "#2563eb",
      dark: "#1d4ed8",
    },
    secondary: {
      main: "#0f766e",
    },
    text: {
      primary: "#111827",
      secondary: "#5b6575",
    },
  },
  typography: {
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    h1: {
      fontWeight: 750,
      lineHeight: 1.15,
    },
    h2: {
      fontWeight: 700,
      lineHeight: 1.2,
    },
    body1: {
      lineHeight: 1.55,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 700,
          letterSpacing: 0,
          minHeight: 38,
          textTransform: "none",
        },
      },
    },
  },
});

export const globalStyles = {
  "*": {
    boxSizing: "border-box",
    cursor: "default !important",
  },
  "html, body, #root": {
    height: "100%",
    minHeight: "100%",
    overflow: "auto",
    scrollbarWidth: "none",
    msOverflowStyle: "none",
  },
  "html::-webkit-scrollbar, body::-webkit-scrollbar": {
    display: "none",
  },
  body: {
    margin: 0,
    backgroundColor: "#f4f7fb",
    color: "#111827",
  },
  svg: {
    display: "block",
    maxWidth: "100%",
    width: "100%",
    height: "auto",
  },
  "@keyframes fadeIn": {
    from: {
      opacity: 0,
      transform: "translateY(-10px)",
    },
    to: {
      opacity: 1,
      transform: "translateY(0)",
    },
  },
};

export const glassPanelSx: SxProps<Theme> = {
  background: "rgba(255, 255, 255, 0.94)",
  border: "1px solid rgba(148, 163, 184, 0.28)",
  boxShadow: "0 18px 44px rgba(15, 23, 42, 0.08)",
  backdropFilter: "blur(10px)",
  WebkitBackdropFilter: "blur(10px)",
  borderRadius: "8px",
};

export const headerPanelSx: SxProps<Theme> = {
  ...glassPanelSx,
  background: "linear-gradient(135deg, #ffffff 0%, #edf5ff 100%)",
  color: "#111827",
  textAlign: "center",
  py: { xs: 2, lg: 2.75 },
  px: { xs: 2, lg: 3 },
  m: 0,
  textShadow: "none",
};

export const pageRootSx: SxProps<Theme> = {
  containerType: "inline-size",
  display: "flex",
  flexShrink: 0,
  flexDirection: "column",
  fontFamily: "system-ui",
  height: "auto",
  minHeight: "100%",
  overflow: "visible",
  width: "100%",
  cursor: "default !important",
  WebkitTouchCallout: "none",
  WebkitUserSelect: "none",
  MozUserSelect: "none",
  msUserSelect: "none",
  userSelect: "none",
};

export const formControlSx: SxProps<Theme> = {
  width: "100%",
  border: "1px solid #d7dee8",
  borderRadius: "8px",
  color: "#111827",
  fontFamily: "inherit",
  fontSize: "1rem",
  lineHeight: 1.5,
  p: "9px 12px",
  backgroundColor: "#fff",
  outline: "none",
  transition: "border-color 0.2s ease, box-shadow 0.2s ease",
  "&:focus": {
    borderColor: "#2563eb",
    boxShadow: "0 0 0 3px rgba(37, 99, 235, 0.14)",
  },
};
