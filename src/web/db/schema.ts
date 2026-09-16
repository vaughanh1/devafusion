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
import { relations } from "drizzle-orm";
import {
  bigint,
  boolean,
  customType,
  index,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

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

// Self-built MFA table (docs/adr/0012) - deliberately not Better Auth's
// own `twoFactor` plugin, which stores its primary TOTP seed as plain
// text with no read-side decrypt hook available. two_factor_secret
// holds an application-layer envelope-encrypted value (see
// features/auth/mfa/two-factor-secret-cipher.ts) - Postgres itself
// never holds a recoverable plaintext seed. One-to-one with user,
// cascade-deleted with it for GDPR "right to be forgotten".
export const userSecurity = pgTable("user_security", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  twoFactorSecret: text("two_factor_secret"),
  twoFactorEnabled: boolean("two_factor_enabled").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const userSecurityRelations = relations(userSecurity, ({ one }) => ({
  user: one(user, {
    fields: [userSecurity.userId],
    references: [user.id],
  }),
}));

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

