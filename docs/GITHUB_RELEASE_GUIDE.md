# Publish Activity Lab v5.0.0 on GitHub

This guide assumes you own a GitHub repository containing Activity Lab v4.0.0 and want to publish v5.0.0 without changing the old Git tags. The steps also work with a new repository after it has been created and cloned.

## 1. Back up and inspect your existing repository

In your already cloned repository:

```bash
git status
git remote -v
git tag --list
```

If you have uncommitted work, commit or stash it first. Never remove the `.git` directory while upgrading. Git tags should identify the actual commit for each historical release. Do not manufacture v1 through v4 tags pointing to v5 source.

## 2. Copy the v5 source

Extract the release ZIP and open the `Activity-Lab-GitHub` folder. Copy its files into the root of your existing repository. Include the hidden `.github` and `.vscodeignore` files. Preserve `.git`, and remove old files that are no longer used.

Inspect the changes:

```bash
git diff --stat
git status
```

## 3. Test

Install Node.js 20 or later for development. VS Code end users do not need Node.js to install a `.vsix`.

```bash
npm test
npm run check
```

The suite validates language selection, preset persistence, editing ratios, project labeling, local reports, and the simulated VS Code editing flow. Tests are **mock-based**; they do not confirm server-side WakaTime stats or installation on your machine.

## 4. Rebuild the VSIX (optional)

The release package already includes `release/activity-lab-synthetic-5.0.0.vsix`. To rebuild it using the official VS Code packaging tool:

```bash
npm install --global @vscode/vsce
vsce package --out release/activity-lab-synthetic-5.0.0.vsix
```

See https://code.visualstudio.com/api/working-with-extensions/publishing-extension for the current official packaging instructions. The publisher in `package.json` is `localdev`, which preserves upgrades from earlier local VSIX builds. Register your own publisher before any future Marketplace publication, noting that changing it creates a different extension identifier.

## 5. Commit the update and create the v5 Git tag

```bash
git add -A
git commit -m "release: Activity Lab v5.0.0"
git push origin HEAD
git tag -a v5.0.0 -m "Activity Lab v5.0.0 — Custom Language Selection"
git push origin v5.0.0
```

If `v5.0.0` already exists, do not overwrite it. Inspect the existing tag and release first.

## 6. Publish a GitHub Release

### Through the GitHub website

1. Open your repository and select **Releases**.
2. Choose **Draft a new release**.
3. Select the existing tag **v5.0.0**.
4. Use the title **Activity Lab v5.0.0 | Custom Language Selection**.
5. Copy the contents of `docs/releases/v5.0.0.md` into the release description.
6. Upload `release/activity-lab-synthetic-5.0.0.vsix` as the release asset.
7. Mark it as the latest stable release and publish it.

### Through GitHub CLI

Authenticate once with `gh auth login`, then run:

```bash
gh release create v5.0.0 \
  release/activity-lab-synthetic-5.0.0.vsix \
  --title "Activity Lab v5.0.0 | Custom Language Selection" \
  --notes-file docs/releases/v5.0.0.md \
  --verify-tag \
  --latest
```

The GitHub website method is easiest for people who do not use the GitHub CLI. On Windows PowerShell you may enter the `gh release create` command on a single line instead of using Bash continuation characters.

## 7. Verify the release

Open the published release, check that the tag reads `v5.0.0` and the VSIX asset is downloadable, then install the VSIX in VS Code. Verify that **Choose multiple languages**, **Saved language presets**, and **Manage Language Presets** appear. Confirm that your previous releases and tags remain unchanged.

**© Albatany 2026**
