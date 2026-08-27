// Runs synchronously before hydration, ahead of any next/script tag,
// so Consent Mode v2 defaults are set before GA can read them.
// Window.dataLayer is already declared globally by @next/third-parties/google.
window.dataLayer = window.dataLayer || [];

function gtag(...args: unknown[]) {
  window.dataLayer?.push(args);
}

gtag("consent", "default", {
  analytics_storage: "denied",
  ad_storage: "denied",
  wait_for_update: 500,
});
