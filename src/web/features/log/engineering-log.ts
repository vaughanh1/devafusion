import { entry as projectInceptionAndArchitecture } from "./entries/project-inception-and-architecture";
import { entry as separateWebAndInfrastructureDeployments } from "./entries/separate-web-and-infrastructure-deployments";
import { entry as seoAndAccessibleNavigation } from "./entries/seo-and-accessible-navigation";
import { entry as keyVaultBackedGoogleSearchVerification } from "./entries/key-vault-backed-google-search-verification";
import { entry as codifyingEngineeringStandardsAndSecretScanning } from "./entries/codifying-engineering-standards-and-secret-scanning";
import { entry as ga4AnalyticsWithConsentMode } from "./entries/ga4-analytics-with-consent-mode";
import { entry as keyvaultSecretPurgeIncident } from "./entries/keyvault-secret-purge-incident";
import { entry as appServiceHealthCheck } from "./entries/app-service-health-check";
import { entry as agentsHubAndSpokeRefactor } from "./entries/agents-hub-and-spoke-refactor";
import { entry as pipelineNamingConsistency } from "./entries/pipeline-naming-consistency";
import { entry as accessibilityThemeEngine } from "./entries/accessibility-theme-engine";
import { entry as qaAutomationFramework } from "./entries/qa-automation-framework";
import { entry as devafusionCoUkDomainAndCanonicalFlip } from "./entries/devafusion-co-uk-domain-and-canonical-flip";
import { entry as splitEngineeringLogPerEntry } from "./entries/split-engineering-log-per-entry";
import { entry as coUkDomainPrivacyNotSupported } from "./entries/co-uk-domain-privacy-not-supported";
import { entry as devafusionComEmailAuthentication } from "./entries/devafusion-com-email-authentication";
import { entry as devafusionComSpfTxtRecordsetConflict } from "./entries/devafusion-com-spf-txt-recordset-conflict";
import { entry as devafusionBrandIconsAndManifest } from "./entries/devafusion-brand-icons-and-manifest";
import { entry as devafusionBrandMarkStrokeWidthSync } from "./entries/devafusion-brand-mark-stroke-width-sync";
import { entry as devafusionAboutContactSeoPresence } from "./entries/devafusion-about-contact-seo-presence";
import { entry as aboutAndFooterUxCleanup } from "./entries/about-and-footer-ux-cleanup";
import { entry as postgresqlFlexibleServerProvisioning } from "./entries/postgresql-flexible-server-provisioning";
import { entry as postgresqlFirstRolloutBlockers } from "./entries/postgresql-first-rollout-blockers";
import { entry as postgresqlCostCircuitBreaker } from "./entries/postgresql-cost-circuit-breaker";
import { entry as postgresqlZoneDriftAndAutomationProvider } from "./entries/postgresql-zone-drift-and-automation-provider";
import { entry as automationWebhookExpiryTime } from "./entries/automation-webhook-expiry-time";
import { entry as automationWebhookExpiryActualCeiling } from "./entries/automation-webhook-expiry-actual-ceiling";
import { entry as drizzleOrmToolingSetup } from "./entries/drizzle-orm-tooling-setup";
import { entry as localPostgresMigrationTesting } from "./entries/local-postgres-migration-testing";
import { entry as betterAuthIdentityAndSelfHostedMfa } from "./entries/better-auth-identity-and-self-hosted-mfa";
import { entry as cdMigrationPipeline } from "./entries/cd-migration-pipeline";
import { entry as registrationAndLoginUi } from "./entries/registration-and-login-ui";
import { entry as blueskySocialLink } from "./entries/bluesky-social-link";
import { entry as clientLevelAuthHardening } from "./entries/client-level-auth-hardening";
import { entry as turnstileBuildTimeKeyAndCspFix } from "./entries/turnstile-build-time-key-and-csp-fix";
import { entry as ga4BuildTimeIdFix } from "./entries/ga4-build-time-id-fix";
import { entry as buttonCursorConsistency } from "./entries/button-cursor-consistency";
import { entry as turnstileFirstUseAndUxPolish } from "./entries/turnstile-first-use-and-ux-polish";
import { entry as a11yLighthouseAudits } from "./entries/a11y-lighthouse-audits";
import { entry as lighthouseHtmlReportTabs } from "./entries/lighthouse-html-report-tabs";
import { entry as lighthouseCiFindingsTriage } from "./entries/lighthouse-ci-findings-triage";
import { entry as selfHostedMfaMatrix } from "./entries/self-hosted-mfa-matrix";
import { entry as mfaMatrixFrontendAndAccessibility } from "./entries/mfa-matrix-frontend-and-accessibility";
import { entry as mfaEmailSenderAndCopyFixes } from "./entries/mfa-email-sender-and-copy-fixes";
import { entry as mfaRouteAndCryptoTestCoverage } from "./entries/mfa-route-and-crypto-test-coverage";
import { entry as mfaE2eVerificationAndDnsHardening } from "./entries/mfa-e2e-verification-and-dns-hardening";
import { entry as mfaCiSandboxAndDeletionHandlerCoverage } from "./entries/mfa-ci-sandbox-and-deletion-handler-coverage";
import { entry as ciFmtCheckDirectoryMismatch } from "./entries/ci-fmt-check-directory-mismatch";
import { entry as cspDevModeUnsafeEval } from "./entries/csp-dev-mode-unsafe-eval";
import { entry as acsDnsRootApexAndSenderImport } from "./entries/acs-dns-root-apex-and-sender-import";
import { entry as autoLocalPostgresOnDev } from "./entries/auto-local-postgres-on-dev";
import { entry as mfaTrustedDevicesIssuerAndReenrol } from "./entries/mfa-trusted-devices-issuer-and-reenrol";
import { entry as enforceEmailVerification } from "./entries/enforce-email-verification";
import { entry as formErrorAriaInvalid } from "./entries/form-error-aria-invalid";
import { entry as keyboardOnlyNavigationE2e } from "./entries/keyboard-only-navigation-e2e";
import { entry as touchTargetAndContrastAudit } from "./entries/touch-target-and-contrast-audit";
import { entry as accessibilityChecklistToolingGaps } from "./entries/accessibility-checklist-tooling-gaps";
import { entry as accessibilityTargetWcag22 } from "./entries/accessibility-target-wcag-2-2";

