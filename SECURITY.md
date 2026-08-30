# Security policy

## Supported application

Security fixes target the latest `master` branch of the actively maintained Next.js application in
[`travlr-web`](travlr-web/README.md). The Rails/CRA implementation at the
repository root is archived and must not be deployed without a dedicated
upgrade and security review.

## Reporting a vulnerability

Please use the repository's
[private advisory form](https://github.com/jonbiro/Travlr---Itinerary-Planning/security/advisories/new).
If private reporting is unavailable, open a public issue that only asks the
maintainer to establish a secure contact; do not include exploit details,
credentials, personal data, or sensitive screenshots. In a private report,
include the affected route or component, reproduction steps, expected impact,
and any safe proof of concept.

## Credential hygiene

Treat every credential that has ever appeared in Git history as compromised,
even when it has since been deleted from the current branch. Revoke and rotate
it at the provider, review provider logs, and only then coordinate any history
rewrite with all repository collaborators.
