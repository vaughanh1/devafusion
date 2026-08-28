import Link from "next/link";
import type { Metadata } from "next";

import { engineeringLog } from "@/features/log/engineering-log";

export const metadata: Metadata = {
  title: "Engineering log",
  description:
    "A chronological public record of Devafusion's engineering changes, decisions and milestones.",
};

export default function LogPage() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-20">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted">
        Engineering log
      </p>

      <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground">
        Building in public.
      </h1>

      <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">
        A chronological record of the changes, decisions and milestones shaping
        Devafusion.
      </p>

      <ol className="mt-14 space-y-10 border-l border-surface-border pl-6">
        {engineeringLog.map((entry) => (
          <li key={entry.slug}>
            <time
              dateTime={entry.date}
              className="text-sm font-medium text-muted"
            >
              {new Intl.DateTimeFormat("en-GB", {
                dateStyle: "long",
              }).format(new Date(`${entry.date}T00:00:00`))}
            </time>

            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
              <Link
                href={`/log/${entry.slug}`}
                className="underline decoration-muted underline-offset-4 transition-colors hover:decoration-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground"
              >
                {entry.title}
              </Link>
            </h2>

            <p className="mt-3 leading-7 text-muted">{entry.summary}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
