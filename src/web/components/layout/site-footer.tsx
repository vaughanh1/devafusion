export function SiteFooter() {
  return (
    <footer className="border-t border-zinc-200">
      <div className="mx-auto flex min-h-20 max-w-6xl items-center px-6 text-sm text-zinc-500">
        <p>
          © {new Date().getFullYear()} Devafusion. Built to explore, experiment
          and learn.
        </p>
      </div>
    </footer>
  );
}
