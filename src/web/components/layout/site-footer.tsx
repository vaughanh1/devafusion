import { ThemeSelector } from "@/components/theme/theme-selector";

export function SiteFooter() {
  return (
    <footer className="border-t border-surface-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-4 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {new Date().getFullYear()} Devafusion. Built to explore, experiment
          and learn.
        </p>

        <ThemeSelector />
      </div>
    </footer>
  );
}
