# Selection of relational database engine: Azure Database for PostgreSQL (Flexible Server, Burstable B1ms)

Devafusion requires persistent storage for the first time in the project's
history: social-auth identity payloads (OAuth provider profile data) and
contact-form submissions, with a possible future migration path for the
currently file-based engineering log. The chosen engine is **Azure Database
for PostgreSQL — Flexible Server**, provisioned on the **Burstable B1ms**
compute tier at launch (~£14–17/month all-in: compute + storage + backup).

## Status
Accepted

## Rationale
- **JSONB support** natively fits variable-shape OAuth/social-auth provider
  payloads without forcing a rigid per-provider schema, while keeping the
  rest of the schema (users, sessions, contact submissions) fully
  relational.
- **Ecosystem fit**: Prisma, Drizzle, and NextAuth/Auth.js all treat
  PostgreSQL as their primary first-class target in the Next.js ecosystem.
- **Vendor freedom**: standard wire-protocol PostgreSQL is portable to any
  other PostgreSQL host (AWS RDS, GCP Cloud SQL, Neon, Supabase,
  self-hosted) via `pg_dump`/`pg_restore`, unlike Azure SQL's proprietary
  T-SQL surface or Cosmos DB's Azure-specific RU billing and partition-key
  model.
- **Flexible Server over Single Server**: Single Server is deprecated by
  Microsoft; Flexible Server is the only currently-supported tier.
- **Flexible Server over Hyperscale (Citus)**: this application has no
  sharding or massive-analytical-scale requirement today; Hyperscale would
  be speculative over-engineering.
- **Cost proportionality**: Burstable B1ms is proportionate to current
  traffic and mirrors the modest sizing already chosen for the App Service
  Plan (ADR-0001). A documented upgrade path (B1ms → B2s → General Purpose)
  exists via a single Terraform SKU variable change, with zero
  re-architecture.
- **Compute billing does not scale with load**: Burstable bills at a fixed
  hourly rate regardless of query volume and does not autoscale under
  sustained load — instead, exhausting CPU credits degrades performance
  (connection timeouts, restricted baseline CPU) rather than inflating the
  bill. A connection-flood/DoS event is a reliability risk on this tier,
  not a cost-overrun risk.

## Considered Options
- **Azure SQL Database** — rejected: weaker native JSON support,
  proprietary T-SQL creates vendor lock-in, smaller mind-share in the
  Next.js/Prisma ecosystem.
- **Cosmos DB** — rejected: RU-based billing is difficult to project at
  this app's traffic level, and adopting it would split the schema across
  two consistency models (relational + document) for no concrete benefit
  at current scale.
- **Azure Database for PostgreSQL — Single Server** — rejected: deprecated
  by Microsoft.
- **Azure Database for PostgreSQL — Hyperscale (Citus)** — rejected:
  solves a distributed-scale problem this application does not have.

## Consequences
- **Fabric Mirroring is not possible on Burstable.** Microsoft's own
  documentation states plainly: "The source Azure Database for PostgreSQL
  flexible server can be either a General Purpose or Memory Optimized
  compute tier. Burstable compute tier is not supported as source for
  mirroring." This is a hard platform restriction, not a configuration
  gap — there is no workaround on B1ms. Any Fabric Mirroring (zero-ETL
  OneLake replication) must target a dedicated read replica provisioned at
  General Purpose tier, to be addressed in a future analytical-mirroring
  slice, never the Burstable OLTP primary.
- **Direct query access from Power BI, Synapse, and Databricks is fully
  supported on Burstable B1ms today** — these tools connect via a standard
  JDBC/native PostgreSQL connector with no tier restriction, unlike Fabric
  Mirroring specifically. Sustained heavy analytical query load against
  B1ms will degrade performance under its CPU-credit model, so heavy BI
  workloads should still be isolated onto a replica once traffic
  justifies it.
- **A cost circuit breaker is required as a deliberate operational safety
  net**, independent of the tier's billing model: an Azure Budget on the
  resource group (e.g. £30/month threshold) wired through an Action Group
  to an Azure Automation Runbook that stops the Flexible Server at the
  100% threshold. This does not protect against a cost overrun that
  cannot actually occur from load alone (see Rationale), but it protects
  against a human or automation error that scales the tier up, and is
  cheap to provision (Automation/Action Groups are within Azure's free
  tier at this usage volume).
- **Public network access must be firewall-restricted** to the App
  Service's known outbound IP and named admin IPs from day one —
  "Allow public access from any Azure service" must never be enabled, per
  Microsoft's own documented warning that it permits connections from
  other customers' subscriptions. Full Private Endpoint isolation is
  deferred to a future networking-hardening slice.
- The database admin credential is provisioned as a Key Vault secret
  value (manual step, per ADR-0004) and consumed via
  `data "azurerm_key_vault_secret"` — Terraform will never write the
  secret value itself.
- A code-first migration tool (Prisma vs. alternatives) must be selected
  before any schema is created — this is a separate, not-yet-decided
  slice.
- GDPR "right to be forgotten" handling for any PII stored in this
  database must be designed before real user data is written, not
  retrofitted afterward — this is a separate, not-yet-decided slice.

## Related
- ADR-0001 (App Service Plan sizing precedent)
- ADR-0004 (Key Vault secret provisioning boundary)
- `infrastructure/AGENTS.md` §PostgreSQL (pre-existing placeholder rule)
