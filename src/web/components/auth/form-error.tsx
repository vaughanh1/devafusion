type FormErrorProps = {
  id?: string;
  message: string;
};

// Shared across every auth form's error alert - previously each form
// rendered its own <p role="alert"> using the same neutral
// --surface-border/--surface tokens as a plain informational box, with
// no color signal that something had actually gone wrong. Pairs the
// new --danger* tokens (globals.css) with a warning glyph rather than
// color alone, per src/web/AGENTS.md's "color is never the sole
// signal" accessibility rule - a colorblind visitor or one on the
// Tactical profile (where danger red already needs to be
// distinguishable from that profile's own high-contrast palette)
// still gets a second, non-color signal.
export function FormError({ id, message }: FormErrorProps) {
  return (
    <p
      id={id}
      role="alert"
      className="flex items-start gap-2 border border-danger-border bg-danger-surface px-4 py-3 text-sm font-medium text-danger"
    >
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className="mt-0.5 size-4 shrink-0"
        aria-hidden="true"
      >
        <path d="M12 2 1 21h22L12 2Zm0 6.5c.55 0 1 .45 1 1v5c0 .55-.45 1-1 1s-1-.45-1-1v-5c0-.55.45-1 1-1ZM11 17h2v2h-2v-2Z" />
      </svg>
      <span>{message}</span>
    </p>
  );
}
