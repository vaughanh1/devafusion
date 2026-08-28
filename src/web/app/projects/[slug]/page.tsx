import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getProject, projects } from "@/features/projects/projects";

interface ProjectPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export function generateStaticParams() {
  return projects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({
  params,
}: ProjectPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);

  if (!project) {
    return {};
  }

  return {
    title: project.title,
    description: project.summary,
  };
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { slug } = await params;
  const project = getProject(slug);

  if (!project) {
    notFound();
  }

  return (
    <section className="mx-auto max-w-4xl px-6 py-20">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted">
        Project
      </p>

      <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground">
        {project.title}
      </h1>

      <p className="mt-6 text-lg leading-8 text-muted">
        {project.description}
      </p>

      <ul className="mt-8 flex flex-wrap gap-2 text-sm text-muted">
        {project.tags.map((tag) => (
          <li key={tag} className="border border-surface-border px-3 py-1">
            {tag}
          </li>
        ))}
      </ul>
    </section>
  );
}
