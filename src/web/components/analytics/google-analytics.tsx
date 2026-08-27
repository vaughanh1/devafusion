import { GoogleAnalytics as NextGoogleAnalytics } from "@next/third-parties/google";

export function GoogleAnalytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  if (!gaId) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "NEXT_PUBLIC_GA_ID is not set. Google Analytics is disabled.",
      );
    }
    return null;
  }

  return <NextGoogleAnalytics gaId={gaId} />;
}
