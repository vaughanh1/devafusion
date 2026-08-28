import type { Metadata } from "next";

interface ExperimentPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({
  params,
}: ExperimentPageProps): Promise<Metadata> {
  const { slug } = await params;
  const title = slug.replaceAll("-", " ");

  return {
    title,
    description: `Read about the ${title} experiment from Devafusion.`,
  };
}

export default async function ExperimentPage({ params }: ExperimentPageProps) {
  const { slug } = await params;

  return (
    <section className="mx-auto max-w-4xl px-6 py-20">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted">
        Experiment
      </p>

      <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground">
        {slug}
      </h1>

      <p className="mt-6 text-lg leading-8 text-muted">
        This experiment does not exist yet.
      </p>
    </section>
  );
}
