import type { Metadata } from "next";

import Link from "next/link";
import { projects } from "@/features/projects/projects";

export const metadata: Metadata = {
  title: "Projects",
  description:
    "Selected software engineering and cloud projects developed through Devafusion.",
};

export default function ProjectsPage() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
        Projects
      </p>

      <h1 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-950">
        Selected projects.
      </h1>

      <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-600">
        Projects, applications and engineering work will be showcased here.
      </p>

      <div className="mt-14 grid gap-6 sm:grid-cols-2">
        {projects.map((project) => (
          <article key={project.slug} className="border border-zinc-200 p-6">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
              {project.status}
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-950">
              <Link
                href={`/projects/${project.slug}`}
                className="underline decoration-zinc-300 underline-offset-4 transition-colors hover:decoration-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-950"
              >
                {project.title}
              </Link>
            </h2>
            <p className="mt-3 leading-7 text-zinc-600">{project.summary}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
