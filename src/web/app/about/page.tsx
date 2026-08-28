import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description:
    "Learn about Devafusion and its approach to software engineering, cloud architecture and experimentation.",
};

export default function AboutPage() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-20">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted">
        About
      </p>

      <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground">
        Engineering, experimentation and continuous learning.
      </h1>

      <p className="mt-6 text-lg leading-8 text-muted">
        Devafusion is a personal technical laboratory for exploring software
        engineering, cloud architecture, modern web technologies and the
        practices that bring them together.
      </p>
    </section>
  );
}
