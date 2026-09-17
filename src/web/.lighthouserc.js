// Lighthouse CI configuration - runs against this app's own built
// output/standalone server (output: "standalone", src/web/AGENTS.md),
// the same server pipelines/ci/web.yml's other jobs and
// playwright.config.ts's webServer already boot via `npm run start`.
//
// URL scope deliberately excludes /sign-up and /log-in: those pages
// mount TurnstileWidget, which loads a third-party script from
// challenges.cloudflare.com - noisy, network-variable, and reflects
// Cloudflare's performance, not this app's. Structural correctness on
// those two pages is instead covered by the axe-core a11y spec
// (tests-e2e/accessibility.spec.ts), which doesn't care about load
// timing. Performance/best-practices/SEO here are audited on the
// pages that are actually representative of this app's own content
// weight: home, projects, and the engineering log.
//
// Thresholds: accessibility/best-practices/SEO are hard error gates -
// these are near-deterministic structural checks (missing alt text,
// invalid meta tags, insecure links) with no legitimate reason to
// regress. performance is deliberately `warn`, not `error`, for now -
// the live site already has known, pre-existing Lighthouse
// performance findings that have not yet been triaged/fixed; setting
// performance to `error` today would make every PR red from day one
// regardless of whether it touches performance at all, training
// reviewers to ignore the gate. Promote performance to `error` in a
// follow-up PR once the live site's existing findings are resolved -
// do not let it silently stay `warn` forever.
module.exports = {
  ci: {
    collect: {
      startServerCommand: "npm run start",
      startServerReadyPattern: "Ready in",
      url: [
        "http://127.0.0.1:3000/",
        "http://127.0.0.1:3000/projects",
        "http://127.0.0.1:3000/log",
      ],
      numberOfRuns: 3,
      settings: {
        // Matches the headless, single-agent CI environment this runs
        // in (pipelines/ci/web.yml's LighthouseCI job) - no GPU, no
        // real network throttling variance from a shared runner.
        chromeFlags: "--headless --no-sandbox",
      },
    },
    assert: {
      assertions: {
        "categories:accessibility": ["error", { minScore: 0.95 }],
        "categories:best-practices": ["error", { minScore: 0.9 }],
        "categories:seo": ["error", { minScore: 0.9 }],
        "categories:performance": ["warn", { minScore: 0.8 }],
      },
    },
    upload: {
      // filesystem, not temporary-public-storage - the latter uploads
      // this app's audit JSON (including page content signals) to a
      // public Google-hosted URL. This repo already treats visitor/
      // data privacy as a first-class concern (docs/gdpr/0001, the
      // UK GDPR transparency notices on /sign-up and /log-in) -
      // keeping audit artifacts inside this pipeline's own storage,
      // published via the existing PublishPipelineArtifact@1 pattern
      // (pipelines/ci/web.yml), is consistent with that.
      target: "filesystem",
      outputDir: "./.lighthouseci",
    },
  },
};
