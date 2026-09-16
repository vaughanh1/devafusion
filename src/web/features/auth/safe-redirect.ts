// OWASP Unvalidated Redirects and Forwards Cheat Sheet: a "redirect back
// to what the user wanted" query param is a classic open-redirect
// vector unless the target is validated as a same-site relative path
// before use. Reject anything else and fall back to the caller's
// default rather than trusting the input.
//
// Deliberately rejects, not just "doesn't specially handle":
// - anything not starting with "/" (e.g. "evil.com", "https://evil.com")
// - "//" (protocol-relative URL - "//evil.com" is a valid same-scheme
//   redirect target in every browser, not a path)
// - any scheme before the first "/" (e.g. "javascript:alert(1)")
export function isSafeRedirectPath(
  value: string | null | undefined,
): value is string {
  if (!value) {
    return false;
  }

  if (!value.startsWith("/")) {
    return false;
  }

  if (value.startsWith("//")) {
    return false;
  }

  // A scheme (javascript:, https:, etc.) would need a ":" before any
  // "/" - startsWith("/") above already guarantees no such prefix, but
  // this second check catches a value like "/\tjavascript:alert(1)"
  // that some browsers still normalise into an executable target.
  if (/^\/\s*javascript:/i.test(value)) {
    return false;
  }

  return true;
}

// Resolves the redirect target from an untrusted searchParams value,
// falling back to fallbackPath when absent or unsafe. Centralised here
// so both the sign-up and log-in pages apply the identical rule rather
// than each re-implementing the check.
export function resolveSafeRedirectPath(
  value: string | string[] | undefined,
  fallbackPath = "/",
): string {
  const candidate = Array.isArray(value) ? value[0] : value;
  return isSafeRedirectPath(candidate) ? candidate : fallbackPath;
}
