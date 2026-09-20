import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Tech Stack",
  description:
    "Every real tool, framework, and Azure resource behind Devafusion, each with the actual production role it plays and a direct link to the dated ADR/engineering-log entry that decided it.",
  alternates: { canonical: "/tech-stack" },
  openGraph: {
    title: "Tech Stack - Devafusion",
    description:
      "The real tools and Azure resources behind Devafusion, with a direct link to the reasoning behind each.",
    url: "/tech-stack",
  },
};

const GITHUB_REPO = "https://github.com/vaughanh1/devafusion";
const GITHUB_ADR = (file: string) => `${GITHUB_REPO}/blob/develop/docs/adr/${file}`;

const linkClass =
  "underline decoration-muted underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground";

type DigDeeperProps = {
  // Not every real decision this project made has a dedicated ADR -
  // gitleaks, for example, is documented only in the engineering log
  // and root AGENTS.md, never its own ADR file. Omitting the ADR
  // link entirely for those entries is correct; inventing one or
  // pointing it at an unrelated file would be worse than no link.
  adr?: { number: string; file: string };
  logSlug: string;
};

// Every claim on this page traces to a real, dated source - this is
// the one shared component that makes that traceable in one click,
// rather than asking a reviewer to trust prose alone.
function DigDeeper({ adr, logSlug }: DigDeeperProps) {
  return (
    <p className="mt-3 text-sm text-muted">
      Dig deeper:{" "}
      {adr && (
        <>
          <a
            href={GITHUB_ADR(adr.file)}
            target="_blank"
            rel="noreferrer"
            className={linkClass}
          >
            ADR-{adr.number}
          </a>{" "}
          ·{" "}
        </>
      )}
      <Link href={`/log/${logSlug}`} className={linkClass}>
        engineering log
      </Link>
    </p>
  );
}

type GlanceRowProps = {
  name: string;
  verdict: string;
  anchor: string;
};

function GlanceRow({ name, verdict, anchor }: GlanceRowProps) {
  return (
    <li className="flex flex-col gap-1 border-b border-surface-border py-3 sm:flex-row sm:items-baseline sm:gap-4">
      <a
        href={`#${anchor}`}
        className={`min-w-48 shrink-0 font-medium text-foreground ${linkClass}`}
      >
        {name}
      </a>
      <span className="text-muted">{verdict}</span>
    </li>
  );
}

