# Terraform for infrastructure management

All Azure resources are managed with Terraform from the project's outset,
rather than manual Azure Portal changes, so infrastructure is reviewable,
repeatable, and separated from application code. This is a hard,
zero-exceptions rule (`infrastructure/AGENTS.md`): no manual portal changes
are permitted, and every value is either a Terraform variable, a local, or a
resource attribute reference — never a second hardcoded literal.

## Status
Accepted

## Considered Options
- Manual Azure Portal configuration — rejected outright; produces
  undocumented, unreviewable, non-reproducible infrastructure with no audit
  trail and no way to safely tear down and rebuild an environment.
- ARM/Bicep templates — rejected in favour of Terraform's broader
  multi-cloud-portable HCL ecosystem and its more mature state-management
  model, keeping future vendor flexibility open even though the project is
  Azure-only today.

## Consequences
- Any resource created manually in the Portal that is not later imported
  into Terraform state becomes invisible drift and must be treated as a
  defect the moment it's discovered.
- `terraform state rm` / `moved` blocks are mandatory for resource address
  migrations (renames, resource-to-data-source conversions) — see the
  Key Vault secret purge incident (2026-08-27) for what happens when this
  is skipped.
