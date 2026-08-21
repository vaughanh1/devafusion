import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Experiments",
  description:
    "Explore technical experiments in software engineering, cloud architecture and modern web development.",
};

export default function ExperimentsPage() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
        Experiments
      </p>

      <h1 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-950">
        Technical experiments.
      </h1>

      <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-600">
        A collection of experiments exploring technologies, techniques,
        architectures and ideas.
      </p>
    </section>
  );
}
