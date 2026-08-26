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
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
        Engineering log
      </p>

      <h1 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-950">
        Building in public.
      </h1>

      <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-600">
        A chronological record of the changes, decisions and milestones shaping
        Devafusion.
      </p>

      <ol className="mt-14 space-y-10 border-l border-zinc-200 pl-6">
        {engineeringLog.map((entry) => (
          <li key={entry.slug}>
            <time
              dateTime={entry.date}
              className="text-sm font-medium text-zinc-500"
            >
              {new Intl.DateTimeFormat("en-GB", {
                dateStyle: "long",
              }).format(new Date(`${entry.date}T00:00:00`))}
            </time>

            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">
              <Link
                href={`/log/${entry.slug}`}
                className="underline decoration-zinc-300 underline-offset-4 transition-colors hover:decoration-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-950"
              >
                {entry.title}
              </Link>
            </h2>

            <p className="mt-3 leading-7 text-zinc-600">{entry.summary}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
