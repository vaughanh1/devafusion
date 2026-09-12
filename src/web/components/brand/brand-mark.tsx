type BrandMarkProps = {
  size?: "compact" | "hero";
};

// Fortress Crossroads badge. Badge colours (red/gold/white) and the
// fusion/.net accent colours are fixed brand colours across every theme;
// "Deva" and the tagline follow --foreground/--muted so they always match
// the active a11y theme (see src/web/AGENTS.md, Accessibility Theme Engine).
export function BrandMark({ size = "compact" }: BrandMarkProps) {
  const isHero = size === "hero";

  return (
    <div
      className={`flex items-center ${isHero ? "gap-4 sm:gap-5" : "gap-3"}`}
    >
      <svg
        viewBox="0 0 54 54"
        role="img"
        aria-label="Devafusion logo"
        className={
          isHero
            ? "h-12 w-12 shrink-0 sm:h-16 sm:w-16"
            : "h-9 w-9 shrink-0"
        }
      >
        <rect width="54" height="54" rx="10" fill="#8b1e14" />
        <rect
          x="2"
          y="2"
          width="50"
          height="50"
          rx="8"
          fill="none"
          stroke="#d19b2f"
          strokeWidth="2.5"
        />
        <rect x="9" y="9" width="36" height="36" rx="2" fill="#f8fafc" />
        <rect x="12" y="12" width="14" height="14" rx="1" fill="#8b1e14" />
        <rect x="28" y="12" width="14" height="14" rx="1" fill="#8b1e14" />
        <rect x="12" y="28" width="14" height="14" rx="1" fill="#8b1e14" />
        <rect x="28" y="28" width="14" height="14" rx="1" fill="#8b1e14" />
        <rect x="25" y="6" width="4" height="3" fill="#d19b2f" />
        <rect x="25" y="45" width="4" height="3" fill="#d19b2f" />
        <line
          x1="27"
          y1="9"
          x2="27"
          y2="45"
          stroke="#d19b2f"
          strokeWidth="2.5"
        />
        <line
          x1="13"
          y1="27"
          x2="41"
          y2="27"
          stroke="#f8fafc"
          strokeWidth="2.5"
        />
        <polygon points="12,27 16,24 16,30" fill="#f8fafc" />
        <polygon points="42,27 38,24 38,30" fill="#f8fafc" />
        <circle
          cx="27"
          cy="27"
          r="4.5"
          fill="#d19b2f"
          stroke="#1e293b"
          strokeWidth="1"
        />
      </svg>

      <div className="flex flex-col">
        <p
          className={`font-extrabold tracking-tight text-foreground ${
            isHero ? "text-3xl sm:text-4xl" : "text-lg"
          }`}
        >
          Deva
          <span style={{ color: "#d19b2f" }}>fusion</span>
          <span
            style={{ color: "#8b1e14" }}
            className={isHero ? "text-2xl sm:text-3xl" : "text-base"}
          >
            .net
          </span>
        </p>

        {isHero ? (
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.22em] text-muted sm:text-xs">
            To Develop a Fusion of Technologies
          </p>
        ) : null}
      </div>
    </div>
  );
}
