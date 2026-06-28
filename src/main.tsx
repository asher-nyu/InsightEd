import React from "react";
import { createRoot } from "react-dom/client";
import { CssBaseline, GlobalStyles, ThemeProvider } from "@mui/material";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { appTheme, globalStyles } from "./theme";

createRoot(document.getElementById("root")!).render(
  <React.Fragment>
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <GlobalStyles styles={globalStyles} />
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </React.Fragment>,
);
