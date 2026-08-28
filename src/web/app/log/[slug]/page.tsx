import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { engineeringLog, getLogEntry } from "@/features/log/engineering-log";

interface LogEntryPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export function generateStaticParams() {
  return engineeringLog.map((entry) => ({ slug: entry.slug }));
}

export async function generateMetadata({
  params,
}: LogEntryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const entry = getLogEntry(slug);

  if (!entry) {
    return {};
  }

  return {
    title: entry.title,
    description: entry.summary,
  };
}

export default async function LogEntryPage({ params }: LogEntryPageProps) {
  const { slug } = await params;
  const entry = getLogEntry(slug);

  if (!entry) {
    notFound();
  }

  return (
    <article className="mx-auto max-w-4xl px-6 py-20">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted">
        Engineering log
      </p>

      <time
        dateTime={entry.date}
        className="mt-4 block text-sm font-medium text-muted"
      >
        {new Intl.DateTimeFormat("en-GB", { dateStyle: "long" }).format(
          new Date(`${entry.date}T00:00:00`),
        )}
      </time>

      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground">
        {entry.title}
      </h1>

      <p className="mt-6 text-lg leading-8 text-muted">{entry.summary}</p>

      <div className="mt-12 grid gap-10 sm:grid-cols-2">
        <LogSection title="Decisions" items={entry.decisions} />
        <LogSection title="Milestones" items={entry.milestones} />
        <LogSection title="Validation" items={entry.validation} />
      </div>
    </article>
  );
}

function LogSection({ title, items }: { title: string; items: string[] }) {
  return (
    <section>
      <h2 className="text-xl font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      <ul className="mt-4 list-disc space-y-2 pl-5 leading-7 text-muted">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
