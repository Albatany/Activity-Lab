# Publish Activity Lab on GitHub

Run the commands in this guide from a clone of your GitHub repository. The two publication commands work in PowerShell and Bash. The examples use `main`; substitute your release branch if it has another name.

## Prepare the repository

Copy the contents of `Activity-Lab-GitHub/` into a clean clone. Include the dotfiles and `.github/workflows/`. The clone's existing `.git` directory supplies the remote and history. In a fresh terminal, authenticate GitHub CLI once with `gh auth login`.

```sh
git remote -v
gh repo view --json nameWithOwner,defaultBranchRef
git status --short
npm run check
npm test
npm run build
git add -A
git diff --cached --stat
git commit -m "Release Activity Lab 4.1.1"
git push origin HEAD
```

If the default branch is protected, push a feature branch and merge the pull request first. For the first publication, `.github/workflows/release.yml` must be present on the default branch. Enable GitHub Actions and allow this workflow to write repository contents and packages. Check that Git and GitHub CLI target the same repository, especially when working in a fork. Use `--repo OWNER/REPO` on the GitHub CLI commands to set it explicitly when needed.

## Replace one failed version

Use this path when you know which old release failed. List the existing releases and tags. Replace the example `v4.1.0` with the exact failed tag from your repository.

```sh
gh release list
git ls-remote --tags origin
gh workflow run release.yml --ref main -f failed_tag=v4.1.0
```

The workflow publishes the version in `package.json`, downloads both copies of the installer and compares them with the build. After verification it removes the named older GitHub Release and its assets, its Git tag and the matching version of the repository's `@owner/activity-lab` npm package when present. The version must be older than the publication version. Git commit history remains available. Earlier installers under other package names are outside this command's scope.

If the repository also tracks a failed installer in its source tree, use `git rm --ignore-unmatch -- release/activity-lab-synthetic-4.1.0.vsix` before committing, with the filename for that version. The release kit includes archived installers separately.

## Publish a normal update

Set a new stable version in `package.json` and add the corresponding `docs/releases/vX.Y.Z.md`. Update the changelog and current installer references. Build, commit and push as above, then run this command without a failed tag.

```sh
gh workflow run release.yml --ref main
```

Each update gets its own tag, release assets and package version. Previous releases remain available.

## Check the result

```sh
gh run list --workflow release.yml --limit 5
gh run watch RUN_ID --exit-status
gh release view v4.1.1 --web
```

Replace `RUN_ID` with the ID printed by `gh run list`. The GitHub Release contains the VSIX and `SHA256SUMS.txt`. The repository's Packages panel lists the npm distribution with the same installer inside. Its scope comes from the lowercase GitHub owner name. GitHub initially makes new npm packages private. If you intend public distribution, review **Package settings** and change the visibility there. VS Code users can install the VSIX from a public release directly.

## Retry a partial publication

Rerun the workflow on the same commit with the same inputs. It verifies existing bytes, resumes drafts and adds missing assets. If an existing tag points to a different commit or a version's assets differ, use a new version. A package already linked to another repository is rejected. For an existing package, grant this repository write access for publication and admin access for version cleanup. Immutable releases and repository rules can prevent deletion. A failed cleanup is reported in the workflow log.

## References

[GitHub Actions manual runs](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow)

[GitHub Packages npm registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry)

[Package version deletion and permissions](https://docs.github.com/en/packages/learn-github-packages/deleting-and-restoring-a-package)
