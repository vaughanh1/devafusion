import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with Devafusion.",
};

export default function ContactPage() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-20">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
        Contact
      </p>

      <h1 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-950">
        Get in touch.
      </h1>

      <p className="mt-6 text-lg leading-8 text-zinc-600">
        Contact details and professional links will be added here.
      </p>
    </section>
  );
}