export default function TechStackPage() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-20">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted">
        Tech Stack
      </p>

      <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground">
        Every tool, one line each. Then the real reasoning.
      </h1>

      <p className="mt-6 text-lg leading-8 text-muted">
        Devafusion is a public proving ground for building to the highest
        standard we can hold ourselves to - every tool below is running in
        production today, chosen deliberately and revisited whenever a
        better option earns its place. Skim the verdicts in a minute; each
        one links straight to the dated ADR and{" "}
        <Link href="/log" className={linkClass}>
          engineering log
        </Link>{" "}
        entry that decided it, including what we rejected and why. Full
        commit history is public on{" "}
        <a
          href={GITHUB_REPO}
          target="_blank"
          rel="noreferrer"
          className={linkClass}
        >
          GitHub
        </a>
        .
      </p>

      <nav aria-label="Tech stack at a glance" className="mt-10">
        <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-muted">
          At a glance
        </h2>
        <ul className="mt-3">
          <GlanceRow
            name="Next.js"
            verdict="Server-first App Router, one Azure Linux App Service, no split hosting."
            anchor="nextjs"
          />
          <GlanceRow
            name="Terraform"
            verdict="Every Azure resource, zero manual Portal changes, ever."
            anchor="terraform"
          />
          <GlanceRow
            name="Drizzle ORM"
            verdict="Plain TypeScript schema behind a repository interface, not a second DSL."
            anchor="drizzle"
          />
          <GlanceRow
            name="PGlite"
            verdict="Real Postgres in-process for local dev/tests - no third-party vendor added."
            anchor="pglite"
          />
          <GlanceRow
            name="Better Auth + self-hosted TOTP"
            verdict="Session/OAuth core from Better Auth; MFA built in-house after its plugin's plaintext-secret gap was found."
            anchor="better-auth"
          />
          <GlanceRow
            name="Vitest + Playwright"
            verdict="Unit, E2E, and Docker-pinned visual regression - three tiers, one CI gate."
            anchor="testing"
          />
          <GlanceRow
            name="Cloudflare Turnstile"
            verdict="Bot protection in place of a WAF/CDN that cost more than the traffic justifies."
            anchor="turnstile"
          />
          <GlanceRow
            name="gitleaks"
            verdict="Official checksum-verified binary, scans every commit locally and again in CI."
            anchor="gitleaks"
          />
          <GlanceRow
            name="Azure App Service"
            verdict="Linux, B1, Verbose logging on - after a real 500 with zero server-side visibility."
            anchor="app-service"
          />
          <GlanceRow
            name="Azure PostgreSQL Flexible Server"
            verdict="Burstable B1ms - fixed hourly cost, degrades under load rather than overspending."
            anchor="postgresql"
          />
          <GlanceRow
            name="Azure Key Vault"
            verdict="Every runtime secret, access-policy model, soft-delete without purge."
            anchor="keyvault"
          />
          <GlanceRow
            name="Azure Communication Services"
            verdict="UK-hosted transactional email - replaced a US-storage vendor on GDPR grounds."
            anchor="acs"
          />
          <GlanceRow
            name="Azure DNS"
            verdict="Three zones, full SPF/DKIM/DMARC/verification record set, one real recordset-collision incident behind it."
            anchor="dns"
          />
          <GlanceRow
            name="Domain registration"
            verdict="Provisioned via azapi - no native azurerm resource type exists for this."
            anchor="domains"
          />
          <GlanceRow
            name="Cost circuit breaker"
            verdict="Budget → Action Group → Runbook, auto-stops Postgres at 100% spend. Free tier throughout."
            anchor="cost-circuit-breaker"
          />
          <GlanceRow
            name="Azure DevOps Pipelines"
            verdict="Separate web/infra CI+CD, manual approval gate on every database migration."
            anchor="pipelines"
          />
        </ul>
      </nav>

      <h2 className="mt-14 text-2xl font-semibold tracking-tight text-foreground">
        Application &amp; tooling
      </h2>

      <div className="mt-6 space-y-10">
        <article id="nextjs">
          <header>
            <h3 className="text-xl font-semibold text-foreground">
              Next.js (App Router)
            </h3>
          </header>
          <p className="mt-2 text-lg leading-8 text-muted">
            <strong className="text-foreground">Production context:</strong>{" "}
            The entire web application - every route, from the marketing
            pages through to authenticated account/MFA flows - runs on
            Next.js&apos;s App Router with server-first rendering, deployed as
            a standalone Node.js build.
          </p>
          <p className="mt-2 text-lg leading-8 text-muted">
            <strong className="text-foreground">The technical thesis:</strong>{" "}
            Route-level metadata and a server-first default were needed from
            day one, ruling out a static-export-only build once an
            interactive health-check endpoint and (later) full authentication
            were already on the roadmap. Hosting was kept on Azure Linux App
            Service rather than Vercel specifically to avoid splitting
            infrastructure across two providers when everything else already
            runs under one Terraform-managed Azure tenant.
          </p>
          <DigDeeper
            adr={{ number: "0001", file: "0001-nextjs-app-router-and-linux-app-service.md" }}
            logSlug="project-inception-and-architecture"
          />
        </article>

        <article id="terraform">
          <header>
            <h3 className="text-xl font-semibold text-foreground">
              Terraform
            </h3>
          </header>
          <p className="mt-2 text-lg leading-8 text-muted">
            <strong className="text-foreground">Production context:</strong>{" "}
            Every Azure resource this project runs - App Service, PostgreSQL,
            Key Vault, DNS, email, cost controls - is defined and applied
            through Terraform. Manual Azure Portal changes are a
            zero-exceptions rule, not a guideline.
          </p>
          <p className="mt-2 text-lg leading-8 text-muted">
            <strong className="text-foreground">The technical thesis:</strong>{" "}
            Chosen over ARM/Bicep for its broader, multi-cloud-portable HCL
            ecosystem and more mature state-management model - keeping future
            vendor flexibility open even though this project is Azure-only
            today. Manual Portal configuration was rejected outright: it
            produces undocumented, unreviewable, non-reproducible
            infrastructure with no audit trail.
          </p>
          <DigDeeper
            adr={{ number: "0002", file: "0002-terraform-for-infrastructure-management.md" }}
            logSlug="project-inception-and-architecture"
          />
        </article>
      </div>

      <div className="mt-10 space-y-10">
        <article id="drizzle">
          <header>
            <h3 className="text-xl font-semibold text-foreground">
              Drizzle ORM, drizzle-zod &amp; zod-to-openapi
            </h3>
          </header>
          <p className="mt-2 text-lg leading-8 text-muted">
            <strong className="text-foreground">Production context:</strong>{" "}
            Owns every schema definition and query against the PostgreSQL
            database - identity tables, MFA state, rate limiting - sitting
            behind a repository-pattern interface so no page or component
            ever imports Drizzle directly.
          </p>
          <p className="mt-2 text-lg leading-8 text-muted">
            <strong className="text-foreground">The technical thesis:</strong>{" "}
            Chosen over Prisma specifically for a plain TypeScript schema
            (<code>pgTable</code>) rather than a second DSL to keep in sync
            by hand, and because Prisma&apos;s own newest migration engine is
            self-described as &quot;early&quot; where Drizzle&apos;s is
            mature and stable. <code>drizzle-zod</code> generates Zod
            validation schemas directly from the table definition, so the
            database schema, runtime validation, and OpenAPI spec can never
            drift out of sync by hand.
          </p>
          <DigDeeper
            adr={{ number: "0011", file: "0011-drizzle-orm-and-repository-pattern.md" }}
            logSlug="drizzle-orm-tooling-setup"
          />
        </article>

        <article id="pglite">
          <header>
            <h3 className="text-xl font-semibold text-foreground">PGlite</h3>
          </header>
          <p className="mt-2 text-lg leading-8 text-muted">
            <strong className="text-foreground">Production context:</strong>{" "}
            Provides a real, in-process WASM PostgreSQL instance for local
            development and Vitest, with zero install step and zero
            production footprint.
          </p>
          <p className="mt-2 text-lg leading-8 text-muted">
            <strong className="text-foreground">The technical thesis:</strong>{" "}
            Neon was considered and explicitly rejected, even for throwaway
            schema testing - it would add a dependency on a second,
            unrelated third-party vendor&apos;s uptime, region, and free-tier
            terms for zero benefit over PGlite, while production data always
            stays in the Azure-hosted instance regardless.
          </p>
          <DigDeeper
            adr={{ number: "0011", file: "0011-drizzle-orm-and-repository-pattern.md" }}
            logSlug="drizzle-orm-tooling-setup"
          />
        </article>
      </div>

      <div className="mt-10 space-y-10">
        <article id="better-auth">
          <header>
            <h3 className="text-xl font-semibold text-foreground">
              Better Auth + a self-hosted TOTP layer
            </h3>
          </header>
          <p className="mt-2 text-lg leading-8 text-muted">
            <strong className="text-foreground">Production context:</strong>{" "}
            Owns session, credential, and OAuth core identity for every
            signed-in account. Multi-factor authentication is deliberately{" "}
            <em>not</em> handled by Better Auth&apos;s own plugin - it is
            self-built on top, using <code>otpauth</code> for RFC 4226/6238
            TOTP generation and verification.
          </p>
          <p className="mt-2 text-lg leading-8 text-muted">
            <strong className="text-foreground">The technical thesis:</strong>{" "}
            Better Auth was chosen over Auth.js (NextAuth) because Auth.js&apos;s
            own documentation now states it is part of Better Auth - starting
            fresh on Auth.js today would mean planning a near-immediate
            migration. Better Auth&apos;s own <code>twoFactor</code> plugin was
            evaluated and rejected on a specific, documented finding: its own
            schema stores the primary TOTP secret as plain text, with no
            symmetric read-side decrypt hook its internal verification
            endpoint could use - encrypting that column via a write hook
            alone would silently break verification, not secure it.
          </p>
          <DigDeeper
            adr={{
              number: "0012",
              file: "0012-better-auth-identity-and-self-hosted-mfa.md",
            }}
            logSlug="better-auth-identity-and-self-hosted-mfa"
          />
        </article>

        <article id="testing">
          <header>
            <h3 className="text-xl font-semibold text-foreground">
              Vitest + Playwright
            </h3>
          </header>
          <p className="mt-2 text-lg leading-8 text-muted">
            <strong className="text-foreground">Production context:</strong>{" "}
            A three-tier automated gate on every change: Vitest for unit and
            component tests, Playwright for end-to-end specs against a
            locally built standalone server, and a separate Playwright
            visual-regression suite that only ever runs inside the official,
            version-pinned <code>mcr.microsoft.com/playwright</code> Docker
            image.
          </p>
          <p className="mt-2 text-lg leading-8 text-muted">
            <strong className="text-foreground">The technical thesis:</strong>{" "}
            Running visual-regression screenshot assertions on the bare
            hosted CI agent (or a contributor&apos;s own OS) was rejected -
            font rendering differs across operating systems, producing
            false-positive diffs unrelated to any real regression. Chasing
            100% coverage as a hard gate was also rejected in favour of
            honest coverage of real business logic over a vanity percentage.
          </p>
          <DigDeeper
            adr={{ number: "0007", file: "0007-three-tier-testing-strategy.md" }}
            logSlug="qa-automation-framework"
          />
        </article>
      </div>

      <div className="mt-10 space-y-10">
        <article id="turnstile">
          <header>
            <h3 className="text-xl font-semibold text-foreground">
              Cloudflare Turnstile
            </h3>
          </header>
          <p className="mt-2 text-lg leading-8 text-muted">
            <strong className="text-foreground">Production context:</strong>{" "}
            Provides bot protection on sign-up, log-in, and password-reset -
            the only network-level (not header-derived) signal this project
            uses, deliberately in place of a paid Web Application Firewall
            or CDN.
          </p>
          <p className="mt-2 text-lg leading-8 text-muted">
            <strong className="text-foreground">The technical thesis:</strong>{" "}
            Azure Front Door Premium and Application Gateway both carry a
            real fixed monthly cost disproportionate to this project&apos;s
            current traffic. Higher-tier commercial bot-management products
            (Cloudflare Enterprise Bot Management, Akamai Bot Manager,
            DataDome) were named and considered, but rejected purely on
            cost/traffic-volume grounds, not technical suitability.
          </p>
          <DigDeeper
            adr={{ number: "0014", file: "0014-client-level-auth-hardening.md" }}
            logSlug="client-level-auth-hardening"
          />
        </article>

        <article id="gitleaks">
          <header>
            <h3 className="text-xl font-semibold text-foreground">
              gitleaks
            </h3>
          </header>
          <p className="mt-2 text-lg leading-8 text-muted">
            <strong className="text-foreground">Production context:</strong>{" "}
            Scans every commit for secrets locally (a Husky pre-commit hook)
            and again server-side against the full pushed history on every
            CI run, before anything else executes.
          </p>
          <p className="mt-2 text-lg leading-8 text-muted">
            <strong className="text-foreground">The technical thesis:</strong>{" "}
            Fetched as the official, checksum-verified release binary into a
            git-ignored local cache, never through an unofficial npm wrapper
            package - consistent with this project&apos;s standing rule to
            prefer a tool&apos;s own official distribution channel over a
            third-party repackaging of it.
          </p>
          <DigDeeper logSlug="codifying-engineering-standards-and-secret-scanning" />
        </article>
      </div>

      <h2 className="mt-14 text-2xl font-semibold tracking-tight text-foreground">
        Azure resources actually provisioned
      </h2>

      <p className="mt-4 text-lg leading-8 text-muted">
        Every resource below exists in this project&apos;s own Terraform
        state today - none are planned-but-unbuilt.
      </p>

      <div className="mt-6 space-y-10">
        <article id="app-service">
          <header>
            <h3 className="text-xl font-semibold text-foreground">
              Linux App Service + App Service Plan
            </h3>
          </header>
          <p className="mt-2 text-lg leading-8 text-muted">
            <strong className="text-foreground">Production context:</strong>{" "}
            Hosts the standalone Next.js server itself, on a B1 plan, with
            application logging deliberately set to its most permissive
            level (&quot;Verbose&quot;) so <code>console.error</code>/
            <code>console.log</code> output is actually captured to disk.
          </p>
          <p className="mt-2 text-lg leading-8 text-muted">
            <strong className="text-foreground">The technical thesis:</strong>{" "}
            Started on B1 as a proportionate, low-cost baseline, with
            capacity reviewed as usage grows - not a fixed ceiling. Logging
            was flipped on after a real 500 on a live MFA route left zero
            server-side visibility into what had actually failed.
          </p>
          <DigDeeper
            adr={{ number: "0001", file: "0001-nextjs-app-router-and-linux-app-service.md" }}
            logSlug="mandatory-mfa-setup-and-app-service-logging"
          />
        </article>

        <article id="postgresql">
          <header>
            <h3 className="text-xl font-semibold text-foreground">
              Azure Database for PostgreSQL - Flexible Server (Burstable
              B1ms)
            </h3>
          </header>
          <p className="mt-2 text-lg leading-8 text-muted">
            <strong className="text-foreground">Production context:</strong>{" "}
            The single relational store behind identity, MFA, and rate
            limiting, running PostgreSQL 16 with the <code>citext</code>{" "}
            extension explicitly allowlisted for case-insensitive email
            lookups.
          </p>
          <p className="mt-2 text-lg leading-8 text-muted">
            <strong className="text-foreground">The technical thesis:</strong>{" "}
            Chosen over Azure SQL Database and Cosmos DB for native JSONB
            support and standard wire-protocol portability. Burstable B1ms
            bills at a fixed hourly rate regardless of query volume - which
            is exactly why a separate Azure Budget circuit breaker exists as
            a safety net against human/automation error, not cost-from-load.
          </p>
          <DigDeeper
            adr={{
              number: "0010",
              file: "0010-relational-database-engine-selection.md",
            }}
            logSlug="postgresql-flexible-server-provisioning"
          />
        </article>

        <article id="keyvault">
          <header>
            <h3 className="text-xl font-semibold text-foreground">
              Azure Key Vault
            </h3>
          </header>
          <p className="mt-2 text-lg leading-8 text-muted">
            <strong className="text-foreground">Production context:</strong>{" "}
            Holds every runtime secret this project needs, read by the
            application and CI/CD pipelines at runtime - never written into
            a literal anywhere in code.
          </p>
          <p className="mt-2 text-lg leading-8 text-muted">
            <strong className="text-foreground">The technical thesis:</strong>{" "}
            Access-policy model (Get/List/Set/Delete, deliberately never
            Purge), soft-delete without purge protection - a resource
            removal always stays recoverable, rather than Terraform
            attempting an immediate hard purge the policy would reject.
          </p>
          <DigDeeper
            adr={{
              number: "0004",
              file: "0004-key-vault-secret-provisioning-boundary.md",
            }}
            logSlug="keyvault-secret-purge-incident"
          />
        </article>
      </div>

      <div className="mt-10 space-y-10">
        <article id="acs">
          <header>
            <h3 className="text-xl font-semibold text-foreground">
              Azure Communication Services (Email)
            </h3>
          </header>
          <p className="mt-2 text-lg leading-8 text-muted">
            <strong className="text-foreground">Production context:</strong>{" "}
            Sends every MFA one-time-code email and verification/reset link,
            from a custom-verified <code>noreply@devafusion.net</code>{" "}
            sender.
          </p>
          <p className="mt-2 text-lg leading-8 text-muted">
            <strong className="text-foreground">The technical thesis:</strong>{" "}
            Replaced an earlier Resend-based design rejected on UK GDPR
            data-sovereignty grounds - even Resend&apos;s nearest-to-UK
            region is a latency choice only, not a data-residency guarantee.
            Azure Communication Services&apos; <code>data_location</code>{" "}
            setting is a genuine Microsoft-documented resource-level
            guarantee, and it&apos;s a first-party service already inside
            this project&apos;s own tenant.
          </p>
          <DigDeeper
            adr={{ number: "0015", file: "0015-self-hosted-mfa-matrix.md" }}
            logSlug="mfa-email-sender-and-copy-fixes"
          />
        </article>

        <article id="dns">
          <header>
            <h3 className="text-xl font-semibold text-foreground">
              Azure DNS Zones (three domains, full record set)
            </h3>
          </header>
          <p className="mt-2 text-lg leading-8 text-muted">
            <strong className="text-foreground">Production context:</strong>{" "}
            Three Azure DNS zones (<code>.com</code>, <code>.net</code>,{" "}
            <code>.co.uk</code>) carry every A, MX, TXT, and CNAME record
            this project needs: domain verification, SPF/DKIM/DMARC for two
            independent mail flows, Google Search Console verification, and
            an <code>_atproto</code> record verifying this site&apos;s
            Bluesky handle.
          </p>
          <p className="mt-2 text-lg leading-8 text-muted">
            <strong className="text-foreground">The technical thesis:</strong>{" "}
            Azure DNS treats every TXT value at a given name as one
            recordset, not independent records - a real incident (a second,
            colliding TXT resource at the same name) established the
            standing rule that multiple TXT values at one name must share a
            single Terraform resource block.
          </p>
          <DigDeeper logSlug="devafusion-com-spf-txt-recordset-conflict" />
        </article>

        <article id="domains">
          <header>
            <h3 className="text-xl font-semibold text-foreground">
              Domain registration (via azapi)
            </h3>
          </header>
          <p className="mt-2 text-lg leading-8 text-muted">
            <strong className="text-foreground">Production context:</strong>{" "}
            Registers and auto-renews all three domains directly through
            Azure&apos;s domain-registration resource provider, with WHOIS
            privacy enabled where the registry supports it.
          </p>
          <p className="mt-2 text-lg leading-8 text-muted">
            <strong className="text-foreground">The technical thesis:</strong>{" "}
            Uses the <code>azapi</code> provider since domain registration
            has no first-class <code>azurerm</code> resource type. The{" "}
            <code>.co.uk</code> registration explicitly sets{" "}
            <code>privacy = false</code> - Nominet does not support WHOIS
            privacy at all, and the API rejects <code>true</code> for that
            TLD outright.
          </p>
          <DigDeeper logSlug="co-uk-domain-privacy-not-supported" />
        </article>
      </div>

      <div className="mt-10 space-y-10">
        <article id="cost-circuit-breaker">
          <header>
            <h3 className="text-xl font-semibold text-foreground">
              Cost circuit breaker (Automation Account, Runbook, Action
              Group, Budget)
            </h3>
          </header>
          <p className="mt-2 text-lg leading-8 text-muted">
            <strong className="text-foreground">Production context:</strong>{" "}
            An Azure Consumption Budget on the resource group warns by email
            at 80% of actual monthly spend and, at 100%, triggers an Action
            Group that invokes a PowerShell Runbook to stop the PostgreSQL
            Flexible Server outright.
          </p>
          <p className="mt-2 text-lg leading-8 text-muted">
            <strong className="text-foreground">The technical thesis:</strong>{" "}
            Every component here stays entirely within Azure&apos;s free
            tier. This does not protect against a cost overrun from load
            alone (Burstable compute bills at a fixed hourly rate, full
            stop) - it protects specifically against a human or automation
            error that scales the tier up.
          </p>
          <DigDeeper
            adr={{
              number: "0010",
              file: "0010-relational-database-engine-selection.md",
            }}
            logSlug="postgresql-cost-circuit-breaker"
          />
        </article>

        <article id="pipelines">
          <header>
            <h3 className="text-xl font-semibold text-foreground">
              Azure DevOps Pipelines (CI/CD)
            </h3>
          </header>
          <p className="mt-2 text-lg leading-8 text-muted">
            <strong className="text-foreground">Production context:</strong>{" "}
            Two entirely separate pipelines - web and infrastructure - so a
            change to one never blocks the other. The web CI pipeline runs
            a gitleaks scan first, then builds, then Vitest, Lighthouse CI,
            Playwright end-to-end, and the Docker-pinned visual-regression
            suite. A separate CD pipeline applies pending database
            migrations behind a manual approval gate before deploying.
          </p>
          <p className="mt-2 text-lg leading-8 text-muted">
            <strong className="text-foreground">The technical thesis:</strong>{" "}
            The migration step runs unconditionally on every CD run, not
            gated on a git-diff of changed files - that gate was considered
            and rejected, since comparing only against the immediately
            preceding commit permanently loses track of a pending migration
            if any single CD run is ever rejected, times out, or fails
            downstream. <code>drizzle-kit migrate</code> is idempotent, so a
            deploy with nothing pending just finds nothing to do.
          </p>
          <DigDeeper
            adr={{ number: "0003", file: "0003-separate-web-and-infrastructure-pipelines.md" }}
            logSlug="cd-migration-pipeline"
          />
        </article>
      </div>

      <div className="mt-14 border-t border-surface-border pt-10">
        {/*
          Reserved slot for a future "Donation Section" slice.
          Deliberately left as a structural placeholder rather than an
          empty <div> with no semantic meaning, so a future PR can drop a
          <section aria-labelledby="donate-heading"> in here without
          needing to re-plan this page's layout flow around it.
        */}
      </div>
    </section>
  );
}
