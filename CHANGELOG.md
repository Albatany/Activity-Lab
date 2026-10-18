# Changelog

All notable changes to **Activity Lab** are documented here. The version numbers
follow the project's published source packages. Release dates are only listed
where they can be verified from the earlier project documentation.

Activity Lab is a **synthetic Visual Studio Code editor activity simulator**.
Generated edits and local line counts do not demonstrate real work and are not
guaranteed to appear in WakaTime or any other tracking tool.

## [4.0.0] — 2026-10-17

### Added
- **32 technology-oriented session modes**, covering Full Stack, Frontend,
  Backend, Data Analyst, Data Engineer, AI Engineering, Cyber Security,
  DevSecOps, MLOps, Cloud, Embedded Systems, and other areas.
- **Optional custom project names** using `.wakatime-project` inside each
  isolated session directory.
- **Varied, randomized scratch filenames**, using topic-related stems such as
  `api_routes`, `debugging`, `model_training`, and `query_report` rather than a
  single `demo` pattern.
- Additional session report metadata describing the selected simulated mode
  and generated files.
- GitHub-ready README, contributor and security guidance, MIT license,
  beginner documentation, and a GitHub Actions verification workflow.

### Changed
- Improved command names, menu text, confirmation prompts, and status display
  for a clearer Bahasa Indonesia user experience.
- Expanded documentation and added the attribution **© Albatany 2026**.
- Kept the existing VS Code extension identifier for upgrades from older VSIX
  versions.

### Retained
- 141 built-in language/file profiles, optional online WakaTime language list,
  role-based language rotation, three synthetic additions/deletions patterns,
  durations up to eight hours, and the **Until I Stop** session option.

## [3.0.0]

### Added
- A choice of three **local synthetic line-change patterns**:
  - Balanced: approximately **1:1** additions/deletions.
  - Additions favored: approximately **4:1**.
  - Strongly favored: approximately **8:1**.
- Local counters for generated additions and deletions.
- `session-report.json` with session totals, and safeguards for test files.

### Changed
- Shifted the simulator toward line-level placeholder changes so local
  additions and deletions could be measured more explicitly.
- Made clear that these totals **are not WakaTime server statistics**.

## [2.0.0]

### Added
- **141 built-in language and file-type profiles**, including Assembly,
  SQL, Bash, Markdown, Python, JavaScript, TypeScript/TSX, Rust, Go,
  Dockerfile, Terraform/HCL, and more.
- An optional online WakaTime programming-language catalog and custom
  language/file-mode selection.
- Full-stack language rotation.
- Session durations up to **eight hours** and an **Until I Stop** option.

### Changed
- Expanded session language configuration and duration controls beyond v1.

## [1.0.0]

### Added
- Initial Windows and Linux VS Code extension.
- 12 programming-language choices for isolated synthetic editor tests.
- Start, Stop, and Status commands.
- Adjustable session intervals and durations between 5 and 120 minutes.
- A disposable, clearly labeled sandbox workspace for generated edits.
- Project labeling via `.wakatime-project` to distinguish test activity.
- Basic testing and installation instructions.

---

## Upgrade and compatibility notes

- The extension package identifier remains `localdev.activity-lab-synthetic`.
  Upgrading to v4 normally means installing the new `.vsix` over the old one.
- Earlier settings and test files should not be interpreted as production
  coding metrics; check the current README for behavior and limitations.
- This changelog records **software features**, not verified release dates,
  Git commit history, or third-party tracker acceptance.

**Developed by Albatany · © Albatany 2026 · MIT License**
