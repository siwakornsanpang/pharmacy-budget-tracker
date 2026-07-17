import { ProjectDashboard } from "@/components/ProjectDashboard";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProjectPage({ params }: PageProps) {
  const { id } = await params;
  return <ProjectDashboard projectId={id} />;
}
