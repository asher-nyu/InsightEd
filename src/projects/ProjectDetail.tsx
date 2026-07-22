import { Navigate, useParams } from "react-router-dom";
import { advocacySections, ConvertedMiniProject } from "./ConvertedMiniProjects";
import { miniProjects } from "./projectCatalog";

export function ProjectDetail() {
  const { slug, variant } = useParams();
  const project = miniProjects.find((candidate) => candidate.slug === slug);

  if (!project || !slug) {
    return <Navigate replace to="/projects" />;
  }

  if (slug === "misleading-visualization" && !variant) {
    return <Navigate replace to="/projects/misleading-visualization/china-internet-users" />;
  }

  if (slug === "data-visualization-for-advocacy") {
    const firstSectionPath = advocacySections[0].path;

    if (!variant || !advocacySections.some((section) => section.path === variant)) {
      return <Navigate replace to={`/projects/data-visualization-for-advocacy/${firstSectionPath}`} />;
    }
  }

  return <ConvertedMiniProject slug={slug} variant={variant} />;
}
