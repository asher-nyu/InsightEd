export type MiniProject = {
  description: string;
  slug: string;
  title: string;
  variants?: Array<{
    label: string;
    path: string;
  }>;
};

export const miniProjects: MiniProject[] = [
  {
    description: "A simple three-region composition demonstrating equal spacing, fixed gaps, and full-viewport layout.",
    slug: "equal-spacing-layout",
    title: "Equal Spacing Layout",
  },
  {
    description: "Average monthly hours of sunshine from 1981 to 2010 in six major U.S. cities.",
    slug: "expository-visualization",
    title: "Sunshine Hours in U.S. Cities",
  },
  {
    description: "A pair of internet-usage visualizations comparing how framing changes the apparent story.",
    slug: "misleading-visualization",
    title: "Misleading Visualization",
    variants: [
      { label: "China Internet Users", path: "china-internet-users" },
      { label: "U.S. Internet Usage", path: "us-internet-usage" },
    ],
  },
  {
    description: "Renewable energy consumption as a percentage of total final energy consumption from 1990 to 2021.",
    slug: "interactive-visualization",
    title: "Interactive Visualization",
  },
  {
    description: "A five-part visual advocacy story about CO2, warming, sea level, and the energy mix.",
    slug: "data-visualization-for-advocacy",
    title: "The Energy and Climate Story",
  },
];
