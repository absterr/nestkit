# Nestkit Version Management

## 1. Current implementation

- Supported majors: `11`, `12`.
- Version selection: `--nest-version latest|previous|11|12`.
- Templates are bundled and authored for Nest 11, with major-specific adjustments.
- `retargetNest` rewrites Nest-owned dependency ranges for the selected major.
- Dependency ranges use carets (`^`), allowing the package manager to install the latest compatible minor and patch.
- No registry access except package installation.

## 2. Original proposed approach

The original plan was to introduce a more comprehensive version-management system:

1. Support major, minor and exact Nest versions (`12`, `12.1`, `12.1.3`).
2. Resolve published versions through the npm registry.
3. Move compatibility information into a standalone JSON metadata file with a schema and `formatVersion`.
4. Introduce periodic metadata update checks, cached locally and silent offline.
5. Support dist-tags such as `nest-11` for older supported majors.
6. Eventually support remotely hosted metadata with a bundled fallback.
7. Eventually distribute templates as separate packages.

## 3. Challenges and sources of complexity of the original proposed approach

### Version resolution and dependency compatibility

- Nest packages do not necessarily share release schedules.
- Some packages follow the framework's major version; others, such as `@nestjs/config`, have independent versioning.
- Exact/minor selection requires identifying which packages can safely follow the selected version.
- Other dependencies, including TypeScript, Vitest, Jest, Supertest and adapters, may have their own compatibility constraints.
- Resolving a published version does not establish that the generated project works with it.

### Template compatibility

- Major releases can introduce differences in `tsconfig`, TypeScript requirements, runners and other generated configuration.
- Minor releases may also introduce changes that affect generated projects.
- Dependency version selection and template selection are separate concerns, but compatibility changes can make them dependent.
- Supporting more versions increases the combinations that need verification.

### Infrastructure and maintenance

The original registry/metadata approach introduces:

- Registry clients and network failure handling.
- Proxy, timeout and offline considerations.
- Local caching and update timestamps.
- Metadata schema design, validation and versioning.
- Remote metadata hosting, trust and fallback mechanisms.
- Additional tests and maintenance.

The main cost is not implementing a resolver. It is maintaining and verifying compatible dependency combinations.

## 4. What to remove from the current scope

Definitely defer or remove:

- **Registry-based version resolution:** Let package managers resolve and install dependency versions.
- **Compatibility metadata JSON:** Keep the current bundled, code-based major compatibility definitions.
- **Remote metadata:** No hosting, schema or fallback infrastructure.
- **Background update checks:** `npx` and `bunx` already fetch the latest CLI when invoked. Global installations can be addressed separately if necessary.
- **Minor/exact version selection:** Defer until a later iteration. It remains a potential feature, not a current requirement.
- **Separate template packages:** Unnecessary for the current scope.

## 5. Approaches worth considering later

### A. Major-based bundled support (current approach)

- Bundle templates for each supported Nest major.
- Maintain major-specific configuration and dependency ranges.
- Use caret ranges and delegate minor/patch resolution to the package manager.
- Add or remove major support deliberately.

**Advantages:** Simple, predictable, offline-friendly and relatively easy to verify.

### B. Release-coupled template maintenance

Instead of introducing a separate version resolver, update bundled templates and dependency ranges as Nestkit evolves.

- Update templates when framework changes warrant it.
- Account for dependency and configuration changes.
- Test the generated projects against supported configurations.
- Do not assume every framework release requires a new template.

This is inspired by the release practices of `create-next-app` and `create-vite`.

### C. Minor/exact dependency selection

Potential future extension:

- Keep templates selected by major.
- Allow minor/exact selections to modify dependency ranges.
- Apply exact/minor constraints only to verified lockstep packages.
- Leave independently versioned packages on their appropriate ranges.
- Delegate package existence validation and installation to the package manager.

This avoids maintaining separate templates for every minor or patch, but requires compatibility research and verification.

### D. Dist-tag distribution for older majors

An alternative future support policy:

- Keep the latest Nest major on the main Nestkit release line.
- Publish older-major-compatible Nestkit releases under tags such as `nest-11`.
- Maintain a clear backport and security-fix policy for older lines.

This reduces main-line complexity but introduces separate release and maintenance obligations.

## 6. Inspiration and references

- **create-next-app:** Release-coupled scaffolding, bundled templates maintained alongside Next.js.
- **create-vite:** Bundled framework/configuration templates, updated across releases when dependencies or configurations warrant it.
- **Nest CLI:** Schematics and extensible template generation, rather than a dedicated arbitrary framework-version resolver.

These tools demonstrate that a scaffolder does not necessarily need to resolve every framework version independently. Template maintenance can follow the scaffolder's own release cycle.

## 7. Current decision

Ship with the existing major-based architecture.

- Retain Nest 11 and Nest 12 support.
- Keep major-specific templates and compatibility rules.
- Retain caret dependency ranges.
- Let the package manager resolve compatible minor and patch releases.
- Do not introduce registry resolution, metadata files or update checks.
- Defer minor/exact selection and alternative distribution models.

**Next iteration:** Revisit minor/exact selection, template maintenance across releases, and the long-term policy for older Nest majors.

The immediate objective is to ship a reliable scaffolder without prematurely building a separate dependency-resolution and compatibility-management system.
