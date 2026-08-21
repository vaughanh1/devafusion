interface ProjectPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function ProjectPage({
  params,
}: ProjectPageProps) {
  const { slug } = await params;

  return (
    <section className="mx-auto max-w-4xl px-6 py-20">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
        Project
      </p>

      <h1 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-950">
        {slug}
      </h1>

      <p className="mt-6 text-lg leading-8 text-zinc-600">
        This project does not exist yet.
      </p>
    </section>
  );
}
