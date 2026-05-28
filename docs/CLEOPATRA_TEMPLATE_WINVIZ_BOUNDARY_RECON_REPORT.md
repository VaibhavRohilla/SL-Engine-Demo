# Cleopatra Template WinViz Boundary Recon Report

Consumer-side mirror of engine report:
- Source of truth: `SL-Engine/docs/internal/WINVIZ_TEMPLATE_CLEOPATRA_STARTER_BOUNDARY_RECON_REPORT.md`
- Verdict: **BAD_BOUNDARY**
- Core finding: local template-owned WinViz schema is too low-level and duplicates engine-facing runtime contracts.
- Recommended direction: migrate to engine-owned public intent helpers; keep Cleopatra ownership to theme/layout/assets/demo intent only.

For full 23-section audit, evidence, grep proof, and migration backlog, read the SL-Engine report above.
