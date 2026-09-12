// Shared JSX for the app/opengraph-image.tsx and app/twitter-image.tsx
// ImageResponse routes. Mirrors the Fortress Crossroads badge geometry in
// app/icon.svg - keep both in sync if the badge is revised.
export function BrandSocialImage() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#05070b",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 40,
        }}
      >
        <svg width="160" height="160" viewBox="0 0 54 54">
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
            strokeWidth="2.0"
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
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 96,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              display: "flex",
            }}
          >
            <span style={{ color: "#f8fafc" }}>Deva</span>
            <span style={{ color: "#d19b2f" }}>fusion</span>
            <span style={{ color: "#8b1e14" }}>.net</span>
          </div>
          <div
            style={{
              fontSize: 24,
              textTransform: "uppercase",
              letterSpacing: "0.22em",
              color: "#64748b",
              fontWeight: 700,
              marginTop: 12,
            }}
          >
            To Develop a Fusion of Technologies
          </div>
        </div>
      </div>
    </div>
  );
}
