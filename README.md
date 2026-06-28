# InsightEd

[Live Demo](https://insighted-viz.vercel.app)

InsightEd is an interactive data visualization app for exploring education spending, student performance, predictive modeling results, and focused visualization studies. It is built with React, TypeScript, Vite, Material UI, D3, Leaflet, and noUiSlider.

## Features

- Global education expenditure map with ranked country bubbles and nearest-hover tooltips.
- Student performance dashboard with charts for study time, internet access, gender, travel time, absences, and grades.
- Predictive analysis view for model performance, predicted-vs-actual scatter plots, and feature importance.
- Project directory with standalone visualization exercises:
  - Equal spacing layout
  - Sunshine hours in U.S. cities
  - Internet usage comparisons
  - Renewable energy consumption over time
  - Energy and climate advocacy story
- Shared proximity hover behavior across charts so the nearest data point remains interactive throughout the chart area.
- Centralized runtime data in `public/data`.

## Tech Stack

- React
- TypeScript
- Vite
- Material UI
- D3
- Leaflet
- noUiSlider
- React Router

## Getting Started

Install dependencies:

```sh
npm install
```

Start the development server:

```sh
npm run dev
```

Build for production:

```sh
npm run build
```

Preview the production build:

```sh
npm run preview
```

## App Routes

- `/` - main InsightEd dashboard
- `/projects` - project directory
- `/projects/equal-spacing-layout`
- `/projects/expository-visualization`
- `/projects/misleading-visualization/china-internet-users`
- `/projects/misleading-visualization/us-internet-usage`
- `/projects/interactive-visualization`
- `/projects/data-visualization-for-advocacy`

## Deployment

InsightEd is deployed on Vercel. The production build is generated with:

```sh
npm run build
```

Vercel serves the Vite build output from `dist`.

## Project Structure

```text
.
├── public/
│   └── data/
├── src/
│   ├── projects/
│   ├── views/
│   ├── visualizations/
│   ├── App.tsx
│   ├── main.tsx
│   └── theme.ts
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Data

All app data lives in `public/data` and is served from `/data/...` at runtime. The visualization modules load CSV and JSON files directly with D3.

## Development Notes

- Keep visualization data files in `public/data`.
- Keep route-level React UI in `src/views` and `src/projects`.
- Keep D3 rendering logic in `src/visualizations` or the relevant project module.
- Run `npm run build` before shipping changes.
