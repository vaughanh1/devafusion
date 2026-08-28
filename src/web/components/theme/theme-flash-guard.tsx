// Runs synchronously during HTML parsing, before first paint and before
// React hydrates — the framework-documented pattern for applying a
// cookie-backed preference without a server-side cookies() read (which
// would force the whole route tree dynamic) and without the flash a
// useEffect-based read would cause. See:
// node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md
//
// The script body is a fixed literal string, never built from
// interpolated or user-controlled input, per src/web/AGENTS.md's
// Accessibility Theme Engine section.
const THEME_FLASH_GUARD_SCRIPT = `(function(){try{
  var m1=document.cookie.match(/(?:^|; )devafusion-a11y-theme=([^;]*)/);
  if(m1)document.documentElement.setAttribute("data-a11y-theme",decodeURIComponent(m1[1]));
  var m2=document.cookie.match(/(?:^|; )devafusion-a11y-scale=([^;]*)/);
  if(m2)document.documentElement.setAttribute("data-a11y-scale",decodeURIComponent(m2[1]));
}catch(e){}})()`;

export function ThemeFlashGuard() {
  return (
    <script
      dangerouslySetInnerHTML={{ __html: THEME_FLASH_GUARD_SCRIPT }}
    />
  );
}