export type { LogEntry } from "./types";

// Each entry lives in its own file under features/log/entries/ specifically
// so two concurrent branches each add a new file instead of both appending
// to the tail of one shared array - see the devafusion-co-uk-domain log
// entry for the merge conflict this replaced.
const allEntries = [
  projectInceptionAndArchitecture,
  separateWebAndInfrastructureDeployments,
  seoAndAccessibleNavigation,
  keyVaultBackedGoogleSearchVerification,
  codifyingEngineeringStandardsAndSecretScanning,
  ga4AnalyticsWithConsentMode,
  keyvaultSecretPurgeIncident,
  appServiceHealthCheck,
  agentsHubAndSpokeRefactor,
  pipelineNamingConsistency,
  accessibilityThemeEngine,
  qaAutomationFramework,
  devafusionCoUkDomainAndCanonicalFlip,
  splitEngineeringLogPerEntry,
  coUkDomainPrivacyNotSupported,
  devafusionComEmailAuthentication,
  devafusionComSpfTxtRecordsetConflict,
  devafusionBrandIconsAndManifest,
  devafusionBrandMarkStrokeWidthSync,
  devafusionAboutContactSeoPresence,
  aboutAndFooterUxCleanup,
  postgresqlFlexibleServerProvisioning,
  postgresqlFirstRolloutBlockers,
  postgresqlCostCircuitBreaker,
  postgresqlZoneDriftAndAutomationProvider,
  automationWebhookExpiryTime,
  automationWebhookExpiryActualCeiling,
  drizzleOrmToolingSetup,
  localPostgresMigrationTesting,
  betterAuthIdentityAndSelfHostedMfa,
  cdMigrationPipeline,
  registrationAndLoginUi,
  blueskySocialLink,
  clientLevelAuthHardening,
  turnstileBuildTimeKeyAndCspFix,
  ga4BuildTimeIdFix,
  buttonCursorConsistency,
  turnstileFirstUseAndUxPolish,
  a11yLighthouseAudits,
  lighthouseHtmlReportTabs,
  lighthouseCiFindingsTriage,
  selfHostedMfaMatrix,
  mfaMatrixFrontendAndAccessibility,
  mfaEmailSenderAndCopyFixes,
  mfaRouteAndCryptoTestCoverage,
  mfaE2eVerificationAndDnsHardening,
  mfaCiSandboxAndDeletionHandlerCoverage,
  ciFmtCheckDirectoryMismatch,
  cspDevModeUnsafeEval,
  acsDnsRootApexAndSenderImport,
  autoLocalPostgresOnDev,
  mfaTrustedDevicesIssuerAndReenrol,
  enforceEmailVerification,
  formErrorAriaInvalid,
  keyboardOnlyNavigationE2e,
  touchTargetAndContrastAudit,
  accessibilityChecklistToolingGaps,
  accessibilityTargetWcag22,
];

export const engineeringLog = [...allEntries].sort((a, b) =>
  a.date < b.date ? -1 : a.date > b.date ? 1 : 0,
);

export function getLogEntry(slug: string) {
  return engineeringLog.find((entry) => entry.slug === slug);
}
