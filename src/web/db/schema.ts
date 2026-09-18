// No "server-only" guard here deliberately: drizzle-kit's CLI (generate/
// migrate) requires this file directly via plain Node, outside Next.js's
// bundler, so it never resolves the "react-server" export condition and
// would hit server-only's hard throw unconditionally (found by actually
// running `drizzle-kit generate` - it failed outright). The real leak
// risk this guards against - a client component importing a
// drizzle-zod-derived schema - is already covered at that narrower entry
// point instead: see the "server-only" import in
// features/log/schema/log-entries.zod.ts, which fires before this file
// is ever reached in that import chain.
import { relations, sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  customType,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import {
  decryptColumnValue,
  encryptColumnValue,
} from "@/features/auth/mfa/encrypted-column-cipher";

// Postgres's citext type has no native Drizzle column helper - defined
// as a customType per Drizzle's own documented pattern. Requires the
// citext extension to be allowlisted via azure.extensions on the live
// server (infrastructure/app/modules/postgresql) before any migration
// using it can run against a real (non-local) Postgres - see
// docs/adr/0012 Consequences.
const citext = customType<{ data: string }>({
  dataType() {
    return "citext";
  },
});

// Field-level, transparent envelope encryption for any column holding a
// credential-equivalent secret (MFA matrix slice) - the customType's
// toDriver/fromDriver hooks call features/auth/mfa/encrypted-column-
// cipher.ts on every write/read, so callers (repositories, routes)
// pass and receive plaintext, exactly like a plain text() column, and
// Postgres itself only ever stores ivHex:authTagHex:ciphertextHex.
// Supersedes the previous manual encryptTwoFactorSecret/
// decryptTwoFactorSecret call pattern (features/auth/mfa/two-factor-
// secret-cipher.ts, now removed) - that module required every caller
// to remember to encrypt before insert and decrypt after select, an
// easy step to forget; a customType makes the boundary structural
// instead of conventional. This is a schema-shape change (dot-
// delimited base64 -> colon-delimited hex), captured in this slice's
// migration, not a live data-preserving rename - see this slice's ADR
// addendum for the accepted one-time re-enrolment consequence for any
// account that had already enabled TOTP before this change (none did,
// per this project's own live user count at the time of writing).
const encryptedSecretText = customType<{ data: string; driverData: string }>({
  dataType() {
    return "text";
  },
  toDriver(value: string): string {
    return encryptColumnValue(value);
  },
  fromDriver(value: string): string {
    return decryptColumnValue(value);
  },
});

// UK GDPR Article 25 (data protection by design): a fixed, closed set
// of re-challenge frequencies rather than a free-text column - 'always'
// is the default in user_security.mfa_frequency below, so a new row
// never silently trusts a device without an explicit opt-in.
export const mfaFrequencyEnum = pgEnum("mfa_frequency", ["always", "30_days"]);

// Column shape mirrors src/web/features/log/types.ts's LogEntry exactly -
// this table is the eventual replacement for the static entries/*.ts
// files, not a new, separate concept. decisions/milestones/validation
// stay text[] (Postgres native array) rather than a normalized child
// table, since they are always read/written as a whole ordered list and
// never queried or filtered by individual item - a join table here would
// be exactly the kind of speculative normalization YAGNI warns against.
// Better Auth's core identity tables, generated verbatim via its own
// CLI (`npx auth@latest generate --adapter drizzle --dialect
// postgresql`) against this project's real db/client.ts, then hand-
// merged into this shared schema file - never hand-edit these column
// definitions; regenerate and diff instead (docs/adr/0012). The email
// column is switched from Better Auth's default `text` to `citext` so
// lookups are case-insensitive at the database level without a
// per-query LOWER() on both sides - a deliberate, documented deviation
// from the generator's raw output.
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: citext("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

// Better Auth's own rate-limiter table (docs/adr/0014), CLI-generated
// verbatim (`npx auth@latest generate`) - do not hand-edit these column
// definitions, same discipline as the identity tables above. Storing
// rate-limit counters here (rather than in-memory) is deliberate: this
// app has no WAF/Front Door, so the app's own rate limiter is the only
// throttling layer, and an in-memory counter would silently reset on
// every restart/redeploy of this single-instance App Service. Rows are
// pruned by a scheduled Azure Automation runbook (infrastructure/app/
// modules/cost-circuit-breaker's sibling pattern) rather than left to
// grow unbounded, since Better Auth itself only opportunistically
// deletes expired rows as a side effect of a fresh request landing on
// the same key, not on a schedule.
export const rateLimit = pgTable("rate_limit", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

// Self-built MFA matrix table (docs/adr/0012, extended for the MFA
// matrix slice) - deliberately not Better Auth's own `twoFactor`
// plugin, which stores its primary TOTP seed as plain text with no
// read-side decrypt hook available. two_factor_secret is the
// encryptedSecretText customType (transparent AES-256-GCM at the
// column boundary - see encrypted-column-cipher.ts above) - Postgres
// itself never holds a recoverable plaintext seed, and every caller
// (repositories, routes) reads/writes plain text with zero manual
// encrypt/decrypt calls. One-to-one with user, cascade-deleted with it
// for GDPR "right to be forgotten".
//
// required_factors defaults to ['password', 'totp'] (UK GDPR Article
// 25, data protection by design/default) - a brand-new user row
// always demands the strongest available factor set until a user
// deliberately weakens it via the settings dashboard, never the
// reverse. text[] rather than a normalized child table: this project
// already established that pattern for decisions/milestones/
// validation in features/log's LogEntry shape - the array is always
// read/written as a whole ordered sequence, never filtered by
// individual element.
export const userSecurity = pgTable("user_security", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  requiredFactors: text("required_factors")
    .array()
    .notNull()
    .default(sql`ARRAY['password', 'totp']::text[]`),
  mfaFrequency: mfaFrequencyEnum("mfa_frequency").default("always").notNull(),
  twoFactorSecret: encryptedSecretText("two_factor_secret"),
  twoFactorEnabled: boolean("two_factor_enabled").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const userSecurityRelations = relations(userSecurity, ({ one, many }) => ({
  user: one(user, {
    fields: [userSecurity.userId],
    references: [user.id],
  }),
  backupCodes: many(backupCodes),
  trustedDevices: many(trustedDevices),
}));

// UK GDPR Article 32 (availability/resilience of processing) - one-time
// recovery codes for when a user has lost their TOTP device. Hashed,
// never stored in plaintext or reversibly encrypted (there is no
// legitimate need to ever read a backup code back out - only to
// compare a hash), burned individually via used_at rather than deleted
// on use, so a user's remaining-code count can be reported (see the
// SAR export handler) without ever exposing the codes themselves.
export const backupCodes = pgTable(
  "backup_codes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => userSecurity.userId, { onDelete: "cascade" }),
    hashedCode: text("hashed_code").notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("backup_codes_userId_idx").on(table.userId)],
);

export const backupCodesRelations = relations(backupCodes, ({ one }) => ({
  userSecurity: one(userSecurity, {
    fields: [backupCodes.userId],
    references: [userSecurity.userId],
  }),
}));

// UK PECR compliance (docs/adr's MFA-matrix slice): zero hardware
// fingerprinting or device-hash tracking - id is a high-entropy,
// server-generated opaque lookup token (crypto.randomBytes-derived,
// never derived from any client-supplied device signal), carried by
// the client purely as an httpOnly cookie value. device_label is a
// human-supplied/derived display string only ("Chrome on Windows"),
// never a persistent cross-site identifier. expires_at enforces an
// absolute 30-day ceiling matching mfa_frequency's '30_days' option -
// a device is never trusted indefinitely.
export const trustedDevices = pgTable(
  "trusted_devices",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => userSecurity.userId, { onDelete: "cascade" }),
    deviceLabel: text("device_label").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("trusted_devices_userId_idx").on(table.userId)],
);

export const trustedDevicesRelations = relations(trustedDevices, ({ one }) => ({
  userSecurity: one(userSecurity, {
    fields: [trustedDevices.userId],
    references: [userSecurity.userId],
  }),
}));

// UK GDPR Article 32 accountability trail for security-relevant
// changes to a user's own MFA configuration (enrolment, factor
// changes, deletion cascade). performed_by is usually the same as
// user_id (self-service) but stays a separate column so a future
// admin-initiated action (not built in this slice) has somewhere to
// record a different actor without a schema change. Deliberately not
// foreign-keyed to user.id/user_security.userId with onDelete cascade
// - the audit trail for a deleted account's own deletion event must
// survive that account's own row being removed, or the log of the
// deletion would itself vanish with the thing it is recording.
export const authAuditLogs = pgTable(
  "auth_audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(),
    action: text("action").notNull(),
    performedBy: text("performed_by").notNull(),
    timestamp: timestamp("timestamp", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("auth_audit_logs_userId_idx").on(table.userId)],
);

// log_entries (the engineering-log table from ADR-0011) is deliberately
// NOT defined here right now. Its real consumer - a role-gated
// visibility feature reading it via this identity layer - is blocked on
// product decisions that were still open when this slice was built, so
// migrating it to the live server alongside these identity tables would
// have shipped a speculative table with no confirmed shape. The three
// files that depended on it (DrizzleLogEntryRepository, its test, and
// log-entries.zod.ts) are removed alongside it, not left dangling -
// restore all four together (this table plus those three files) from
// git history once the visibility feature is actually being built; see
// docs/adr/0012's Consequences section.

