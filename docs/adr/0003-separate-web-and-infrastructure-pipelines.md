# Separate CI/CD pipelines for web and infrastructure

Web application delivery and Terraform infrastructure delivery run through
two entirely separate CI/CD pipeline pairs (`devafusion-web-ci`/`-cd` and
`devafusion-infrastructure-ci`/`-cd`), so that a web-only code change never
requires a Terraform plan or an infrastructure approval gate, and vice versa.

## Status
Accepted

## Considered Options
- A single combined pipeline running both web build/test and Terraform
  plan/apply — rejected: it would force every web-only PR to wait on (and
  visually clutter its checks with) an infrastructure plan it doesn't need,
  and would couple infrastructure approval gates to unrelated web releases.

## Consequences
- The two pipeline pairs must be kept naming-consistent
  (`devafusion-<domain>-<ci|cd>`) so their relationship stays legible — see
  the 2026-08-28 pipeline naming consistency fix, which is the direct
  consequence of this split existing at all.
- Infrastructure CD only triggers after a successful infrastructure CI run
  on `develop`; it is never triggered by a web-only merge.
