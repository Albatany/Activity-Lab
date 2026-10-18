# Publishing Activity Lab v4.0.0 on GitHub

**Step-by-step guide for a repository currently at v1.0.0**

This guide publishes the **v4.0.0 source and installer** with a complete
v1→v4 changelog. Publishing v2/v3 separately is optional and should only be
done when you have the corresponding real source revisions.

## 1. Understand the files

After extracting the distribution package you will see:

```text
Activity-Lab-GitHub/       → repository files (source, README, CHANGELOG, tests)
GITHUB_RELEASE_KIT/        → release notes and VSIX installers for v1–v4
START_HERE_RELEASE.md      → quick start
```

**Do not upload the whole outer ZIP as your Git repository**. Copy the
*contents* of `Activity-Lab-GitHub` into your existing repository. The release
kit is only for attaching installers to GitHub Releases.

## 2. Before pushing

You will need:

- An existing GitHub repository, e.g. `https://github.com/OWNER/REPOSITORY`.
- Git installed and authentication set up.
- Node.js 18+ to test the source (not required for users installing the VSIX).
- Optionally GitHub CLI (`gh`) for the terminal release method.

Replace `OWNER/REPOSITORY` with your actual repository URL. The example is
**not** a known name of your repository.

## 3. Upgrade the existing repository from v1 source to v4

### Option A: GitHub web interface (simple)

1. Make a backup of your current repository or create a new branch.
2. Open your GitHub repository and choose **Add file → Upload files**.
3. Upload the **contents** of the `Activity-Lab-GitHub/` folder; replace
   existing source files where needed. Make sure hidden paths like `.github/`,
   `.gitignore`, and `.vscodeignore` are included.
4. Review the changed files carefully, especially if your repository has
   custom work not present in the v4 package.
5. Commit with message `release: Activity Lab v4.0.0`.

Note: GitHub's web upload flow may be awkward when replacing many files.
For a repository already at v1, the **terminal workflow below is safer**
because it shows a complete diff before committing.

### Option B: Git on Windows PowerShell

Open PowerShell in the directory containing the two extracted folders.

```powershell
# Clone your existing repository (do not run git init on the extracted files)
git clone https://github.com/OWNER/REPOSITORY.git activity-lab-repo

# Copy v4 files, preserving the clone's .git folder
Copy-Item -Path ".\Activity-Lab-GitHub\*" -Destination ".\activity-lab-repo" -Recurse -Force

Set-Location .\activity-lab-repo
git status

# Test, review, then commit/push
npm test
npm run check
git add -A
git commit -m "release: Activity Lab v4.0.0"
git push origin HEAD
```

### Option C: Git on Kali Linux

Open a terminal in the directory containing the two extracted folders.

```bash
# Clone your existing repository
git clone https://github.com/OWNER/REPOSITORY.git activity-lab-repo

# Copy all v4 files, including dotfiles, without deleting .git
cp -a Activity-Lab-GitHub/. activity-lab-repo/

cd activity-lab-repo
git status

npm test
npm run check
git add -A
git commit -m "release: Activity Lab v4.0.0"
git push origin HEAD
```

**Before `git add -A`**, inspect `git diff` and make sure older tracked files
no longer needed in v4 are handled appropriately. Don't delete `.git`.
If the repository has independent changes, merge them rather than overwriting
blindly. If your default branch is protected, open a pull request instead.

## 4. Create an actual Git tag v4.0.0

After the v4 commit reaches the branch you're releasing, in the cloned repo:

```bash
git status
git log -1 --oneline
git tag -a v4.0.0 -m "Activity Lab v4.0.0"
git push origin v4.0.0
```

The tag marks the actual v4 source revision. If the tag **already exists**,
check where it points with `git show v4.0.0` instead of recreating or forcing
it. Never force-move a published version tag.

## 5. Publish the GitHub Release

### Method A: From GitHub (recommended for beginners)

