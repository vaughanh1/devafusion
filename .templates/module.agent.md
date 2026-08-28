# 🧩 MODULE SPOKE TEMPLATE

This is a reusable **Spoke** template. It is not wired into the root
Hub's [Spoke Index](../AGENTS.md#spoke-index) and does not govern any
code by itself. To bring a new module (e.g. a future Auth module) under
governance:

1. Copy this file to `<module-root>/AGENTS.md` (e.g. `src/web/features/auth/AGENTS.md`, or a new top-level directory's own `AGENTS.md`).
2. Fill in every `<PLACEHOLDER>` below with the module's real specifics. Delete any section that does not apply to the module's stack (e.g. a frontend-only module has no Terraform section).
3. Add a line for the new spoke to the [Spoke Index](../AGENTS.md#spoke-index) in the root `AGENTS.md`.
4. Do not duplicate rules that already live in the root Hub (Persona, Git discipline, Pre-Flight Gate, PR pipeline, Universal Cross-Stack Standards) — this file only holds rules specific to `<MODULE_NAME>`.

---

# `<MODULE_NAME>` Module Rules

Governs: `<MODULE_ROOT_PATH>`

## Next.js / React Boundaries

- **Server/Client Separation:** `<Describe where this module's Server Components end and 'use client' boundaries begin — e.g. "Auth session reads are Server Components; the sign-in form and its client-side validation state are the only 'use client' boundary.">`
- **Do not over-nest client state:** `<Describe the module's state ownership — e.g. "Session state is read server-side per request; no client-side global auth store is permitted.">`
- **Typed Routes:** All `<Link href="...">` and `router.push()` calls within this module must resolve against `next.config.ts`'s `typedRoutes: true` — verify the target route exists in the file-system route tree before writing it.
- **Standalone Output Target:** This module must not introduce anything (a custom server entrypoint, an incompatible dependency) that breaks the root `next.config.ts`'s `output: 'standalone'` setting.

## TypeScript Strict Blocks

- The `any` type is forbidden anywhere in this module. Every prop, function signature, API payload, and state object has an explicit `interface` or `type`, declared above the component/function that uses it.
- `<Module-specific type contracts — e.g. "Session and User types are defined once in `<path>` and imported everywhere else in this module; do not redeclare shape-compatible duplicates.">`

## Data & Environment

- `<Describe this module's environment variables — which are server-only (no prefix) vs. NEXT_PUBLIC_, and what the runtime fallback behavior is if one is unset.>`
- `<Describe this module's database/migration touchpoints, if any — e.g. "Any change to the `<table>` shape requires a new migration file in `<path>` before the module code that depends on it.">`

## Cloud Infrastructure (if this module owns Terraform-managed resources)

- **No Repeated Literals:** Any value this module's Terraform introduces (a resource name, a SKU, a tag map) is defined once as a `variable`/`local`/resource attribute reference — never restated as a second hardcoded literal, with the sole exception of a `backend` block literal (a hard technical constraint, not a style choice).
- **Idempotency:** `<Module>`'s Terraform and any migration scripts must be safely re-runnable without side effects.
- **Secret Provisioning:** This module's secrets are created/rotated directly in Azure Key Vault; Terraform only reads them via `data "azurerm_key_vault_secret"` and wires them into resources. Terraform must never write a real secret value into state or a variable group for this module.
- **Resource Address Migrations:** If this module's Terraform ever converts a `resource` to a `data` source, renames a resource, or moves it between modules, that change ships with a `terraform state rm` or `moved` block in the same commit, and `terraform plan` is confirmed to show no destroy before merging.
- **Key Vault Purge Safety:** If this module provisions its own Key Vault, `features.key_vault.purge_soft_delete_on_destroy` must be explicitly `false`.
- **App Service Restart:** If this module deploys to an `azurerm_linux_web_app`, its CD pipeline step ends with `az webapp restart` (or, if this module uses deployment slots, an explicit `azurerm_app_service_slot_configuration_names` resource listing every sticky `app_setting_names`/`connection_string_names`).

## Module-Specific Validation

- `<List any validation this module needs beyond the root Hub's Pre-Flight Gate — e.g. a specific test suite, a contract test against an external API, a specific migration dry-run command.>`
