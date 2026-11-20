# Release quick start

In a clean clone, copy in the current source, run the checks, commit and push the reviewed change. Make sure the release workflow has reached the repository's default branch. These examples assume the release branch is named `main`.

| Purpose | Command |
| --- | --- |
| Keep earlier releases | `gh workflow run release.yml --ref main` |
| Retire one known failed release after publication | `gh workflow run release.yml --ref main -f failed_tag=v4.1.0` |
| Find the run ID | `gh run list --workflow release.yml --limit 5` |
| Wait for the result | `gh run watch RUN_ID --exit-status` |

Choose one publication command. Replace the example failed tag with the version you intend to remove. The current version comes from `package.json`. Both publication paths produce a GitHub Release and an npm package containing the same VSIX.

[Setup, push commands and recovery](GITHUB_RELEASE_GUIDE.md)
