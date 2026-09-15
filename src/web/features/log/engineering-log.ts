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
];

export const engineeringLog = [...allEntries].sort((a, b) =>
  a.date < b.date ? -1 : a.date > b.date ? 1 : 0,
);

export function getLogEntry(slug: string) {
  return engineeringLog.find((entry) => entry.slug === slug);
}
