export default function HomePage() {
  return (
    <section className="mx-auto flex min-h-[calc(100vh-9rem)] max-w-6xl items-center px-6 py-20">
      <div className="max-w-3xl">
        <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
          Software engineering · Cloud · Experiments
        </p>

        <h1 className="text-5xl font-semibold tracking-tight text-zinc-950 sm:text-6xl">
          Engineering in public.
        </h1>

        <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-600">
          Devafusion is a living technical laboratory for exploring software
          engineering, cloud architecture, modern web development and the
          technologies behind them.
        </p>
      </div>
    </section>
  );
}
