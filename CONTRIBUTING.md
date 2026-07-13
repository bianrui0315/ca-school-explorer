# Contributing

Thank you for helping make California public education data easier to understand and audit.

## Before opening a pull request

1. Open or reference an issue for material product, methodology, or data-source changes.
2. Keep source data out of Git unless redistribution has been explicitly approved.
3. Do not include student-level records, credentials, or private contact information.
4. Add or update tests for code and data-contract changes.
5. Document methodology changes that affect interpretation.

## Development setup

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -e ".[dev]"
make check
```

## Pull request expectations

- Use a focused title and explain the user or maintainer impact.
- Separate formatting-only changes from behavior changes when practical.
- Include the source release and school years for data adapters.
- Record suppression, methodology, and entity-join decisions.
- Include small, non-sensitive fixtures rather than production source files.
- Confirm that documentation and code are written in English.

## Source adapter checklist

- Canonical landing and download URLs are recorded.
- Retrieval timestamp and SHA-256 digest are captured.
- The source schema or record layout is versioned.
- Grain and primary key are documented.
- Suppression and missing-value markers are preserved.
- Entity joins and unmatched rows are measured.
- Official aggregates reconcile where definitions permit.
- Redistribution terms are reviewed separately from the code license.

## Community standards

Participation is governed by the [Code of Conduct](CODE_OF_CONDUCT.md). Security concerns should follow the [Security Policy](SECURITY.md), not public issue discussion.
