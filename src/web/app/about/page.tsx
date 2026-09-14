import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Software Engineering Rooted in Deva Victrix",
  description:
    "Devafusion fuses Roman engineering discipline with modern software practice - TDD, CI/CD, clean architecture, built from Chester, UK.",
  alternates: { canonical: "/about" },
  openGraph: {
    type: "profile",
    title: "Software Engineering Rooted in Deva Victrix",
    description:
      "TDD, CI/CD, clean architecture - engineered with the discipline of Deva Victrix.",
    url: "/about",
  },
  twitter: {
    card: "summary_large_image",
    title: "Devafusion",
    description:
      "Software engineering discipline, rooted in Chester's Roman fortress heritage.",
  },
};

export default function AboutPage() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-20">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted">
        About
      </p>

      <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground">
        The Geometry of the Grid: Engineering Discipline Since Deva Victrix
      </h1>

      <p className="mt-6 text-lg leading-8 text-muted">
        Devafusion is a personal technical laboratory for exploring software
        engineering, cloud architecture, modern web technologies and the
        practices that bring them together.
      </p>

      <h2 className="mt-14 text-2xl font-semibold tracking-tight text-foreground">
        The Origin of Devafusion
      </h2>

      <div className="mt-4 border-l-2 border-surface-border bg-surface p-6 text-lg leading-8 text-muted">
        <p>
          The name traces back to Chester, United Kingdom - once{" "}
          <strong className="text-foreground">
            <a
              href="https://en.wikipedia.org/wiki/Deva_Victrix"
              rel="noreferrer"
              target="_blank"
              className="underline decoration-muted underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground"
            >
              Deva Victrix
            </a>
          </strong>
          , the fortress city of the Roman Legion XX Valeria Victrix. Its
          engineers didn&apos;t build temporary camps; they built permanent
          infrastructure designed to outlast centuries of pressure. That
          same bias toward durable foundations shapes this practice&apos;s
          own engineering choices, without treating any one stack or
          decision as permanent - the tooling and technologies used here
          keep evolving.
        </p>

        <p className="mt-4">The name is a deliberate, four-layer fusion:</p>

        <ul className="mt-4 space-y-3">
          <li>
            <strong className="text-foreground">Deva</strong> - the
            foundation. A direct homage to Chester and the legion&apos;s
            engineering legacy: discipline, precision, structures built to
            last.
          </li>
          <li>
            <strong className="text-foreground">Dev</strong> - the
            discipline. The daily reality of software craftsmanship,
            systems architecture, and engineering rigor.
          </li>
          <li>
            <strong className="text-foreground">Fusion</strong> - the
            method. &quot;Develop a Fusion&quot; - synthesizing disparate
            technologies into one coherent, unified system.
          </li>
          <li>
            <strong className="text-foreground">.net</strong> - the
            architectural nod. A salute to the type-safe, high-performance
            framework anchoring backend engineering discipline.
          </li>
        </ul>
      </div>

      <div className="mt-6 border-l-2 border-surface-border bg-surface p-6 text-lg leading-8 text-muted">
        <p>
          Colour is not decoration - it&apos;s archival. Roman Madder Red is
          a direct nod to the organic crimson dye extracted from{" "}
          <em>Rubia tinctorum</em>, the plant the legions actually used to
          colour cloth and standards. Paired with Legionary Gold and Gladius
          Steel, the palette is historically accurate, not merely
          &quot;Roman-themed.&quot; The geometry mirrors the Cardo and
          Decumanus - the cross-axis grid at the center of every Roman
          fortress city - framed by the outline of Chester&apos;s own Roman
          Wall, and carries specific shield heraldry lifted from the XX
          Legion: white horizontal arrows (momentum, directed force),
          vertical gold lines (structural load, integrity), and the central
          boss (the point where distinct systems converge into one).
        </p>
        <p className="mt-4">
          See the{" "}
          <Link
            href="/log/devafusion-brand-icons-and-manifest"
            className="underline decoration-muted underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground"
          >
            engineering log entry
          </Link>{" "}
          documenting how this mark was actually built.
        </p>
      </div>

      <h2 className="mt-14 text-2xl font-semibold tracking-tight text-foreground">
        Engineering Principles
      </h2>

      <p className="mt-4 text-lg leading-8 text-muted">
        Discipline here is enforced by tooling, not memory - and it sits
        alongside an agile, evolving practice: work ships in small vertical
        slices, and the toolchain keeps being re-examined against newer
        approaches rather than fixed in place.
      </p>

      <ul className="mt-6 space-y-4 text-lg leading-8 text-muted">
        <li>
          <strong className="text-foreground">
            Test-Driven &amp; Behaviour-Driven Development.
          </strong>{" "}
          Code is written to a failing test first. Behaviour is specified
          before implementation exists, not retrofitted after.
        </li>
        <li>
          <strong className="text-foreground">
            CI/CD automation &amp; DevOps culture.
          </strong>{" "}
          Every change ships through an automated pipeline - lint,
          typecheck, unit, E2E, visual regression - before a human ever
          reviews it. See it running in the{" "}
          <Link
            href="/log"
            className="underline decoration-muted underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground"
          >
            engineering log
          </Link>
          , documenting real incidents as they happened.
        </li>
        <li>
          <strong className="text-foreground">
            Clean Code &amp; SOLID principles.
          </strong>{" "}
          Single-responsibility components, explicit boundaries between
          server and client rendering, no speculative abstraction.
        </li>
        <li>
          <strong className="text-foreground">
            Scalable system architecture.
          </strong>{" "}
          Infrastructure as code (Terraform), separated deployment
          pipelines for application vs. infrastructure, explicit
          resource-address migration discipline - decisions documented, not
          assumed.
        </li>
        <li>
          <strong className="text-foreground">Continuous learning.</strong>{" "}
          The engineering log is a public, timestamped record of real
          decisions and real incidents - not a curated highlight reel.
        </li>
      </ul>

      <h2 className="mt-14 text-2xl font-semibold tracking-tight text-foreground">
        Open Source &amp; Proof of Work
      </h2>

      <p className="mt-4 text-lg leading-8 text-muted">
        Claims are cheap. A public commit history is not. Devafusion&apos;s
        own build is public on{" "}
        <a
          href="https://github.com/vaughanh1/devafusion"
          rel="me noreferrer"
          target="_blank"
          className="underline decoration-muted underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground"
        >
          GitHub
        </a>
        . Every commit follows Conventional Commits, every PR is validated
        by CI before merge, and the{" "}
        <Link
          href="/log"
          className="underline decoration-muted underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground"
        >
          engineering log
        </Link>{" "}
        narrates the reasoning - including the mistakes, such as{" "}
        <Link
          href="/log/devafusion-com-spf-txt-recordset-conflict"
          className="underline decoration-muted underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground"
        >
          a DNS recordset conflict
        </Link>
        , as candidly as the wins. See the{" "}
        <Link
          href="/projects/devafusion"
          className="underline decoration-muted underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground"
        >
          Devafusion project entry
        </Link>{" "}
        for how this site itself is built and operated.
      </p>

      <p className="mt-14 text-lg leading-8 text-muted">
        Questions or feedback? See the{" "}
        <Link
          href="/contact"
          className="underline decoration-muted underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground"
        >
          Contact page
        </Link>
        .
      </p>
    </section>
  );
}

