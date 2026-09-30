# Coursework evidence and authority

## Source hierarchy

1. The supplied NB6007CEM Coursework Brief is the authority for the assignment scope, required API surface, seed scale, report content, deployment requirement, and academic rules.
2. The supplied NB6007CEM Marking Rubric is the authority for the eight assessment dimensions and eligibility/viva gate.
3. The supplied NB6007CEM Report Template is the authority for report structure, formatting, declaration, word range, and appendices.
4. The pasted engineering request directs implementation and verification choices. It may add useful engineering controls, but it cannot override the coursework documents.

The referenced module REST API Design Guidelines white paper was not present in the supplied files or the repository. Its contents have not been invented. Any contested design choice should be checked against that document when it becomes available.

## Rubric dimensions and current evidence

| Dimension | Marks | Current evidence | Remaining evidence |
|---|---:|---|---|
| Architecture and data model | 15 | Six Sequelize entities, restrictive foreign keys, append-only reading table, ER diagram | Final report justification and viva explanation |
| API design | 20 | Resource routes, nested collections, noun-based URIs, JSON, status codes, headers, Swagger | Live deployed OpenAPI evidence and guideline citations |
| Coverage | 15 | Hierarchy reads, overview, latest reading, readings history, pagination, filters, sorting, conditional GET, summary | Full MySQL integration results |
| Implementation with generated code | 10 | Incremental commits, AI log, validation/security corrections | Student must understand and defend every artefact |
| Functionality against seed data | 5 | Seed generator and local successful authentication after migration/seed | Dedicated test-database run with actual results |
| Deployment and operation | 10 | Dockerfile, Compose, health/readiness, graceful shutdown | Public HTTPS deployment and shared repository |
| Security and authentication | 15 | JWT role separation, installation binding, scope-first joins, hashing, rate limits, security headers | HTTPS deployment and full cross-jurisdiction test evidence |
| Report quality | 10 | Technical notes, endpoint inventory, viva notes, AI disclosure log | Student-written 2,250–2,750 word report, signed declaration, APA7 references |

## Eligibility gate

The local project is not yet submission-eligible: localhost is not a public HTTPS deployment, the repository has not been shared with the module leader, and the formal report/declaration/viva requirements remain outstanding. These are submission tasks, not claims of completed deployment.