1. Open your repository on GitHub.
2. Click **Releases → Draft a new release**.
3. Choose the **existing** tag `v4.0.0` (created above).
4. Release title: **Activity Lab v4.0.0 — GitHub Edition**.
5. Copy the content of `docs/releases/v4.0.0.md` into the description.
6. Attach `activity-lab-synthetic-4.0.0.vsix` from the release kit, or
   `release/activity-lab-synthetic-4.0.0.vsix` from the repo.
7. Mark it **Latest release** and publish (or save as a draft first).

### Method B: GitHub CLI (Windows or Kali)

In the cloned repository, log in once:

```bash
gh auth login
```

Then publish, using the **repository's existing v4.0.0 tag**:

```bash
gh release create v4.0.0   release/activity-lab-synthetic-4.0.0.vsix   --title "Activity Lab v4.0.0 — GitHub Edition"   --notes-file docs/releases/v4.0.0.md   --verify-tag   --latest
```

The multiline example above uses Bash line continuations. In Windows
PowerShell use this **single-line** equivalent:

```powershell
gh release create v4.0.0 .\release\activity-lab-synthetic-4.0.0.vsix --title "Activity Lab v4.0.0 — GitHub Edition" --notes-file .\docs\releases\v4.0.0.md --verify-tag --latest
```

GitHub CLI reference: <https://cli.github.com/manual/gh_release_create>.

## 6. What about publishing v1, v2, and v3 too?

**If only v1 was previously released:** publish v4 as the next release.
The full changelog already documents 1→2→3→4. You do **not** need to publish
separate v2 and v3 releases merely to show the progression.

**If your Git history contains real v2/v3 commits:** locate each exact
commit using `git log --oneline --all`, tag the matching historical commit,
and create its GitHub Release from `docs/releases/v2.0.0.md` or
`docs/releases/v3.0.0.md` with the corresponding VSIX from the release kit.
For example, substitute a real v2 commit hash:

```bash
git tag -a v2.0.0 ACTUAL_V2_COMMIT_SHA -m "Activity Lab v2.0.0"
git push origin v2.0.0
gh release create v2.0.0 ../GITHUB_RELEASE_KIT/v2.0.0/activity-lab-synthetic-2.0.0.vsix --title "Activity Lab v2.0.0" --notes-file docs/releases/v2.0.0.md --verify-tag --latest=false
```

**Do not** tag the current v4 commit as v1, v2, or v3. That would make
GitHub's downloadable "Source code" archives show the wrong code for those
versions. If old source commits are unavailable, keep their features in
`CHANGELOG.md` without creating incorrect historical releases.

## 7. Verification checklist

- [ ] `package.json` shows version `4.0.0`.
- [ ] `CHANGELOG.md` includes v1.0.0 through v4.0.0.
- [ ] The repository's v4 commit is on its intended release branch.
- [ ] GitHub Actions verification passes (if enabled).
- [ ] GitHub tag `v4.0.0` resolves to the v4 commit.
- [ ] GitHub Release `v4.0.0` is published with matching release notes.
- [ ] The asset is named `activity-lab-synthetic-4.0.0.vsix`.
- [ ] A clean VS Code installation can install the VSIX.
- [ ] The README does not claim that synthetic changes equal real coding time.

### Troubleshooting

- **`fatal: tag 'v4.0.0' already exists`**: check `git show v4.0.0`; don't
  overwrite an existing published tag.
- **`gh: command not found`**: use the GitHub web release method.
- **`gh auth status` says not logged in**: run `gh auth login`.
- **`npm: command not found`**: install Node.js for tests or skip tests and
  make the release a draft pending verification.
- **Protected default branch**: push a feature branch and merge a pull request.
- **Existing release**: use `gh release edit v4.0.0 --notes-file ...` or the
  GitHub Releases UI instead of trying to create a duplicate.

---

**Activity Lab by Albatany · © Albatany 2026 · MIT License**
