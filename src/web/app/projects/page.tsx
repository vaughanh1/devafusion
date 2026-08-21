import type { Metadata } from "next";

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
    </section>
  );
}
