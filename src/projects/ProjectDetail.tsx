import { Navigate, useParams } from "react-router-dom";
import { ConvertedMiniProject } from "./ConvertedMiniProjects";
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

  return <ConvertedMiniProject slug={slug} variant={variant} />;
}
